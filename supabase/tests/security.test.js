// Security and RLS tests for supabase/migrations/0001_family_hub_security.sql.
// They run the migration in PGlite (real PostgreSQL compiled to WebAssembly) with a small stand-in for
// Supabase's auth schema, then act as different users through the real "anon" / "authenticated" roles.
// Nothing goes through the app: tables and functions are called directly.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const MIGRATION = fs.readFileSync(path.join(__dirname, '..', 'migrations', '0001_family_hub_security.sql'), 'utf8');

/* The parts of Supabase the migration relies on: roles, auth.uid()/auth.jwt() reading request.jwt.claims,
   and Supabase's default of granting everything on new public objects (which the migration must undo). */
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

async function freshDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STANDIN);
  await db.exec(MIGRATION);
  return db;
}

/* a person = a signed JWT; guests carry is_anonymous = true */
const person = (anonymous = false) => ({ id: randomUUID(), anonymous });
async function as(db, who, sql, params = []) {
  await db.exec('reset role');
  if (who === 'anon') {
    await db.query("select set_config('request.jwt.claims', '', false)");
    await db.exec('set role anon');
  } else {
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: who.id, role: 'authenticated', is_anonymous: who.anonymous })]);
    await db.exec('set role authenticated');
  }
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
async function refused(promise, pattern) {
  await assert.rejects(promise, err => pattern ? pattern.test(err.message) : true);
}
const one = rows => rows[0] && rows[0][Object.keys(rows[0])[0]];
const sys = (db, sql, params) => db.query(sql, params);   // the test itself, as the database owner

/* Two families with an owner each, a manager, a child; a room in family A with a code. */
async function world() {
  const db = await freshDb();
  const ownerA = person(), managerA = person(), ownerB = person(), guest = person(true), stranger = person(true);
  const famA = one(await as(db, ownerA, "select public.create_family('Family A')"));
  const famB = one(await as(db, ownerB, "select public.create_family('Family B')"));
  await as(db, ownerA, 'select public.set_member_role($1, $2, $3)', [famA, managerA.id, 'manager']);
  const childA = one(await as(db, ownerA, "select public.create_child_profile($1, 'Mia', '🦊')", [famA]));
  const childB = one(await as(db, ownerB, "select public.create_child_profile($1, 'Leo', '🐼')", [famB]));
  const room = one(await as(db, ownerA, "select public.create_room($1, 'flags', 4)", [famA]));
  const inv = (await as(db, ownerA, 'select * from public.create_room_invite($1, 60, 5)', [room]))[0];
  const guestProfile = one(await as(db, guest, "select public.create_guest_profile('Kim', '🐸')"));
  return { db, ownerA, managerA, ownerB, guest, stranger, famA, famB, childA, childB, room, inv, guestProfile };
}
/* guest joins, host adds the child as a local player, a 2-turn session is started */
async function playingSession(w, timer = 15) {
  const j = one(await as(w.db, w.guest, 'select public.join_room($1, $2)', [w.inv.code, w.guestProfile]));
  assert.equal(j.ok, true, JSON.stringify(j));
  await as(w.db, w.ownerA, 'select public.add_local_player($1, $2)', [w.room, w.childA]);
  const turns = [
    { profile_id: w.guestProfile, question: { code: 'se', opts: ['se', 'no', 'fi'] }, answer: 'se' },
    { profile_id: w.childA, question: { code: 'jp', opts: ['jp', 'cn', 'th'] }, answer: 'jp' }
  ];
  const s = one(await as(w.db, w.ownerA, 'select public.start_session($1, $2, $3, $4)', [w.room, 'flags', timer, JSON.stringify(turns)]));
  return s;
}

// ---------------------------------------------------------------------------------------------
test('G1: a user of family A cannot read or change family B', async () => {
  const w = await world();
  const fams = await as(w.db, w.ownerA, 'select id from public.families');
  assert.deepEqual(fams.map(r => r.id), [w.famA]);
  assert.equal((await as(w.db, w.ownerA, 'select * from public.player_profiles where family_id = $1', [w.famB])).length, 0);
  assert.equal((await as(w.db, w.ownerA, 'select * from public.family_members where family_id = $1', [w.famB])).length, 0);
  const upd = await as(w.db, w.ownerA, "update public.player_profiles set display_name = 'Hacked' where id = $1 returning id", [w.childB]);
  assert.equal(upd.length, 0, 'update of another family profile affects no rows');
  await refused(as(w.db, w.ownerA, "select public.create_child_profile($1, 'X')", [w.famB]), /not_allowed/);
  await refused(as(w.db, w.ownerA, "select public.set_member_role($1, $2, 'owner')", [w.famB, w.ownerA.id]), /not_allowed/);
  await refused(as(w.db, w.ownerA, 'delete from public.families where id = $1', [w.famB]), /permission denied/);
});

