// Curriculum (Phase E): units, the nine lesson parts, Thai explanations, placement test, practice drills. No packages. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const ctx = { console, Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean, Error, RegExp, Intl };
  ctx.globalThis = ctx; ctx.window = undefined; vm.createContext(ctx);
  for (const f of ['content/academy-sv.js', 'content/academy-en-es.js', 'content/academy-th.js', 'content/academy-th-explain.js', 'content/academy-th-more.js', 'content/academy-th-read.js',
    'js/family/srs.js', 'js/family/academy.js', 'js/academy/curriculum.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const seeded = s => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const THAI = /[฀-๿]/;
const words = s => { const w = Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(String(s).replace(/\|/g, ''))).filter(x => x.isWordLike).map(x => x.segment); return String(s).includes('|') ? String(s).split('|') : w; };
const graphemes = s => Array.from(new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s), x => x.segment);

test('the Thai course follows the plan: five levels, units, every lesson in exactly one unit, in unit order', () => {
  const ctx = load(), AC = ctx.FGH.academy, CU = ctx.FGH.curriculum, c = AC.course('th');
  assert.equal(AC.levelIds(c).join(','), 'L1,L2,L3,L4,L5');
  assert.equal(c.levels.map(l => l.name.en).join(','), 'Beginner,Foundation,Elementary,Intermediate,Advanced');
  const us = CU.units(c), all = [].concat(...us.map(u => u.lessons.map(l => l.id)));
  assert.equal(all.length, c.lessons.length); assert.equal(new Set(all).size, all.length);
  assert.equal(all.join(','), c.lessons.map(l => l.id).join(','));
  for (const lv of AC.levelIds(c)) { assert.ok(CU.unitsAt(c, lv).length >= 2, lv); assert.ok(AC.lessonsAt(c, lv).length >= 4, lv); }
  for (const u of us) assert.ok(u.title.sv && u.title.th, u.id);
  // the plan's topics are covered somewhere at the right level
  const at = (lv, id) => assert.equal(AC.lessonById(c, id).level, lv, id);
  at('L2', 'th-2-spelling'); at('L3', 'th-3-finals'); at('L4', 'th-4-clusters'); at('L4', 'th-4-reading'); at('L5', 'th-5-songkran'); at('L5', 'th-5-translate');
});

test('every lesson has the nine parts and Thai explanations; every exercise is answerable in both explanation languages', () => {
  const ctx = load(), AC = ctx.FGH.academy, CU = ctx.FGH.curriculum, c = AC.course('th');
  for (const l of c.lessons) {
    const P = CU.parts(l, 'sv');
    for (const k of ['objectives', 'teacher', 'examples', 'explanation', 'audio', 'vocabulary', 'practice', 'assessment', 'completion']) assert.ok(P[k], l.id + ' ' + k);
    assert.ok(l.title.th && THAI.test(l.title.th), l.id + ' title.th'); assert.ok(l.goal.th && THAI.test(l.goal.th), l.id + ' goal.th');
    assert.ok(l.grammar.body.th && THAI.test(l.grammar.body.th), l.id + ' grammar.th');
    assert.ok(l.objectives.length >= 2 && l.objectives.every(o => o.sv && THAI.test(o.th)), l.id + ' objectives');
    for (const d of l.dialogue) assert.ok(THAI.test(d.t) && d.tr.sv, l.id + ' line');
    for (const ex of ['sv', 'th']) for (let s = 1; s < 6; s++) for (const q of AC.exercises(c, l, ex, seeded(s))) {
      if (q.opts) assert.ok(q.opts.some(o => String(o.v) === String(q.answer)), l.id + ' ' + q.id);
      if (q.type === 'order') assert.equal(q.tiles.slice().sort((a, b) => a.k - b.k).map(x => x.g).join(q.joiner), q.answer, l.id);
    }
    for (const e of l.exercises) if (e.q && e.q.sv) assert.ok(e.q.th, l.id + ' q.th ' + e.q.sv);
  }
  assert.ok(c.explain.includes('th'));
  const q = CU.quiz(c, c.lessons[0], 'sv', seeded(3));
  assert.equal(q.length, 5); assert.ok(q.every(x => x.type !== 'write' && x.type !== 'speak'));
});

test('a course without units (BOOK 42 order, teacher courses) gets one unit per level', () => {
  const ctx = load(), AC = ctx.FGH.academy, CU = ctx.FGH.curriculum, c = AC.course('thr');
  const us = CU.units(c);
  assert.equal(us.length, AC.levelIds(c).length);
  assert.equal([].concat(...us.map(u => u.lessons)).length, c.lessons.length);
  assert.ok(us.every(u => u.title === null));
});

test('placement test: 3 questions per level; the learner starts at the first level not passed', () => {
  const ctx = load(), AC = ctx.FGH.academy, CU = ctx.FGH.curriculum, c = AC.course('th');
  const qs = CU.placement(c, 'sv', seeded(9));
  assert.equal(qs.length, 15);
  for (const lv of AC.levelIds(c)) assert.equal(qs.filter(q => q.level === lv).length, 3);
  assert.ok(qs.every(q => q.opts.some(o => String(o.v) === String(q.answer))));
  const r = (a, b, c3, d, e) => ({ L1: { right: a, total: 3 }, L2: { right: b, total: 3 }, L3: { right: c3, total: 3 }, L4: { right: d, total: 3 }, L5: { right: e, total: 3 } });
  assert.equal(CU.placeResult(c, r(0, 0, 0, 0, 0)), 'L1');
  assert.equal(CU.placeResult(c, r(3, 2, 1, 3, 3)), 'L3');
  assert.equal(CU.placeResult(c, r(3, 3, 3, 3, 3)), 'L5');
});

test('practice drills: every kind gives questions up to the level; answers are among the options; tiles make the answer', () => {
  const ctx = load(), AC = ctx.FGH.academy, CU = ctx.FGH.curriculum, c = AC.course('th');
  const h = { wordsOf: words, graphemes };
  assert.equal(CU.DRILLS.length, 8);
  for (const k of CU.DRILLS) {
    const qs = CU.drill(k, c, 'L5', 'sv', seeded(4), h);
    assert.ok(qs.length >= 5, k + ' ' + qs.length);
    for (const q of qs) {
      if (q.opts) { assert.ok(q.opts.some(o => o.v === q.answer), k); assert.equal(new Set(q.opts.map(o => o.v)).size, q.opts.length, k); }
      if (q.type === 'order') assert.equal(q.tiles.slice().sort((a, b) => a.k - b.k).map(x => x.g).join(''), q.answer, k);
    }
  }
  // level 1 material only comes from level 1 lessons
  const l1 = new Set(AC.lessonsAt(c, 'L1').flatMap(l => l.vocab.map(w => w.t)));
  assert.ok(CU.drill('vocabTh', c, 'L1', 'sv', seeded(2), h).every(q => l1.has(q.answer)));
});
