/* Live lesson logic without the DOM (tested in Node: tests/live.test.js).
   - steps(lesson): the sections the teacher moves through: start, tones, grammar, the lesson's reading/dialogue lines in groups,
     the words in groups, images, end. The same list is built on the teacher's and the students' devices from the same lesson,
     so only the step number travels through the database.
   - pool(course, lesson, explain): the lesson's questions that can be answered by choosing (multiple choice, listening, gap),
     split into what students may see (pub) and the right answer (key), which goes to the database separately.
   - tally(students, exercise): how many chose each option (for the teacher). */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const GROUP = 6;

  function steps(lesson) {
    if (!lesson) return [{ kind: 'intro' }];
    const out = [{ kind: 'intro' }];
    if (lesson.tones && lesson.tones.length) out.push({ kind: 'tones' });
    if (lesson.grammar && (lesson.grammar.title || lesson.grammar.body || lesson.grammar.table)) out.push({ kind: 'grammar' });
    const d = lesson.dialogue || [], w = lesson.vocab || [];
    for (let i = 0; i < d.length; i += GROUP) out.push({ kind: 'lines', from: i, to: Math.min(d.length, i + GROUP) });
    for (let i = 0; i < w.length; i += GROUP) out.push({ kind: 'words', from: i, to: Math.min(w.length, i + GROUP) });
    if (lesson.images && lesson.images.length) out.push({ kind: 'images' });
    out.push({ kind: 'end' });
    return out.slice(0, 200);
  }
  /* the Thai texts of one step (what "play for everyone" can read) */
  function textsOf(lesson, step) {
    if (!lesson || !step) return [];
    if (step.kind === 'lines') return (lesson.dialogue || []).slice(step.from, step.to).map(x => x.t);
    if (step.kind === 'words') return (lesson.vocab || []).slice(step.from, step.to).map(x => x.t);
    return [];
  }
  const CHOOSE = ['mc', 'listen', 'gap'];
  function pool(course, lesson, explain, rnd) {
    const AC = FGH.academy; if (!AC || !course || !lesson) return [];
    let qs = [];
    try { qs = AC.exercises(course, lesson, explain, rnd || (() => 0.42)); } catch (e) { qs = []; }
    const seen = new Set();
    return qs.filter(q => CHOOSE.includes(q.type) && Array.isArray(q.opts) && q.opts.length >= 2 && q.answer != null).filter(q => !seen.has(q.id) && seen.add(q.id)).slice(0, 40).map(q => ({
      id: q.id,
      key: String(q.answer),
      pub: { type: q.type, id: q.id, prompt: q.prompt || '', q: q.q || '', rom: q.rom || null, text: q.text || '', sub: q.sub || '', say: q.say || null, noSay: !!q.noSay,
        reverse: !!q.reverse, opts: q.opts.map(o => ({ v: String(o.v), text: String(o.text), sub: o.sub || '' })) }
    }));
  }
  function tally(students, exercise) {
    const out = { total: 0, right: 0, by: {} };
    if (!exercise) return out;
    (exercise.opts || []).forEach(o => { out.by[o.v] = []; });
    (students || []).forEach(s => { const c = s.current; if (!c) return; out.total++; if (c.ok) out.right++; (out.by[c.choice] = out.by[c.choice] || []).push(s.name); });
    return out;
  }
  FGH.liveCore = { steps, textsOf, pool, tally, GROUP };
})(typeof window !== 'undefined' ? window : globalThis);