test('G2: a guest who has not joined sees nothing of the room, its members or history', async () => {
  const w = await world();
  await playingSession(w);
  for (const table of ['rooms', 'room_participants', 'game_sessions', 'results', 'family_members', 'families']) {
    assert.equal((await as(w.db, w.stranger, `select * from public.${table}`)).length, 0, table);
  }
  assert.equal((await as(w.db, w.stranger, 'select session_id, turn_no, question from public.session_turns')).length, 0, 'session_turns');
  // the hidden columns are refused outright
  await refused(as(w.db, w.stranger, 'select * from public.session_turns'), /permission denied/);
  assert.equal((await as(w.db, w.stranger, 'select * from public.player_profiles where id = $1', [w.childA])).length, 0);
  await refused(as(w.db, w.stranger, 'select * from public.room_invites'), /permission denied/);
});

test('G3: an expired code does not let anyone in', async () => {
  const w = await world();
  await sys(w.db, "update public.room_invites set expires_at = now() - interval '1 minute'");
  const r = one(await as(w.db, w.guest, 'select public.join_room($1, $2)', [w.inv.code, w.guestProfile]));
  assert.deepEqual(r, { ok: false, error: 'invalid_code' });
  assert.equal((await as(w.db, w.guest, 'select * from public.rooms')).length, 0);
});

test('G4: a participant cannot change anyone\'s answers or scores', async () => {
  const w = await world();
  const s = await playingSession(w);
  await refused(as(w.db, w.guest, 'select public.begin_turn($1, 1)', [s]), /not_your_turn|previous_turn_open/);
  await as(w.db, w.guest, 'select public.begin_turn($1, 0)', [s]);
  await as(w.db, w.guest, "select public.submit_answer($1, 0, 'se', $2)", [s, randomUUID()]);
  await as(w.db, w.ownerA, 'select public.begin_turn($1, 1)', [s]);
  await refused(as(w.db, w.guest, "select public.submit_answer($1, 1, 'cn', $2)", [s, randomUUID()]), /not_your_turn/);
  await refused(as(w.db, w.guest, 'update public.session_turns set points = 999'), /permission denied/);
  await as(w.db, w.ownerA, "select public.submit_answer($1, 1, 'jp', $2)", [s, randomUUID()]);
  await as(w.db, w.ownerA, 'select * from public.finish_session($1)', [s]);
  await refused(as(w.db, w.guest, 'update public.results set score = 999'), /permission denied/);
  await refused(as(w.db, w.guest, 'insert into public.results values ($1, $2, $3, 999, 9, 9, 1)', [s, w.guestProfile, w.famA]), /permission denied/);
  await refused(as(w.db, w.guest, 'select * from public.finish_session($1)', [s]), /permanent_account_required|not_allowed/);
  await refused(as(w.db, w.guest, "select public.adjust_score($1, $2, 100, 'because')", [s, w.guestProfile]), /permanent_account_required/);
  await refused(as(w.db, w.managerA, "select public.adjust_score($1, $2, 100, 'because')", [s, w.guestProfile]), /not_allowed/);
  // the right answers are never readable
  await refused(as(w.db, w.guest, 'select * from private.answer_keys'), /permission denied/);
});

test('G5: a room host cannot reach other families', async () => {
  const w = await world();
  const roomB = one(await as(w.db, w.ownerB, "select public.create_room($1, 'flags')", [w.famB]));
  assert.equal((await as(w.db, w.ownerA, 'select * from public.rooms where id = $1', [roomB])).length, 0);
  await refused(as(w.db, w.ownerA, 'select * from public.create_room_invite($1)', [roomB]), /not_allowed/);
  await refused(as(w.db, w.ownerA, 'select public.add_local_player($1, $2)', [w.room, w.childB]), /not_allowed/);
  await refused(as(w.db, w.ownerA, "select public.create_room($1, 'flags')", [w.famB]), /not_allowed/);
  // and a manager of family A cannot host in family B either
  await refused(as(w.db, w.managerA, "select public.create_room($1, 'flags')", [w.famB]), /not_allowed/);
});

