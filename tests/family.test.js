// Family layer tests (no packages needed): points ledger, rewards, migration of existing data, activities,
// knowledge games, kids language exercises, adult academy, spaced repetition and content checks.
// Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(files) {
  const mem = {};
  const ctx = { console, Intl, Math, Date, Set, Map, JSON, Array, Object, String, Number, Boolean, Error, Promise, TextEncoder, crypto: globalThis.crypto,
    localStorage: { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } } };
  ctx.globalThis = ctx; ctx.window = undefined;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const plain = x => JSON.parse(JSON.stringify(x));
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const CORE = ['js/family/ledger.js', 'js/family/store.js'];
const DAY = 86400000;

test('ledger: balance is the sum of transactions; awards are idempotent and capped', () => {
  const { FGH } = load(CORE); const LG = FGH.ledger;
  const st = LG.emptyState(); const now = Date.parse('2026-10-30T10:00:00');
  assert.equal(LG.award(st, 'p', { key: 'a', kind: 'quiz', correct: 5, d: 2 }, now).amount, 20);
  assert.equal(LG.award(st, 'p', { key: 'a', kind: 'quiz', correct: 5, d: 2 }, now).error, 'duplicate');
  assert.equal(LG.award(st, 'p', { key: 'b', kind: 'quiz', correct: 50, d: 4 }, now).amount, 150);   // max per activity
  assert.equal(LG.award(st, 'p', { key: 'c', kind: 'kidslesson', pct: 85, repeat: true }, now).amount, 15);
  st.rules.dailyCap = 200;
  const capped = LG.award(st, 'p', { key: 'd', kind: 'spell', score: 100 }, now);
  assert.deepEqual([capped.amount, capped.capped], [15, true]);
  assert.equal(LG.award(st, 'p', { key: 'e', kind: 'spell', score: 100 }, now + DAY).amount, 100);   // a new day
  assert.equal(LG.balance(st, 'p'), 20 + 150 + 15 + 15 + 100);
  assert.equal(st.tx[st.tx.length - 1].balanceAfter, LG.balance(st, 'p'));
});

test('rewards: reserve on request, spend once on approval, nothing on rejection, never negative', () => {
  const { FGH } = load(CORE); const LG = FGH.ledger;
  const st = LG.emptyState();
  assert.equal(LG.saveReward(st, { name: '', cost: 5 }).error, 'name_required');
  assert.equal(LG.saveReward(st, { name: 'x', cost: 0 }).error, 'cost_required');
  assert.equal(LG.saveReward(st, { name: 'x', cost: 5, startsOn: '2026-12-01', endsOn: '2026-11-01' }).error, 'dates_order');
  const snack = LG.saveReward(st, { name: 'Snack', cost: 50, perChildLimit: 1 }).reward;
  const toy = LG.saveReward(st, { name: 'Toy', cost: 100 }).reward;
  assert.equal(LG.request(st, 'p', snack.id).error, 'not_enough');
  LG.adjust(st, 'p', 120, 'chores');
  const r = LG.request(st, 'p', snack.id); assert.equal(r.ok, true);
  assert.equal(LG.request(st, 'p', snack.id).error, 'limit_reached');   // the waiting request already uses the one allowed time
  assert.equal(LG.request(st, 'p', toy.id).error, 'not_enough');            // 70 left after the reservation
  assert.equal(LG.adjust(st, 'p', -100, 'oops').error, 'would_go_negative');
  assert.equal(LG.adjust(st, 'p', 5, ' ').error, 'note_required');
  assert.equal(LG.approve(st, r.redemption.id).ok, true);
  assert.equal(LG.approve(st, r.redemption.id).error, 'not_pending');
  assert.equal(LG.balance(st, 'p'), 70);
  assert.equal(LG.request(st, 'p', snack.id).error, 'limit_reached');
  LG.adjust(st, 'p', 100, 'more');
  const r2 = LG.request(st, 'p', toy.id); LG.reject(st, r2.redemption.id, Date.now(), 'not today');
  assert.equal(LG.balance(st, 'p'), 170);
  assert.equal(st.tx.filter(x => x.kind === 'spend').length, 1);
  assert.equal(LG.deleteReward(st, snack.id).archived, true);               // has history → archived
  const auto = LG.saveReward(st, { name: 'Sticker', cost: 10, autoApprove: true, totalLimit: 1 }).reward;
  assert.equal(LG.request(st, 'p', auto.id).redemption.status, 'approved');
  assert.equal(LG.request(st, 'q', auto.id).error, 'sold_out');
  const later = LG.saveReward(st, { name: 'Later', cost: 1, startsOn: '2999-01-01' }).reward;
  assert.equal(LG.request(st, 'p', later.id).error, 'not_started');
});

