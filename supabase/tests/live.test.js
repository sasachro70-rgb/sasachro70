// Tests for supabase/migrations/0008_live_classroom.sql: classroom dashboard, announcements, schedule and live lessons (Phase G). Real PostgreSQL with the real "authenticated" role, calling tables and functions
// directly, so nothing in the app can hide a hole. Also checks that 0001/0002 keep working and that the rollback works.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const MIG = n => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8');
const ROLLBACK = fs.readFileSync(path.join(__dirname, '..', 'rollback', '0008_rollback.sql'), 'utf8');
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
  await db.exec(MIG('0008_live_classroom.sql'));
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
  return Object.assign(w, { a, b, dev, tomDev });
}
const EX = { type: 'mc', prompt: 'สี', q: 'Vad betyder ordet?', opts: [{ v: 'มะลิ', text: 'jasmin' }, { v: 'สี', text: 'färg' }] };
const start = w => q1(w, w.tina, "select public.live_start($1, 'thr', 'thr-1', 'Kapitel 1', 6) as r", [w.a.class_id]);
const ctl = (w, who, sid, action, step, ex, ans, audio) => q1(w, who, 'select public.live_control($1, $2, $3, $4, $5, $6) as r', [sid, action, step ?? null, ex ? JSON.stringify(ex) : null, ans ?? null, audio ?? null]);
const sstate = (w, d) => q1(w, d, 'select public.live_student_state() as r');
const tstate = (w, sid) => q1(w, w.tina, 'select public.live_teacher_state($1) as r', [sid]);

test('G1 announcements and schedule: only the class teacher writes; students of the class read; others see nothing', async () => {
  const w = await school();
  await q1(w, w.tina, "select public.class_announce($1, 'Ta med pennor i morgon', true) as r", [w.a.class_id]);
  await q1(w, w.tina, "select public.class_schedule_add($1, now() + interval '1 day', 45, 'Kapitel 2', 'thr', 'thr-2', null) as r", [w.a.class_id]);
  await refused(as(w.db, w.tom, "select public.class_announce($1, 'x')", [w.a.class_id]), /not_allowed/);
  await refused(as(w.db, w.dev[0], "select public.class_announce($1, 'x')", [w.a.class_id]), /not_allowed/);
  await refused(as(w.db, w.tom, "select public.class_schedule_add($1, now(), 45, 'x')", [w.a.class_id]), /not_allowed/);
  const c = await q1(w, w.dev[1], 'select public.student_classroom() as r');
  assert.equal(c.class_name, 'Thai 1A'); assert.equal(c.teacher_name, 'Tina');
  assert.equal(c.announcements[0].body, 'Ta med pennor i morgon'); assert.equal(c.schedule[0].title, 'Kapitel 2'); assert.equal(c.live, null);
  const other = await q1(w, w.tomDev, 'select public.student_classroom() as r');
  assert.deepEqual([other.announcements.length, other.schedule.length], [0, 0]);
  await refused(as(w.db, person(), 'select public.student_classroom()'), /not_a_student/);
  await refused(as(w.db, 'anon', 'select public.student_classroom()'));
  for (const tbl of ['class_announcements', 'class_schedule', 'live_messages', 'live_exercise_keys', 'live_presence'])
    await refused(as(w.db, w.dev[0], 'select * from public.' + tbl), /permission denied/);
  await refused(as(w.db, w.tina, "insert into public.class_announcements (class_id, author_id, author_name, body) values ($1, $2, 'x', 'y')", [w.a.class_id, w.tina.id]), /permission denied/);
  const t = await q1(w, w.tina, 'select public.teacher_classroom($1) as r', [w.a.class_id]);
  assert.equal(t.announcements.length, 1); assert.equal(t.schedule.length, 1);
  await q1(w, w.tina, 'select public.class_announcement_archive($1) as r', [t.announcements[0].id]);
  await q1(w, w.tina, 'select public.class_schedule_delete($1) as r', [t.schedule[0].id]);
  const t2 = await q1(w, w.tina, 'select public.teacher_classroom($1) as r', [w.a.class_id]);
  assert.deepEqual([t2.announcements.length, t2.schedule.length], [0, 0]);
});

