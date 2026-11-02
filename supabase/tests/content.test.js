// Tests for supabase/migrations/0006_content_manager.sql: teacher courses, drafts, publishing, version history, media rules. Real PostgreSQL with the real "authenticated" role, calling tables and functions
// directly, so nothing in the app can hide a hole. Also checks that 0001/0002 keep working and that the rollback works.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const MIG = n => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8');
const ROLLBACK = fs.readFileSync(path.join(__dirname, '..', 'rollback', '0006_rollback.sql'), 'utf8');
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


/* 0001–0006 with: System Creator, an approved teacher (Tina), a second teacher (Tom), a pending teacher, an old parent */
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
  await db.exec(MIG('0005_homework_protected_content.sql'));
  await db.exec(MIG('0006_content_manager.sql'));
  return { db, owner, tina, tom, pend, oldParent, fam };
}
const mkClass = (w, who, name, count, names) => as(w.db, who, 'select public.create_class($1, $2, $3) as r', [name, count || 0, names || null]).then(r => r[0].r);
const device = () => person(true);   // an anonymous Supabase user = one student device
const login = (w, dev, code, no, pin) => as(w.db, dev, 'select public.student_login($1, $2, $3) as r', [code, no, pin]).then(r => r[0].r);


const q1 = (w, who, sql, params) => as(w.db, who, sql, params).then(r => r[0] && r[0].r);
const lesson = (id, extra) => Object.assign({ id, level: 'L1', title: { sv: 'Lektion ' + id }, goal: { sv: 'Mål' }, dialogue: [], vocab: [{ t: 'สวัสดี', tr: { sv: 'Hej' } }], exercises: [], grammar: { title: { sv: 'x' }, body: { sv: 'y' } } }, extra || {});
const doc = (...ids) => ({ key: 'x', target: 'th', explain: ['sv'], name: { sv: 'Kurs' }, levels: [{ id: 'L1', n: 1, name: { sv: 'Nivå 1' } }], lessons: ids.map(i => lesson(i)) });
const save = (w, who, id, d, title) => q1(w, who, 'select public.save_course_draft($1, $2, $3) as r', [id, title || 'Min kurs', d]);
async function setup() {
  const w = await world();
  const a = await mkClass(w, w.tina, 'Thai 1A', 1); const dev = device(); await login(w, dev, a.code, 1, a.students[0].pin);
  return Object.assign(w, { dev });
}

test('F1: teachers draft their own courses; students and outsiders never see drafts; publish makes it readable', async () => {
  const w = await setup();
  await save(w, w.tina, 't-tina-1', doc('a', 'b'));
  for (const who of [w.pend, w.oldParent, w.dev, device()]) await refused(save(w, who, 't-x', doc('a')), /not_allowed/);
  await refused(save(w, w.tina, 'book42', doc('a')), /not_allowed/, 'teachers cannot touch admin courses');
  await refused(save(w, w.tina, 'T Bad', doc('a')), /bad_course_id/);
  assert.equal((await q1(w, w.dev, 'select public.list_course_content() as r')).length, 0, 'a draft is invisible to students');
  assert.equal((await q1(w, w.tina, "select public.get_course_draft('t-tina-1') as r")).doc.lessons.length, 2);
  assert.equal(await q1(w, w.tom, "select public.get_course_draft('t-tina-1') as r"), null, "another teacher never sees Tina's draft");
  const pub = await q1(w, w.tina, "select public.publish_course_draft('t-tina-1') as r");
  assert.equal(pub.version, 1);
  assert.equal((await q1(w, w.dev, "select public.get_course_content('t-tina-1') as r")).doc.lessons.length, 2);
  /* Tom cannot edit Tina's published course */
  await refused(save(w, w.tom, 't-tina-1', doc('z')), /not_allowed/);
  assert.equal(await q1(w, w.tom, "select public.can_edit_course('t-tina-1') as r"), false);
  assert.equal(await q1(w, w.owner, "select public.can_edit_course('t-tina-1') as r"), true, 'classes.manage edits every course');
  assert.equal(await q1(w, w.owner, "select public.can_edit_course('book42') as r"), true);
  const list = await q1(w, w.tina, 'select public.teacher_courses() as r');
  assert.deepEqual(list.map(c => [c.id, c.version, c.mine]), [['t-tina-1', 1, true]]);
});

