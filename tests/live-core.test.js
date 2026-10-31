// Live lesson logic (js/classroom/live-core.js) and the live page wiring. No packages. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const ctx = { console, Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean, Error, RegExp };
  ctx.globalThis = ctx; ctx.window = undefined; vm.createContext(ctx);
  for (const f of ['content/academy-sv.js', 'content/academy-en-es.js', 'content/academy-th.js', 'content/academy-th-read.js', 'js/family/srs.js', 'js/family/academy.js', 'js/classroom/live-core.js', 'js/classroom/live-i18n.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const plain = x => JSON.parse(JSON.stringify(x));

test('steps: start, grammar, reading and words in groups, end – the same on every device', () => {
  const ctx = load(), AC = ctx.FGH.academy, LC = ctx.FGH.liveCore;
  for (const id of ['th', 'thr']) for (const l of AC.course(id).lessons) {
    const st = plain(LC.steps(l));
    assert.equal(st[0].kind, 'intro'); assert.equal(st[st.length - 1].kind, 'end');
    const lines = st.filter(s => s.kind === 'lines').reduce((n, s) => n + s.to - s.from, 0), words = st.filter(s => s.kind === 'words').reduce((n, s) => n + s.to - s.from, 0);
    assert.equal(lines, l.dialogue.length, l.id + ' every line once'); assert.equal(words, l.vocab.length, l.id + ' every word once');
    assert.ok(st.every(s => s.to == null || s.to - s.from <= LC.GROUP));
    assert.deepEqual(plain(LC.steps(l)), st);
    if (l.tones) assert.ok(st.some(s => s.kind === 'tones'));
    const w = st.find(s => s.kind === 'words'); assert.deepEqual(plain(LC.textsOf(l, w)), plain(l.vocab.slice(w.from, w.to).map(x => x.t)));
  }
  assert.deepEqual(plain(LC.steps(null)), [{ kind: 'intro' }]);
});

test('exercise pool: only answerable-by-choice questions; the public part carries no answer; the key is one of the options', () => {
  const ctx = load(), AC = ctx.FGH.academy, LC = ctx.FGH.liveCore;
  const c = AC.course('thr'), l = c.lessons[0], pool = LC.pool(c, l, 'sv');
  assert.ok(pool.length >= 5);
  for (const q of pool) {
    assert.ok(['mc', 'listen', 'gap'].includes(q.pub.type));
    assert.equal(q.pub.answer, undefined);
    assert.ok(q.pub.opts.some(o => o.v === q.key), q.id);
    assert.equal(new Set(q.pub.opts.map(o => o.v)).size, q.pub.opts.length);
  }
  assert.deepEqual(plain(LC.pool(c, l, 'sv').map(q => q.pub)), plain(pool.map(q => q.pub)));   // same order each time
  const ta = plain(LC.tally([{ name: 'A', current: { choice: 'x', ok: true } }, { name: 'B', current: { choice: 'y', ok: false } }, { name: 'C', current: null }], { opts: [{ v: 'x' }, { v: 'y' }, { v: 'z' }] }));
  assert.deepEqual(ta, { total: 2, right: 1, by: { x: ['A'], y: ['B'], z: [] } });
});

test('texts exist in sv, en, th; pages load scripts in the right order', () => {
  const ctx = load(), S = ctx.FGH.liveTexts;
  const keys = o => Object.keys(o).sort();
  for (const ns of ['live', 'cls']) { assert.deepEqual(keys(S.en[ns]), keys(S.sv[ns])); assert.deepEqual(keys(S.th[ns]), keys(S.sv[ns])); }
  const html = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const order = (page, a, b) => { const h = html(page); assert.ok(h.indexOf(a) > 0 && h.indexOf(a) < h.indexOf(b), page + ': ' + a + ' before ' + b); };
  order('live.html', 'js/family/i18n.js', 'js/classroom/live-i18n.js');
  order('live.html', 'js/academy/access.js', 'js/classroom/live-ui.js');
  order('live.html', 'js/classroom/live-core.js', 'js/classroom/live-ui.js');
  order('live.html', 'js/family/cloud-voice.js', 'js/family/voice.js');
  order('teacher.html', 'js/classroom/live-core.js', 'js/school/teacher-ui.js');
  order('academy.html', 'js/family/i18n.js', 'js/classroom/live-i18n.js');
});