test('G2 live lesson: one open lesson per class; only its teacher controls it; students follow step, pause, audio and end', async () => {
  const w = await school();
  const s = await start(w);
  assert.equal((await start(w)).already_open, true);   // starting again returns the open one
  await refused(as(w.db, w.tom, "select public.live_control($1, 'step', 1)", [s.id]), /not_allowed/);
  await refused(as(w.db, w.dev[0], "select public.live_control($1, 'step', 1)", [s.id]), /not_allowed/);
  await refused(as(w.db, w.tom, 'select public.live_teacher_state($1)', [s.id]), /not_allowed/);
  let st = await sstate(w, w.dev[0]);
  assert.deepEqual([st.session.status, st.session.step, st.session.title], ['live', 0, 'Kapitel 1']);
  assert.equal((await sstate(w, w.tomDev)).session, null);   // another class sees no live lesson
  await ctl(w, w.tina, s.id, 'step', 3);
  await refused(ctl(w, w.tina, s.id, 'step', 6), /bad_step/);
  await ctl(w, w.tina, s.id, 'audio', null, null, null, 'ตามาหายาย');
  st = await sstate(w, w.dev[1]);
  assert.deepEqual([st.session.step, st.session.audio_text, st.session.audio_seq], [3, 'ตามาหายาย', 1]);
  await ctl(w, w.tina, s.id, 'pause');
  assert.equal((await sstate(w, w.dev[0])).session.status, 'paused');
  await ctl(w, w.tina, s.id, 'resume');
  const t = await tstate(w, s.id);
  assert.deepEqual(t.students.map(x => [x.name, x.here]), [['Mali', true], ['Chaiyo', true], ['Pear', false]]);   // Pear has not opened it
  const rev = (await sstate(w, w.dev[0])).session.rev;
  await ctl(w, w.tina, s.id, 'end');
  st = await sstate(w, w.dev[0]);
  assert.equal(st.session.status, 'ended'); assert.ok(st.session.rev > rev);
  await refused(ctl(w, w.tina, s.id, 'step', 1), /ended/);
  const s2 = await start(w);   // a new lesson can start after the old one ended
  assert.notEqual(s2.id, s.id); assert.equal(s2.already_open, undefined);
  const tc = await q1(w, w.tina, 'select public.teacher_classroom($1) as r', [w.a.class_id]);
  assert.equal(tc.live.id, s2.id); assert.equal(tc.recent[0].id, s.id); assert.equal(tc.recent[0].students, 2);
});

test('G3 exercise on screen: the answer key never reaches students before it is shown; answers are checked by the database', async () => {
  const w = await school();
  const s = await start(w);
  await ctl(w, w.tina, s.id, 'exercise', null, Object.assign({ answer: 'สี' }, EX), 'สี');
  let st = await sstate(w, w.dev[0]);
  assert.equal(st.session.exercise.seq, 1); assert.equal(st.session.exercise.answer, undefined);   // a key passed inside the exercise is removed
  assert.equal(JSON.stringify(st).includes('"สี"') && JSON.stringify(st.session.exercise.opts).includes('สี'), true);
  // the live_sessions row students may read directly (for Realtime) holds no key either
  const row = await as(w.db, w.dev[0], 'select * from public.live_sessions');
  assert.equal(row.length, 1); assert.equal(row[0].exercise.answer, undefined);
  assert.equal((await as(w.db, w.tomDev, 'select * from public.live_sessions')).length, 0);
  await refused(as(w.db, w.dev[0], "select public.live_student_answer(2, 'สี')"), /not_current/);
  await q1(w, w.dev[0], "select public.live_student_answer(1, 'มะลิ') as r");
  await q1(w, w.dev[0], "select public.live_student_answer(1, 'สี') as r");   // changed the answer
  await q1(w, w.dev[1], "select public.live_student_answer(1, 'มะลิ') as r");
  st = await sstate(w, w.dev[0]);
  assert.deepEqual(st.mine, { seq: 1, choice: 'สี', ok: null });   // right or wrong is hidden until shown
  const t = await tstate(w, s.id);
  assert.equal(t.key, 'สี');
  assert.deepEqual(t.students.map(x => x.current && [x.current.choice, x.current.ok]), [['สี', true], ['มะลิ', false], null]);
  assert.equal(t.messages.length, 0);   // answers are not listed as messages
  await refused(as(w.db, w.tomDev, "select public.live_student_answer(1, 'สี')"), /no_live_lesson/);
  await ctl(w, w.tina, s.id, 'reveal');
  st = await sstate(w, w.dev[1]);
  assert.equal(st.session.exercise.answer, 'สี'); assert.deepEqual(st.mine, { seq: 1, choice: 'มะลิ', ok: false });
  await refused(as(w.db, w.dev[2], "select public.live_student_answer(1, 'สี')"), /already_revealed/);
  await ctl(w, w.tina, s.id, 'pause');
  await ctl(w, w.tina, s.id, 'exercise', null, EX, 'มะลิ');
  await refused(as(w.db, w.dev[2], "select public.live_student_answer(2, 'มะลิ')"), /paused/);
  await refused(ctl(w, w.tina, s.id, 'exercise', null, EX, null), /bad_answer/);
  await refused(ctl(w, w.tina, s.id, 'bogus'), /bad_action/);
});

