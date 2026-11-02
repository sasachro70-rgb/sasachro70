// Tests for supabase/migrations/0009_teacher_permissions.sql: extra rights for teachers given in the Admin Panel. Real PostgreSQL with the real "authenticated" role, calling tables and functions
// directly, so nothing in the app can hide a hole. Also checks that 0001/0002 keep working and that the rollback works.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const MIG = n => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8');
const ROLLBACK = fs.readFileSync(path.join(__dirname, '..', 'rollback', '0009_rollback.sql'), 'utf8');
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
  await db.exec(MIG('0006_content_manager.sql'));
  await db.exec(MIG('0009_teacher_permissions.sql'));
  return { db, owner, tina, tom, pend, oldParent, fam };
}
const mkClass = (w, who, name, count, names) => as(w.db, who, 'select public.create_class($1, $2, $3) as r', [name, count || 0, names || null]).then(r => r[0].r);
const device = () => person(true);   // an anonymous Supabase user = one student device
const login = (w, dev, code, no, pin) => as(w.db, dev, 'select public.student_login($1, $2, $3) as r', [code, no, pin]).then(r => r[0].r);


const q1 = (w, who, sql, params) => as(w.db, who, sql, params).then(r => r[0] && r[0].r);
const grant = (w, who, user, perms) => as(w.db, who, 'select public.set_teacher_permissions($1, $2)', [user.id, perms]);
async function school() {
  const w = await world();
  const a = await mkClass(w, w.tina, 'Thai 1A', 0, ['Mali', 'Chaiyo']);
  const b = await mkClass(w, w.tom, 'Thai 2B', 0, ['Jasmin']);
  const tomStudent = (await w.db.query('select id from public.students where class_id = $1', [b.class_id])).rows[0].id;
  return Object.assign(w, { a, b, tomStudent });
}
const classNames = (w, who) => as(w.db, who, 'select name from public.classes order by name').then(r => r.map(x => x.name).join(','));

test('P1 classes.manage for a teacher: every class and its students; the right shows in my_account', async () => {
  const w = await school();
  assert.equal(await classNames(w, w.tina), 'Thai 1A');
  await refused(as(w.db, w.tina, "select public.rename_student($1, 'Jasmine')", [w.tomStudent]), /not_allowed/);
  await grant(w, w.owner, w.tina, ['classes.manage']);
  assert.equal(await classNames(w, w.tina), 'Thai 1A,Thai 2B');
  await as(w.db, w.tina, "select public.rename_student($1, 'Jasmine')", [w.tomStudent]);
  assert.equal((await w.db.query('select display_name from public.students where id = $1', [w.tomStudent])).rows[0].display_name, 'Jasmine');
  assert.deepEqual((await me(w.db, w.tina)).permissions, ['classes.manage']);
  assert.equal(await classNames(w, w.tom), 'Thai 2B');   // Tom has no extra right
  const log = await w.db.query("select action, details from public.account_audit where action = 'teacher_permissions_set'");
  assert.equal(log.rows.length, 1); assert.deepEqual(log.rows[0].details.to, ['classes.manage']);
});

test('P2 curriculum.manage: every course in the Content Manager, but not other teachers\' classes', async () => {
  const w = await school();
  const canEdit = (who, id) => as(w.db, who, 'select public.can_edit_course($1) as r', [id]).then(r => r[0].r);
  assert.equal(await canEdit(w.tina, 'book42'), false);
  await grant(w, w.owner, w.tina, ['curriculum.manage']);
  assert.equal(await canEdit(w.tina, 'book42'), true);
  assert.equal(await canEdit(w.tom, 'book42'), false);
  assert.equal(await classNames(w, w.tina), 'Thai 1A');
  await grant(w, w.owner, w.tina, []);   // taken away again
  assert.equal(await canEdit(w.tina, 'book42'), false);
  assert.deepEqual((await me(w.db, w.tina)).permissions, []);
});

test('P3 who may give what: only the two teacher rights, only to teachers, only by the System Creator or an Admin who holds them', async () => {
  const w = await school();
  await refused(grant(w, w.owner, w.tina, ['users.view']), /bad_permission/);
  await refused(grant(w, w.owner, w.tina, ['admins.manage']), /bad_permission/);
  await refused(grant(w, w.owner, w.oldParent, ['classes.manage']), /not_a_teacher/);
  await refused(grant(w, w.tina, w.tina, ['classes.manage']), /not_allowed/);    // a teacher cannot give himself rights
  await refused(grant(w, w.tina, w.tom, ['curriculum.manage']), /not_allowed/);
  await refused(grant(w, 'anon', w.tom, []));
  const adm = person(); await accept(w.db, adm, (await invite(w.db, w.owner, 'admin', ['teachers.manage', 'curriculum.manage'])).token, 'Adam');
  await grant(w, adm, w.tom, ['curriculum.manage']);                             // holds it: allowed
  await refused(grant(w, adm, w.tom, ['curriculum.manage', 'classes.manage']), /not_allowed/);   // does not hold classes.manage
  await grant(w, w.owner, w.tom, ['curriculum.manage', 'classes.manage']);
  await refused(grant(w, adm, w.tom, ['curriculum.manage']), /not_allowed/);    // cannot take away what he does not hold
  const adm2 = person(); await accept(w.db, adm2, (await invite(w.db, w.owner, 'admin', ['users.view'])).token, 'Eva');
  await refused(grant(w, adm2, w.tom, []), /not_allowed/);                      // no teachers.manage
  await refused(as(w.db, w.tina, "insert into public.admin_permissions (user_id, permission, granted_by) values ($1, 'classes.manage', $1)", [w.tina.id]));
});

test('P4 a teacher never gets Admin rights, even with a stray row; a role change removes the extra rights', async () => {
  const w = await school();
  await w.db.query("insert into public.admin_permissions (user_id, permission, granted_by) values ($1, 'users.view', $2), ($1, 'classes.manage', $2)", [w.tina.id, w.owner.id]);
  assert.equal(await can(w.db, w.tina, 'users.view'), false);
  assert.equal(await can(w.db, w.tina, 'classes.manage'), true);
  assert.equal((await as(w.db, w.tina, 'select * from public.app_accounts')).length, 1);   // still only her own account
  await as(w.db, w.owner, "select public.set_account_role($1, 'parent')", [w.tina.id]);
  assert.equal((await w.db.query('select count(*)::int as n from public.admin_permissions where user_id = $1', [w.tina.id])).rows[0].n, 0);
  assert.equal(await can(w.db, w.tina, 'classes.manage'), false);
});

test('P5 rollback restores the earlier rules and can be applied again', async () => {
  const w = await school();
  await grant(w, w.owner, w.tina, ['classes.manage']);
  await w.db.exec(ROLLBACK);
  assert.equal(await classNames(w, w.tina), 'Thai 1A');
  assert.equal((await w.db.query("select to_regclass('public.teacher_grantable') as t")).rows[0].t, null);
  assert.ok((await me(w.db, w.owner)).permissions.length > 5);
  await w.db.exec(MIG('0009_teacher_permissions.sql'));
  await grant(w, w.owner, w.tina, ['classes.manage']);
  assert.equal(await classNames(w, w.tina), 'Thai 1A,Thai 2B');
});
