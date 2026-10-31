// Tests for supabase/migrations/0004_classes_students.sql: classes, students with PIN login, progress saved on the server,
// family creation closed. Real PostgreSQL with the real "authenticated" role, calling tables and functions
// directly, so nothing in the app can hide a hole. Also checks that 0001/0002 keep working and that the rollback works.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const MIG = n => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8');
const ROLLBACK = fs.readFileSync(path.join(__dirname, '..', 'rollback', '0004_rollback.sql'), 'utf8');
const STANDIN = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;
const person = (anonymous = false) => ({ id: randomUUID(), anonymous });
async function as(db, who, sql, params = []) {
  await db.exec('reset role');
  if (who === 'anon') { await db.query("select set_config('request.jwt.claims', '', false)"); await db.exec('set role anon'); }
  else { await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: who.id, role: 'authenticated', is_anonymous: who.anonymous })]); await db.exec('set role authenticated'); }
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
const one = rows => rows[0] && rows[0][Object.keys(rows[0])[0]];
const refused = (p, re) => assert.rejects(p, err => (re ? re.test(err.message) : true));
const me = (db, who) => as(db, who, 'select public.my_account() as r').then(r => r[0].r);
const can = (db, who, perm) => as(db, who, 'select public.has_permission($1) as r', [perm]).then(r => r[0].r);
const invite = (db, who, role, perms, days) => as(db, who, 'select public.create_invitation($1, $2, $3) as r', [role, days || 7, perms || []]).then(r => r[0].r);
const accept = (db, who, token, name) => as(db, who, "select public.accept_invitation($1, $2, 'sv') as r", [token, name || 'Someone']).then(r => r[0].r);


/* 0001–0004 with: System Creator, an approved teacher (Tina), a second teacher (Tom), a pending teacher, an old parent */
async function world() {
  const db = new PGlite();
  await db.exec(STANDIN);
  for (const m of ['0001_family_hub_security.sql', '0002_points_rewards_learning.sql', '0003_accounts_access_control.sql']) await db.exec(MIG(m));
  const oldParent = person();
  // a family from before (created while families were open) – inserted directly as the old data would be
  const fam = randomUUID();
  await db.query("insert into public.families (id, name, created_by) values ($1, 'Old', $2)", [fam, oldParent.id]);
  await db.query("insert into public.family_members (family_id, user_id, role) values ($1, $2, 'owner')", [fam, oldParent.id]);
  await db.query("insert into public.app_accounts (user_id, display_name, role, status) values ($1, 'P', 'parent', 'approved')", [oldParent.id]);
  await db.exec(MIG('0004_classes_students.sql'));
  const owner = person(), tina = person(), tom = person(), pend = person();
  await db.query("insert into auth.users (id, email) values ($1, 'owner@example.com')", [owner.id]);
  await db.query("select private.set_system_owner('owner@example.com')");
  for (const [p, name] of [[tina, 'Tina'], [tom, 'Tom']]) {
    const inv = await as(db, owner, "select public.create_invitation('teacher') as r").then(r => r[0].r);
    await as(db, p, "select public.accept_invitation($1, $2, 'th')", [inv.token, name]);
  }
  await as(db, pend, "select public.request_access('Pending', 'sv', 'teacher')");
  return { db, owner, tina, tom, pend, oldParent, fam };
}
const mkClass = (w, who, name, count, names) => as(w.db, who, 'select public.create_class($1, $2, $3) as r', [name, count || 0, names || null]).then(r => r[0].r);
const device = () => person(true);   // an anonymous Supabase user = one student device
const login = (w, dev, code, no, pin) => as(w.db, dev, 'select public.student_login($1, $2, $3) as r', [code, no, pin]).then(r => r[0].r);

test('C1: family creation is closed except for the System Creator; old families keep working', async () => {
  const w = await world();
  await refused(as(w.db, w.oldParent, "select public.create_family('New')"), /family_creation_closed/);
  await refused(as(w.db, w.tina, "select public.create_family('New')"), /family_creation_closed/);
  assert.ok(one(await as(w.db, w.owner, "select public.create_family('Owner family')")));
  const kid = one(await as(w.db, w.oldParent, "select public.create_child_profile($1, 'Mia', '🦊')", [w.fam]));
  assert.ok(kid);
});

