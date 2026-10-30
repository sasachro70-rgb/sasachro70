/* Knowledge & Word Games: builds question rounds. No DOM, so it is tested in Node.
   Sources: KeyKids vocabulary (js/keykids/core.js, Thai/Swedish/English), the question bank (content/knowledge.js),
   countries and flags (js/data/countries.js), and maths that is generated here.
   band = 1 (ages 3–4), 2 (5–6), 3 (7–8), 4 (9–10); a parent can set the band for a child. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const OPTS = { 1: 2, 2: 3, 3: 4, 4: 4 };
  const ROUND = 8;

  const vocab = () => (G.KK && G.KK.VOCAB) || {};
  function vocabItems(cat) {
    const V = vocab();
    const cats = cat && cat !== 'all' ? [cat] : Object.keys(V).filter(c => c !== 'countries');
    return [].concat(...cats.filter(c => V[c]).map(c => V[c].items));
  }
  const wordLen = (w, lang) => Array.from(String(w)).length;

  /* Guess the word. band 1: hear the word, tap the right picture (2 pictures). band 2–4: see the picture, pick the word.
     From band 3 every third question asks to spell the word with letter tiles. */
  function wordQuestion(lang, band, cat, rnd, used, i) {
    let pool = vocabItems(cat).filter(it => it.word[lang]);
    if (band <= 2) pool = pool.filter(it => wordLen(it.word[lang]) <= 7 && !it.pic.startsWith('shape:rect'));
    const fresh = pool.filter(it => !used.has(it.id)); const src = fresh.length ? fresh : pool;
    const it = src[Math.floor(rnd() * src.length)]; used.add(it.id);
    const others = shuffle(pool.filter(x => x.id !== it.id && x.word[lang] !== it.word[lang] && x.pic !== it.pic), rnd);
    /* harder bands prefer distractors from the same topic and of similar length */
    if (band >= 4) others.sort((a, b) => (a.cat === it.cat ? 0 : 1) - (b.cat === it.cat ? 0 : 1) || Math.abs(wordLen(a.word[lang]) - wordLen(it.word[lang])) - Math.abs(wordLen(b.word[lang]) - wordLen(it.word[lang])));
    const opts = shuffle([it].concat(others.slice(0, OPTS[band] - 1)), rnd);
    if (band >= 3 && i % 3 === 2) {
      const tiles = graphemes(it.word[lang]);
      return { type: 'spell', id: it.id, pic: it.pic, word: it.word[lang], lang, tiles: shuffle(tiles.map((g, k) => ({ k, g })), rnd), answer: it.word[lang] };
    }
    return { type: band === 1 ? 'pickpic' : 'pickword', id: it.id, pic: it.pic, word: it.word[lang], lang,
      opts: opts.map(o => ({ v: o.id, text: o.word[lang], pic: o.pic })), answer: it.id };
  }
  function graphemes(s) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), x => x.segment);
    return String(s).match(/[^ัิ-ฺ็-๎][ัิ-ฺ็-๎]*|[\s\S]/gu) || [];
  }

  /* General knowledge: questions of the child's band, with the band below mixed in so a round never runs dry. */
  function quizQuestion(lang, band, cat, rnd, used) {
    const K = G.FGH_CONTENT.knowledge;
    if (band <= 1) return soundQuestion(lang, band, rnd, used);
    let pool = K.questions.filter(q => (q.band === band || q.band === band - 1) && (!cat || cat === 'all' || q.cat === cat));
    if (!pool.length) pool = K.questions.filter(q => q.band <= band);
    const fresh = pool.filter(q => !used.has(q.id)); const src = fresh.length ? fresh : pool;
    const same = src.filter(x => x.band === band), from = same.length && rnd() < 0.75 ? same : src;
    const q = from[Math.floor(rnd() * from.length)];
    used.add(q.id);
    const n = Math.min(q.a.length, OPTS[band]);
    const opts = shuffle(q.a.slice(0, n).map((a, k) => ({ v: String(k), text: a[lang] || a.en })), rnd);
    return { type: 'pickword', id: q.id, pic: q.pic, prompt: q.q[lang] || q.q.en, opts, answer: '0' };
  }
  function soundQuestion(lang, band, rnd, used) {
    const S = G.FGH_CONTENT.knowledge.sounds;
    const fresh = S.filter(s => !used.has(s.pic)); const src = fresh.length ? fresh : S;
    const s = src[Math.floor(rnd() * src.length)]; used.add(s.pic);
    const opts = shuffle([s].concat(shuffle(S.filter(x => x !== s), rnd).slice(0, OPTS[Math.max(1, band)] - 1)), rnd);
    return { type: 'pickpic', id: 'snd:' + s.pic, sound: s.say[lang] || s.say.en, word: s.say[lang] || s.say.en, lang,
      opts: opts.map(o => ({ v: o.pic, text: o.name[lang] || o.name.en, pic: o.pic })), answer: s.pic };
  }

  /* Maths, generated so it never repeats the same way: counting (3–4), plus within 10 (5–6),
     plus/minus within 100 and the 2, 5 and 10 times tables (7–8), times tables, division and halves (9–10). */
  const COUNT_PICS = ['🍎', '⭐', '🐟', '🎈', '🐞', '🌸', '🚗', '🧁'];
  function mathQuestion(band, rnd) {
    const r = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    let prompt, ans, pic = null, kind;
    if (band <= 1) { const n = r(1, 5); const e = COUNT_PICS[r(0, COUNT_PICS.length - 1)]; pic = e.repeat(n); prompt = null; ans = n; kind = 'count'; }
    else if (band === 2) { const a = r(0, 6), b = r(1, 10 - a); prompt = a + ' + ' + b + ' = ?'; ans = a + b; kind = 'add'; }
    else if (band === 3) {
      const k = r(0, 2);
      if (k === 0) { const a = r(10, 60), b = r(5, 39); prompt = a + ' + ' + b + ' = ?'; ans = a + b; kind = 'add'; }
      else if (k === 1) { const a = r(20, 99), b = r(5, a - 5); prompt = a + ' − ' + b + ' = ?'; ans = a - b; kind = 'sub'; }
      else { const a = [2, 5, 10][r(0, 2)], b = r(1, 10); prompt = a + ' × ' + b + ' = ?'; ans = a * b; kind = 'mul'; }
    } else {
      const k = r(0, 2);
      if (k === 0) { const a = r(3, 10), b = r(3, 10); prompt = a + ' × ' + b + ' = ?'; ans = a * b; kind = 'mul'; }
      else if (k === 1) { const b = r(2, 10), q = r(2, 10); prompt = (b * q) + ' ÷ ' + b + ' = ?'; ans = q; kind = 'div'; }
      else { const h = r(4, 30) * 2; prompt = '½ × ' + h + ' = ?'; ans = h / 2; kind = 'half'; }
    }
    const set = new Set([ans]);
    const spread = band <= 2 ? 2 : band === 3 ? 10 : 6;
    let guard = 0;
    while (set.size < OPTS[band] && guard++ < 50) { const d = ans + (r(0, 1) ? 1 : -1) * r(1, spread); if (d >= 0) set.add(d); }
    const opts = shuffle(Array.from(set), rnd).map(n => ({ v: String(n), text: String(n) }));
    return { type: 'pickword', id: 'math:' + kind + ':' + prompt + ':' + ans, pic, prompt, math: true, opts, answer: String(ans) };
  }

  function flagQuestion(lang, band, rnd, used) {
    const C = FGH.countries;
    const codes = C.codes.filter(c => C.hasFlag(c));
    const fresh = codes.filter(c => !used.has(c)); const src = fresh.length ? fresh : codes;
    const code = src[Math.floor(rnd() * src.length)]; used.add(code);
    const sim = band >= 3 ? shuffle(C.similar(code).filter(c => C.hasFlag(c)), rnd) : [];
    const other = shuffle(codes.filter(c => c !== code && !C.similar(code).includes(c)), rnd);
    const picks = [code].concat(sim.slice(0, band === 3 ? 1 : 3), other).slice(0, OPTS[band]);
    return { type: 'pickword', id: 'flag:' + code, pic: 'flag:' + code, flag: true, opts: shuffle(picks, rnd).map(c => ({ v: c, text: C.byCode[c].name[lang] || C.byCode[c].name.en })), answer: code };
  }

  /* a round of questions for one game */
  function makeRound(game, lang, band, cat, rnd, n) {
    rnd = rnd || Math.random; n = n || ROUND; band = Math.max(1, Math.min(4, band || 2));
    const used = new Set(), out = [];
    for (let i = 0; i < n; i++) {
      if (game === 'words') out.push(wordQuestion(lang, band, cat, rnd, used, i));
      else if (game === 'quiz') out.push(quizQuestion(lang, band, cat, rnd, used));
      else if (game === 'sounds') out.push(soundQuestion(lang, band, rnd, used));
      else if (game === 'math') out.push(mathQuestion(band, rnd));
      else if (game === 'flags') out.push(flagQuestion(lang, band, rnd, used));
    }
    return out;
  }
  const isRight = (q, v) => String(v) === String(q.answer);

  FGH.knowledgeGames = { makeRound, wordQuestion, quizQuestion, soundQuestion, mathQuestion, flagQuestion, isRight, graphemes, vocabItems, OPTS, ROUND };
})(typeof window !== 'undefined' ? window : globalThis);
