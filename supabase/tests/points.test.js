// Tests for supabase/migrations/0002_points_rewards_learning.sql: points ledger, rewards, redemptions, parent PIN,
// learning state. Same approach as security.test.js: real PostgreSQL (PGlite) with the real "authenticated" role,
// calling tables and functions directly, so nothing in the app can hide a hole.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const MIG = n => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8');
const SUPABASE_STANDIN = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
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
const sys = (db, sql, params) => db.query(sql, params);

/* family A: owner, manager, member (e.g. the account a child's tablet is signed in with), two children, an adult;
   family B: owner and a child; a guest */
async function world() {
  const db = new PGlite();
  await db.exec(SUPABASE_STANDIN); await db.exec(MIG('0001_family_hub_security.sql')); await db.exec(MIG('0002_points_rewards_learning.sql'));
  const ownerA = person(), managerA = person(), memberA = person(), ownerB = person(), guest = person(true);
  const famA = one(await as(db, ownerA, "select public.create_family('A')"));
  const famB = one(await as(db, ownerB, "select public.create_family('B')"));
  await as(db, ownerA, 'select public.set_member_role($1, $2, $3)', [famA, managerA.id, 'manager']);
  await as(db, ownerA, 'select public.set_member_role($1, $2, $3)', [famA, memberA.id, 'member']);
  const mia = one(await as(db, ownerA, "select public.create_child_profile($1, 'Mia', '🦊')", [famA]));
  const leo = one(await as(db, ownerA, "select public.create_child_profile($1, 'Leo', '🐼')", [famA]));
  const mum = one(await as(db, ownerA, "select public.create_child_profile($1, 'Mum', '👩')", [famA]));
  await as(db, ownerA, "select public.save_profile_settings($1, 'adult', 40, 0, 15, 0.9)", [mum]);
  await as(db, ownerA, "select public.save_profile_settings($1, 'child', 7, 0, 0, 0.9)", [mia]);
  const kidB = one(await as(db, ownerB, "select public.create_child_profile($1, 'Kim', '🐸')", [famB]));
  await as(db, ownerA, "select public.set_parent_pin($1, '2468')", [famA]);
  return { db, ownerA, managerA, memberA, ownerB, guest, famA, famB, mia, leo, mum, kidB };
}
const unlockTry = (w, who, pin) => as(w.db, who || w.ownerA, 'select public.unlock_parent($1, $2) as r', [w.famA, pin || '2468']).then(r => r[0].r);
const unlock = async (w, who) => { const r = await unlockTry(w, who); if (!r.ok) throw new Error(r.error); return r; };
const finish = (w, who, profile, key, kind, meta, unit) => as(w.db, who, 'select public.finish_activity($1, $2, $3, $4, $5, $6, $7, $8) as r',
  [profile, 'key-' + key, unit || null, 'kids', kind, 'test', 60000, JSON.stringify(meta || {})]).then(r => r[0].r);
const balance = async (w, p) => one(await as(w.db, w.ownerA, 'select public.point_balance($1)', [p]));
const reward = (w, p) => as(w.db, w.ownerA, 'select public.save_reward($1, $2)', [w.famA, JSON.stringify(p)]).then(one);
const request = (w, who, profile, rw) => as(w.db, who, 'select public.request_reward($1, $2, $3) as r', [profile, rw, randomUUID()]).then(r => r[0].r);
const adjust = (w, who, profile, n, note) => as(w.db, who, 'select public.adjust_points($1, $2, $3, $4) as r', [profile, n, note, 'adj:' + randomUUID()]).then(r => r[0].r);

// ---------------------------------------------------------------------------------------------
test('L1: nobody can write points, rewards or redemptions directly; the PIN hash is unreadable', async () => {
  const w = await world();
  for (const who of [w.ownerA, w.memberA]) {
    await refused(as(w.db, who, "insert into public.point_transactions (family_id, profile_id, kind, amount, key, created_by) values ($1, $2, 'earn', 999, 'hack', $3)", [w.famA, w.mia, who.id]), /permission denied/);
    await refused(as(w.db, who, 'update public.point_transactions set amount = 999'), /permission denied/);
    await refused(as(w.db, who, 'delete from public.point_transactions'), /permission denied/);
    await refused(as(w.db, who, "insert into public.rewards (family_id, name, cost, created_by) values ($1, 'x', 1, $2)", [w.famA, who.id]), /permission denied/);
    await refused(as(w.db, who, "update public.reward_redemptions set status = 'approved'"), /permission denied/);
    await refused(as(w.db, who, 'select pin_hash from public.family_settings'), /permission denied/);
  }
  await refused(as(w.db, 'anon', 'select * from public.point_transactions'), /permission denied/);
});

