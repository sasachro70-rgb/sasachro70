// Tests for supabase/migrations/0005_homework_protected_content.sql: homework, hand-in versions, teacher review, feedback and
// comments, protected course content. Real PostgreSQL with the real "authenticated" role, calling tables and functions
// directly, so nothing in the app can hide a hole. Also checks that 0001/0002 keep working and that the rollback works.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const MIG = n => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8');
const ROLLBACK = fs.readFileSync(path.join(__dirname, '..', 'rollback', '0005_rollback.sql'), 'utf8');
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


/* 0001–0005 with: System Creator, an approved teacher (Tina), a second teacher (Tom), a pending teacher, an old parent */
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
  return { db, owner, tina, tom, pend, oldParent, fam };
}
const mkClass = (w, who, name, count, names) => as(w.db, who, 'select public.create_class($1, $2, $3) as r', [name, count || 0, names || null]).then(r => r[0].r);
const device = () => person(true);   // an anonymous Supabase user = one student device
const login = (w, dev, code, no, pin) => as(w.db, dev, 'select public.student_login($1, $2, $3) as r', [code, no, pin]).then(r => r[0].r);


const q1 = (w, who, sql, params) => as(w.db, who, sql, params).then(r => r[0] && r[0].r);
/* Tina's class with three students signed in on three devices; Tom has his own class with one student */
async function school() {
  const w = await world();
  const a = await mkClass(w, w.tina, 'Thai 1A', 0, ['Mali', 'Chaiyo', 'Pear']);
  const b = await mkClass(w, w.tom, 'Thai 2B', 0, ['Jasmin']);
  const dev = [device(), device(), device()], tomDev = device();
  for (let i = 0; i < 3; i++) await login(w, dev[i], a.code, i + 1, a.students[i].pin);
  await login(w, tomDev, b.code, 1, b.students[0].pin);
  const ids = (await as(w.db, w.tina, 'select id from public.students where class_id = $1 order by student_no', [a.class_id])).map(r => r.id);
  return Object.assign(w, { a, b, dev, tomDev, ids });
}
const newHw = (w, who, cls, extra) => q1(w, who, 'select public.create_assignment($1, $2, $3, $4, $5, $6, $7, $8) as r',
  [cls, 'Läxa 1', 'Skriv fem meningar med สระอะ', (extra && extra.due) || null, 'thr', 'thr-1', 10, extra && extra.resubmit === false ? false : true]);

test('H1: who may read teaching material: approved staff and signed-in students only', async () => {
  const w = await school();
  for (const who of [w.tina, w.owner, w.dev[0]]) assert.equal(await q1(w, who, 'select public.can_read_teaching() as r'), true);
  for (const who of [w.pend, w.oldParent, device()]) assert.equal(await q1(w, who, 'select public.can_read_teaching() as r'), false);
  assert.equal((await q1(w, w.dev[0], 'select public.teaching_access() as r')).kind, 'student');
  assert.equal((await q1(w, w.tina, 'select public.teaching_access() as r')).kind, 'staff');
  assert.equal((await q1(w, w.oldParent, 'select public.teaching_access() as r')).ok, false);
  await refused(as(w.db, 'anon', 'select public.teaching_access()'), /permission denied/);
  /* an archived student or class loses access at once */
  await as(w.db, w.tina, 'select public.set_student_archived($1, true)', [w.ids[2]]);
  assert.equal(await q1(w, w.dev[2], 'select public.can_read_teaching() as r'), false);
});

test('H2: protected course content: only classes.manage saves; staff and students read; nobody else, never the table', async () => {
  const w = await school();
  const doc = { lessons: [{ id: 'b42-1', title: { sv: 'Kapitel 1' } }] };
  await refused(q1(w, w.tina, "select public.save_course_content('book42', 'BOOK 42', $1) as r", [doc]), /not_allowed/);
  assert.equal((await q1(w, w.owner, "select public.save_course_content('book42', 'BOOK 42', $1) as r", [doc])).version, 1);
  assert.equal((await q1(w, w.owner, "select public.save_course_content('book42', 'BOOK 42', $1) as r", [doc])).version, 2);
  await refused(q1(w, w.owner, "select public.save_course_content('book42', 'x', $1) as r", [{ nope: 1 }]), /bad_document/);
  for (const who of [w.tina, w.tom, w.dev[1]]) assert.equal((await q1(w, who, "select public.get_course_content('book42') as r")).doc.lessons[0].id, 'b42-1');
  assert.equal((await q1(w, w.dev[1], 'select public.list_course_content() as r')).length, 1);
  for (const who of [w.pend, w.oldParent, device()]) await refused(q1(w, who, "select public.get_course_content('book42') as r"), /no_teaching_access/);
  for (const who of [w.tina, w.dev[0], w.owner]) await refused(as(w.db, who, 'select * from public.course_content'), /permission denied/);
  await refused(as(w.db, w.owner, "update public.course_content set title = 'x'"), /permission denied/);
});