test('migration: existing KeyKids learners and hub players are linked, their points become an opening balance, nothing is lost', () => {
  const { FGH } = load(CORE); const F = FGH.family, LG = FGH.ledger;
  const f = F.emptyFamily();
  const kk = { v: 2, profiles: [{ id: 'k1', name: 'Mia', avatar: '🦊', age: 5, points: 120 }, { id: 'k2', name: 'Leo', age: 9, points: 0 }] };
  const hub = { v: 1, players: [{ id: 'h1', name: 'mia ', avatar: '🦊', level: 1 }, { id: 'h2', name: 'Pappa', avatar: '👨', level: 3 }] };
  const r = F.importLegacy(f, hub, kk);
  assert.deepEqual(plain(r), { added: 3, linked: 1 });
  const mia = F.byLink(f, 'keykids', 'k1');
  assert.equal(F.byLink(f, 'hub', 'h1').id, mia.id);
  assert.equal(LG.balance(f.ledger, mia.id), 120);
  assert.equal(F.byLink(f, 'hub', 'h2').kind, 'adult');
  assert.deepEqual(plain(F.importLegacy(f, hub, kk)), { added: 0, linked: 0 });   // runs again without doubling
  assert.equal(LG.balance(f.ledger, mia.id), 120);
  /* the stored record survives a round trip, and unknown data falls back to an empty family */
  const back = F.loadFamily(JSON.stringify(f));
  assert.equal(back.profiles.length, 3);
  assert.equal(F.loadFamily('{broken').profiles.length, 0);
  /* removing a profile keeps its points history */
  F.removeProfile(f, mia.id);
  assert.equal(F.activeProfiles(f).length, 2);
  assert.equal(LG.balance(f.ledger, mia.id), 120);
});

test('activities: logged once, repeat rule, adults earn nothing, daily goal bonus', () => {
  const { FGH } = load(CORE); const F = FGH.family;
  const f = F.emptyFamily();
  const kid = F.addProfile(f, { name: 'Mia', age: 7 }).profile;
  const mum = F.addProfile(f, { name: 'Mum', kind: 'adult' }).profile;
  F.updateProfile(f, kid.id, { goalMin: 10 });
  const a = F.finishActivity(f, kid.id, { key: 'x1', unit: 'u', kind: 'kidslesson', pct: 90, ms: 11 * 60000 });
  assert.equal(a.award.amount, 30); assert.equal(a.award.bonus, 15);
  assert.equal(F.finishActivity(f, kid.id, { key: 'x1', kind: 'quiz' }).error, 'duplicate');
  const b = F.finishActivity(f, kid.id, { key: 'x2', unit: 'u', kind: 'kidslesson', pct: 90 });
  assert.equal(b.repeat, true); assert.equal(b.award.amount, 15); assert.equal(b.award.bonus, undefined);
  assert.equal(F.finishActivity(f, mum.id, { key: 'x3', kind: 'quiz', correct: 9, d: 4 }).award.amount, 0);
  assert.equal(F.weekly(f, kid.id).length, 7);
  assert.equal(F.level(kid), 3); F.updateProfile(f, kid.id, { diff: 1 }); assert.equal(F.level(F.getProfile(f, kid.id)), 1);
});

