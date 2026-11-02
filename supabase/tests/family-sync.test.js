// End-to-end test of js/family/cloud-sync.js + actions.js against migrations 0001 + 0002:
// a device's local family data is uploaded, a child earns points, asks for a reward, a parent approves,
// and a second device sees the same balance and progress. Supabase Auth is faked; the database rules are real.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { PGlite } = require('@electric-sql/pglite');

const ROOT = path.join(__dirname, '..', '..');
const STANDIN = fs.readFileSync(path.join(__dirname, 'security.test.js'), 'utf8').match(/const SUPABASE_STANDIN = `([\s\S]*?)`;/)[1];
const MIG = n => fs.readFileSync(path.join(__dirname, '..', 'migrations', n), 'utf8');

function fakeClient(db, user) {
  async function run(sql, params) {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: user.id, role: 'authenticated', is_anonymous: false })]);
    await db.exec('set role authenticated');
    try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
  }
  /* one database connection is shared by every device in this test: one query at a time */
  db.chain = db.chain || Promise.resolve();
  const lock = fn => { const p = db.chain.then(fn, fn); db.chain = p.catch(() => {}); return p; };
  return {
    auth: { async getSession() { return { data: { session: { user: { id: user.id, is_anonymous: false } } } }; } },
    rpc: (name, args) => lock(async () => {
      const keys = Object.keys(args || {}).filter(k => args[k] !== undefined);
      const params = keys.map(k => (args[k] !== null && typeof args[k] === 'object') ? JSON.stringify(args[k]) : args[k]);
      try {
        const res = await run(`select * from public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`, params);
        const scalar = res.rows.length === 1 && res.fields.length === 1 && res.fields[0].name === name;
        return { data: scalar ? res.rows[0][name] : res.rows, error: null };
      } catch (e) { return { data: null, error: { message: e.message } }; }
    }),
    from(table) {
      const q = { cols: '*', where: [], params: [], order: [], limit: null, update: null };
      const b = {
        select(c) { q.cols = c; return b; }, update(v) { q.update = v; return b; },
        eq(c, v) { q.params.push(v); q.where.push(`${c} = $${q.params.length}`); return b; },
        in(c, arr) { q.params.push(arr.map(String)); q.where.push(`${c}::text = any($${q.params.length}::text[])`); return b; },
        order(c, o) { q.order.push(c + (o && o.ascending === false ? ' desc' : '')); return b; },
        limit(n) { q.limit = n; return b; },
        then(ok, bad) {
          let sql;
          if (q.update) { const ks = Object.keys(q.update); const base = q.params.length; ks.forEach(k => q.params.push(q.update[k])); sql = `update public.${table} set ${ks.map((k, i) => k + ' = $' + (base + i + 1)).join(', ')} where ${q.where.join(' and ')}`; }
          else sql = `select ${q.cols} from public.${table}` + (q.where.length ? ' where ' + q.where.join(' and ') : '') + (q.order.length ? ' order by ' + q.order.join(', ') : '') + (q.limit ? ' limit ' + q.limit : '');
          return lock(() => run(sql, q.params)).then(r => ({ data: r.rows, error: null }), e => ({ data: null, error: { message: e.message } })).then(ok, bad);
        }
      };
      return b;
    }
  };
}

