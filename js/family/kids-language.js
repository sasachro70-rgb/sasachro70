/* Kids Language Learning: turns lesson content (content/kids-language.js) into exercises for one language pair.
   No DOM, so it is tested in Node. Exercise types:
     listen   – hear a word in the new language, tap the picture
     picture  – see a picture and the word in your language, pick the word in the new language
     match    – pair 4 words with their translations
     spell    – put the letters of the new word in order
     complete – a sentence with one word missing
     build    – put the words of a sentence in order (translate the sentence)
     translate– pick the right translation of a whole sentence
     reply    – in a dialogue, pick what comes next
     question – a question about the story
     speak    – say the word or sentence after the voice
   Age (band) decides which types appear: 2–4-year-olds only listen and look at pictures. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clean = s => String(s || '').replace(/\|/g, '');
  /* words of a sentence: Thai uses the "|" breaks from the content, other languages spaces */
  const words = (text, lang) => lang === 'th' ? String(text).split('|').filter(Boolean) : clean(text).split(/\s+/).filter(Boolean);
  const joinWords = (ws, lang) => lang === 'th' ? ws.join('') : ws.join(' ');
  function graphemes(s) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), x => x.segment);
    return String(s).match(/[^ัิ-ฺ็-๎][ัิ-ฺ็-๎]*|[\s\S]/gu) || [];
  }

  const content = () => G.FGH_CONTENT.kidsLanguage;
  const pairById = id => content().pairs.find(p => p.id === id) || null;
  const courseKey = pairId => 'kl:' + pairId;

  /* all lessons in order, with the family's own words as an extra lesson and switched-off lessons left out */
  function lessons(custom) {
    custom = custom || {};
    const off = new Set(custom.disabledLessons || []);
    const out = [];
    content().levels.forEach(lv => lv.lessons.forEach(ls => { if (!off.has(ls.id)) out.push(Object.assign({ level: lv.n, levelId: lv.id }, ls)); }));
    const fam = (custom.kidsWords || []).filter(w => w && w.id);
    if (fam.length && !off.has('family_words')) out.splice(out.filter(l => l.level <= 2).length, 0, { id: 'family_words', level: 2, levelId: 'basic', icon: '🏡', type: 'words', custom: true,
      name: { th: 'คำศัพท์ของครอบครัว', sv: 'Familjens ord', en: 'Our family words' }, items: fam });
    return out;
  }
  /* a lesson works for a pair only with rows that have both languages */
  const usable = (lesson, pair) => lesson.items.filter(it => it[pair.from] && it[pair.to]);
  const ageBand = age => { age = +age || 6; return age <= 4 ? 1 : age <= 6 ? 2 : age <= 8 ? 3 : 4; };
  /* the level a child of this band should start on */
  const recommendedLevel = band => ({ 1: 1, 2: 2, 3: 3, 4: 4 })[band] || 1;

  function exercises(lesson, pair, band, rnd) {
    rnd = rnd || Math.random;
    band = Math.max(1, Math.min(4, band || 2));
    const items = usable(lesson, pair); if (!items.length) return [];
    const from = pair.from, to = pair.to, out = [];
    const nOpt = band === 1 ? 2 : band === 2 ? 3 : 4;
    const others = (it, key) => shuffle(items.filter(x => x !== it && clean(x[key]) !== clean(it[key])), rnd);
    const opt = it => ({ v: it.id, text: clean(it[to]), sub: clean(it[from]), pic: it.pic });

    if (lesson.type === 'words') {
      const picked = shuffle(items, rnd).slice(0, band === 1 ? 4 : 6);
      picked.forEach((it, i) => {
        out.push({ type: 'listen', id: it.id, say: it[to], lang: to, opts: shuffle([it].concat(others(it, to).slice(0, nOpt - 1)), rnd).map(opt), answer: it.id });
        if (band >= 2) out.push({ type: 'picture', id: it.id, pic: it.pic, prompt: clean(it[from]), lang: to, opts: shuffle([it].concat(others(it, to).slice(0, nOpt - 1)), rnd).map(opt), answer: it.id });
        if (band >= 3 && i % 2 === 0 && graphemes(clean(it[to])).length <= 12) {
          const g = graphemes(clean(it[to]));
          out.push({ type: 'spell', id: it.id, pic: it.pic, prompt: clean(it[from]), say: it[to], lang: to, tiles: shuffle(g.map((x, k) => ({ k, g: x })), rnd), answer: clean(it[to]) });
        }
      });
      if (band >= 2 && items.length >= 4) {
        const four = shuffle(items, rnd).slice(0, 4);
        out.splice(Math.min(out.length, 4), 0, { type: 'match', lang: to, left: shuffle(four, rnd).map(it => ({ v: it.id, text: clean(it[from]), pic: it.pic })), right: shuffle(four, rnd).map(it => ({ v: it.id, text: clean(it[to]) })) });
      }
      const sp = picked[Math.floor(rnd() * picked.length)];
      out.push({ type: 'speak', id: sp.id, pic: sp.pic, say: sp[to], lang: to, prompt: clean(sp[from]) });
      return out;
    }

    /* sentences, dialogue lines and story lines */
    const lines = items;
    lines.forEach((it, i) => {
      const ws = words(it[to], to);
      if (lesson.type === 'dialogue' && i < lines.length - 1 && band >= 2) {
        const nx = lines[i + 1];
        const wrong = shuffle(lines.filter(x => x !== nx && x !== it), rnd).slice(0, nOpt - 1);
        out.push({ type: 'reply', id: nx.id, line: clean(it[to]), lineSub: clean(it[from]), say: it[to], lang: to, opts: shuffle([nx].concat(wrong), rnd).map(opt), answer: nx.id });
      }
      if (lesson.type !== 'story' && ws.length >= 2) {
        if (band >= 3 || i % 2 === 0) {
          const gap = Math.floor(rnd() * ws.length);
          const pool = [].concat(...lines.filter(x => x !== it).map(x => words(x[to], to))).filter(w => w !== ws[gap]);
          const choices = shuffle(Array.from(new Set(shuffle(pool, rnd))).slice(0, nOpt - 1).concat([ws[gap]]), rnd);
          out.push({ type: 'complete', id: it.id, pic: it.pic, prompt: clean(it[from]), lang: to,
            before: joinWords(ws.slice(0, gap), to), after: joinWords(ws.slice(gap + 1), to), opts: choices.map(c => ({ v: c, text: c })), answer: ws[gap], say: it[to] });
        }
        if (band >= 3 && ws.length <= 9) out.push({ type: 'build', id: it.id, prompt: clean(it[from]), lang: to, say: it[to], tiles: shuffle(ws.map((w, k) => ({ k, g: w })), rnd), answer: joinWords(ws, to), sep: to === 'th' ? '' : ' ' });
        else if (band <= 2) out.push({ type: 'translate', id: it.id, prompt: clean(it[from]), lang: to, say: it[to], opts: shuffle([it].concat(others(it, to).slice(0, nOpt - 1)), rnd).map(opt), answer: it.id });
      }
    });
    if (lesson.type === 'story' && lesson.questions) {
      lesson.questions.forEach((q, i) => out.push({ type: 'question', id: lesson.id + ':q' + i, prompt: q.q[to], promptSub: q.q[from], lang: to,
        opts: shuffle(q.opts.map((o, k) => ({ v: String(k), text: o[to], sub: o[from] })), rnd), answer: String(q.a) }));
    }
    const sp = lines[Math.floor(rnd() * lines.length)];
    out.push({ type: 'speak', id: sp.id, pic: sp.pic, say: sp[to], lang: to, prompt: clean(sp[from]) });
    return out;
  }
  /* answer check for every type; spelling and building compare the finished text */
  function check(ex, value) {
    if (ex.type === 'speak' || ex.type === 'match') return !!value;
    return clean(value) === clean(ex.answer);
  }
  /* words of the lesson that the child got wrong come back in "Review words" */
  function reviewLesson(allLessons, wordStats, pair) {
    const weak = new Set(Object.keys(wordStats || {}).filter(id => (wordStats[id].wrong || 0) > (wordStats[id].right || 0) * 0.5));
    const items = [];
    allLessons.filter(l => l.type === 'words').forEach(l => usable(l, pair).forEach(it => { if (weak.has(it.id) && !items.some(x => x.id === it.id)) items.push(it); }));
    return items.length ? { id: 'review', level: 0, icon: '🔁', type: 'words', name: { th: 'ทบทวนคำศัพท์', sv: 'Repetera orden', en: 'Review words' }, items: items.slice(0, 10) } : null;
  }

  FGH.kidsLanguage = { content, pairById, courseKey, lessons, usable, exercises, check, reviewLesson, words, joinWords, clean, graphemes, ageBand, recommendedLevel };
})(typeof window !== 'undefined' ? window : globalThis);
