/* Adult Language Academy logic: courses, lessons, exercises, level tests, "continue learning" and statistics.
   No DOM; tested in Node. Content comes from content/academy-*.js. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const courses = () => (G.FGH_CONTENT && G.FGH_CONTENT.academy && G.FGH_CONTENT.academy.courses) || {};
  const course = target => courses()[target] || null;
  const courseKey = (target, explain) => 'ac:' + target + ':' + explain;
  const lessonsAt = (c, level) => c.lessons.filter(l => l.level === level);
  /* a course may name its own levels (the Thai course: Level 1–5); the others use CEFR A1–C1 */
  const levelIds = c => (c && Array.isArray(c.levels) && c.levels.length) ? c.levels.map(l => l.id) : LEVELS;
  const levelInfo = (c, id) => (c && Array.isArray(c.levels) && c.levels.find(l => l.id === id)) || null;
  const firstLevel = c => levelIds(c)[0];
  const lessonById = (c, id) => c.lessons.find(l => l.id === id) || null;
  const itemKey = (c, lesson, w) => c.target + ':' + lesson.id + ':' + w.t;
  const tr = (obj, lang) => obj ? (obj[lang] != null ? obj[lang] : Object.values(obj)[0]) : '';

  /* text comparison that forgives case, punctuation and extra spaces, but not wrong words */
  const norm = s => String(s || '').toLocaleLowerCase().normalize('NFC').replace(/[¿?¡!.,;:"'’“”–-]/g, ' ').replace(/\s+/g, ' ').trim();
  function check(ex, value) {
    if (ex.type === 'write' || ex.type === 'speak') return !!value;
    if (ex.type === 'translate') return [ex.answer].concat(ex.accept || []).some(a => norm(a) === norm(value));
    return norm(value) === norm(ex.answer);
  }

  /* the lesson's own exercises plus vocabulary questions in both directions and a speaking task */
  function exercises(c, lesson, explain, rnd) {
    rnd = rnd || Math.random;
    const out = [];
    const optsOf = (list, a) => shuffle(list.map((o, k) => ({ v: String(k), text: typeof o === 'string' ? o : tr(o, explain) })), rnd);
    lesson.exercises.forEach((e, i) => {
      const id = lesson.id + ':e' + i;
      if (e.type === 'mc') out.push({ type: 'mc', id, prompt: e.prompt, rom: e.rom || null, q: tr(e.q, explain), opts: optsOf(e.opts), answer: String(e.a), say: e.noSay ? null : (e.say || e.prompt), noSay: !!e.noSay });
      else if (e.type === 'listen') out.push({ type: 'listen', id, say: e.say, opts: optsOf(e.opts), answer: String(e.a), reveal: e.say });
      else if (e.type === 'gap') out.push({ type: 'gap', id, text: e.text, rom: e.rom || null, sub: e.tr ? tr(e.tr, explain) : '', opts: shuffle(e.opts.map(o => ({ v: o, text: o })), rnd), answer: e.a, say: e.text.replace('___', e.a) });
      else if (e.type === 'order') {
        /* Thai is written without spaces between words, so Thai answers mark the tiles with "|" and the tiles are joined without spaces */
        const thai = e.answer.includes('|'), ws = thai ? e.answer.split('|') : e.answer.split(/\s+/), answer = thai ? ws.join('') : e.answer;
        out.push({ type: 'order', id, tiles: shuffle(ws.map((w, k) => ({ k, g: w })), rnd), answer, joiner: thai ? '' : ' ', say: answer, rom: e.rom || null, sub: e.tr ? tr(e.tr, explain) : '' });
      }
      else if (e.type === 'translate') out.push({ type: 'translate', id, from: tr(e.from, explain), answer: e.answer, accept: e.accept || [], say: e.answer });
      else if (e.type === 'write') out.push({ type: 'write', id, task: tr(e.task, explain), model: e.model });
    });
    const vocab = shuffle(lesson.vocab, rnd).slice(0, 4);
    vocab.forEach((w, i) => {
      const others = shuffle(lesson.vocab.filter(x => x !== w), rnd).slice(0, 3);
      if (i % 2 === 0) out.splice(Math.min(out.length, i + 1), 0, { type: 'mc', id: itemKey(c, lesson, w), word: true, prompt: w.t, q: '', say: w.t,
        rom: w.rom || null, opts: shuffle([w].concat(others).map(x => ({ v: x.t, text: tr(x.tr, explain) })), rnd), answer: w.t });
      else out.splice(Math.min(out.length, i + 1), 0, { type: 'mc', id: itemKey(c, lesson, w), word: true, reverse: true, prompt: tr(w.tr, explain), q: '', say: w.t,
        opts: shuffle([w].concat(others).map(x => ({ v: x.t, text: x.t, sub: x.rom || '' })), rnd), answer: w.t });
    });
    const line = lesson.dialogue.filter(d => d.t.split(' ').length <= 10)[0] || lesson.dialogue[0];
    if (line) out.push({ type: 'speak', id: lesson.id + ':speak', say: line.t, rom: line.rom || null, sub: tr(line.tr, explain) });
    return out;
  }

  /* level test: questions from every lesson of the level (no writing tasks), 70 % to pass */
  function levelTest(c, level, explain, rnd, n) {
    rnd = rnd || Math.random;
    const pool = [].concat(...lessonsAt(c, level).map(l => exercises(c, l, explain, rnd).filter(e => e.type !== 'write' && e.type !== 'speak')));
    return shuffle(pool, rnd).slice(0, n || 10);
  }

  /* where "Continue learning" goes: the lesson in progress, else the first unfinished lesson from the learner's level up */
  function nextLesson(c, prog, level) {
    prog = prog || { lessons: {} };
    if (prog.current) { const cur = lessonById(c, prog.current); if (cur && !(prog.lessons[cur.id] && prog.lessons[cur.id].done)) return cur; }
    const ids = levelIds(c), from = Math.max(0, ids.indexOf(level || ids[0]));
    const order = c.lessons.filter(l => ids.indexOf(l.level) >= from).concat(c.lessons.filter(l => ids.indexOf(l.level) < from));
    return order.find(l => !(prog.lessons[l.id] && prog.lessons[l.id].done)) || null;
  }
  function levelState(c, prog, level) {
    const ls = lessonsAt(c, level), done = ls.filter(l => prog && prog.lessons[l.id] && prog.lessons[l.id].done).length;
    const passed = !!(prog && prog.tests && prog.tests.some(t => t.level === level && t.passed));
    return { total: ls.length, done, passed };
  }

  /* numbers for the learning dashboard */
  function stats(c, prog, deck, log, pid, now) {
    prog = prog || { lessons: {}, timeMs: 0, lastAt: 0 };
    const recs = Object.values(prog.lessons);
    const done = c.lessons.filter(l => prog.lessons[l.id] && prog.lessons[l.id].done).length;
    const prefix = c.target + ':';
    const words = Object.values(deck || {}).filter(x => x.key.startsWith(prefix) && (x.reps >= 1 || (x.lapses === 0 && x.last === 0))).length;   // studied in a finished lesson and not failed since
    return {
      pct: Math.round(100 * done / Math.max(1, c.lessons.length)), done, total: c.lessons.length,
      words, avg: recs.length ? Math.round(recs.reduce((a, r) => a + r.best, 0) / recs.length) : null,
      timeMs: prog.timeMs || 0, lastAt: prog.lastAt || 0
    };
  }

  FGH.academy = { LEVELS, levelIds, levelInfo, firstLevel, courses, course, courseKey, lessonsAt, lessonById, itemKey, tr, exercises, levelTest, check, norm, nextLesson, levelState, stats };
})(typeof window !== 'undefined' ? window : globalThis);