/* one "device": its own localStorage and its own copy of the family scripts */
function device(client) {
  const mem = {};
  const g = { localStorage: { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
    crypto: globalThis.crypto, addEventListener() {}, setTimeout, setInterval: () => 0, clearInterval() {}, console, Intl, TextEncoder, Date, Math, JSON, Promise, Object, Array, Set, Map, String, Number, Boolean, Error, URLSearchParams };
  g.window = g; g.FGH_CONFIG = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' };
  const vm = require('vm'); vm.createContext(g);
  for (const f of ['js/family/ledger.js', 'js/family/store.js', 'js/online/supabase-client.js', 'js/family/cloud-sync.js', 'js/family/actions.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), g, { filename: f });
  g.FGH.supabaseClient.createClient = async () => client;
  return g.FGH;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

test('family sync: upload, earn, redeem, approve, and a second device sees it all', async () => {
  const db = new PGlite(); await db.exec(STANDIN); await db.exec(MIG('0001_family_hub_security.sql')); await db.exec(MIG('0002_points_rewards_learning.sql'));
  const owner = { id: randomUUID() };
  const c1 = fakeClient(db, owner);
  const fam = (await c1.rpc('create_family', { p_name: 'Home' })).data;

  // device 1 has local data from before the family account: a child with 120 KeyKids points and a reward
  const D1 = device(c1);
  D1.familyStore.mutate(f => {
    const p = D1.family.addProfile(f, { name: 'Mia', age: 7 }).profile;
    D1.ledger.openingBalance(f.ledger, p.id, 120, Date.now());
    D1.ledger.saveReward(f.ledger, { name: 'Snack', icon: '🍫', cost: 50 });
    D1.family.recordLesson(f, p.id, 'kl:th-es', 'greet', 90, 60000, 60);
  });
  assert.equal(await D1.cloud.start(), true);
  await D1.cloud.setPin('2468'); await D1.cloud.unlock('2468');
  await D1.cloud.uploadLocal();
  const mia = D1.familyStore.get().profiles[0];
  assert.ok(mia.cloudId);
  assert.equal((await c1.rpc('point_balance', { p_profile: mia.cloudId })).data, 120);
  const learning = (await c1.from('learning_state').select('data').eq('profile_id', mia.cloudId)).data[0].data;
  assert.equal(learning.learning['kl:th-es'].lessons.greet.best, 90);

  // a finished game on device 1: queued, sent, counted by the server rules (5 right × 2 × level 2 = 20)
  D1.actions.finish(mia.id, { key: 'game-1', area: 'kids', kind: 'quiz', correct: 5, d: 2, title: 'quiz', ms: 120000 });
  await wait(300); await D1.cloud.sync();
  assert.equal((await c1.rpc('point_balance', { p_profile: mia.cloudId })).data, 140);
  // the same game sent again (lost reply) does not pay twice
  D1.cloud.queueFinish(mia.id, { key: 'game-1', area: 'kids', kind: 'quiz', correct: 5, d: 2 });
  await wait(300); await D1.cloud.sync();
  assert.equal((await c1.rpc('point_balance', { p_profile: mia.cloudId })).data, 140);

  // device 2 (the child's tablet, same family account): sees balance, reward and progress; asks for the reward
  const D2 = device(fakeClient(db, owner));
  assert.equal(await D2.cloud.start(), true);
  const f2 = D2.familyStore.get(), mia2 = f2.profiles.find(p => p.cloudId === mia.cloudId);
  assert.equal(D2.ledger.balance(f2.ledger, mia2.id), 140);
  assert.equal(f2.learning[mia2.id]['kl:th-es'].lessons.greet.done, true);
  const rw = f2.ledger.rewards[0];
  const req = await D2.actions.request(mia2.id, rw.id);
  assert.equal(req.ok, true);
  const again = await D2.actions.request(mia2.id, rw.id);
  assert.equal(again.ok, false); assert.equal(again.error, 'pending_exists');

  // device 1 parent approves: 50 points spent once, both devices agree
  await D1.cloud.sync();
  const red = D1.familyStore.get().ledger.redemptions.find(r => r.status === 'pending');
  assert.equal((await D1.actions.approve(red.id)).ok, true);
  assert.equal((await D1.actions.approve(red.id)).ok, false);
  await D2.cloud.sync();
  assert.equal(D2.ledger.balance(D2.familyStore.get().ledger, mia2.id), 90);
  assert.equal(D1.ledger.balance(D1.familyStore.get().ledger, mia.id), 90);

  // progress made on both devices is merged, not overwritten
  D2.actions.recordLesson(mia2.id, 'kl:th-es', 'colors', 70, 30000, 60);
  D1.actions.recordLesson(mia.id, 'kl:th-es', 'numbers', 100, 30000, 60);
  await wait(400); await D2.cloud.sync(); await D1.cloud.sync(); await wait(300); await D2.cloud.sync();
  const l2 = D2.familyStore.get().learning[mia2.id]['kl:th-es'].lessons;
  assert.deepEqual(Object.keys(l2).sort(), ['colors', 'greet', 'numbers']);
});
