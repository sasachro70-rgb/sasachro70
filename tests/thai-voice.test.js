// Thai course for Swedish speakers ("Lär dig thailändska") and the voice settings (no packages needed). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(files) {
  const mem = {};
  const ctx = { console, Intl, Math, Date, Set, Map, JSON, Array, Object, String, Number, Boolean, Error, Promise, RegExp, TextEncoder, crypto: globalThis.crypto,
    localStorage: { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } } };
  ctx.globalThis = ctx; ctx.window = undefined;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const plain = x => JSON.parse(JSON.stringify(x));
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const THAI = /[฀-๿]/;

test('Thai course: Level 1–5, every word and line has Thai, romanization and Swedish; exercises are answerable', () => {
  const ctx = load(['content/academy-sv.js', 'content/academy-en-es.js', 'content/academy-th.js', 'js/family/srs.js', 'js/family/academy.js']);
  const AC = ctx.FGH.academy, c = AC.course('th');
  assert.equal(c.name.sv, 'Lär dig thailändska');
  assert.equal(c.desc.sv, 'Lär dig thailändska från grunden med svenska som förklaringsspråk.');
  assert.deepEqual(plain(c.explain), ['sv']);
  assert.deepEqual(plain(AC.levelIds(c)), ['L1', 'L2', 'L3', 'L4', 'L5']);
  assert.deepEqual(plain(AC.levelIds(AC.course('sv'))), ['A1', 'A2', 'B1', 'B2', 'C1']);   // the other courses keep CEFR
  for (const lv of AC.levelIds(c)) assert.ok(AC.lessonsAt(c, lv).length >= 2, lv + ' has lessons');
  const ids = new Set(), rnd = seeded(5);
  for (const l of c.lessons) {
    assert.ok(!ids.has(l.id), 'unique id ' + l.id); ids.add(l.id);
    assert.ok(AC.levelIds(c).includes(l.level), l.id + ' level');
    assert.ok(l.title.sv && l.goal.sv && l.grammar.title.sv && l.grammar.body.sv, l.id + ' Swedish texts');
    for (const d of l.dialogue) { assert.ok(THAI.test(d.t) && d.rom && d.tr.sv, l.id + ' line ' + d.t); assert.ok(!THAI.test(d.rom), l.id + ' romanization is Latin: ' + d.rom); }
    for (const w of l.vocab) { assert.ok(THAI.test(w.t) && w.rom && w.tr.sv, l.id + ' word ' + w.t); assert.ok(!/\s{2,}|^\s|\s$/.test(w.t), 'no stray spaces: ' + w.t); }
    /* Thai has no spaces inside words: no space between two Thai letters inside a word entry, and none before a final particle */
    for (const d of l.dialogue) assert.ok(!/ (ครับ|ค่ะ|คะ)(\s|$)/.test(d.t), l.id + ' particle is attached: ' + d.t);
    const exs = AC.exercises(c, l, 'sv', rnd);
    assert.ok(exs.length >= 5, l.id + ' exercises');
    for (const e of exs) {
      if (e.opts) assert.ok(e.opts.some(o => String(o.v) === String(e.answer)), l.id + ' ' + e.type + ' answer is an option');
      if (e.type === 'order' && THAI.test(e.answer)) {
        assert.equal(e.joiner, '');
        assert.ok(!/\s/.test(e.answer), 'Thai order answer has no spaces: ' + e.answer);
        assert.equal(AC.check(e, e.tiles.slice().sort((a, b) => a.k - b.k).map(t => t.g).join('')), true);
      }
      if (e.type === 'gap') assert.ok(e.text.includes('___') && e.sub, l.id + ' gap has a Swedish meaning');
      if (e.type === 'mc' && e.noSay) assert.equal(e.say, null);
    }
  }
  const tones = c.lessons.find(l => l.tones);
  assert.deepEqual(plain(tones.tones.map(x => x.name)), ['สามัญ', 'เอก', 'โท', 'ตรี', 'จัตวา']);
  assert.deepEqual(plain(tones.tones.map(x => x.word)), ['คา', 'ข่า', 'ค่า', 'ค้า', 'ขา']);
  for (const tn of tones.tones) assert.ok(tn.curve.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 1 && p[1] <= 5) && tn.sv && tn.desc, tn.name);
  const greet = c.lessons.find(l => l.id === 'th-1-greet').vocab.find(w => w.t === 'สวัสดี');
  assert.deepEqual(plain([greet.rom, greet.tr.sv]), ['sawatdi', 'Hej']);
  assert.ok(greet.note.sv.startsWith('En vanlig hälsning på thailändska.'));
  /* continue learning and level tests work with the course's own levels */
  assert.equal(AC.nextLesson(c, { lessons: {} }, 'L1').id, 'th-1-intro');
  assert.equal(AC.nextLesson(c, { lessons: {} }, 'L3').level, 'L3');
  assert.equal(AC.nextLesson(c, { lessons: { 'th-1-intro': { done: true } }, current: 'th-1-intro' }, 'L1').id, 'th-1-consonants');
  assert.ok(AC.levelTest(c, 'L1', 'sv', rnd, 10).length === 10);
  const st = AC.stats(c, { lessons: { 'th-1-intro': { done: true, best: 90 } }, timeMs: 0, lastAt: 1 }, {}, [], 'p');
  assert.deepEqual(plain([st.done, st.total]), [1, c.lessons.length]);
});