test('L2: points come from the server rules; the same key never pays twice; caps hold', async () => {
  const w = await world();
  const r1 = await finish(w, w.memberA, w.mia, 'k1', 'quiz', { correct: 5, d: 2 });
  assert.equal(r1.amount, 20);                                       // 5 right × 2 points × level 2
  const again = await finish(w, w.memberA, w.mia, 'k1', 'quiz', { correct: 5, d: 2 });
  assert.equal(again.duplicate, true);
  assert.equal(await balance(w, w.mia), 20);
  const big = await finish(w, w.memberA, w.mia, 'k2', 'quiz', { correct: 9999, d: 99 });   // forged numbers are clamped
  assert.equal(big.amount, 150);                                     // 50 × 2 × 4 = 400 → max per activity 150
  const sp = await finish(w, w.memberA, w.mia, 'k3', 'spell', { score: 100000 });
  assert.equal(sp.amount, 100);
  const cap = await finish(w, w.memberA, w.mia, 'k4', 'spell', { score: 100 });
  assert.deepEqual([cap.amount, cap.capped], [100, false]);          // daily cap 400: 20 + 150 + 100 = 270, room 130, so 100 fits
  const cap2 = await finish(w, w.memberA, w.mia, 'k5', 'spell', { score: 100 });
  assert.equal(cap2.amount, 30); assert.equal(cap2.capped, true);
  const earned = await as(w.db, w.ownerA, "select coalesce(sum(amount), 0)::int as s from public.point_transactions where profile_id = $1 and source <> 'dailygoal'", [w.mia]);
  assert.equal(earned[0].s, 400);
});

test('L3: replaying a finished unit earns the replay share; adults earn nothing; unknown kinds earn nothing', async () => {
  const w = await world();
  const a = await finish(w, w.memberA, w.leo, 'u1', 'kidslesson', { pct: 90 }, 'kl:th-es:greet');
  assert.equal(a.amount, 30); assert.equal(a.repeat, false);
  const b = await finish(w, w.memberA, w.leo, 'u2', 'kidslesson', { pct: 90 }, 'kl:th-es:greet');
  assert.equal(b.amount, 15); assert.equal(b.repeat, true);
  assert.equal((await finish(w, w.ownerA, w.mum, 'u3', 'quiz', { correct: 10, d: 4 })).amount, 0);
  assert.equal((await finish(w, w.ownerA, w.leo, 'u4', 'admin_bonus', { score: 999 })).amount, 0);
});

test('L4: another family, a guest and a signed-out user cannot award, read or redeem', async () => {
  const w = await world();
  await refused(finish(w, w.ownerB, w.mia, 'x1', 'quiz', { correct: 5, d: 2 }), /not_allowed/);
  await refused(finish(w, w.guest, w.mia, 'x2', 'quiz', { correct: 5, d: 2 }), /permanent_account_required|not_allowed/);
  await refused(finish(w, 'anon', w.mia, 'x3', 'quiz', {}), /permission denied/);
  await finish(w, w.memberA, w.mia, 'ok1', 'quiz', { correct: 5, d: 2 });
  assert.equal((await as(w.db, w.ownerB, 'select * from public.point_transactions')).length, 0);
  assert.equal(one(await as(w.db, w.ownerB, 'select public.point_balance($1)', [w.mia])), null);
  await unlock(w);
  const rw = await reward(w, { name: 'Snack', cost: 10 });
  await refused(request(w, w.ownerB, w.mia, rw), /not_allowed/);
  await refused(request(w, w.ownerB, w.kidB, rw).then(r => { if (!r.ok) throw new Error(r.error); }), /not_found/);
});