test('G6: a profile that already has an owner cannot be taken over through linking', async () => {
  const w = await world();
  await playingSession(w);
  // someone else's guest profile
  const other = person(true);
  await refused(as(w.db, other, 'select public.request_profile_link($1, $2)', [w.guestProfile, w.famA]), /not_your_guest_profile/);
  // a family child profile is not a guest profile
  await refused(as(w.db, w.guest, 'select public.request_profile_link($1, $2)', [w.childB, w.famA]), /not_your_guest_profile/);
  // asking a family you never played with
  await refused(as(w.db, w.guest, 'select public.request_profile_link($1, $2)', [w.guestProfile, w.famB]), /not_allowed/);
  // proper request, but approved by the wrong family's owner
  const req = one(await as(w.db, w.guest, 'select public.request_profile_link($1, $2)', [w.guestProfile, w.famA]));
  await refused(as(w.db, w.ownerB, 'select public.approve_profile_link($1)', [req]), /not_allowed/);
  // the guest cannot approve their own request
  await refused(as(w.db, w.guest, 'select public.approve_profile_link($1)', [req]), /permanent_account_required/);
  // if the profile somehow got a family meanwhile, approval stops instead of moving it
  await sys(w.db, 'update public.player_profiles set family_id = $1 where id = $2', [w.famB, w.guestProfile]);
  await refused(as(w.db, w.ownerA, 'select public.approve_profile_link($1)', [req]), /conflict_profile_already_in_a_family/);
  const p = (await sys(w.db, 'select family_id from public.player_profiles where id = $1', [w.guestProfile])).rows[0];
  assert.equal(p.family_id, w.famB, 'nothing was overwritten');
});

test('G7: sending the same answer or result twice never counts twice', async () => {
  const w = await world();
  const s = await playingSession(w, 0);
  await as(w.db, w.guest, 'select public.begin_turn($1, 0)', [s]);
  const key = randomUUID();
  const a1 = one(await as(w.db, w.guest, "select public.submit_answer($1, 0, 'se', $2)", [s, key]));
  const a2 = one(await as(w.db, w.guest, "select public.submit_answer($1, 0, 'se', $2)", [s, key]));
  assert.equal(a1.points, 10); assert.equal(a2.points, 10); assert.equal(a2.replayed, true);
  await refused(as(w.db, w.guest, "select public.submit_answer($1, 0, 'se', $2)", [s, randomUUID()]), /already_answered/);
  // someone else replaying the guest's key gets nothing
  await refused(as(w.db, w.ownerA, "select public.submit_answer($1, 0, 'se', $2)", [s, key]), /idempotency_key_reused/);
  await as(w.db, w.ownerA, 'select public.begin_turn($1, 1)', [s]);
  await as(w.db, w.ownerA, "select public.submit_answer($1, 1, 'cn', $2)", [s, randomUUID()]);
  const r1 = await as(w.db, w.ownerA, 'select * from public.finish_session($1)', [s]);
  const r2 = await as(w.db, w.ownerA, 'select * from public.finish_session($1)', [s]);
  assert.deepEqual(r1, r2);
  assert.equal((await sys(w.db, 'select count(*)::int n from public.results where session_id = $1', [s])).rows[0].n, 2);
  assert.equal(r1.find(r => r.profile_id === w.guestProfile).score, 10);
  assert.equal(r1.find(r => r.profile_id === w.childA).score, 0);
});