test('Thai course pages: academy and parent pages load the Thai content', () => {
  for (const page of ['academy.html', 'parent.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    assert.ok(html.includes('content/academy-th.js'), page);
    assert.ok(html.indexOf('js/family/voice.js') > html.indexOf('js/family/kit.js'), page + ' loads voice.js after kit.js');
  }
  const kids = fs.readFileSync(path.join(__dirname, '..', 'kids.html'), 'utf8');
  assert.ok(kids.indexOf('js/family/voice-ui.js') > kids.indexOf('js/family/actions.js'));
});

test('voice: only voices of the asked language, accents from the language tag, choice restored or the closest one used', () => {
  const ctx = load(['js/family/voice.js']); const V = ctx.FGH.voice;
  const voices = [
    { name: 'Kanya', lang: 'th-TH', voiceURI: 'com.apple.kanya', localService: true },
    { name: 'Microsoft Niwat Online (Natural) - Thai (Thailand)', lang: 'th-TH', voiceURI: 'ms-niwat', localService: false },
    { name: 'Alva', lang: 'sv-SE', voiceURI: 'alva', localService: true },
    { name: 'Oskar', lang: 'sv_SE', voiceURI: 'oskar', localService: true },
    { name: 'Satu', lang: 'fi-FI', voiceURI: 'satu', localService: true },
    { name: 'Daniel', lang: 'en-GB', voiceURI: 'daniel', localService: true },
    { name: 'Samantha', lang: 'en-US', voiceURI: 'samantha', localService: true },
    { name: 'Google español de Estados Unidos', lang: 'es-US', voiceURI: 'g-es-us', localService: false },
    { name: 'Mónica', lang: 'es-ES', voiceURI: 'monica', localService: true }
  ];
  assert.deepEqual(plain(V.listFor(voices, 'th').map(v => v.name)), ['Kanya', 'Microsoft Niwat Online (Natural) - Thai (Thailand)']);
  assert.deepEqual(plain(V.listFor(voices, 'sv').map(v => v.id)), ['alva', 'oskar']);   // Finnish is never offered for Swedish
  assert.deepEqual(plain(V.listFor(voices, 'en').map(v => v.region)), ['GB', 'US']);     // main accent first
  assert.deepEqual(plain(V.listFor(voices, 'es').map(v => v.region)), ['ES', 'US']);
  assert.equal(V.listFor(voices, 'de').length, 0);
  assert.deepEqual(plain(['Kanya', 'Microsoft Niwat Online', 'Alva', 'Oskar', 'Mónica', 'Google español'].map(V.genderOf)), ['female', 'male', 'female', 'male', 'female', 'unknown']);
  assert.equal(V.choose(voices, 'sv', { id: 'oskar' }).name, 'Oskar');
  assert.equal(V.choose(voices, 'sv', { id: 'gone', name: 'Oskar' }).name, 'Oskar');
  assert.equal(V.choose(voices, 'en', { id: 'gone', region: 'US', gender: 'female' }).name, 'Samantha');
  assert.equal(V.choose(voices, 'th', { id: 'gone', gender: 'male' }).name.startsWith('Microsoft Niwat'), true);
  assert.equal(V.choose(voices, 'th', null).name, 'Kanya');
  assert.equal(V.choose(voices, 'de', { id: 'daniel' }), null);   // never a voice of another language
});

test('voice: sentences and pauses; Thai keeps its spelling; mixed Swedish/Thai text is split by script', () => {
  const ctx = load(['js/family/voice.js']); const V = ctx.FGH.voice;
  assert.deepEqual(plain(V.chunks('Hej! Jag heter Anna. Vad heter du?', 'sv')), ['Hej!', 'Jag heter Anna.', 'Vad heter du?']);
  assert.deepEqual(plain(V.chunks('สบายดีค่ะ ขอบคุณค่ะ แล้วคุณล่ะคะ', 'th')), ['สบายดีค่ะ ขอบคุณค่ะ', 'แล้วคุณล่ะคะ']);
  assert.deepEqual(plain(V.chunks('ผม|ชื่อ|เคน', 'th')), ['ผมชื่อเคน']);   // word marks removed, no spaces added
  assert.deepEqual(plain(V.chunks('a b c\nd', 'th')), ['a b c', 'd']);   // short Thai phrases are joined, lines never
  const long = 'Ett, två, tre, fyra, fem, sex, sju, åtta, nio, tio, elva, tolv, tretton, fjorton, femton, sexton, sjutton, arton, nitton, tjugo, tjugoett, tjugotvå, tjugotre, tjugofyra, tjugofem';
  assert.ok(V.chunks(long, 'sv').every(p => p.length <= 180));
  assert.deepEqual(plain(V.segments('Säg สวัสดี när du hälsar.', 'sv')), [{ text: 'Säg', lang: 'sv' }, { text: 'สวัสดี', lang: 'th' }, { text: 'när du hälsar.', lang: 'sv' }]);
  assert.deepEqual(plain(V.segments('ผมชื่อเคน Ken ครับ', 'th')), [{ text: 'ผมชื่อเคน Ken ครับ', lang: 'th' }]);   // names inside Thai stay with the Thai voice
  assert.ok(V.pauseAfter('Hej.', 0.5) > V.pauseAfter('Hej.', 1));
  assert.deepEqual(plain(V.RATES), [0.5, 0.75, 0.85, 1, 1.25, 1.5]);
  assert.equal(V.clampRate(3), 1.5); assert.equal(V.clampRate(0.1), 0.5); assert.equal(V.clampRate('x'), 0.85);
});

test('voice: per-learner settings are kept apart, restored, and merged across devices without losing the newer choice', () => {
  const ctx = load(['js/family/ledger.js', 'js/family/store.js', 'js/family/voice.js']); const V = ctx.FGH.voice, F = ctx.FGH.family;
  const f = F.emptyFamily();
  const a = F.addProfile(f, { name: 'Ken', kind: 'adult' }).profile, b = F.addProfile(f, { name: 'Mia', kind: 'child' }).profile;
  assert.equal(V.rateOf(f, a.id), 0.85);                                     // new default
  F.updateProfile(f, b.id, { ttsRate: 0.7 }); assert.equal(V.rateOf(f, b.id), 0.7);   // a speed set on the old slider is kept
  V.setVoice(f, a.id, 'th', { id: 'ms-niwat', name: 'Niwat', region: 'TH', gender: 'male' }, 100);
  V.setRate(f, a.id, 1.25, 100);
  assert.equal(V.prefFor(f, a.id, 'th').id, 'ms-niwat');
  assert.equal(V.prefFor(f, b.id, 'th'), null);                              // Mia keeps the default
  assert.equal(V.rateOf(f, a.id), 1.25);
  const back = F.loadFamily(JSON.stringify(f));                               // saved and loaded again
  assert.equal(V.prefFor(back, a.id, 'th').name, 'Niwat'); assert.equal(back.voice[a.id].lastLang, 'th');
  V.resetVoice(back, a.id, 'th', 200); assert.equal(V.prefFor(back, a.id, 'th'), null);
  /* two devices: device 1 chose Kanya at t=300, device 2 changed the speed at t=400 */
  const d1 = { rate: 1.25, rateAt: 100, langs: { th: { id: 'kanya', name: 'Kanya', at: 300 } }, updated: 300, lastLang: 'th' };
  const d2 = { rate: 0.75, rateAt: 400, langs: { th: { id: 'ms-niwat', name: 'Niwat', at: 100 }, sv: { id: 'alva', name: 'Alva', at: 50 } }, updated: 400, lastLang: 'sv' };
  const m = V.merge(d1, d2);
  assert.deepEqual(plain([m.langs.th.id, m.langs.sv.id, m.rate, m.lastLang]), ['kanya', 'alva', 0.75, 'sv']);
  assert.deepEqual(plain(V.merge(null, d1)), plain(d1));
});

test('home page texts: every hero, zone and Continue Learning text exists in English, Swedish and Thai', () => {
  const ctx = load(['js/family/ledger.js', 'js/family/store.js']); ctx.window = ctx; ctx.document = {};
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/family/hub-bridge.js'), 'utf8'), ctx);
  const T = ctx.FGH.hubBridge.TXT, flat = (o, p) => Object.keys(o).flatMap(k => typeof o[k] === 'object' ? flat(o[k], p + k + '.') : [p + k]);
  const en = flat(T.en, '');
  for (const l of ['sv', 'th']) { const has = new Set(flat(T[l], '')); for (const k of en) assert.ok(has.has(k), l + ' is missing ' + k); }
  assert.equal(T.en.heroSub, 'Learn, Play & Grow Together');
});