test('L5: parent actions need an owner/manager account AND the PIN; wrong PINs are limited', async () => {
  const w = await world();
  await refused(reward(w, { name: 'Snack', cost: 10 }), /pin_required/);
  await refused(unlockTry(w, w.memberA), /not_allowed/);
  for (let i = 0; i < 5; i++) assert.equal((await unlockTry(w, w.ownerA, '0000')).error, 'wrong_pin');
  assert.equal((await unlockTry(w, w.ownerA)).error, 'too_many_attempts');   // even the right PIN waits now
  await unlock(w, w.managerA);                                         // the manager's own limit is separate
  await refused(as(w.db, w.memberA, 'select public.save_reward($1, $2)', [w.famA, JSON.stringify({ name: 'x', cost: 1 })]), /not_allowed/);
  await refused(as(w.db, w.ownerB, 'select public.save_reward($1, $2)', [w.famA, JSON.stringify({ name: 'x', cost: 1 })]), /not_allowed/);
  const rw = one(await as(w.db, w.managerA, 'select public.save_reward($1, $2)', [w.famA, JSON.stringify({ name: 'Snack', cost: 10 })]));
  assert.ok(rw);
  await as(w.db, w.managerA, "select public.set_parent_pin($1, '1111')", [w.famA]);  // an unlocked manager may change it
  assert.equal((await unlockTry(w, w.managerA, '2468')).error, 'wrong_pin');
  assert.equal((await unlockTry(w, w.managerA, '1111')).ok, true);
});

test('L6: requesting reserves points; approval spends once; rejection spends nothing; never negative', async () => {
  const w = await world(); await unlock(w);
  const snack = await reward(w, { name: 'Snack', cost: 50, perChildLimit: 2 });
  const game = await reward(w, { name: 'Game time', cost: 100 });
  assert.equal((await request(w, w.memberA, w.mia, snack)).error, 'not_enough');
  await adjust(w, w.ownerA, w.mia, 120, 'helped at home');
  const r1 = await request(w, w.memberA, w.mia, snack); assert.equal(r1.ok, true); assert.equal(r1.status, 'pending');
  assert.equal((await request(w, w.memberA, w.mia, snack)).error, 'pending_exists');
  assert.equal((await request(w, w.memberA, w.mia, game)).error, 'not_enough');   // 120 − 50 reserved = 70 < 100
  assert.equal(await balance(w, w.mia), 120);                                      // reserved, not spent
  await refused(adjust(w, w.ownerA, w.mia, -100, 'too much'), /would_go_negative/); // 120 − 100 < 50 reserved
  await refused(adjust(w, w.ownerA, w.mia, 5, '  '), /note_required/);
  const red = (await as(w.db, w.ownerA, "select id from public.reward_redemptions where status = 'pending'"))[0].id;
  await refused(as(w.db, w.memberA, 'select public.decide_redemption($1, true, null)', [red]), /not_allowed/);
  const ok = (await as(w.db, w.ownerA, 'select public.decide_redemption($1, true, null) as r', [red]))[0].r;
  assert.equal(ok.ok, true);
  const twice = (await as(w.db, w.ownerA, 'select public.decide_redemption($1, true, null) as r', [red]))[0].r;
  assert.equal(twice.error, 'not_pending');
  assert.equal(await balance(w, w.mia), 70);
  const r2 = await request(w, w.memberA, w.mia, snack);
  const red2 = (await as(w.db, w.ownerA, "select id from public.reward_redemptions where status = 'pending'"))[0].id;
  assert.equal(r2.ok, true);
  await as(w.db, w.ownerA, "select public.decide_redemption($1, false, 'not today')", [red2]);
  assert.equal(await balance(w, w.mia), 70);                                        // rejected: nothing spent
  const spends = await as(w.db, w.ownerA, "select count(*)::int as n from public.point_transactions where kind = 'spend'");
  assert.equal(spends[0].n, 1);
});

test('L7: limits, dates, auto-approval, only-for-some rewards and archiving', async () => {
  const w = await world(); await unlock(w);
  await adjust(w, w.ownerA, w.mia, 500, 'start'); await adjust(w, w.ownerA, w.leo, 500, 'start');
  const once = await reward(w, { name: 'Toy', cost: 10, totalLimit: 1, autoApprove: true });
  assert.equal((await request(w, w.memberA, w.mia, once)).status, 'approved');
  assert.equal(await balance(w, w.mia), 490);
  assert.equal((await request(w, w.memberA, w.leo, once)).error, 'sold_out');
  const later = await reward(w, { name: 'Later', cost: 10, startsOn: '2999-01-01' });
  assert.equal((await request(w, w.memberA, w.mia, later)).error, 'not_started');
  const old = await reward(w, { name: 'Old', cost: 10, endsOn: '2000-01-01' });
  assert.equal((await request(w, w.memberA, w.mia, old)).error, 'expired');
  const forLeo = await reward(w, { name: 'Leo only', cost: 10, profileIds: [w.leo] });
  assert.equal((await request(w, w.memberA, w.mia, forLeo)).error, 'not_for_you');
  await refused(reward(w, { name: 'Foreign', cost: 10, profileIds: [w.kidB] }), /not_allowed/);
  const off = await reward(w, { name: 'Off', cost: 10, active: false });
  assert.equal((await request(w, w.memberA, w.mia, off)).error, 'inactive');
  const del = (await as(w.db, w.ownerA, 'select public.delete_reward($1) as r', [once]))[0].r;
  assert.equal(del.archived, true);                                   // has history → archived, history kept
  assert.equal((await request(w, w.memberA, w.leo, forLeo)).ok, true);
  await refused(as(w.db, w.ownerA, 'select public.delete_reward($1)', [forLeo]), /has_pending/);
});

