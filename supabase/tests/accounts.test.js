// Tests for supabase/migrations/0003_accounts_access_control.sql: accounts, approval, roles & permissions, invitations,
// System Creator, security log. Real PostgreSQL with the real "authenticated" role, calling tables and functions
// directly, so nothing in the app can hide a hole. Also checks that 0001/0002 keep working and that the rollback works.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const MIG = n => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8');
const ROLLBACK = fs.readFileSync(path.join(__dirname, '..', 'rollback', '0003_rollback.sql'), 'utf8');
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

/* a family created before 0003 (parent + member), then 0003 is applied; the System Creator is set from the SQL Editor */
async function world() {
  const db = new PGlite();
  await db.exec(STANDIN); await db.exec(MIG('0001_family_hub_security.sql')); await db.exec(MIG('0002_points_rewards_learning.sql'));
  const oldParent = person(), oldMember = person(), owner = person();
  const fam = one(await as(db, oldParent, "select public.create_family('Old family')"));
  await as(db, oldParent, 'select public.set_member_role($1, $2, $3)', [fam, oldMember.id, 'member']);
  await db.exec(MIG('0003_accounts_access_control.sql'));
  await db.query("insert into auth.users (id, email) values ($1, 'ken@example.com')", [owner.id]);
  await db.query("select private.set_system_owner('Ken@Example.com')");
  return { db, owner, oldParent, oldMember, fam };
}

test('A1: existing family adults keep access as approved parents; nobody else is approved; anon gets nothing', async () => {
  const w = await world();
  assert.deepEqual([(await me(w.db, w.oldParent)).status, (await me(w.db, w.oldParent)).role], ['approved', 'parent']);
  assert.equal((await me(w.db, w.oldMember)).approved, true);
  const stranger = person();
  assert.deepEqual(await me(w.db, stranger), { signed_in: true, guest: false, status: 'none', approved: false });
  assert.equal((await me(w.db, person(true))).approved, false);
  await refused(as(w.db, 'anon', 'select * from public.app_accounts'), /permission denied/);
  await refused(as(w.db, 'anon', 'select public.my_account()'), /permission denied/);
  /* 0001/0002 still work after 0003 */
  const kid = one(await as(w.db, w.oldParent, "select public.create_child_profile($1, 'Mia', '🦊')", [w.fam]));
  assert.ok(kid);
  assert.equal(one(await as(w.db, w.oldParent, 'select public.point_balance($1)', [kid])), 0);
});

test('A2: System Creator has every permission, is set only from the SQL Editor and can be moved there', async () => {
  const w = await world();
  const o = await me(w.db, w.owner);
  assert.deepEqual([o.role, o.status, o.system_owner], ['super_admin', 'approved', true]);
  assert.equal(o.permissions.length, 14);
  /* the API cannot call it */
  await refused(as(w.db, w.oldParent, "select private.set_system_owner('ken@example.com')"), /permission denied/);
  /* hand-over: the new owner takes over, the old one becomes an Admin without permissions; still exactly one owner */
  const next = person(); await w.db.query("insert into auth.users (id, email) values ($1, 'next@example.com')", [next.id]);
  await w.db.query("select private.set_system_owner('next@example.com')");
  assert.equal((await me(w.db, next)).role, 'super_admin');
  const old = await me(w.db, w.owner);
  assert.deepEqual([old.role, old.system_owner, old.permissions], ['admin', false, []]);
  assert.equal(one((await w.db.query('select count(*)::int from private.system_owner')).rows), 1);
  await assert.rejects(w.db.query("select private.set_system_owner('nobody@example.com')"), /create the account in the app first/);
});