test('G8: someone who left the room can no longer act in it', async () => {
  const w = await world();
  const s = await playingSession(w);
  await as(w.db, w.guest, 'select public.leave_room($1)', [w.room]);
  await refused(as(w.db, w.guest, 'select public.begin_turn($1, 0)', [s]), /not_your_turn/);
  await refused(as(w.db, w.guest, "select public.submit_answer($1, 0, 'se', $2)", [s, randomUUID()]), /not_your_turn/);
  assert.equal((await as(w.db, w.guest, 'select session_id, turn_no from public.session_turns')).length, 0);
  // removed by the host: same result
  const w2 = await world(); const s2 = await playingSession(w2);
  await as(w2.db, w2.ownerA, 'select public.remove_participant($1, $2)', [w2.room, w2.guest.id]);
  await refused(as(w2.db, w2.guest, 'select public.begin_turn($1, 0)', [s2]), /not_your_turn/);
  // an adult removed from the family loses the family data
  await as(w2.db, w2.ownerA, 'select public.remove_member($1, $2)', [w2.famA, w2.managerA.id]);
  assert.equal((await as(w2.db, w2.managerA, 'select * from public.families')).length, 0);
  await refused(as(w2.db, w2.managerA, "select public.create_room($1, 'flags')", [w2.famA]), /not_allowed/);
});

test('G9: revoking a code works at once, and closing a room revokes its codes', async () => {
  const w = await world();
  await as(w.db, w.ownerA, 'select public.revoke_room_invite($1)', [w.inv.invite_id]);
  assert.deepEqual(one(await as(w.db, w.guest, 'select public.join_room($1, $2)', [w.inv.code, w.guestProfile])), { ok: false, error: 'invalid_code' });
  const inv2 = (await as(w.db, w.ownerA, 'select * from public.create_room_invite($1)', [w.room]))[0];
  await refused(as(w.db, w.managerA, 'select public.revoke_room_invite($1)', [inv2.invite_id]), /not_allowed/);
  await as(w.db, w.ownerA, 'select public.close_room($1)', [w.room]);
  assert.deepEqual(one(await as(w.db, w.guest, 'select public.join_room($1, $2)', [inv2.code, w.guestProfile])), { ok: false, error: 'invalid_code' });
});

test('G10: the realtime channel rule only admits people in that room', async () => {
  const w = await world();
  await playingSession(w);
  const roomB = one(await as(w.db, w.ownerB, "select public.create_room($1, 'flags')", [w.famB]));
  const allowed = (who, topic) => as(w.db, who, 'select public.room_topic_allowed($1) ok', [topic]).then(r => r[0].ok);
  assert.equal(await allowed(w.guest, 'room:' + w.room), true);
  assert.equal(await allowed(w.ownerA, 'room:' + w.room), true);
  assert.equal(await allowed(w.stranger, 'room:' + w.room), false);
  assert.equal(await allowed(w.guest, 'room:' + roomB), false);
  assert.equal(await allowed(w.ownerA, 'room:' + roomB), false);
  assert.equal(await allowed(w.guest, 'family:' + w.famA), false);
  assert.equal(await allowed(w.guest, "room:x' or '1'='1"), false);
  await as(w.db, w.guest, 'select public.leave_room($1)', [w.room]);
  assert.equal(await allowed(w.guest, 'room:' + w.room), false);
});

test('G11: not signed in means no data and no member operations; guests cannot do permanent-member operations', async () => {
  const w = await world();
  await refused(as(w.db, 'anon', 'select * from public.families'), /permission denied/);
  await refused(as(w.db, 'anon', 'select * from public.player_profiles'), /permission denied/);
  await refused(as(w.db, 'anon', "select public.create_family('X')"), /permission denied/);
  await refused(as(w.db, 'anon', 'select public.join_room($1, $2)', [w.inv.code, w.guestProfile]), /permission denied/);
  await refused(as(w.db, w.guest, "select public.create_family('Guests')"), /permanent_account_required/);
  await refused(as(w.db, w.guest, "select public.create_room($1, 'flags')", [w.famA]), /permanent_account_required/);
  await refused(as(w.db, w.guest, "select public.create_child_profile($1, 'X')", [w.famA]), /permanent_account_required/);
  await refused(as(w.db, w.guest, 'select * from public.create_room_invite($1)', [w.room]), /permanent_account_required/);
  // a signed-in user without a family cannot create profiles or rooms anywhere
  const loner = person();
  await refused(as(w.db, loner, "select public.create_child_profile($1, 'X')", [w.famA]), /not_allowed/);
});

