// The pronunciation module: data checks (44 consonants, classes, vowels, tones and tone rules) and the listening questions. No packages. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const ctx = { console, Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean, Error, RegExp, Intl };
  ctx.globalThis = ctx; ctx.window = undefined; vm.createContext(ctx);
  for (const f of ['content/pronunciation-th.js', 'js/academy/pron-ui.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const THAI = /^[฀-๿\s|–]+$/;

test('44 consonants, each once, with the right number per class; every item has Thai, romanization and audio text', () => {
  const D = load().FGH_CONTENT.pronunciation;
  assert.equal(D.CONS.length, 44);
  assert.equal(new Set(D.CONS.map(c => c.t)).size, 44);
  const n = k => D.CONS.filter(c => c.cls === k).length;
  assert.deepEqual([n('m'), n('h'), n('l')], [9, 11, 24]);
  assert.deepEqual(D.CONS.filter(c => c.cls === 'm').map(c => c.t).join(''), 'กจฎฏดตบปอ');
  assert.equal(D.CONS.filter(c => c.old).map(c => c.t).join(''), 'ฃฅ');
  for (const c of D.CONS) { assert.ok(THAI.test(c.say) && c.say.startsWith(c.t + 'อ '), c.t); assert.ok(c.rom && c.sv && c.ini, c.t); }
  assert.deepEqual(D.CONS.filter(c => !c.fin).map(c => c.t).join(''), 'ฉผฝหอฮ');
  for (const list of [D.VOW, D.TONES, D.FINALS, D.LIVEDEAD, D.CLUSTERS, D.FALSE_CLUSTERS, D.LEADING, D.WORDS, D.RHYTHM])
    for (const x of list) { assert.ok(x.t && x.rom != null, JSON.stringify(x)); }
  for (const s of D.SECTIONS) assert.ok(s.title.sv && s.title.th && s.intro.sv && s.intro.th, s.id);
  assert.equal(D.SECTIONS.length, 9);
});

test('vowels come in short/long pairs; the tone set and the tone rules agree', () => {
  const D = load().FGH_CONTENT.pronunciation;
  assert.ok(D.VOW.filter(v => v.len === 's').length >= 10 && D.VOW.filter(v => v.len === 'l').length >= 12);
  assert.equal(D.TONES.map(x => x.tone).join(','), 'mid,low,falling,high,rising');
  const cls = ch => D.CONS.find(c => c.t === ch).cls, rule = k => D.RULES.find(r => r.cls === k);
  // คา: low class, live, no mark → mid; ข่า: high + ่ → low; ค่า: low + ่ → falling; ค้า: low + ้ → high; ขา: high, live → rising
  const tone = w => { const r = rule(cls(w[0])); return w.includes('่') ? r.ek : w.includes('้') ? r.tho : r.live; };
  for (const x of D.TONES) assert.equal(tone(x.t), x.tone, x.t);
  assert.equal(D.LIVEDEAD.filter(x => x.live).map(x => x.t).join(','), 'มา,กิน,ลม');
  assert.equal(D.FINALS.length, 9);
});

test('listening questions: the answer is always one of the options; consonant options are 4 different letters', () => {
  const ctx = load(), Q = ctx.FGH.pronUI.question, D = ctx.FGH_CONTENT.pronunciation;
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 200; i++) for (const k of ['cons', 'tone', 'len']) {
    const q = Q(k, D, 'sv', rnd);
    assert.ok(q.opts.some(o => o.v === q.answer), k);
    assert.equal(new Set(q.opts.map(o => o.v)).size, q.opts.length);
    assert.ok(q.say && THAI.test(q.say));
    if (k === 'cons') { assert.equal(q.opts.length, 4); assert.ok(!['ฃ', 'ฅ'].includes(q.answer)); }
  }
});
