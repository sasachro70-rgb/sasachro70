// End-to-end tests of the browser's online code (js/online/*) against the real database rules.
// A small stand-in for the supabase-js client sends every call to PGlite as the signed-in user,
// so the service code, the SQL functions and RLS are exercised together. Supabase Auth itself is faked here.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

require('../../js/online/supabase-client.js');
require('../../js/online/auth-service.js');
require('../../js/online/online-service.js');
const FGH = globalThis.FGH;

const MIGRATION = fs.readFileSync(path.join(__dirname, '..', 'migrations', '0001_family_hub_security.sql'), 'utf8');
const STANDIN = fs.readFileSync(path.join(__dirname, 'security.test.js'), 'utf8').match(/const SUPABASE_STANDIN = `([\s\S]*?)`;/)[1];

/* a supabase-js look-alike: rpc() and from().select().eq().in().order().limit(), run as one user */
function fakeClient(db, user, net = { online: true, loseReply: false }) {
  async function run(sql, params) {
    if (!net.online) throw new TypeError('Failed to fetch');
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: user.id, role: 'authenticated', is_anonymous: !!user.anonymous })]);
    await db.exec('set role authenticated');
    try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
  }
  return {
    async rpc(name, args) {
      const keys = Object.keys(args);
      const params = keys.map(k => (args[k] !== null && typeof args[k] === 'object') ? JSON.stringify(args[k]) : args[k]);
      try {
        const res = await run(`select * from public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`, params);
        if (net.loseReply) { net.loseReply = false; throw new TypeError('Failed to fetch'); }   // the server did it, the reply was lost
        const scalar = res.rows.length === 1 && res.fields.length === 1 && res.fields[0].name === name;
        return { data: scalar ? res.rows[0][name] : res.rows, error: null };
      } catch (e) {
        if (e instanceof TypeError) throw e;
        return { data: null, error: { message: e.message } };
      }
    },
    from(table) {
      const q = { cols: '*', where: [], params: [], order: [], limit: null };
      const b = {
        select(cols) { q.cols = cols; return b; },
        eq(c, v) { q.params.push(v); q.where.push(`${c} = $${q.params.length}`); return b; },
        in(c, arr) { q.params.push(arr.map(String)); q.where.push(`${c}::text = any($${q.params.length}::text[])`); return b; },
        order(c, o) { q.order.push(c + (o && o.ascending === false ? ' desc' : '')); return b; },
        limit(n) { q.limit = n; return b; },
        then(ok, bad) {
          const sql = `select ${q.cols} from public.${table}` + (q.where.length ? ' where ' + q.where.join(' and ') : '') +
            (q.order.length ? ' order by ' + q.order.join(', ') : '') + (q.limit ? ' limit ' + q.limit : '');
          return run(sql, q.params).then(r => ({ data: r.rows, error: null }), e => e instanceof TypeError ? Promise.reject(e) : ({ data: null, error: { message: e.message } })).then(ok, bad);
        }
      };
      return b;
    }
  };
}
function memoryStorage() { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }

async function setup() {
  const db = new PGlite();
  await db.exec(STANDIN); await db.exec(MIGRATION);
  const mk = (anonymous) => { const user = { id: randomUUID(), anonymous }; const net = { online: true, loseReply: false };
    return { user, net, svc: FGH.onlineService.create(fakeClient(db, user, net), { storage: memoryStorage() }) }; };
  return { db, owner: mk(false), owner2: mk(false), guest: mk(true) };
}