test('G12: the database enforces the rules even when the app is bypassed', async () => {
  const w = await world();
  await refused(as(w.db, w.ownerA, "select public.create_child_profile($1, '')", [w.famA]), /check constraint/);
  await refused(as(w.db, w.ownerA, "select public.create_child_profile($1, $2)", [w.famA, 'x'.repeat(21)]), /check constraint/);
  await refused(as(w.db, w.ownerA, "select public.create_room($1, 'Bad Game!')", [w.famA]), /check constraint/);
  // a member (not manager) cannot create profiles even by calling the function directly
  const member = person();
  await as(w.db, w.ownerA, "select public.set_member_role($1, $2, 'member')", [w.famA, member.id]);
  await refused(as(w.db, member, "select public.create_child_profile($1, 'X')", [w.famA]), /not_allowed/);
  // an answer that is not one of the options is refused when the session is created
  const bad = [{ profile_id: w.childA, question: { opts: ['se', 'no'] }, answer: 'fi' }];
  await as(w.db, w.ownerA, 'select public.add_local_player($1, $2)', [w.room, w.childA]);
  await refused(as(w.db, w.ownerA, 'select public.start_session($1, $2, 15, $3)', [w.room, 'flags', JSON.stringify(bad)]), /answer_not_an_option/);
  // tables cannot be written directly
  await refused(as(w.db, w.ownerA, "insert into public.family_members values ($1, $2, 'owner')", [w.famB, w.ownerA.id]), /permission denied/);
  await refused(as(w.db, w.ownerA, "update public.family_members set role = 'owner'"), /permission denied/);
  await refused(as(w.db, w.ownerA, 'insert into public.audit_log (action) values ($1)', ['fake']), /permission denied/);
});