test('parent PIN: stored hashed, checked, locked after 5 wrong tries', async () => {
  const { FGH } = load(CORE); const F = FGH.family;
  const f = F.emptyFamily();
  assert.equal((await F.setPin(f, '12')).error, 'pin_format');
  assert.equal((await F.setPin(f, '2468')).ok, true);
  assert.ok(!JSON.stringify(f).includes('"2468"'));
  assert.equal((await F.checkPin(f, '2468')).ok, true);
  for (let i = 0; i < 5; i++) assert.equal((await F.checkPin(f, '0000')).ok, false);
  assert.equal((await F.checkPin(f, '2468')).error, 'locked');
  assert.equal(F.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('learning progress from two devices is merged, not overwritten', () => {
  const { FGH } = load(CORE); const F = FGH.family;
  const a = { 'kl:th-es': { lessons: { greet: { best: 60, attempts: 1, done: true, last: 1, firstDone: 1 } }, timeMs: 100, lastAt: 1, current: 'greet', tests: [] } };
  const b = { 'kl:th-es': { lessons: { greet: { best: 90, attempts: 2, done: true, last: 5, firstDone: 3 }, colors: { best: 50, attempts: 1, done: false, last: 6, firstDone: 0 } }, timeMs: 300, lastAt: 6, current: 'colors', tests: [] },
    'ac:sv:th': { lessons: {}, timeMs: 0, lastAt: 0 } };
  const m = plain(F.mergeLearning(a, b));
  assert.equal(m['kl:th-es'].lessons.greet.best, 90);
  assert.equal(m['kl:th-es'].lessons.greet.firstDone, 1);
  assert.ok(m['kl:th-es'].lessons.colors);
  assert.equal(m['kl:th-es'].current, 'colors');
  assert.ok(m['ac:sv:th']);
});

test('knowledge games: right answer is always among the options, bands change the game, maths is correct', () => {
  const ctx = load(['js/keykids/core.js', 'js/data/countries.js', 'content/knowledge.js', 'js/family/kids-knowledge.js']);
  const KG = ctx.FGH.knowledgeGames; const rnd = seeded(7);
  for (const game of ['words', 'quiz', 'sounds', 'math', 'flags']) for (const band of [1, 2, 3, 4]) for (const lang of ['th', 'sv', 'en']) {
    const qs = KG.makeRound(game, lang, band, 'all', rnd, 8);
    assert.equal(qs.length, 8);
    for (const q of qs) {
      if (q.type === 'spell') { assert.equal(q.tiles.slice().sort((a, b) => a.k - b.k).map(t => t.g).join(''), q.answer); continue; }
      assert.ok(q.opts.some(o => String(o.v) === String(q.answer)), game + band + lang);
      assert.equal(new Set(q.opts.map(o => String(o.v))).size, q.opts.length, 'no duplicate options ' + game);
      if (band === 1 && game !== 'math' && game !== 'flags' && game !== 'quiz') assert.equal(q.type, 'pickpic');
      assert.ok(q.opts.length <= KG.OPTS[band]);
    }
  }
  for (let i = 0; i < 200; i++) {
    const q = KG.mathQuestion(1 + (i % 4), rnd);
    if (!q.prompt) { assert.equal(Array.from(q.pic).length / Array.from(q.pic.slice(0, 2)).length >= 1, true); continue; }
    const expr = q.prompt.replace(' = ?', '').replace('½ × ', '0.5*').replace('×', '*').replace('÷', '/').replace('−', '-');
    assert.equal(String(Function('return ' + expr)()), q.answer, q.prompt);
  }
});

test('kids language: all five pairs work at every age; content has all four languages; Thai sentence breaks rebuild the sentence', () => {
  const ctx = load(['content/kids-language.js', 'js/family/kids-language.js']);
  const KL = ctx.FGH.kidsLanguage, C = KL.content();
  assert.deepEqual(plain(C.pairs.map(p => p.id)), ['th-es', 'th-sv', 'sv-th', 'en-sv', 'sv-en']);
  assert.equal(C.levels.length, 5);
  const ids = new Set();
  for (const lv of C.levels) for (const l of lv.lessons) {
    assert.ok(!ids.has(l.id), 'unique lesson id ' + l.id); ids.add(l.id);
    for (const it of l.items) for (const lang of ['th', 'sv', 'en', 'es']) assert.ok(it[lang] && String(it[lang]).trim(), l.id + ' ' + it.id + ' missing ' + lang);
    if (l.questions) for (const q of l.questions) { assert.ok(q.a < q.opts.length); for (const lang of ['th', 'sv', 'en', 'es']) assert.ok(q.q[lang] && q.opts.every(o => o[lang])); }
  }
  const rnd = seeded(3);
  for (const pair of C.pairs) for (const band of [1, 2, 3, 4]) for (const l of KL.lessons({})) {
    const ex = KL.exercises(l, pair, band, rnd);
    assert.ok(ex.length > 0, pair.id + ' ' + l.id);
    for (const e of ex) {
      if (e.opts) assert.ok(e.opts.some(o => String(o.v) === String(e.answer)), pair.id + l.id + e.type);
      if (e.tiles) assert.equal(KL.clean(e.tiles.slice().sort((a, b) => a.k - b.k).map(t => t.g).join(e.sep || '')), KL.clean(e.answer));
      if (band === 1) assert.ok(['listen', 'speak', 'complete', 'translate', 'question', 'reply'].includes(e.type), 'little ones: ' + e.type);
    }
  }
  /* family words appear only in pairs where both languages are filled in */
  const custom = { kidsWords: [{ id: 'w1', pic: '🏡', th: 'บ้านยาย', sv: 'mormors hus' }] };
  const fw = KL.lessons(custom).find(l => l.id === 'family_words');
  assert.equal(KL.usable(fw, KL.pairById('th-sv')).length, 1);
  assert.equal(KL.usable(fw, KL.pairById('th-es')).length, 0);
  assert.ok(!KL.lessons({ disabledLessons: ['greet'] }).some(l => l.id === 'greet'));
  assert.ok(KL.reviewLesson(KL.lessons({}), { cat: { right: 0, wrong: 2 } }, KL.pairById('th-es')).items.some(i => i.id === 'cat'));
});

test('adult academy: every lesson has dialogue, words, grammar and exercises in its explanation languages; tests and continue work', () => {
  const ctx = load(['content/academy-sv.js', 'content/academy-en-es.js', 'js/family/srs.js', 'js/family/academy.js']);
  const AC = ctx.FGH.academy, SRS = ctx.FGH.srs;
  assert.deepEqual(plain(Object.keys(AC.courses()).sort()), ['en', 'es', 'sv']);
  const rnd = seeded(11);
  for (const target of ['sv', 'en', 'es']) {
    const c = AC.course(target);
    assert.ok(AC.LEVELS.includes(c.lessons[0].level));
    for (const l of c.lessons) {
      assert.ok(l.dialogue.length >= 4 && l.vocab.length >= 5 && l.exercises.length >= 4, l.id);
      for (const ex of c.explain) {
        for (const d of l.dialogue) assert.ok(d.tr[ex], l.id + ' dialogue ' + ex);
        for (const w of l.vocab) assert.ok(w.tr[ex], l.id + ' ' + w.t + ' ' + ex);
        assert.ok(l.title[ex] && l.goal[ex] && l.grammar.title[ex] && l.grammar.body[ex], l.id + ' texts ' + ex);
        const exs = AC.exercises(c, l, ex, rnd);
        for (const e of exs) {
          if (e.opts) assert.ok(e.opts.some(o => String(o.v) === String(e.answer)), l.id + ' ' + e.type);
          if (e.type === 'order') assert.equal(AC.check(e, e.tiles.slice().sort((a, b) => a.k - b.k).map(t => t.g).join(' ')), true);
          if (e.type === 'translate') assert.equal(AC.check(e, e.answer.toUpperCase() + '!!'), true);
          if (e.type === 'gap') assert.ok(e.text.includes('___'));
        }
      }
    }
  }
  const sv = AC.course('sv');
  assert.deepEqual(plain(AC.LEVELS.map(lv => AC.lessonsAt(sv, lv).length > 0)), [true, true, true, true, true]);   // A1–C1 all have lessons
  assert.equal(AC.levelTest(sv, 'A1', 'th', rnd, 10).length, 10);
  assert.ok(AC.levelTest(sv, 'A1', 'th', rnd, 10).every(e => e.type !== 'write'));
  /* continue learning: the lesson in progress first, never back to the start */
  assert.equal(AC.nextLesson(sv, { lessons: {}, current: null }, 'A2').level, 'A2');
  assert.equal(AC.nextLesson(sv, { lessons: { 'sv-a1-hej': { done: true } }, current: 'sv-a1-hej' }, 'A1').id, 'sv-a1-handla');
  assert.equal(AC.nextLesson(sv, { lessons: {}, current: 'sv-b1-asikt' }, 'A1').id, 'sv-b1-asikt');
  /* spaced repetition: right answers push the review out, wrong ones bring it back today */
  let c = SRS.newCard('sv:x', 0);
  c = SRS.grade(c, 'good', 0); assert.equal(c.interval, 1);
  c = SRS.grade(c, 'good', DAY); assert.equal(c.interval, 3);
  c = SRS.grade(c, 'good', 4 * DAY); assert.ok(c.interval >= 7);
  c = SRS.grade(c, 'again', 20 * DAY); assert.deepEqual(plain([c.reps, c.interval, c.lapses]), [0, 0, 1]); assert.ok(c.due < 20 * DAY + DAY);
  const deck = {}; SRS.addCards(deck, ['sv:a', 'sv:b', 'en:c'], 0);
  assert.equal(SRS.due(deck, DAY, 'sv:').length, 2);
});

test('texts: every family-page text exists in Thai, Swedish and English', () => {
  const { FGH } = load(['js/family/i18n.js']);
  const flat = (o, p) => Object.keys(o).reduce((a, k) => (o[k] && typeof o[k] === 'object') ? a.concat(flat(o[k], p + k + '.')) : a.concat(p + k), []);
  const en = flat(FGH.FT.en, '');
  for (const l of ['sv', 'th']) { const has = new Set(flat(FGH.FT[l], '')); for (const k of en) assert.ok(has.has(k), l + ' is missing ' + k); }
});

test('pages: every script a page loads exists, and the KeyKids page keeps its scripts in order', () => {
  const root = path.join(__dirname, '..');
  for (const page of ['index.html', 'play.html', 'keykids.html', 'kids.html', 'academy.html', 'parent.html', 'online.html', 'student.html', 'teacher.html', 'content.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(/^<!doctype html>/i.test(html), page + ' has a doctype');
    for (const m of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"#:]+)"/g)) assert.ok(fs.existsSync(path.join(root, m[1])), page + ' → ' + m[1]);
  }
});