test('C2: approved teachers create classes by count or by names; PINs are shown once and never readable', async () => {
  const w = await world();
  const a = await mkClass(w, w.tina, 'Thai 1A', 25);
  assert.match(a.code, /^[2-9A-HJ-NP-Z]{6}$/);
  assert.equal(a.students.length, 25);
  assert.deepEqual([a.students[0].student_no, a.students[0].name, a.students[24].student_no], [1, 'Elev 1', 25]);
  assert.ok(a.students.every(s => /^\d{4}$/.test(s.pin)));
  const b = await mkClass(w, w.tina, 'Thai 2', 0, ['Mali', ' ', 'Chaiyo', 'Pear']);
  assert.deepEqual(b.students.map(s => [s.student_no, s.name]), [[1, 'Mali'], [2, 'Chaiyo'], [3, 'Pear']]);
  await refused(as(w.db, w.tina, 'select pin_hash from public.students'), /permission denied/);
  await refused(as(w.db, w.tina, 'select pin_salt from public.students'), /permission denied/);
  assert.equal((await as(w.db, w.tina, 'select student_no, display_name from public.students')).length, 28);
  /* not allowed: pending teacher, parent, guest, too many students */
  await refused(mkClass(w, w.pend, 'X', 3), /not_allowed/);
  await refused(mkClass(w, w.oldParent, 'X', 3), /not_allowed/);
  await refused(mkClass(w, device(), 'X', 3), /not_allowed/);
  await refused(mkClass(w, w.tina, 'X', 101), /students_1_to_100/);
  await refused(mkClass(w, w.tina, '', 3), /name_required/);
  /* more students later continue the numbering */
  const more = await as(w.db, w.tina, 'select public.add_students($1, 2) as r', [b.class_id]).then(r => r[0].r);
  assert.deepEqual(more.map(s => s.student_no), [4, 5]);
});

test('C3: teachers see and manage only their own classes; nobody writes the tables directly', async () => {
  const w = await world();
  const a = await mkClass(w, w.tina, 'Tina class', 3);
  const st = (await as(w.db, w.tina, 'select id from public.students where class_id = $1 order by student_no', [a.class_id]))[0].id;
  assert.equal((await as(w.db, w.tom, 'select * from public.classes')).length, 0);
  assert.equal((await as(w.db, w.tom, 'select id from public.students')).length, 0);
  await refused(as(w.db, w.tom, 'select public.reset_student_pin($1)', [st]), /not_allowed/);
  await refused(as(w.db, w.tom, 'select public.add_students($1, 1)', [a.class_id]), /not_allowed/);
  await refused(as(w.db, w.tom, "select public.rename_student($1, 'x')", [st]), /not_allowed/);
  /* the System Creator (classes.manage) sees every class */
  assert.equal((await as(w.db, w.owner, 'select * from public.classes')).length, 1);
  for (const sql of ["update public.students set display_name = 'x'", 'delete from public.students', "insert into public.classes (name, code, teacher_id) values ('x', 'ABCDEF', auth.uid())",
    "update public.student_progress set data = '{}'", "insert into public.student_activity (student_id, class_id, key, area, kind, title) values (gen_random_uuid(), gen_random_uuid(), 'kkk', 'a', 'b', 'c')",
    'select * from public.student_sessions']) await refused(as(w.db, w.tina, sql), /permission denied/);
  /* a suspended teacher loses access at once */
  await as(w.db, w.owner, "select public.set_account_status($1, 'suspended')", [w.tina.id]);
  assert.equal((await as(w.db, w.tina, 'select * from public.classes')).length, 0);
  await refused(mkClass(w, w.tina, 'Again', 2), /not_allowed/);
});

test('C4: student login with class code + number + PIN on any device; wrong tries are limited and all look the same', async () => {
  const w = await world();
  const a = await mkClass(w, w.tina, 'Thai 1A', 3);
  const s1 = a.students[0];
  /* a permanent account cannot become a student; the device must be an anonymous session */
  assert.equal((await as(w.db, w.tina, 'select public.student_login($1, 1, $2) as r', [a.code, s1.pin]))[0].r.error, 'use_student_device_session');
  const ipad = device();
  const r = await login(w, ipad, a.code.toLowerCase(), 1, s1.pin);
  assert.equal(r.ok, true);
  assert.deepEqual([r.student_no, r.name, r.class_name, r.rev], [1, 'Elev 1', 'Thai 1A', 0]);
  /* the same student on a second device */
  const laptop = device();
  assert.equal((await login(w, laptop, a.code, 1, s1.pin)).ok, true);
  /* wrong PIN, wrong number and wrong code all answer "wrong" */
  for (const [code, no, pin] of [[a.code, 1, '0000' === s1.pin ? '1111' : '0000'], [a.code, 99, s1.pin], ['ZZZZZZ', 1, s1.pin]]) assert.equal((await login(w, device(), code, no, pin)).error, 'wrong');
  /* 5 wrong PINs for student 2 → locked for everyone for 15 minutes, even with the right PIN */
  const s2 = a.students[1], bad = s2.pin === '9999' ? '8888' : '9999';
  for (let i = 0; i < 5; i++) assert.equal((await login(w, device(), a.code, 2, bad)).error, 'wrong');
  assert.equal((await login(w, device(), a.code, 2, s2.pin)).error, 'too_many_attempts');
  await w.db.query("update private.student_login_attempts set at = now() - interval '16 minutes'");
  assert.equal((await login(w, device(), a.code, 2, s2.pin)).ok, true);
  /* a device that is not signed in as a student gets nothing */
  await refused(as(w.db, device(), 'select public.student_me()'), /not_a_student/);
  await refused(as(w.db, 'anon', "select public.student_login('ABCDEF', 1, '1234')"), /permission denied/);
});