test('A3: "Create account" is pending; pending users have no rights; Admin approval works within permissions', async () => {
  const w = await world();
  const ann = person();
  assert.deepEqual(await as(w.db, ann, "select public.request_access('Ann', 'th', 'parent', 'Mamma till Mia') as r").then(r => r[0].r), { ok: true, status: 'pending' });
  assert.equal((await me(w.db, ann)).status, 'pending');
  assert.equal(await as(w.db, ann, 'select public.is_approved() as r').then(r => r[0].r), false);
  assert.equal((await as(w.db, ann, 'select * from public.app_accounts')).length, 1);           // only herself
  await refused(as(w.db, ann, 'select public.decide_account($1, true)', [ann.id]), /not_allowed/);
  await refused(as(w.db, person(true), "select public.request_access('Guest', 'sv', 'parent')"), /permanent_account_required/);
  /* asking twice does not create a second account */
  assert.equal((await as(w.db, ann, "select public.request_access('Ann', 'th', 'parent') as r"))[0].r.error, 'already_exists');
  /* an Admin who may approve families, invited by the owner */
  const inv = await invite(w.db, w.owner, 'admin', ['users.view', 'users.approve', 'families.manage']);
  const adm = person();
  assert.deepEqual(await accept(w.db, adm, inv.token, 'Admin Ada'), { ok: true, role: 'admin' });
  assert.equal(await can(w.db, adm, 'users.approve'), true);
  assert.equal(await can(w.db, adm, 'teachers.manage'), false);
  assert.ok((await as(w.db, adm, 'select * from public.app_accounts')).length >= 4);         // users.view
  /* may not approve Ann as a teacher (no teachers.manage), may approve her as a parent */
  await refused(as(w.db, adm, "select public.decide_account($1, true, 'teacher')", [ann.id]), /not_allowed/);
  await refused(as(w.db, adm, "select public.decide_account($1, true, 'admin')", [ann.id]), /use_an_admin_invitation/);
  await as(w.db, adm, 'select public.decide_account($1, true)', [ann.id]);
  assert.deepEqual([(await me(w.db, ann)).status, (await me(w.db, ann)).role], ['approved', 'parent']);
  await refused(as(w.db, adm, 'select public.decide_account($1, true)', [ann.id]), /not_pending/);
  /* rejected → may ask again only after 24 hours */
  const bob = person(); await as(w.db, bob, "select public.request_access('Bob', 'sv', 'user')");
  await as(w.db, adm, 'select public.decide_account($1, false)', [bob.id]).catch(() => {});
  /* adm lacks users.create, but rejecting needs only users.approve */
  assert.equal((await me(w.db, bob)).status, 'rejected');
  assert.equal((await as(w.db, bob, "select public.request_access('Bob', 'sv', 'user') as r"))[0].r.error, 'try_again_later');
  await w.db.query("update public.app_accounts set decided_at = now() - interval '25 hours' where user_id = $1", [bob.id]);
  assert.equal((await as(w.db, bob, "select public.request_access('Bob', 'sv', 'user') as r"))[0].r.status, 'pending');
});