// ---------------------------------------------------------------------------------------------
test('room codes: random, unambiguous, stored only as a hash, guessing is rate limited', async () => {
  const w = await world();
  const codes = new Set();
  for (let i = 0; i < 40; i++) codes.add((await as(w.db, w.ownerA, 'select * from public.create_room_invite($1)', [w.room]))[0].code);
  assert.equal(codes.size, 40);
  for (const c of codes) assert.match(c, /^[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/);
  const stored = (await sys(w.db, 'select encode(code_hash, $1) h from public.room_invites', ['escape'])).rows.map(r => r.h);
  for (const c of codes) assert.ok(!stored.some(h => h.includes(c.replace('-', ''))), 'code is not stored in clear');
  await refused(as(w.db, w.ownerA, 'select code_hash from public.room_invites'), /permission denied/);
  // codes are accepted in any case and with or without the dash
  const loose = w.inv.code.toLowerCase().replace('-', ' ');
  assert.equal(one(await as(w.db, w.guest, 'select public.join_room($1, $2)', [loose, w.guestProfile])).ok, true);
  // 5 wrong guesses lock the guesser out, even with the right code afterwards
  const g = person(true);
  const gp = one(await as(w.db, g, "select public.create_guest_profile('Bot')"));
  for (let i = 0; i < 5; i++) assert.equal(one(await as(w.db, g, 'select public.join_room($1, $2)', ['AAAAA-AAAAA', gp])).error, 'invalid_code');
  assert.equal(one(await as(w.db, g, 'select public.join_room($1, $2)', [w.inv.code, gp])).error, 'too_many_attempts');
  // the code limit on uses
  const inv1 = (await as(w.db, w.ownerA, 'select * from public.create_room_invite($1, 60, 1)', [w.room]))[0];
  const g1 = person(true), g2 = person(true);
  const p1 = one(await as(w.db, g1, "select public.create_guest_profile('A')")), p2 = one(await as(w.db, g2, "select public.create_guest_profile('B')"));
  assert.equal(one(await as(w.db, g1, 'select public.join_room($1, $2)', [inv1.code, p1])).ok, true);
  assert.equal(one(await as(w.db, g2, 'select public.join_room($1, $2)', [inv1.code, p2])).error, 'invalid_code');
  // joining with someone else's profile is refused
  assert.equal(one(await as(w.db, g2, 'select public.join_room($1, $2)', [w.inv.code, w.childA])).error, 'profile_not_yours');
});

test('acceptance: guest plays, family links the guest profile, scores and history stay', async () => {
  const w = await world();
  const s = await playingSession(w, 0);
  await as(w.db, w.guest, 'select public.begin_turn($1, 0)', [s]);
  await as(w.db, w.guest, "select public.submit_answer($1, 0, 'se', $2)", [s, randomUUID()]);
  await as(w.db, w.ownerA, 'select public.begin_turn($1, 1)', [s]);
  await as(w.db, w.ownerA, "select public.submit_answer($1, 1, 'jp', $2)", [s, randomUUID()]);
  await as(w.db, w.ownerA, 'select * from public.finish_session($1)', [s]);
  const before = (await sys(w.db, 'select score from public.results where profile_id = $1', [w.guestProfile])).rows[0].score;
  const req = one(await as(w.db, w.guest, 'select public.request_profile_link($1, $2)', [w.guestProfile, w.famA]));
  // the owner sees the request; another family does not
  assert.equal((await as(w.db, w.ownerA, 'select * from public.profile_link_requests')).length, 1);
  assert.equal((await as(w.db, w.ownerB, 'select * from public.profile_link_requests')).length, 0);
  await as(w.db, w.managerA, 'select public.approve_profile_link($1)', [req]);
  const linked = (await as(w.db, w.ownerA, 'select id, family_id, display_name from public.player_profiles where id = $1', [w.guestProfile]))[0];
  assert.equal(linked.family_id, w.famA);
  const after = (await as(w.db, w.ownerA, 'select score from public.results where profile_id = $1', [w.guestProfile]))[0].score;
  assert.equal(after, before, 'score kept');
  assert.equal(after, 10);
  // the guest still sees their own profile; a second approval is refused
  assert.equal((await as(w.db, w.guest, 'select * from public.player_profiles where id = $1', [w.guestProfile])).length, 1);
  await refused(as(w.db, w.ownerA, 'select public.approve_profile_link($1)', [req]), /request_not_pending/);
  // the audit trail has the link
  const audit = await as(w.db, w.ownerA, "select action from public.audit_log where action = 'profile_linked'");
  assert.equal(audit.length, 1);
  assert.equal((await as(w.db, w.managerA, 'select * from public.audit_log')).length, 0, 'audit log is for the owner');
  // unlinking hands it back, results stay
  await as(w.db, w.ownerA, 'select public.unlink_profile($1)', [w.guestProfile]);
  assert.equal((await sys(w.db, 'select count(*)::int n from public.results where profile_id = $1', [w.guestProfile])).rows[0].n, 1);
});

test('acceptance: an adult sees the same family and profiles from any device', async () => {
  const w = await world();
  // a second device is just a second session with the same signed identity
  const phone = { id: w.ownerA.id, anonymous: false };
  const names = (await as(w.db, phone, 'select display_name from public.player_profiles order by display_name')).map(r => r.display_name);
  assert.deepEqual(names, ['Mia']);
});

test('roles: managers handle only their assigned children; members only read', async () => {
  const w = await world();
  const kid2 = one(await as(w.db, w.managerA, "select public.create_child_profile($1, 'Noa')", [w.famA]));
  assert.equal((await as(w.db, w.managerA, "update public.player_profiles set avatar = '🐯' where id = $1 returning id", [kid2])).length, 1);
  assert.equal((await as(w.db, w.managerA, "update public.player_profiles set avatar = '🐯' where id = $1 returning id", [w.childA])).length, 0, 'not assigned');
  await refused(as(w.db, w.managerA, "select public.set_member_role($1, $2, 'owner')", [w.famA, w.managerA.id]), /not_allowed/);
  await as(w.db, w.ownerA, 'select public.assign_profile_manager($1, $2)', [w.childA, w.managerA.id]);
  assert.equal((await as(w.db, w.managerA, "update public.player_profiles set avatar = '🐯' where id = $1 returning id", [w.childA])).length, 1);
  await refused(as(w.db, w.managerA, "update public.player_profiles set family_id = $1 where id = $2", [w.famB, kid2]), /permission denied/);
  const member = person();
  await as(w.db, w.ownerA, "select public.set_member_role($1, $2, 'member')", [w.famA, member.id]);
  assert.equal((await as(w.db, member, 'select * from public.player_profiles')).length, 2);
  assert.equal((await as(w.db, member, "update public.player_profiles set avatar = '🐯' returning id")).length, 0);
  const roles = await as(w.db, w.ownerA, "select details from public.audit_log where action = 'role_changed'");
  assert.equal(roles.length, 2, 'role changes are logged');
});
