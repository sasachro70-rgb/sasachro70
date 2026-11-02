// "Läsa och skriva thailändska" (course thr): chapter order after BOOK 42 (Kru Aom); texts written for the app. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const plain = x => JSON.parse(JSON.stringify(x));
function load(files) {
  const ctx = { console, Math, JSON }; ctx.globalThis = ctx; ctx.window = undefined; vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  return ctx;
}
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const THAI = /[฀-๿]/;
const files = ['content/academy-sv.js', 'content/academy-en-es.js', 'content/academy-th.js', 'content/academy-th-read.js', 'js/family/srs.js', 'js/family/academy.js'];

test('reading course: 10 chapters over 5 steps, Thai + romanization + Swedish everywhere, Thai explanations for titles and grammar', () => {
  const AC = load(files).FGH.academy, c = AC.course('thr');
  assert.equal(c.target, 'th');
  assert.equal(c.track, 'thai');
  assert.deepEqual(plain(AC.levelIds(c)), ['R1', 'R2', 'R3', 'R4', 'R5']);
  assert.deepEqual(plain(c.lessons.map(l => l.id)), ['thr-1', 'thr-2', 'thr-3', 'thr-4', 'thr-5', 'thr-6', 'thr-7', 'thr-8', 'thr-9', 'thr-10']);
  for (const lv of AC.levelIds(c)) assert.equal(AC.lessonsAt(c, lv).length, 2, lv);
  const rnd = seeded(3);
  for (const l of c.lessons) {
    assert.ok(l.title.sv && l.title.th && l.goal.sv && l.goal.th && l.grammar.title.sv && l.grammar.title.th && l.grammar.body.sv && l.grammar.body.th, l.id + ' sv + th texts');
    assert.ok(l.vocab.length >= 6 && l.dialogue.length >= 3 && l.exercises.length >= 6, l.id + ' size');
    for (const d of l.dialogue) { assert.ok(THAI.test(d.t) && d.rom && d.tr.sv, l.id + ' line ' + d.t); assert.ok(!THAI.test(d.rom), d.rom); }
    for (const w of l.vocab) { assert.ok(THAI.test(w.t) && w.rom && w.tr.sv, l.id + ' ' + w.t); assert.ok(!THAI.test(w.rom), w.rom); }
    if (l.grammar.table) for (const r of l.grammar.table) assert.equal(r.length, l.grammar.table[0].length, l.id + ' table row length');
    for (const e of AC.exercises(c, l, 'sv', rnd)) {
      if (e.opts) assert.ok(e.opts.some(o => String(o.v) === String(e.answer)), l.id + ' ' + e.type + ' answer is an option');
      if (e.type === 'order') { assert.equal(e.joiner, ''); assert.equal(AC.check(e, e.tiles.slice().sort((a, b) => a.k - b.k).map(t => t.g).join('')), true); }
      if (e.type === 'gap') assert.ok(e.text.includes('___') && e.sub);
      if (e.type === 'mc' && e.noSay) assert.equal(e.say, null);
    }
    /* Thai explanations are used when the learner picks ภาษาไทย; Swedish stays the fallback */
    assert.equal(AC.tr(l.grammar.body, 'th'), l.grammar.body.th);
    assert.equal(AC.tr(l.vocab[0].tr, 'th'), l.vocab[0].tr.sv);
  }
});

test('reading course: Thai facts used in the exercises', () => {
  const AC = load(files).FGH.academy, c = AC.course('thr');
  const ex = (id, prompt, q) => c.lessons.find(l => l.id === id).exercises.find(e => e.prompt === prompt && (!q || e.q.sv.includes(q)));
  const answer = e => e.opts[e.a];
  /* live (คำเป็น) and dead (คำตาย) syllables */
  assert.match(answer(ex('thr-1', 'ตา')), /^คำเป็น/);
  assert.match(answer(ex('thr-1', 'กะ')), /^คำตาย/);
  assert.match(answer(ex('thr-9', 'นก')), /^คำตาย/);
  assert.match(answer(ex('thr-9', 'ลม')), /^คำเป็น/);
  assert.match(answer(ex('thr-8', 'ทำ')), /^คำเป็น/);
  /* final-consonant groups and tones */
  assert.equal(answer(ex('thr-2', 'กิน')), 'แม่ กน');
  assert.equal(answer(ex('thr-2', 'มด')), 'แม่ กด');
  assert.equal(answer(ex('thr-2', 'ลิง')), 'แม่ กง');
  assert.match(answer(ex('thr-5', 'ป้า')), /^โท/);
  assert.match(answer(ex('thr-5', 'ค่า')), /^โท/);
  assert.match(answer(ex('thr-5', 'ข')), /^อักษรสูง/);
  assert.match(answer(ex('thr-5', 'ก')), /^อักษรกลาง/);
  const finals = c.lessons.find(l => l.id === 'thr-2').grammar.table;
  assert.equal(finals.length - 1, 9, 'nine final-consonant groups');
  const vowels = c.lessons.find(l => l.id === 'thr-10').grammar.table;
  assert.equal((vowels.length - 1) * 2 + 4 + 4, 32, '12 pairs + อำ ใอ ไอ เอา + ฤ ฤๅ ฦ ฦๅ = 32');
  const tones = c.lessons.find(l => l.id === 'thr-5').grammar.table;
  assert.deepEqual(plain(tones[1]), ['กลาง ป', 'ปา', 'ป่า', 'ป้า', 'ป๊า', 'ป๋า']);
});

test('reading course: pages load it, the other-courses picker and home page leave it out', () => {
  const root = path.join(__dirname, '..');
  for (const p of ['academy.html', 'parent.html', 'student.html']) assert.ok(fs.readFileSync(path.join(root, p), 'utf8').includes('content/academy-th-read.js'), p);
  assert.ok(fs.readFileSync(path.join(root, 'js/family/academy-ui.js'), 'utf8').includes('.filter(k => !AC.course(k).track)'));
  assert.ok(fs.readFileSync(path.join(root, 'js/family/hub-bridge.js'), 'utf8').includes('!a.course(k).track'));
});