test('A4: nobody can raise their own rights; Admins cannot touch the owner, other Admins or themselves', async () => {
  const w = await world();
  const inv = await invite(w.db, w.owner, 'admin', ['users.view', 'users.edit', 'users.suspend', 'users.approve', 'families.manage']);
  const adm = person(); await accept(w.db, adm, inv.token, 'Ada');
  const inv2 = await invite(w.db, w.owner, 'admin', ['users.view']);
  const adm2 = person(); await accept(w.db, adm2, inv2.token, 'Bea');
  for (const sql of [
    "update public.app_accounts set role = 'super_admin'", "update public.app_accounts set status = 'approved'",
    "insert into public.admin_permissions (user_id, permission, granted_by) values (auth.uid(), 'security.manage', auth.uid())",
    "insert into public.app_accounts (user_id, display_name, role, status) values (gen_random_uuid(), 'x', 'admin', 'approved')",
    'delete from public.account_audit', "insert into public.account_audit (action) values ('fake')", 'select token_hash from public.invitations'
  ]) await refused(as(w.db, adm, sql), /permission denied/);
  await refused(as(w.db, adm, "select public.set_admin_permissions($1, array['security.manage'])", [adm.id]), /not_allowed/);
  await refused(as(w.db, adm, "select public.set_account_role($1, 'admin')", [w.oldParent.id]), /not_allowed/);
  await refused(as(w.db, adm, "select public.create_invitation('admin', 7, array['users.view'])"), /not_allowed/);
  await refused(as(w.db, adm, "select public.set_account_status($1, 'suspended')", [w.owner.id]), /not_allowed/);
  await refused(as(w.db, adm, "select public.set_account_status($1, 'suspended')", [adm2.id]), /not_allowed/);
  await refused(as(w.db, adm, "select public.set_account_status($1, 'suspended')", [adm.id]), /not_on_yourself/);
  await refused(as(w.db, adm, "select public.set_account_role($1, 'super_admin')", [w.oldParent.id]), /use_set_system_owner/);
  /* the owner cannot be demoted or suspended through the API, not even by themselves */
  await refused(as(w.db, w.owner, "select public.set_account_status($1, 'suspended')", [w.owner.id]), /not_on_yourself/);
  /* the owner grants exactly the listed permissions; admins.manage can never be granted */
  await refused(as(w.db, w.owner, "select public.set_admin_permissions($1, array['admins.manage'])", [adm2.id]), /bad_permission/);
  await as(w.db, w.owner, "select public.set_admin_permissions($1, array['reports.view'])", [adm2.id]);
  assert.deepEqual((await me(w.db, adm2)).permissions, ['reports.view']);
  /* an Admin with users.edit + families.manage may change a parent to a user? only with users.create → refused; to parent is allowed */
  await refused(as(w.db, adm, "select public.set_account_role($1, 'teacher')", [w.oldParent.id]), /not_allowed/);
});

test('A5: invitations are single use, expire, can be revoked, and guessing is rate limited', async () => {
  const w = await world();
  const t1 = await invite(w.db, w.owner, 'teacher');
  assert.equal(t1.token.length, 64);
  const tina = person();
  assert.deepEqual(await accept(w.db, tina, t1.token, 'Tina'), { ok: true, role: 'teacher' });
  assert.deepEqual([(await me(w.db, tina)).role, (await me(w.db, tina)).status], ['teacher', 'approved']);
  assert.equal((await accept(w.db, person(), t1.token)).error, 'used');
  const t2 = await invite(w.db, w.owner, 'parent', [], 1);
  await w.db.query("update public.invitations set expires_at = now() - interval '1 minute' where id = $1", [t2.id]);
  assert.equal((await accept(w.db, person(), t2.token)).error, 'expired');
  const t3 = await invite(w.db, w.owner, 'student');
  await as(w.db, w.owner, 'select public.revoke_invitation($1)', [t3.id]);
  assert.equal((await accept(w.db, person(), t3.token)).error, 'revoked');
  await refused(as(w.db, w.owner, "select public.create_invitation('super_admin')"), /not_allowed/);
  await refused(as(w.db, w.owner, "select public.create_invitation('parent', 90)"), /days_1_to_30/);
  /* a teacher or parent may not invite anyone */
  await refused(as(w.db, tina, "select public.create_invitation('student')"), /not_allowed/);
  await refused(as(w.db, w.oldParent, "select public.create_invitation('parent')"), /not_allowed/);
  /* guessing: 5 wrong tokens, then the right one is refused too until 15 minutes have passed */
  const t4 = await invite(w.db, w.owner, 'parent');
  const guesser = person();
  for (let i = 0; i < 5; i++) assert.equal((await accept(w.db, guesser, 'x'.repeat(64))).error, 'invalid');
  assert.equal((await accept(w.db, guesser, t4.token)).error, 'too_many_attempts');
  await w.db.query("update private.invite_attempts set at = now() - interval '16 minutes' where user_id = $1", [guesser.id]);
  assert.equal((await accept(w.db, guesser, t4.token)).ok, true);
  /* guests (anonymous) cannot use invitations */
  await refused(accept(w.db, person(true), (await invite(w.db, w.owner, 'parent')).token), /permanent_account_required/);
});