test('F2: bad documents are refused; publishing keeps history; restore makes a draft, not a publication; unpublish', async () => {
  const w = await setup();
  for (const bad of [{ nope: 1 }, { lessons: [{ title: { sv: 'x' } }] }, { lessons: [lesson('a'), lesson('a')] }, { lessons: [{ id: 'a', title: { sv: 'x' } }] }])
    await refused(save(w, w.tina, 't-k', bad), /bad_document|lesson_without_id|duplicate_lesson_id|lesson_incomplete/);
  await refused(q1(w, w.tina, "select public.publish_course_draft('t-k') as r"), /no_draft/);
  await save(w, w.tina, 't-k', doc('a')); await q1(w, w.tina, "select public.publish_course_draft('t-k') as r");
  await save(w, w.tina, 't-k', doc('a', 'b')); assert.equal((await q1(w, w.tina, "select public.publish_course_draft('t-k') as r")).version, 2);
  const hist = await q1(w, w.tina, "select public.course_history('t-k') as r");
  assert.deepEqual(hist.map(h => [h.version, h.lessons]), [[1, 1]]);
  await q1(w, w.tina, "select public.restore_course_version('t-k', 1) as r");
  assert.equal((await q1(w, w.dev, "select public.get_course_content('t-k') as r")).doc.lessons.length, 2, 'students still see version 2');
  assert.equal((await q1(w, w.tina, "select public.get_course_draft('t-k') as r")).doc.lessons.length, 1, 'the restored version is a draft');
  await refused(as(w.db, w.tina, 'delete from public.course_versions'), /permission denied/);
  await refused(w.db.query('delete from public.course_versions'), /history_is_read_only/);
  await q1(w, w.tina, "select public.unpublish_course('t-k') as r");
  assert.equal(await q1(w, w.dev, "select public.get_course_content('t-k') as r"), null);
  assert.equal((await q1(w, w.tina, "select public.course_history('t-k') as r")).length, 2);
});

test('F3: media rules: only course editors upload under their course; staff and students read; outsiders nothing', async () => {
  const w = await setup();
  await save(w, w.tina, 't-m', doc('a')); await q1(w, w.tina, "select public.publish_course_draft('t-m') as r");
  assert.equal(await q1(w, w.tina, "select public.can_upload_course_media('t-m/audio/sawatdi.mp3') as r"), true);
  for (const who of [w.tom, w.dev, w.pend]) assert.equal(await q1(w, who, "select public.can_upload_course_media('t-m/a.mp3') as r"), false);
  assert.equal(await q1(w, w.tina, "select public.can_upload_course_media('t-m/../book42/a.mp3') as r"), false);
  assert.equal(await q1(w, w.tina, "select public.can_upload_course_media('book42/a.mp3') as r"), false);
  for (const who of [w.tina, w.tom, w.dev]) assert.equal(await q1(w, who, "select public.can_read_course_media('t-m/a.mp3') as r"), true);
  for (const who of [w.pend, w.oldParent, device()]) assert.equal(await q1(w, who, "select public.can_read_course_media('t-m/a.mp3') as r"), false);
});

test('F4: rollback removes only 0006; published courses stay readable; 0006 applies again', async () => {
  const w = await setup();
  await save(w, w.tina, 't-r', doc('a')); await q1(w, w.tina, "select public.publish_course_draft('t-r') as r");
  await w.db.exec(ROLLBACK);
  assert.equal((await q1(w, w.dev, "select public.get_course_content('t-r') as r")).doc.lessons.length, 1);
  await refused(as(w.db, w.tina, 'select public.teacher_courses()'), /does not exist/);
  await w.db.exec(MIG('0006_content_manager.sql'));
  assert.equal(await q1(w, w.tina, "select public.can_edit_course('t-new') as r"), true);
});