test('H3: homework flow: create, hand in, ask for correction, hand in again, approve; history stays', async () => {
  const w = await school();
  const hw = (await newHw(w, w.tina, w.a.class_id)).id;
  /* Tom, a pending teacher, a parent and students cannot create homework in Tina's class */
  for (const who of [w.tom, w.pend, w.oldParent, w.dev[0]]) await refused(newHw(w, who, w.a.class_id), /not_allowed|not_a_student|not_signed_in/);
  const list = await q1(w, w.dev[0], 'select public.student_assignments() as r');
  assert.equal(list.length, 1); assert.equal(list[0].status, null);
  assert.equal((await q1(w, w.tomDev, 'select public.student_assignments() as r')).length, 0, "Tom's student sees nothing of Tina's class");
  await refused(q1(w, w.tomDev, 'select public.student_thread($1) as r', [hw]), /not_found/);
  await refused(q1(w, w.dev[0], "select public.student_submit($1, '  ') as r", [hw]), /empty/);
  assert.equal((await q1(w, w.dev[0], "select public.student_submit($1, 'มะลิ มาหา ยาย') as r", [hw])).version, 1);
  let sub = await q1(w, w.tina, 'select public.teacher_submissions($1) as r', [hw]);
  assert.deepEqual(sub.map(s => s.submission && s.submission.status), ['submitted', null, null]);
  assert.equal((await q1(w, w.tina, 'select public.teacher_assignments($1) as r', [w.a.class_id]))[0].pending, 1);
  await refused(q1(w, w.tom, 'select public.teacher_submissions($1) as r', [hw]), /not_allowed/);
  /* correction asked with a comment; the student answers and hands in version 2 */
  const s1 = sub[0].submission.id;
  await q1(w, w.tina, "select public.review_submission($1, 'returned', 6, 'Kolla stavningen av ยาย') as r", [s1]);
  await q1(w, w.dev[0], "select public.student_comment($1, 'Tack, jag rättar') as r", [hw]);
  assert.equal((await q1(w, w.dev[0], "select public.student_submit($1, 'มะลิ มาหา ยาย ทุก วัน') as r", [hw])).version, 2);
  await refused(q1(w, w.tina, "select public.review_submission($1, 'approved', 10) as r", [s1]), /not_latest_version/);
  sub = await q1(w, w.tina, 'select public.teacher_submissions($1) as r', [hw]);
  await q1(w, w.tina, "select public.review_submission($1, 'approved', 99, 'Mycket bra!') as r", [sub[0].submission.id]);
  const th = await q1(w, w.dev[0], 'select public.student_thread($1) as r', [hw]);
  assert.deepEqual(th.submissions.map(s => [s.version, s.status]), [[1, 'returned'], [2, 'approved']]);
  assert.equal(th.submissions[1].score, 10, 'score is capped at max_score');
  assert.deepEqual(th.messages.map(m => [m.kind, m.body]), [['teacher', 'Kolla stavningen av ยาย'], ['student', 'Tack, jag rättar'], ['teacher', 'Mycket bra!']]);
  await refused(q1(w, w.dev[0], "select public.student_submit($1, 'again') as r", [hw]), /already_approved/);
  /* nobody edits history, nobody reads the tables directly */
  for (const sql of ["update public.homework_messages set body = 'x'", 'delete from public.homework_messages', "update public.submissions set score = 0", 'select * from public.submissions', 'select * from public.assignments'])
    for (const who of [w.tina, w.dev[0]]) await refused(as(w.db, who, sql), /permission denied/);
  await refused(w.db.query("update public.homework_messages set body = 'x'"), /history_is_read_only/);   // not even the table owner
  /* other students in the class see only their own thread */
  const other = await q1(w, w.dev[1], 'select public.student_thread($1) as r', [hw]);
  assert.deepEqual([other.submissions.length, other.messages.length], [0, 0]);
});

