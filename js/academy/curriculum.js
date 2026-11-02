/* Curriculum structure and practice generators (Phase E). No DOM; tested in Node (tests/curriculum.test.js).
   - units(course): Level → Unit → Lesson. Courses list their units in data (course.units); a course without units (for example a
     teacher's own course or the BOOK 42 chapters) gets one unit per level, so the app never needs code changes for new courses.
   - parts(lesson): which of the nine parts of a lesson are there (objectives, teacher explanation, Thai examples, Swedish/Thai
     explanation, audio, vocabulary, practice, short assessment, completion).
   - quiz(course, lesson): the short assessment – 5 questions from the lesson (no writing or speaking tasks).
   - placement(course): 3 questions per level; placeResult() puts the learner at the first level not passed (ability, not age).
   - drill(kind, course, level): practice from every lesson up to the learner's level: listening, reading, spelling, sentence
     building, vocabulary both ways, translating sentences both ways. Returns questions for the Academy's exercise runner. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const AC = () => FGH.academy;
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clean = s => String(s == null ? '' : s).replace(/\|/g, '').trim();
  const tr = (o, ex) => AC().tr(o, ex);

  function units(c) {
    if (!c) return [];
    const ids = AC().levelIds(c), byId = {}; c.lessons.forEach(l => { byId[l.id] = l; });
    if (Array.isArray(c.units) && c.units.length) {
      const listed = new Set();
      const out = c.units.map(u => ({ id: u.id, level: u.level, title: u.title, lessons: (u.lessons || []).map(id => byId[id]).filter(Boolean) }));
      out.forEach(u => u.lessons.forEach(l => listed.add(l.id)));
      /* lessons not listed in any unit (added later) still show, in an extra unit of their level */
      ids.forEach(lv => { const rest = c.lessons.filter(l => l.level === lv && !listed.has(l.id)); if (rest.length) out.push({ id: 'more-' + lv, level: lv, title: null, lessons: rest }); });
      return out.filter(u => u.lessons.length).sort((a, b) => ids.indexOf(a.level) - ids.indexOf(b.level));
    }
    return ids.map(lv => ({ id: 'lv-' + lv, level: lv, title: null, lessons: c.lessons.filter(l => l.level === lv) })).filter(u => u.lessons.length);
  }
  const unitsAt = (c, level) => units(c).filter(u => u.level === level);

  function parts(l, ex) {
    const has = o => !!(o && (typeof o === 'string' ? o.trim() : (o[ex] || o.sv)));
    return {
      objectives: !!((l.objectives && l.objectives.length) || has(l.goal)),
      teacher: !!(l.grammar && has(l.grammar.body)),
      examples: (l.dialogue || []).length > 0,
      explanation: (l.dialogue || []).concat(l.vocab || []).some(x => has(x.tr)),
      audio: true,   // every Thai text has audio (recording, cloud voice or device voice)
      vocabulary: (l.vocab || []).length > 0,
      practice: (l.exercises || []).length > 0 || (l.vocab || []).length > 0,
      assessment: (l.exercises || []).some(e => e.type !== 'write' && e.type !== 'speak') || (l.vocab || []).length >= 2,
      completion: true
    };
  }

  function quiz(c, l, ex, rnd) {
    rnd = rnd || Math.random;
    const qs = AC().exercises(c, l, ex, rnd).filter(q => q.type !== 'write' && q.type !== 'speak');
    return shuffle(qs, rnd).slice(0, 5);
  }

  function placement(c, ex, rnd, per) {
    rnd = rnd || Math.random; per = per || 3;
    const out = [];
    AC().levelIds(c).forEach(lv => {
      const pool = [].concat(...AC().lessonsAt(c, lv).map(l => AC().exercises(c, l, ex, rnd).filter(q => q.type === 'mc' || q.type === 'listen' || q.type === 'gap')));
      shuffle(pool, rnd).slice(0, per).forEach(q => out.push(Object.assign({}, q, { level: lv })));
    });
    return out;
  }
  /* answers: { level: { right, total } } → the first level with fewer than 2 of 3 right (or the last level) */
  function placeResult(c, byLevel) {
    const ids = AC().levelIds(c);
    for (const lv of ids) { const x = byLevel[lv] || { right: 0, total: 0 }; if (!x.total || x.right / x.total < 0.6) return lv; }
    return ids[ids.length - 1];
  }

  const DRILLS = ['listen', 'read', 'spell', 'build', 'vocabTh', 'vocabSv', 'transSvTh', 'transThSv'];
  function material(c, level) {
    const ids = AC().levelIds(c), up = Math.max(0, ids.indexOf(level));
    const ls = c.lessons.filter(l => ids.indexOf(l.level) <= up);
    const lines = [].concat(...ls.map(l => (l.dialogue || []).map(d => ({ t: d.t, rom: d.rom, tr: d.tr, l })))).filter(x => x.tr && x.tr.sv);
    const words = [].concat(...ls.map(l => (l.vocab || []).map(w => ({ t: w.t, rom: w.rom, tr: w.tr, l }))));
    const seen = new Set(), uniq = a => a.filter(x => { const k = clean(x.t); if (seen.has(k)) return false; seen.add(k); return true; });
    const u1 = uniq(lines); seen.clear();
    return { lines: u1, words: uniq(words) };
  }
  /* wordsOf(text) and graphemes(text) come from the page (the browser's Thai word and letter breaker), so this stays testable */
  function drill(kind, c, level, ex, rnd, h) {
    rnd = rnd || Math.random; h = h || {};
    const M = material(c, level), n = 10, out = [];
    const mean = x => tr(x.tr, ex);
    const others = (list, x, k) => shuffle(list.filter(y => y !== x && mean(y) !== mean(x) && clean(y.t) !== clean(x.t)), rnd).slice(0, k);
    const pick = (list, k) => shuffle(list, rnd).slice(0, k);
    if (kind === 'listen' || kind === 'read' || kind === 'transThSv') {
      pick(M.lines, n).forEach((x, i) => {
        const opts = shuffle([x].concat(others(M.lines, x, 3)), rnd).map(y => ({ v: clean(y.t), text: mean(y) }));
        if (opts.length < 2) return;
        if (kind === 'listen') out.push({ type: 'listen', id: 'dr:listen:' + i, say: clean(x.t), opts, answer: clean(x.t), reveal: clean(x.t) });
        else out.push({ type: 'mc', id: 'dr:' + kind + ':' + i, prompt: clean(x.t), rom: kind === 'transThSv' ? x.rom : null, q: '', say: clean(x.t), noSay: kind === 'read', opts, answer: clean(x.t) });
      });
    } else if (kind === 'transSvTh') {
      pick(M.lines, n).forEach((x, i) => {
        const opts = shuffle([x].concat(others(M.lines, x, 3)), rnd).map(y => ({ v: clean(y.t), text: clean(y.t), sub: y.rom || '' }));
        if (opts.length >= 2) out.push({ type: 'mc', id: 'dr:svth:' + i, reverse: true, prompt: mean(x), q: '', say: clean(x.t), opts, answer: clean(x.t) });
      });
    } else if (kind === 'vocabTh' || kind === 'vocabSv') {
      pick(M.words, n).forEach((x, i) => {
        const set = shuffle([x].concat(others(M.words, x, 3)), rnd);
        if (set.length < 2) return;
        out.push(kind === 'vocabTh'
          ? { type: 'mc', id: 'dr:w:' + i, word: true, prompt: clean(x.t), rom: x.rom || null, q: '', say: clean(x.t), opts: set.map(y => ({ v: clean(y.t), text: mean(y) })), answer: clean(x.t) }
          : { type: 'mc', id: 'dr:w:' + i, word: true, reverse: true, prompt: mean(x), q: '', say: clean(x.t), opts: set.map(y => ({ v: clean(y.t), text: clean(y.t), sub: y.rom || '' })), answer: clean(x.t) });
      });
    } else if (kind === 'spell') {
      const g = h.graphemes || (s => Array.from(s));
      pick(M.words.filter(x => { const k = g(clean(x.t)); return k.length >= 3 && k.length <= 8; }), n).forEach((x, i) => {
        const parts = g(clean(x.t));
        out.push({ type: 'order', id: 'dr:spell:' + i, tiles: shuffle(parts.map((p, k) => ({ k, g: p })), rnd), answer: clean(x.t), joiner: '', say: clean(x.t), rom: x.rom || null, sub: mean(x), listenFirst: true });
      });
    } else if (kind === 'build') {
      const wd = h.wordsOf || (s => String(s).split(/[|\s]+/).filter(Boolean));
      pick(M.lines.filter(x => { const k = wd(x.t); return k.length >= 3 && k.length <= 9; }), n).forEach((x, i) => {
        const ws = wd(x.t);
        out.push({ type: 'order', id: 'dr:build:' + i, tiles: shuffle(ws.map((p, k) => ({ k, g: p })), rnd), answer: ws.join(''), joiner: '', say: ws.join(''), rom: x.rom || null, sub: mean(x) });
      });
    }
    return out;
  }
  const drillSize = (kind, c, level, h) => drill(kind, c, level, 'sv', () => 0.5, h).length;

  /* texts (sv, en, th) */
  const TX = {
    sv: { cur: { unit: 'Enhet', objectives: 'Mål för lektionen', inLesson: 'I lektionen', practise: 'Öva', quiz: 'Kort prov', quizInfo: '5 frågor. Minst {p} % = lektionen klar.',
      status: { done: '✓ Klar · bästa resultat {b} %', started: 'Påbörjad · bästa resultat {b} % (minst {p} % behövs)', none: 'Inte påbörjad' },
      parts: { objectives: 'Mål', teacher: 'Lärarens förklaring', examples: 'Thailändska exempel', explanation: 'Förklaring', audio: 'Ljud', vocabulary: 'Ordförråd', practice: 'Övningar', assessment: 'Kort prov', completion: 'Status' },
      place: 'Placeringstest', placeInfo: 'Svara på några frågor från varje nivå så föreslår appen var du ska börja – efter vad du kan, inte efter ålder.', placeResult: 'Förslag: börja på {l}.', placeUse: 'Välj den nivån',
      drills: 'Öva thailändska', drillsInfo: 'Övningar från alla lektioner upp till din nivå.',
      d: { listen: ['Hörförståelse', 'Lyssna på en mening och välj vad den betyder'], read: ['Läsa', 'Läs en mening (utan ljud) och välj vad den betyder'], spell: ['Stava', 'Lyssna och bygg ordet av bokstäverna'],
        build: ['Bygga meningar', 'Sätt orden i rätt ordning'], vocabTh: ['Ord: thailändska → svenska', 'Vad betyder ordet?'], vocabSv: ['Ord: svenska → thailändska', 'Välj rätt thailändskt ord'],
        transSvTh: ['Översätt till thailändska', 'Välj rätt thailändsk mening'], transThSv: ['Översätt till svenska', 'Välj rätt svensk översättning'] } } },
    en: { cur: { unit: 'Unit', objectives: 'Lesson objectives', inLesson: 'In this lesson', practise: 'Practise', quiz: 'Short test', quizInfo: '5 questions. At least {p} % = lesson done.',
      status: { done: '✓ Done · best result {b} %', started: 'Started · best result {b} % ({p} % needed)', none: 'Not started' },
      parts: { objectives: 'Objectives', teacher: 'Teacher explanation', examples: 'Thai examples', explanation: 'Explanation', audio: 'Audio', vocabulary: 'Vocabulary', practice: 'Practice', assessment: 'Short test', completion: 'Status' },
      place: 'Placement test', placeInfo: 'Answer a few questions from each level and the app suggests where to start – by what you know, not by age.', placeResult: 'Suggestion: start at {l}.', placeUse: 'Choose that level',
      drills: 'Thai practice', drillsInfo: 'Exercises from every lesson up to your level.',
      d: { listen: ['Listening', 'Hear a sentence and choose its meaning'], read: ['Reading', 'Read a sentence (no sound) and choose its meaning'], spell: ['Spelling', 'Listen and build the word from its letters'],
        build: ['Sentence building', 'Put the words in the right order'], vocabTh: ['Words: Thai → Swedish', 'What does the word mean?'], vocabSv: ['Words: Swedish → Thai', 'Choose the right Thai word'],
        transSvTh: ['Translate into Thai', 'Choose the right Thai sentence'], transThSv: ['Translate into Swedish', 'Choose the right translation'] } } },
    th: { cur: { unit: 'หน่วย', objectives: 'จุดประสงค์ของบทเรียน', inLesson: 'ในบทเรียนนี้', practise: 'ฝึก', quiz: 'แบบทดสอบสั้น', quizInfo: '๕ ข้อ ได้อย่างน้อย {p} % = ผ่านบทเรียน',
      status: { done: '✓ ผ่านแล้ว · คะแนนดีที่สุด {b} %', started: 'เริ่มแล้ว · คะแนนดีที่สุด {b} % (ต้องได้ {p} %)', none: 'ยังไม่เริ่ม' },
      parts: { objectives: 'จุดประสงค์', teacher: 'คำอธิบายของครู', examples: 'ตัวอย่างภาษาไทย', explanation: 'คำอธิบาย', audio: 'เสียง', vocabulary: 'คำศัพท์', practice: 'แบบฝึกหัด', assessment: 'แบบทดสอบสั้น', completion: 'สถานะ' },
      place: 'แบบทดสอบวัดระดับ', placeInfo: 'ตอบคำถามจากทุกระดับ แล้วแอปจะแนะนำระดับที่ควรเริ่ม ตามความสามารถ ไม่ใช่ตามอายุ', placeResult: 'แนะนำให้เริ่มที่ {l}', placeUse: 'เลือกระดับนี้',
      drills: 'ฝึกภาษาไทย', drillsInfo: 'แบบฝึกจากทุกบทเรียนจนถึงระดับของคุณ',
      d: { listen: ['ฟังจับใจความ', 'ฟังประโยคแล้วเลือกความหมาย'], read: ['ฝึกอ่าน', 'อ่านประโยค (ไม่มีเสียง) แล้วเลือกความหมาย'], spell: ['สะกดคำ', 'ฟังแล้วเรียงตัวอักษรเป็นคำ'],
        build: ['เรียงประโยค', 'เรียงคำให้ถูกลำดับ'], vocabTh: ['คำศัพท์: ไทย → สวีเดน', 'คำนี้แปลว่าอะไร'], vocabSv: ['คำศัพท์: สวีเดน → ไทย', 'เลือกคำไทยที่ถูกต้อง'],
        transSvTh: ['แปลเป็นภาษาไทย', 'เลือกประโยคภาษาไทยที่ถูกต้อง'], transThSv: ['แปลเป็นภาษาสวีเดน', 'เลือกคำแปลที่ถูกต้อง'] } } }
  };
  FGH.FT = FGH.FT || {};
  for (const l in TX) FGH.FT[l] = Object.assign(FGH.FT[l] || {}, TX[l]);

  FGH.curriculum = { units, unitsAt, parts, quiz, placement, placeResult, drill, drillSize, material, DRILLS };
})(typeof window !== 'undefined' ? window : globalThis);