test('A6: suspending takes rights away at once; suspended accounts cannot use invitations; re-activation', async () => {
  const w = await world();
  const inv = await invite(w.db, w.owner, 'admin', ['users.view', 'users.approve', 'families.manage']);
  const adm = person(); await accept(w.db, adm, inv.token, 'Ada');
  assert.equal(await can(w.db, adm, 'users.view'), true);
  await as(w.db, w.owner, "select public.set_account_status($1, 'suspended', 'test')", [adm.id]);
  assert.equal(await can(w.db, adm, 'users.view'), false);
  assert.equal((await as(w.db, adm, 'select * from public.app_accounts')).length, 1);      // only itself
  assert.deepEqual((await me(w.db, adm)).permissions, []);
  assert.equal((await accept(w.db, adm, (await invite(w.db, w.owner, 'parent')).token)).error, 'account_blocked');
  await as(w.db, w.owner, "select public.set_account_status($1, 'approved')", [adm.id]);
  assert.equal(await can(w.db, adm, 'users.view'), true);
  /* pending accounts are approved through decide_account, not by changing the status */
  const p = person(); await as(w.db, p, "select public.request_access('P', 'sv', 'parent')");
  await refused(as(w.db, w.owner, "select public.set_account_status($1, 'approved')", [p.id]), /use_decide_account/);
});

test('A7: the security log records every change, only security.manage can read it, nobody can change it', async () => {
  const w = await world();
  const p = person(); await as(w.db, p, "select public.request_access('P', 'sv', 'parent')");
  await as(w.db, w.owner, 'select public.decide_account($1, true)', [p.id]);
  await as(w.db, w.owner, "select public.set_account_status($1, 'suspended')", [p.id]);
  await as(w.db, p, 'select public.record_login()');
  const actions = (await as(w.db, w.owner, 'select action from public.account_audit order by id')).map(r => r.action);
  for (const a of ['account_created_from_family', 'system_owner_set', 'access_requested', 'account_approved', 'account_status_suspended', 'login']) assert.ok(actions.includes(a), a);
  assert.equal((await as(w.db, p, 'select * from public.account_audit')).length, 0);
  assert.equal((await as(w.db, w.oldParent, 'select * from public.account_audit')).length, 0);
  /* not even the database owner (and so no SECURITY DEFINER function) can edit or delete it */
  await assert.rejects(w.db.query('update public.account_audit set action = $1', ['x']), /append_only/);
  await assert.rejects(w.db.query('delete from public.account_audit'), /append_only/);
  /* nothing secret in the log */
  const t = await invite(w.db, w.owner, 'parent');
  const raw = JSON.stringify(await as(w.db, w.owner, 'select * from public.account_audit'));
  assert.ok(!raw.includes(t.token));
});

test('A8: rollback removes only 0003; families, profiles and points keep working', async () => {
  const w = await world();
  await w.db.exec(ROLLBACK);
  assert.equal(one((await w.db.query("select to_regclass('public.app_accounts')")).rows), null);
  assert.equal(one((await w.db.query("select to_regclass('public.account_audit')")).rows), null);
  const kid = one(await as(w.db, w.oldParent, "select public.create_child_profile($1, 'Leo', '🐼')", [w.fam]));
  assert.ok(kid);
  assert.equal(one(await as(w.db, w.oldParent, 'select count(*)::int from public.families')), 1);
  /* and 0003 can be applied again afterwards */
  await w.db.exec(MIG('0003_accounts_access_control.sql'));
  assert.equal((await me(w.db, w.oldParent)).status, 'approved');
});