test('H4: rules: no resubmit while waiting when not allowed; late flag; file paths only under the own student id', async () => {
  const w = await school();
  const hw = (await newHw(w, w.tina, w.a.class_id, { resubmit: false, due: '2000-01-01T00:00:00Z' })).id;
  const r1 = await q1(w, w.dev[1], "select public.student_submit($1, 'svar', $2, 'bild.png', 'image/png') as r", [hw, w.ids[1] + '/hw1/bild.png']);
  assert.equal(r1.version, 1);
  await refused(q1(w, w.dev[1], "select public.student_submit($1, 'igen') as r", [hw]), /waiting_for_review/);
  const sub = await q1(w, w.tina, 'select public.teacher_submissions($1) as r', [hw]);
  assert.deepEqual([sub[1].submission.late, sub[1].submission.has_file], [true, true]);
  await refused(q1(w, w.dev[0], "select public.student_submit($1, 'x', $2) as r", [hw, w.ids[1] + '/steal.png']), /bad_file_path/);
  await refused(q1(w, w.dev[0], "select public.student_submit($1, 'x', $2) as r", [hw, w.ids[0] + '/../' + w.ids[1] + '/a.png']), /bad_file_path/);
  /* storage helpers used by the bucket policies */
  assert.equal(await q1(w, w.dev[1], 'select public.can_read_submission_file($1) as r', [w.ids[1] + '/hw1/bild.png']), true);
  assert.equal(await q1(w, w.dev[0], 'select public.can_read_submission_file($1) as r', [w.ids[1] + '/hw1/bild.png']), false);
  assert.equal(await q1(w, w.tina, 'select public.can_read_submission_file($1) as r', [w.ids[1] + '/hw1/bild.png']), true);
  assert.equal(await q1(w, w.tom, 'select public.can_read_submission_file($1) as r', [w.ids[1] + '/hw1/bild.png']), false);
  assert.equal(await q1(w, w.dev[0], 'select public.can_upload_submission_file($1) as r', [w.ids[0] + '/a.pdf']), true);
  assert.equal(await q1(w, w.dev[0], 'select public.can_upload_submission_file($1) as r', [w.ids[1] + '/a.pdf']), false);
  assert.equal(await q1(w, w.tina, 'select public.can_upload_submission_file($1) as r', [w.ids[0] + '/a.pdf']), false);
  /* teacher comments only for students of the class; archived homework disappears for students */
  await refused(q1(w, w.tina, "select public.teacher_comment($1, $2, 'hej') as r", [hw, w.ids[0].replace(/.$/, '0')]), /not_found/);
  await q1(w, w.tina, 'select public.set_assignment_archived($1, true) as r', [hw]);
  assert.equal((await q1(w, w.dev[0], 'select public.student_assignments() as r')).length, 0);
  /* comment flood limit */
  const hw2 = (await newHw(w, w.tina, w.a.class_id)).id;
  for (let i = 0; i < 20; i++) await q1(w, w.dev[2], "select public.student_comment($1, 'hej') as r", [hw2]);
  await refused(q1(w, w.dev[2], "select public.student_comment($1, 'hej') as r", [hw2]), /too_many_messages/);
});

test('H5: rollback removes only 0005; classes, students and families keep working; 0005 applies again', async () => {
  const w = await school();
  await newHw(w, w.tina, w.a.class_id);
  await w.db.exec(ROLLBACK);
  assert.equal((await as(w.db, w.tina, 'select id from public.classes')).length, 1);
  assert.ok(await login(w, device(), w.a.code, 1, w.a.students[0].pin));
  await refused(as(w.db, w.tina, 'select public.teaching_access()'), /does not exist/);
  await w.db.exec(MIG('0005_homework_protected_content.sql'));
  assert.equal((await q1(w, w.tina, 'select public.teaching_access() as r')).ok, true);
});
