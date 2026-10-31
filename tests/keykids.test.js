// KeyKids regression test (keykids.html): layouts, Thai/Swedish input, lessons, spelling and flag quiz logic.
// Run: node --test "tests/*.test.js"
const test = require("node:test");
test("KeyKids core logic still works after the split into js/keykids/", () => {
  const fs = require('fs'), vm = require('vm'), assert = require('assert');
  const P = require('path');
  /* since the split into modules: keykids.html loads js/keykids/core.js and js/keykids/ui.js */
  const core = fs.readFileSync(P.join(__dirname, '..', 'js', 'keykids', 'core.js'), 'utf8');
  const ui = fs.readFileSync(P.join(__dirname, '..', 'js', 'keykids', 'ui.js'), 'utf8');
  const html = ui;
  const page = fs.readFileSync(P.join(__dirname, '..', 'keykids.html'), 'utf8');
  assert(/<script src="js\/keykids\/core.js"><\/script>/.test(page) && /<script src="js\/keykids\/ui.js"><\/script>/.test(page), 'keykids.html loads both scripts');
  new vm.Script(ui); // syntax check of the UI script
  const ctx = { Intl }; vm.createContext(ctx); vm.runInContext(core, ctx);
  const K = ctx.KK;
  let n = 0; const ok = (c, m) => { assert(c, m); n++; };

  // every practice character is typeable on its own layout, content is already normalized
  for (const lang of ['en', 'sv', 'th']) {
    const L = K.LAYOUTS[lang], C = K.CONTENT[lang];
    const strs = [];
    for (const k in C) { const v = C[k]; if (typeof v === 'string') strs.push(v); else v.forEach(x => Array.isArray(x) ? strs.push(x[1], x[2]) : strs.push(x)); }
    for (const s of strs) {
      ok(K.normalizeText(s) === s, lang + ' not normalized: ' + s);
      for (const ch of Array.from(s)) ok(ch in L.byChar, lang + ' untypeable "' + ch + '" (U+' + ch.codePointAt(0).toString(16) + ') in ' + s);
    }
    for (const p of C.pictures) ok(Array.from(p[1]).includes(p[2]), lang + ' picture letter not in word ' + p[1]);
  }
  // translations and voice lines complete in all three languages
  for (const l of ['sv', 'th']) {
    for (const k in K.T.en) ok(k in K.T[l], 'T.' + l + ' missing ' + k);
    for (const k in K.VOICE.en) ok(k in K.VOICE[l], 'VOICE.' + l + ' missing ' + k);
  }
  for (const l of ['en', 'sv', 'th']) for (const k in K.VOICE[l]) ok(K.VOICE[l][k][0] in K.BUDDIES, 'bad buddy ' + k);
  for (const L of K.LESSONS) ok(('l_' + L.id) in K.T.en, 'lesson name missing ' + L.id);

  // Swedish: physical keys give Å Ä Ö regardless of OS layout; NFD input is folded
  const sv = K.LAYOUTS.sv;
  ok(K.matches('ö', K.candidates(sv, 'Semicolon', ';', false, false), false), 'sv ö via US layout');
  ok(K.matches('Ä', K.candidates(sv, 'Quote', '"', true, false), false), 'sv Ä shift');
  ok(K.matches('å', K.candidates(sv, 'BracketLeft', 'å', false, false), false), 'sv å native');
  ok(K.normalizeText('å') === 'å', 'NFD å folded');
  ok(K.matches('A', K.candidates(K.LAYOUTS.en, 'KeyA', 'a', false, true), false), 'caps lock gives A');
  ok(!K.matches('A', K.candidates(K.LAYOUTS.en, 'KeyA', 'a', false, false), false), 'strict case');
  ok(K.matches('A', ['a'], true), 'lenient case');

  // Thai: Kedmanee mapping, combining marks typed as separate keys, clusters for display
  const th = K.LAYOUTS.th;
  ok(K.matches('ก', K.candidates(th, 'KeyD', 'd', false, false), false), 'th ก on KeyD');
  ok(K.matches('้', K.candidates(th, 'KeyH', 'h', false, false), false), 'th mai tho on KeyH');
  ok(K.matches('ู', K.candidates(th, 'Digit6', '^', true, false), false), 'th sara uu shifted');
  ok(!K.matches('ก', K.candidates(th, 'KeyF', 'f', false, false), false), 'th wrong key rejected');
  ok(K.LAYOUTS.th.byChar['ำ'].code === 'KeyE', 'sara am key');
  ok(K.normalizeText('ต้ัง') === 'ตั้ง', 'tone/vowel order fixed');
  ok(K.normalizeText('น้ํา') === 'น้ำ', 'nikhahit+aa -> sara am');
  const g = K.graphemes('น้ำใจ');
  ok(g.length === 3 && g[0].text === 'น้ำ' && g[0].end === 3 && g[2].end === 5, 'thai graphemes ' + JSON.stringify(g));
  ok(K.graphemes('ผีเสื้อ').map(x => x.text).join('|') === 'ผี|เ|สื้|อ', 'graphemes ผีเสื้อ');
  ok(K.displayChar('่') === '◌่', 'combining shown on dotted circle');

  // grading & adaptivity
  ok(K.starsFor(100) === 3 && K.starsFor(85) === 2 && K.starsFor(10) === 1, 'stars never 0');
  ok(K.wpm(50, 60000) === 10, 'wpm');
  ok(K.ageLevel(3) === 1 && K.ageLevel(6) === 2 && K.ageLevel(8) === 3 && K.ageLevel(10) === 4, 'age level');
  const p = {}; K.LESSONS.filter(l => l.level === 2).forEach(l => p[l.id] = { stars: 3, bestAcc: 97 });
  ok(K.effectiveLevel(p, 5) === 3, 'mastered level 2 moves up');
  ok(K.effectiveLevel({ words1: { stars: 1, bestAcc: 40 }, words2: { stars: 1, bestAcc: 45 } }, 7) === 2, 'struggling moves down');
  ok(K.plan({}, 7)[0] === 'words1', 'plan starts at age level');
  ok(K.suggestAfter('homeR', 40, 1).kind === 'down' && K.suggestAfter('homeR', 97, 3).id === 'homeAll', 'suggestions');
  for (const lang of ['en', 'sv', 'th']) for (const L of K.LESSONS) {
    const it = K.makeItems(L, lang);
    if (L.type !== 'explore') ok(it.length > 0 && it.every(x => x.text.length > 0), 'items ' + lang + ' ' + L.id);
  }
  // Spelling Challenge vocabulary: every word typeable, unique ids, every topic named, playable at every level
  for (const cat in K.VOCAB) {
    ok(('c_' + cat) in K.T.en, 'topic name missing ' + cat);
    ok(K.VOCAB[cat].items.length >= 8, 'topic too small ' + cat);
    for (const it of K.VOCAB[cat].items) {
      ok(/^(flag:[a-z]{2}|color:#[0-9A-F]{6}|shape:[a-z]+|[^:]+)$/.test(it.pic), 'picture ' + it.id);
      for (const lang of ['en', 'sv', 'th']) {
        const w = it.word[lang];
        ok(w && w.trim() === w, 'word ' + it.id + ' ' + lang);
        for (const ch of Array.from(w)) ok(ch in K.LAYOUTS[lang].byChar, lang + ' untypeable "' + ch + '" in ' + w);
      }
    }
    for (const lang of ['en', 'sv', 'th']) for (let d = 1; d <= 4; d++) {
      const ids = K.spellPool(cat, lang, d, 8);
      ok(ids.length === 8 && new Set(ids).size === 8 && ids.every(id => K.VOCAB_INDEX[id]), 'pool ' + cat + lang + d);
    }
  }
  ok(Object.keys(K.VOCAB_INDEX).length === Object.values(K.VOCAB).reduce((a, c) => a + c.items.length, 0), 'vocab ids unique');
  ok(K.VOCAB_INDEX['countries:se'].word.sv === 'Sverige' && K.VOCAB_INDEX['countries:se'].word.th === 'สวีเดน' && K.VOCAB_INDEX['countries:se'].info.sv === 'Stockholm', 'country names per language');
  ok(K.wordLevel('แมว', 'th') === 1 && K.wordLevel('ฮิปโปโปเตมัส', 'th') === 4 && K.wordLevel('cat', 'en') === 1 && K.wordLevel('hippopotamus', 'en') === 4, 'word levels');
  // easier levels get shorter words
  const avg = (d) => K.spellPool('animals', 'en', d, 8).reduce((a, id) => a + K.VOCAB_INDEX[id].word.en.length, 0) / 8;
  ok(avg(1) < avg(4), 'harder levels have longer words');
  ok(K.checkSpelling('Sverige', 'Sverige').kind === 'exact', 'exact');
  ok(K.checkSpelling('sverige', 'Sverige').kind === 'case', 'case only');
  const cw = K.checkSpelling('ช้งา', 'ช้าง'); ok(cw.kind === 'wrong' && cw.marks.join() === 'true,false,false', 'thai wrong marks ' + JSON.stringify(cw));
  ok(K.checkSpelling('näsa', 'näsa').kind === 'exact', 'decomposed ä accepted');
  ok(K.checkSpelling('น้ํา', 'น้ำ').kind === 'exact', 'thai nikhahit+aa accepted');
  ok(K.spellPoints(2, 'first', 0) === 20 && K.spellPoints(2, 'second', 0) === 10 && K.spellPoints(2, 'shown', 0) === 2 && K.spellPoints(4, 'first', 1) === 32, 'points');
  ok(K.spellStars(20, 20) === 3 && K.spellStars(13, 20) === 2 && K.spellStars(1, 20) === 1, 'spell stars');
  // Guess the Country by Flag
  const flagSrc = html.match(/const FLAGS = \{([\s\S]*?)\n  \};/)[1];
  for (const c of K.FLAG_CODES) ok(new RegExp('\\b' + c + ':').test(flagSrc), 'flag drawing missing for ' + c);
  for (const c of K.FLAG_CODES) ok(K.similarFlags(c).every(x => K.FLAG_CODES.includes(x)), 'look-alike codes valid ' + c);
  for (let d = 1; d <= 4; d++) for (const c of K.FLAG_CODES) for (let r = 0; r < 5; r++) {
    const q = K.flagQuestion(c, d);
    ok(q.opts.length === K.FLAG_OPTIONS[d] && q.opts.includes(c) && new Set(q.opts).size === q.opts.length, 'options ' + c + d);
    for (const l of ['en', 'sv', 'th']) ok(new Set(q.opts.map(x => K.VOCAB_INDEX['countries:' + x].word[l])).size === q.opts.length, 'option names distinct ' + l);
    const sim = K.similarFlags(c), nsim = q.opts.filter(x => sim.includes(x)).length;
    if (d <= 2) ok(nsim === 0, 'easy level has no look-alikes ' + c);
    if (d === 3) ok(nsim === Math.min(1, sim.length), 'medium has one look-alike ' + c);
    if (d === 4) ok(nsim === Math.min(3, sim.length), 'hard uses look-alikes ' + c);
  }
  ok(K.flagQuestion('se', 4).opts.filter(x => ['no', 'fi', 'dk', 'is', 'gr'].includes(x)).length === 3, 'Sweden with look-alike cross flags');
  const rd = K.flagRound(2, { se: 2, jp: 1 }, 8);
  ok(rd.length === 8 && new Set(rd.map(q => q.code)).size === 8, 'round of 8 distinct flags');
  ok(rd.some(q => q.code === 'se') && rd.some(q => q.code === 'jp'), 'tricky flags come back');
  ok(K.flagPoints(2, 'first') === 20 && K.flagPoints(2, 'second') === 8 && K.flagPoints(4, 'late') === 0, 'flag points');

  console.log("KeyKids assertions:", n);
});