test('G4 questions, comments and private notes: who sees what', async () => {
  const w = await school();
  const s = await start(w);
  await q1(w, w.dev[0], "select public.live_student_post('question', 'Vad betyder ยาย?') as r");
  await q1(w, w.dev[1], "select public.live_student_post('comment', 'Jag hör bra!') as r");
  await q1(w, w.tina, "select public.live_teacher_post($1, 'note', 'Chaiyo behöver hjälp med tonerna') as r", [s.id]);
  await q1(w, w.tina, "select public.live_teacher_post($1, 'comment', 'Bra jobbat alla') as r", [s.id]);
  await refused(as(w.db, w.dev[0], "select public.live_student_post('note', 'x')"), /bad_kind/);
  await refused(as(w.db, w.tom, "select public.live_teacher_post($1, 'note', 'x')", [s.id]), /not_allowed/);
  const kinds = st => st.messages.map(m => m.kind + ':' + (m.body || '')).join(' | ');
  let a = await sstate(w, w.dev[0]), b = await sstate(w, w.dev[1]);
  assert.equal(kinds(a), 'question:Vad betyder ยาย? | comment:Jag hör bra! | comment:Bra jobbat alla');   // own question, comments; never the note
  assert.equal(kinds(b), 'comment:Jag hör bra! | comment:Bra jobbat alla');                             // not another student's open question
  const t = await tstate(w, s.id);
  assert.equal(t.messages.length, 4);
  const qid = t.messages.find(m => m.kind === 'question').id;
  await refused(as(w.db, w.dev[0], "select public.live_reply($1, 'x')", [qid]), /not_allowed/);
  await q1(w, w.tina, "select public.live_reply($1, 'mormor') as r", [qid]);
  b = await sstate(w, w.dev[1]);
  assert.ok(b.messages.some(m => m.kind === 'question' && m.reply === 'mormor' && m.mine === false));   // answered questions are shown to all
  assert.equal(t.students.find(x => x.name === 'Mali').posts, 1);
  for (let i = 0; i < 15; i++) await q1(w, w.dev[2], "select public.live_student_post('comment', 'hej') as r");
  await refused(as(w.db, w.dev[2], "select public.live_student_post('comment', 'hej')"), /too_many_messages/);
  await refused(as(w.db, w.dev[0], "insert into public.live_messages (session_id, kind, author_kind, author_name, body) values ($1, 'note', 'teacher', 'x', 'y')", [s.id]), /permission denied/);
  await refused(as(w.db, w.dev[0], 'update public.live_sessions set step = 5'), /permission denied/);
  await refused(as(w.db, w.tina, 'delete from public.live_sessions'), /permission denied/);
});

test('G5 rollback removes everything and can be applied again; 0001–0005 keep working', async () => {
  const w = await school();
  await start(w);
  await w.db.exec(ROLLBACK);
  const r = await w.db.query("select to_regclass('public.live_sessions') as a, to_regclass('public.class_schedule') as b, to_regproc('public.live_start') as c");
  assert.deepEqual([r.rows[0].a, r.rows[0].b, r.rows[0].c], [null, null, null]);
  assert.ok((await q1(w, w.dev[0], 'select public.student_assignments() as r')));
  await w.db.exec(MIG('0008_live_classroom.sql'));
  assert.ok((await start(w)).id);
});