test('a whole online game: family, room code, guest joins, answers survive a lost connection, results and linking', async () => {
  const { db, owner, owner2, guest } = await setup();
  const fam = await owner.svc.createFamily('Familjen Ek');
  const kid = await owner.svc.createChildProfile(fam, 'Mia', '🦊');
  const families = await owner.svc.myFamilies(owner.user.id);
  assert.deepEqual(families.map(f => [f.name, f.role]), [['Familjen Ek', 'owner']]);

  const room = await owner.svc.createRoom(fam, 'flags', 6);
  const inv = await owner.svc.createInvite(room, 60, 5);
  assert.match(inv.code, /^[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/);
  assert.equal((await owner.svc.invites(room)).length, 1);

  // before joining the guest sees nothing of the room
  assert.equal(await guest.svc.room(room), null);
  const gp = await guest.svc.createGuestProfile('Kim', '🐸');
  // a typo is caught on the device and does not use up one of the 5 tries
  await assert.rejects(guest.svc.joinRoom('ABC', gp), e => e.code === 'invalid_code');
  assert.equal((await db.query('select count(*)::int n from private.join_attempts')).rows[0].n, 0);
  // the code works in lower case with spaces
  const joined = await guest.svc.joinRoom(inv.code.toLowerCase().replace('-', ' '), gp);
  assert.equal(joined, room);
  const seen = await guest.svc.room(room);
  assert.deepEqual(seen.profiles.map(p => p.display_name).sort(), ['Kim']);

  // the host adds Mia as a player on the host's iPad and starts a game with server-checked answers
  await owner.svc.addLocalPlayer(room, kid);
  const session = await owner.svc.startSession(room, 'flags', 0, [
    { profile_id: gp, question: { code: 'se', opts: ['se', 'no', 'fi'] }, answer: 'se' },
    { profile_id: kid, question: { code: 'jp', opts: ['jp', 'cn', 'th'] }, answer: 'jp' }
  ]);
  const turns = await guest.svc.turns(session);
  assert.equal(owner.svc.currentTurn(turns).turn_no, 0);
  assert.ok(!('answer_key' in turns[0]) && turns[0].answer === null);

  // guest answers, the connection drops: the answer waits on the device
  await guest.svc.beginTurn(session, 0);
  guest.net.online = false;
  await assert.rejects(guest.svc.submitAnswer(session, 0, 'se'), e => e.code === 'offline');
  assert.equal(guest.svc.pendingAnswers().length, 1);
  guest.net.online = true;
  // the server gets it, but the reply is lost: the answer stays queued with the same key
  guest.net.loseReply = true;
  await guest.svc.flushQueue();
  assert.equal(guest.svc.pendingAnswers().length, 1);
  const sent = await guest.svc.flushQueue();
  assert.equal(sent.length, 1);
  assert.equal(guest.svc.pendingAnswers().length, 0);
  const t0 = (await guest.svc.turns(session))[0];
  assert.deepEqual([t0.correct, t0.points], [true, 10], 'counted once');

  // the host plays Mia's turn; the guest cannot
  await assert.rejects(guest.svc.beginTurn(session, 1), e => e.code === 'not_your_turn');
  await owner.svc.beginTurn(session, 1);
  await owner.svc.submitAnswer(session, 1, 'cn');
  // finishing twice gives the same results, visible to the guest and the family
  const r1 = await owner.svc.finishSession(session);
  const r2 = await owner.svc.finishSession(session);
  assert.deepEqual(r1, r2);
  assert.deepEqual((await guest.svc.sessionResults(session)).map(r => [r.profile_id === gp, r.score, r.rank]), [[true, 10, 1], [false, 0, 2]]);
  assert.equal((await owner.svc.familyResults(fam)).length, 2);
  // another family sees none of it
  assert.equal(await owner2.svc.room(room), null);
  assert.equal((await owner2.svc.familyResults(fam)).length, 0);
  assert.equal((await owner2.svc.myFamilies(owner2.user.id)).length, 0);

  // the guest asks to join the family; the owner approves; profile and score stay
  await guest.svc.requestLink(gp, fam);
  const reqs = await owner.svc.pendingLinkRequests();
  assert.equal(reqs.length, 1);
  assert.equal((await owner2.svc.pendingLinkRequests()).length, 0);
  await owner.svc.approveLink(reqs[0].id);
  assert.deepEqual((await owner.svc.familyProfiles(fam)).map(p => p.display_name).sort(), ['Kim', 'Mia']);
  assert.equal((await owner.svc.familyResults(fam)).find(r => r.profile_id === gp).score, 10);

  // revoking the code stops new joins at once
  await owner.svc.revokeInvite(inv.id || inv.invite_id);
  const g2 = { user: { id: randomUUID(), anonymous: true }, net: { online: true } };
  const svc2 = FGH.onlineService.create(fakeClient(db, g2.user, g2.net), { storage: memoryStorage() });
  const p2 = await svc2.createGuestProfile('Ola');
  await assert.rejects(svc2.joinRoom(inv.code, p2), e => e.code === 'invalid_code');
});

test('errors are turned into codes the app can show', () => {
  const { toError } = FGH.onlineService;
  assert.equal(toError({ message: 'not_allowed' }).code, 'not_allowed');
  assert.equal(toError(new TypeError('Failed to fetch')).code, 'offline');
  assert.equal(toError({ message: 'permission denied for table results' }).code, 'not_allowed');
  assert.equal(toError({ message: 'duplicate key value violates unique constraint' }).code, 'error');
});

test('the app refuses keys that would bypass the database rules', () => {
  const { keyProblem, configured } = FGH.supabaseClient;
  const jwt = role => 'x.' + Buffer.from(JSON.stringify({ role })).toString('base64').replace(/=+$/, '') + '.y';
  assert.equal(keyProblem(jwt('service_role')), 'secret_key');
  assert.equal(keyProblem('sb_secret_abc123'), 'secret_key');
  assert.equal(keyProblem(jwt('anon')), null);
  assert.equal(keyProblem('sb_publishable_abc'), null);
  assert.equal(keyProblem(''), 'missing');
  assert.equal(configured({ supabaseUrl: '', supabaseAnonKey: '' }), false);
  // the shipped config is empty, so online play is off until a parent sets it up
  const cfg = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'online', 'config.js'), 'utf8');
  assert.match(cfg, /supabaseAnonKey: ''/);
  assert.doesNotMatch(cfg.replace(/\/\*[\s\S]*?\*\//, ''), /service_role|sb_secret_|eyJ/, 'no key in the shipped config');
});

test('auth service: guest sign-in, keeping progress, checks and sign-out', async () => {
  const calls = [];
  let listener = null, session = null;
  const user = (anon, email) => ({ id: 'u1', is_anonymous: anon, email });
  const fakeAuth = {
    onAuthStateChange: fn => { listener = fn; },
    getSession: async () => ({ data: { session }, error: null }),
    signInAnonymously: async () => { calls.push('anon'); session = { user: user(true), expires_at: 2e9 }; listener('SIGNED_IN', session); return { error: null }; },
    updateUser: async (u) => { calls.push(['update', Object.keys(u).sort().join(',')]); session = { user: user(false, u.email), expires_at: 2e9 }; listener('USER_UPDATED', session); return { error: null }; },
    signInWithPassword: async () => ({ error: { message: 'Invalid login credentials', status: 400 } }),
    signOut: async (o) => { calls.push(['signOut', o.scope]); return { error: null }; }
  };
  const auth = FGH.authService.create({ auth: fakeAuth });
  await auth.init();
  assert.equal(auth.state().signedIn, false);
  await assert.rejects(auth.keepGuestProgress('a@b.se', 'longpassword'), e => e.code === 'not_a_guest');
  await auth.signInAsGuest();
  assert.deepEqual(auth.state().user, { id: 'u1', email: null, guest: true });
  await assert.rejects(auth.keepGuestProgress('not-an-email', 'longpassword'), e => e.code === 'bad_email');
  await assert.rejects(auth.keepGuestProgress('a@b.se', 'short'), e => e.code === 'weak_password');
  await auth.keepGuestProgress('a@b.se', 'longpassword');
  assert.deepEqual(auth.state().user, { id: 'u1', email: 'a@b.se', guest: false }, 'same account id, now permanent');
  await assert.rejects(auth.signIn('a@b.se', 'wrong'), /Invalid login/);
  await auth.signOut(true);
  assert.equal(auth.state().signedIn, false);
  assert.deepEqual(calls, ['anon', ['update', 'email,password'], ['signOut', 'global']]);
});