test('C5: progress is saved on the server, continues on another device, never mixes students, stale saves are refused', async () => {
  const w = await world();
  const a = await mkClass(w, w.tina, 'Thai 1A', 2);
  const ipad = device(), laptop = device(), other = device();
  await login(w, ipad, a.code, 1, a.students[0].pin); await login(w, laptop, a.code, 1, a.students[0].pin); await login(w, other, a.code, 2, a.students[1].pin);
  const doc = { learning: { 'kl:th-sv': { lessons: { l1: { best: 80, done: true } }, current: 'l2', lastAt: 1 } } };
  assert.deepEqual(await as(w.db, ipad, 'select public.student_save_progress($1, 0) as r', [JSON.stringify(doc)]).then(r => r[0].r), { ok: true, rev: 1 });
  /* the laptop sees it ("continue where you left off") */
  const me = await as(w.db, laptop, 'select public.student_me() as r').then(r => r[0].r);
  assert.deepEqual([me.rev, me.progress.learning['kl:th-sv'].current], [1, 'l2']);
  /* the laptop saving with an old revision gets the server copy back instead of overwriting */
  const stale = await as(w.db, laptop, "select public.student_save_progress('{}', 0) as r").then(r => r[0].r);
  assert.deepEqual([stale.ok, stale.error, stale.rev], [false, 'stale', 1]);
  /* student 2 does not see student 1's progress */
  assert.deepEqual((await as(w.db, other, 'select public.student_me() as r'))[0].r.progress, {});
  /* activities: stored once per key, numbers clamped, visible to the teacher only */
  const act = (dev, key, score, max) => as(w.db, dev, "select public.student_record_activity($1, 'kids', 'lesson', 'Lesson 1', 'l1', $2, $3, 60000) as r", [key, score, max]).then(r => r[0].r);
  assert.deepEqual(await act(ipad, 'act-1', 8, 10), { ok: true, duplicate: false });
  assert.deepEqual(await act(laptop, 'act-1', 8, 10), { ok: true, duplicate: true });
  await act(ipad, 'act-2', 999, 10);
  const rows = await as(w.db, w.tina, 'select key, score, pct from public.student_activity order by key');
  assert.deepEqual(rows.map(r => [r.key, r.score, r.pct]), [['act-1', 8, 80], ['act-2', 10, 100]]);
  assert.equal((await as(w.db, w.tom, 'select * from public.student_activity')).length, 0);
  assert.equal((await as(w.db, w.tina, 'select * from public.student_progress')).length, 1);
  assert.equal((await as(w.db, ipad, 'select public.student_me() as r'))[0].r.recent.length, 2);
  await refused(as(w.db, ipad, 'select public.student_save_progress($1, 1)', [JSON.stringify({ big: 'x'.repeat(600000) })]), /too_large/);
});

test('C6: a PIN reset or archiving signs the student out everywhere; nothing is deleted', async () => {
  const w = await world();
  const a = await mkClass(w, w.tina, 'Thai 1A', 2);
  const ipad = device();
  await login(w, ipad, a.code, 1, a.students[0].pin);
  await as(w.db, ipad, "select public.student_save_progress('{\"x\":1}', 0)");
  const st = (await as(w.db, w.tina, 'select id from public.students where student_no = 1'))[0].id;
  const fresh = await as(w.db, w.tina, 'select public.reset_student_pin($1) as r', [st]).then(r => r[0].r);
  await refused(as(w.db, ipad, 'select public.student_me()'), /not_a_student/);
  assert.equal((await login(w, ipad, a.code, 1, a.students[0].pin)).error, 'wrong');
  assert.equal((await login(w, ipad, a.code, 1, fresh.pin)).progress.x, 1);          // same saved progress
  await as(w.db, w.tina, 'select public.set_student_archived($1, true)', [st]);
  await refused(as(w.db, ipad, 'select public.student_me()'), /not_a_student/);
  assert.equal((await login(w, ipad, a.code, 1, fresh.pin)).error, 'wrong');
  await as(w.db, w.tina, 'select public.set_student_archived($1, false)', [st]);
  assert.equal((await login(w, ipad, a.code, 1, fresh.pin)).ok, true);
  await as(w.db, w.tina, 'select public.set_class_archived($1, true)', [a.class_id]);
  await refused(as(w.db, ipad, 'select public.student_me()'), /not_a_student/);
  assert.equal(one((await w.db.query('select count(*)::int from public.student_progress')).rows), 1);
});

test('C7: rollback removes only 0004 and re-opens family creation', async () => {
  const w = await world();
  await mkClass(w, w.tina, 'Thai 1A', 2);
  await w.db.exec(ROLLBACK);
  assert.equal(one((await w.db.query("select to_regclass('public.classes')")).rows), null);
  assert.ok(one(await as(w.db, w.oldParent, "select public.create_family('Again')")));
  assert.equal((await as(w.db, w.owner, 'select public.my_account() as r'))[0].r.role, 'super_admin');
  await w.db.exec(MIG('0004_classes_students.sql'));
  await refused(as(w.db, w.oldParent, "select public.create_family('Closed again')"), /family_creation_closed/);
});
