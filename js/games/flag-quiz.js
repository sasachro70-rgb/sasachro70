/* Guess the Flag: a turn-based family game for the hub.
   Level 1: 3 clearly different flags. Level 2: 4 choices, one look-alike. Level 3: 4 look-alike flags. */
(function (G) {
  'use strict';
  const FGH = G.FGH;
  const C = FGH.countries, core = FGH.core;
  const OPTIONS = { 1: 3, 2: 4, 3: 4 };
  const SIMILAR = { 1: 0, 2: 1, 3: 3 };

  function makeQuestion({ level, used, rnd }) {
    rnd = rnd || Math.random;
    let pool = C.codes.filter(c => !used.has('flag:' + c));
    if (!pool.length) { C.codes.forEach(c => used.delete('flag:' + c)); pool = C.codes.slice(); }   /* long matches start the pool over */
    const code = pool[Math.floor(rnd() * pool.length)];
    used.add('flag:' + code);
    const n = OPTIONS[level] || 3;
    const sim = core.shuffle(C.similar(code), rnd);
    const other = core.shuffle(C.codes.filter(c => c !== code && !sim.includes(c)), rnd);
    const opts = [code].concat(sim.slice(0, SIMILAR[level] || 0));
    for (const c of other.concat(sim)) { if (opts.length >= n) break; if (!opts.includes(c)) opts.push(c); }
    return { code, opts: core.shuffle(opts, rnd) };
  }

  /* view: { lang, esc, t, answer (the turn's answer or null), locked } */
  function questionHTML(q, view) {
    const name = c => view.esc(C.byCode[c].name[view.lang]);
    const a = view.answer;
    return '<div class="fq">' + C.flagSVG(q.code, 'big', view.esc(view.t('flagQ'))) + '<h2>' + view.esc(view.t('flagQ')) + '</h2><div class="opts">' +
      q.opts.map((c, i) => {
        let cls = '';
        if (a) { if (c === q.code) cls = 'good'; else if (c === a.value) cls = 'bad'; else cls = 'dim'; }
        return '<button class="opt ' + cls + '" data-answer="' + c + '"' + (a || view.locked ? ' disabled' : '') + '><span class="num" aria-hidden="true">' + (i + 1) + '</span><span class="nm">' + name(c) + '</span></button>';
      }).join('') + '</div></div>';
  }

  core.registerGame({
    id: 'flags',
    icon: '🚩',
    levels: 3,
    name: { th: 'ทายธงชาติ', sv: 'Gissa flaggan', en: 'Guess the Flag' },
    desc: {
      th: 'ผลัดกันดูธงแล้วเลือกประเทศ ใครได้คะแนนมากที่สุดชนะ',
      sv: 'Turas om att gissa landet från flaggan. Flest poäng vinner.',
      en: 'Take turns guessing the country from its flag. Most points wins.'
    },
    levelNames: {
      th: ['ง่าย · 3 ตัวเลือก', 'ปานกลาง · 4 ตัวเลือก', 'ยาก · ธงคล้ายกัน'],
      sv: ['Lätt · 3 val', 'Medel · 4 val', 'Svår · liknande flaggor'],
      en: ['Easy · 3 choices', 'Medium · 4 choices', 'Hard · look-alike flags']
    },
    makeQuestion,
    isCorrect: (q, answer) => answer === q.code,
    questionHTML,
    answerText: (q, lang) => C.byCode[q.code].name[lang],
    answerExtra: (q, lang) => C.byCode[q.code].capital[lang],
    miniPicture: q => C.flagSVG(q.code, 'tiny')
  });
})(typeof window !== 'undefined' ? window : globalThis);