test('L8: rules can be changed only by a parent and are sanitised', async () => {
  const w = await world();
  await refused(as(w.db, w.ownerA, 'select public.save_point_rules($1, $2)', [w.famA, '{"quizPerCorrect":5}']), /pin_required/);
  await unlock(w);
  const r = one(await as(w.db, w.ownerA, 'select public.save_point_rules($1, $2)', [w.famA, '{"quizPerCorrect":5,"repeatFactor":7,"evil":"x","dailyCap":-1}']));
  assert.equal(r.quizPerCorrect, 5); assert.equal(r.repeatFactor, 1); assert.equal(r.evil, undefined); assert.equal(r.dailyCap, 400);
  assert.equal((await finish(w, w.memberA, w.mia, 'r1', 'quiz', { correct: 2, d: 1 })).amount, 10);
});

test('L9: learning progress is shared by the family; an old revision cannot overwrite a newer one', async () => {
  const w = await world();
  const a = (await as(w.db, w.memberA, 'select public.save_learning_state($1, $2, $3) as r', [w.mia, '{"x":1}', 0]))[0].r;
  assert.deepEqual([a.ok, a.rev], [true, 1]);
  const b = (await as(w.db, w.ownerA, 'select public.save_learning_state($1, $2, $3) as r', [w.mia, '{"x":2}', 1]))[0].r;
  assert.equal(b.rev, 2);
  const stale = (await as(w.db, w.memberA, 'select public.save_learning_state($1, $2, $3) as r', [w.mia, '{"x":3}', 1]))[0].r;
  assert.equal(stale.error, 'stale'); assert.deepEqual(stale.data, { x: 2 });
  await refused(as(w.db, w.ownerB, 'select public.save_learning_state($1, $2, $3)', [w.mia, '{}', 2]), /not_allowed/);
  assert.equal((await as(w.db, w.ownerB, 'select * from public.learning_state')).length, 0);
});

test('L10: importing a device history is idempotent and cannot leave a negative balance', async () => {
  const w = await world(); await unlock(w);
  const rows = [{ key: 'opening:p1', kind: 'opening', amount: 120 }, { key: 'tx2', kind: 'spend', amount: -50 }];
  assert.equal(one(await as(w.db, w.ownerA, 'select public.import_points($1, $2)', [w.mia, JSON.stringify(rows)])), 2);
  assert.equal(one(await as(w.db, w.ownerA, 'select public.import_points($1, $2)', [w.mia, JSON.stringify(rows)])), 0);
  assert.equal(await balance(w, w.mia), 70);
  await refused(as(w.db, w.ownerA, 'select public.import_points($1, $2)', [w.leo, JSON.stringify([{ key: 'neg', kind: 'spend', amount: -5 }])]), /would_go_negative/);
  await refused(as(w.db, w.memberA, 'select public.import_points($1, $2)', [w.leo, '[]']), /not_allowed/);
});

test('L11: archiving a profile keeps its history, rejects its waiting requests and stops new points', async () => {
  const w = await world(); await unlock(w);
  await adjust(w, w.ownerA, w.mia, 50, 'x');
  const rw = await reward(w, { name: 'Snack', cost: 10 });
  await request(w, w.memberA, w.mia, rw);
  await as(w.db, w.ownerA, 'select public.archive_profile($1)', [w.mia]);
  assert.equal((await as(w.db, w.ownerA, "select status from public.reward_redemptions"))[0].status, 'rejected');
  assert.equal(await balance(w, w.mia), 50);
  assert.equal((await finish(w, w.memberA, w.mia, 'z', 'quiz', { correct: 5, d: 2 })).amount, 0);
});
