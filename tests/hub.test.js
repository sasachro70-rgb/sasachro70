// Family Game Hub core tests. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
// objects made inside the vm sandbox have other prototypes, so compare plain copies
const deq = (actual, expected, msg) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, msg);

function loadHub() {
  const ctx = { console, Intl, Math, Date, Set, Map, JSON, Array, Object, String, Number, Error };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['js/i18n.js', 'js/data/countries.js', 'js/hub-core.js', 'js/games/flag-quiz.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  }
  return ctx.FGH;
}
/* repeatable random numbers */
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
function family(FGH) {
  const s = FGH.core.emptyState();
  const mia = FGH.core.addPlayer(s, { name: ' Mia ', avatar: '🦊', level: 1 });
  const dad = FGH.core.addPlayer(s, { name: 'Pappa', avatar: '👨', level: 3 });
  const ann = FGH.core.addPlayer(s, { name: 'Ann', avatar: '👧', level: 2 });
  return { s, mia, dad, ann };
}

test('every country has names in three languages and a flag', () => {
  const { countries } = loadHub();
  assert.ok(countries.list.length >= 30);
  for (const c of countries.list) {
    for (const l of ['th', 'sv', 'en']) { assert.ok(c.name[l], c.code + ' ' + l); assert.ok(c.capital[l], c.code + ' capital ' + l); }
    assert.ok(countries.hasFlag(c.code), 'flag ' + c.code);
    for (const x of countries.similar(c.code)) assert.ok(countries.byCode[x], 'look-alike ' + x);
  }
  assert.equal(new Set(countries.codes).size, countries.codes.length);
});

test('interface texts exist in all three languages', () => {
  const { T } = loadHub();
  for (const l of ['th', 'sv']) for (const k of Object.keys(T.en)) assert.ok(k in T[l], l + ' missing ' + k);
});

test('game registry rejects incomplete games and lists registered ones', () => {
  const { core } = loadHub();
  assert.throws(() => core.registerGame({ id: 'x' }), /missing/);
  deq(core.listGames().map(g => g.id), ['flags']);
  // a new game only needs the documented fields to work with players, turns, scores and history
  core.registerGame({ id: 'sum', name: { en: 'Sums' }, levels: 1,
    makeQuestion: ({ used }) => { const n = used.size; used.add(n); return { a: n, b: 1 }; },
    isCorrect: (q, ans) => +ans === q.a + q.b, questionHTML: () => '', answerText: q => String(q.a + q.b) });
  const s = core.emptyState(); const p = core.addPlayer(s, { name: 'Tester' });
  const m = core.createMatch(s, { gameId: 'sum', playerIds: [p.id], rounds: 2 });
  core.answerTurn(m, '1', 500); core.nextTurn(m);
  core.answerTurn(m, '9', 500); core.nextTurn(m);
  assert.equal(m.phase, 'done');
  const e = core.finishMatch(s, m);
  assert.equal(e.players[0].score, 10);
  assert.equal(core.playerStats(s, p.id, 'sum').games, 1);
});

test('players: names are trimmed, empty names refused, ids unique', () => {
  const { core } = loadHub();
  const { s, mia, dad } = family(loadHub());
  assert.equal(mia.name, 'Mia');
  assert.notEqual(mia.id, dad.id);
  assert.throws(() => core.addPlayer(s, { name: '   ' }), /name/);
  assert.equal(core.cleanName('x'.repeat(40)).length, 20);
});

test('a match gives every player the same number of turns in order, with no flag asked twice', () => {
  const FGH = loadHub(), { core } = FGH;
  const { s, mia, dad, ann } = family(FGH);
  const m = core.createMatch(s, { gameId: 'flags', playerIds: [dad.id, mia.id, ann.id], rounds: 8, timer: 15, rnd: seeded(7) });
  assert.equal(m.turns.length, 24);
  deq(m.turns.slice(0, 6).map(t => t.p), [0, 1, 2, 0, 1, 2]);
  assert.equal(new Set(m.turns.map(t => t.q.code)).size, 24);
  assert.equal(m.players[0].name, 'Pappa');
});

test('each player gets questions for their own level', () => {
  const FGH = loadHub(), { core, countries } = FGH;
  const { s, mia, dad } = family(FGH);
  for (let seed = 1; seed < 30; seed++) {
    const m = core.createMatch(s, { gameId: 'flags', playerIds: [mia.id, dad.id], rounds: 5, rnd: seeded(seed) });
    for (const t of m.turns) {
      const q = t.q, sim = countries.similar(q.code), lvl = m.players[t.p].level;
      assert.ok(q.opts.includes(q.code));
      assert.equal(new Set(q.opts).size, q.opts.length);
      if (lvl === 1) { assert.equal(q.opts.length, 3); assert.equal(q.opts.filter(c => sim.includes(c)).length, 0, 'easy has no look-alikes'); }
      if (lvl === 3) { assert.equal(q.opts.length, 4); assert.equal(q.opts.filter(c => sim.includes(c)).length, Math.min(3, sim.length), 'hard uses look-alikes'); }
    }
  }
});

test('long matches reuse flags only after all have been asked', () => {
  const FGH = loadHub(), { core, countries } = FGH;
  const { s, mia, dad, ann } = family(FGH);
  const m = core.createMatch(s, { gameId: 'flags', playerIds: [mia.id, dad.id, ann.id], rounds: 20, rnd: seeded(3) });
  const n = countries.codes.length;
  assert.equal(new Set(m.turns.slice(0, n).map(t => t.q.code)).size, n);
});

test('scoring: 10 for right, up to 5 speed bonus with a timer, 0 for wrong or time out', () => {
  const { core } = loadHub();
  assert.equal(core.pointsFor(true, 0, 0), 10);
  assert.equal(core.pointsFor(true, 0, 15), 15);
  assert.equal(core.pointsFor(true, 7500, 15), 13);
  assert.equal(core.pointsFor(true, 15000, 15), 10);
  assert.equal(core.pointsFor(false, 100, 15), 0);
  const FGH = loadHub(); const { s, mia } = family(FGH);
  const m = FGH.core.createMatch(s, { gameId: 'flags', playerIds: [mia.id], rounds: 1, timer: 10, rnd: seeded(1) });
  const a = FGH.core.answerTurn(m, null, 10000);
  deq([a.correct, a.timedOut, a.points], [false, true, 0]);
  // answering twice does not change the result
  assert.equal(FGH.core.answerTurn(m, m.turns[0].q.code, 10).points, 0);
});

test('standings share a place on a tie, history and stats are recorded', () => {
  const FGH = loadHub(), { core } = FGH;
  const { s, mia, dad, ann } = family(FGH);
  const m = core.createMatch(s, { gameId: 'flags', playerIds: [mia.id, dad.id, ann.id], rounds: 2, rnd: seeded(5) });
  s.current = m;
  const plan = [true, true, false, true, true, false]; // Mia 2, Pappa 2, Ann 0
  plan.forEach(ok => { const t = core.currentTurn(m); core.answerTurn(m, ok ? t.q.code : t.q.opts.find(c => c !== t.q.code), 1000); core.nextTurn(m); });
  const st = core.standings(m);
  deq(st.map(r => [r.name, r.score, r.rank]), [['Mia', 20, 1], ['Pappa', 20, 1], ['Ann', 0, 3]]);
  const e = core.finishMatch(s, m);
  deq(e.winners.sort(), [mia.id, dad.id].sort());
  assert.equal(s.current, null);
  assert.equal(s.history.length, 1);
  deq(core.playerStats(s, mia.id), { games: 1, wins: 1, best: 20, accuracy: 100 });
  deq(core.playerStats(s, ann.id), { games: 1, wins: 0, best: 0, accuracy: 0 });
  // finishing the same match again does not add a second history entry
  core.finishMatch(s, m);
  assert.equal(s.history.length, 1);
});

test('saved data: broken or foreign data falls back safely, a removed player keeps history', () => {
  const FGH = loadHub(), { core } = FGH;
  deq(core.loadState('{broken').players, []);
  deq(core.loadState(JSON.stringify({ v: 99, players: [1] })).players, []);
  const { s, mia, dad } = family(FGH);
  const m = core.createMatch(s, { gameId: 'flags', playerIds: [mia.id, dad.id], rounds: 1, rnd: seeded(2) });
  s.current = m;
  const again = core.loadState(JSON.stringify(s));
  assert.equal(again.current.turns.length, 2);
  const bad = JSON.parse(JSON.stringify(s)); bad.current.gameId = 'nope';
  assert.equal(core.loadState(JSON.stringify(bad)).current, null);
  core.removePlayer(s, mia.id);
  assert.equal(s.current, null, 'a match with a removed player is dropped');
  assert.equal(s.players.length, 2);
});
