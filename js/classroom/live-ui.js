/* Live lesson (live.html) – Phase G. One page, two roles, decided by the database (teaching_access):
   - Teacher (live.html?s=<session id>): lesson navigation and exercises on the left, Thai material in the middle, questions,
     comments, private notes, participation and progress on the right. Controls: previous/next part, play Thai for everyone,
     show an exercise, show the answer, pause, end, assign homework.
   - Student (live.html): follows the part the teacher shows, hears the Thai the teacher plays, answers the exercise on screen,
     asks questions and writes comments.
   Changes reach the other devices through Supabase Realtime (a signal that the lesson row changed) and, as a fallback, by
   asking every 3 seconds. Nothing here decides rights: every call is checked by supabase/migrations/0008_live_classroom.sql. */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit, LC = FGH.liveCore, AC = FGH.academy, VO = FGH.voice;
  const { $, esc } = K;
  const t = (k, v) => K.t('live.' + k, v);
  const P = new URLSearchParams(location.search);
  const V = { phase: 'loading', role: null, acc: null, st: null, joined: false, err: null, rt: false, lastAudio: null, confirm: false, hw: false, busy: false };
  let svc = null, timer = null, stopWatch = null, sig = '', classId = null;

  const EXPL = (() => { try { return localStorage.getItem('te.explain') === 'th' ? 'th' : 'sv'; } catch (e) { return 'sv'; } })();
  const tr = o => o == null ? '' : typeof o === 'string' ? o : (o[EXPL] || o.sv || o.th || o.en || Object.values(o)[0] || '');
  const errCode = e => (FGH.teachingAccess ? FGH.teachingAccess.reasonOf(e) : (e && e.code)) || 'error';
  const say = (text, rate) => { if (VO) VO.say(text, 'th', rate ? { rate } : {}); else K.speak(text, 'th'); };

  /* ---------- data ---------- */
  const S = () => V.st && V.st.session;
  function lessonOf(s) {
    if (!s || !AC) return { course: null, lesson: null };
    let course = null; try { course = AC.course(s.course_id); } catch (e) { course = null; }
    const lesson = course && course.lessons ? course.lessons.find(l => l.id === s.lesson_id) : null;
    return { course, lesson };
  }

  async function boot() {
    if (!FGH.teachingAccess) { V.phase = 'gate'; V.err = 'not_configured'; return render(); }
    const a = await FGH.teachingAccess.check();
    V.acc = a;
    if (!a.ok) { V.phase = 'gate'; V.err = a.reason; return render(); }
    svc = a.svc; V.role = a.kind === 'staff' ? 'teacher' : 'student';
    if (V.role === 'teacher' && !P.get('s')) { V.phase = 'error'; V.err = 'notAllowed'; return render(); }
    V.phase = 'live';
    await sync(true);
  }
  async function fetchState() { return V.role === 'teacher' ? svc.liveTeacherState(P.get('s')) : svc.liveStudentState(); }
  async function sync(first) {
    let st;
    try { st = await fetchState(); }
    catch (e) {
      const c = errCode(e);
      if (first) { V.phase = 'error'; V.err = c === 'migration_missing' ? 'needsUpdate' : c === 'not_allowed' ? 'notAllowed' : c; render(); return; }
      return schedule();   // a short network hiccup: try again
    }
    const s = st && st.session;
    const cid = (s && s.class_id) || st.class_id;
    if (cid && cid !== classId) { classId = cid; if (stopWatch) stopWatch(); stopWatch = svc.watchClass(cid, () => sync(), ok => { if (V.rt !== ok) { V.rt = ok; render(); } schedule(); }); }
    /* sound the teacher plays for everyone: only new ones, only after the student joined (a tap allows sound on phones and tablets) */
    if (V.role === 'student' && s) {
      if (V.lastAudio == null || first) V.lastAudio = s.audio_seq;
      else if (s.audio_seq > V.lastAudio) { V.lastAudio = s.audio_seq; if (V.joined && s.audio_text && s.status === 'live') say(s.audio_text); }
    }
    /* redraw only when something visible changed (rev and updated_at move with every answer in the class) */
    const nsig = JSON.stringify(st, (k, v) => (k === 'rev' || k === 'updated_at') ? undefined : v);
    V.st = st;
    if (nsig !== sig || first) { sig = nsig; render(); }
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    const s = S();
    if (s && s.status === 'ended' && V.role === 'teacher') return;
    timer = setTimeout(() => sync(), V.rt ? 10000 : (s && s.status !== 'ended' ? (V.role === 'teacher' ? 2000 : 3000) : 6000));
  }
  async function act(fn, after) {
    if (V.busy) return; V.busy = true;
    try { await fn(); if (after) after(); } catch (e) { const c = errCode(e); K.toast('⚠️ ' + (c === 'too_many_messages' ? t('tooMany') : t('error', { m: c }))); }
    V.busy = false; await sync();
  }

  /* ---------- screens ---------- */
  function render() {
    document.documentElement.lang = K.ui();
    /* typed text survives the regular updates */
    const keep = {}; document.querySelectorAll('#app input[id], #app textarea[id], #app select[id]').forEach(e => { if (e.type !== 'checkbox') keep[e.id] = e.value; });
    const focus = document.activeElement && document.activeElement.id;
    const s = S();
    const back = V.role === 'teacher' ? '<a class="btn small" href="teacher.html">← ' + esc(t('backTeacher')) + '</a>' : '<a class="btn small" href="academy.html">← ' + esc(t('backAcademy')) + '</a>';
    const pill = V.phase === 'live' && s && s.status !== 'ended' ? '<span class="pill lv-rt" title="' + esc(V.rt ? t('rtOn') : t('rtOff')) + '">' + esc(V.rt ? t('rtOn') : t('rtOff')) + '</span>' : '';
    let h = K.header(s && s.status !== 'ended' ? s.title : t('title'), { extra: pill + back });
    if (V.phase === 'loading') h += '<section class="card center"><p class="muted">…</p></section>';
    else if (V.phase === 'gate') h += gateHTML();
    else if (V.phase === 'error') h += '<section class="card stack"><p>⚠️ ' + esc(t(V.err) !== 'live.' + V.err ? t(V.err) : t('error', { m: V.err })) + '</p></section>';
    else h += V.role === 'teacher' ? teacherHTML() : studentHTML();
    if (V.confirm) h += '<div class="overlay" role="dialog" aria-modal="true"><div class="card stack" style="max-width:440px"><p>' + esc(t('endAsk')) + '</p><div class="row"><button class="btn primary" data-act="endYes">' + esc(t('end')) + '</button><button class="btn" data-act="endNo">' + esc(K.t('cancel')) + '</button></div></div></div>';
    $('app').innerHTML = h;
    for (const id in keep) { const e = $(id); if (e) e.value = keep[id]; }
    if (focus && $(focus)) $(focus).focus();
  }
  function gateHTML() {
    return '<section class="card stack"><h2>🔒 ' + esc(t('notAllowed')) + '</h2><div class="row"><a class="btn primary" href="student.html">🎒 ' + esc(t('signIn')) + '</a><a class="btn" href="teacher.html">🧑‍🏫 ' + esc(t('teacher')) + '</a></div></section>';
  }

  /* the Thai material of one part */
  function stepHTML(lesson, step, teacher) {
    const media = (window.FGH_CONTENT && window.FGH_CONTENT.media) || {};
    const play = text => '<button class="ghost" data-act="say" data-v="' + esc(text) + '" title="' + esc(t('play')) + '" aria-label="' + esc(t('play')) + '">🔊</button>' +
      (teacher ? '<button class="ghost" data-act="sayAll" data-v="' + esc(text) + '" title="' + esc(t('playAll')) + '" aria-label="' + esc(t('playAll')) + '">📢</button>' : '');
    if (!lesson) return '<section class="card"><p class="muted">' + esc(t('lessonMissing')) + '</p></section>';
    const k = step.kind;
    let h = '<section class="card lv-step"><p class="muted lv-kind">' + esc(t('kind.' + k)) + '</p>';
    if (k === 'intro') h += '<div class="lv-intro"><span class="lv-icon" aria-hidden="true">' + esc(lesson.icon || '📖') + '</span><h2 class="lv-th" lang="th">' + esc(lesson.title && lesson.title.th ? lesson.title.th : tr(lesson.title)) + '</h2>' +
      (lesson.title && lesson.title.th && EXPL !== 'th' ? '<p class="lv-tr">' + esc(tr(lesson.title)) + '</p>' : '') + '<p class="muted">' + esc(tr(lesson.goal)) + '</p></div>';
    else if (k === 'tones') h += '<div class="lv-words">' + lesson.tones.map(tn => '<div class="lv-word"><div class="lv-th" lang="th">' + esc(tn.word || tn.name) + '</div><div class="lv-rom">' + esc(tn.name + ' · ' + (tn.wrom || tn.rom || '')) + '</div><div class="lv-tr">' + esc(tn.sv || '') + (tn.wsv ? ' – ' + esc(tn.wsv) : '') + '</div>' + (tn.word ? '<div>' + play(tn.word) + '</div>' : '') + '</div>').join('') + '</div>';
    else if (k === 'grammar') {
      const g = lesson.grammar;
      h += '<h2>' + esc(tr(g.title)) + '</h2>' + (g.body ? tr(g.body).split(/\n\n+/).map(p => '<p>' + esc(p) + '</p>').join('') : '') +
        (g.table ? '<div class="tablewrap"><table class="lv-table"><tbody>' + g.table.map((r, ri) => '<tr>' + r.map(c => ri === 0 ? '<th lang="th">' + esc(c) + '</th>' : '<td lang="th">' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '');
    } else if (k === 'lines') {
      const ls = (lesson.dialogue || []).slice(step.from, step.to);
      if (teacher) h += '<div class="row" style="margin:0 0 .5rem"><button class="btn small" data-act="sayAll" data-v="' + esc(ls.map(x => x.t.replace(/\|/g, '')).join('\n').slice(0, 400)) + '">📢 ' + esc(t('playAll')) + '</button></div>';
      h += ls.map(d => '<div class="lv-line">' + (d.who ? '<span class="who" aria-hidden="true">' + esc(d.who) + '</span>' : '') + '<div class="grow"><div class="lv-th" lang="th">' + esc(d.t.replace(/\|/g, '')) + '</div>' +
        (d.rom ? '<div class="lv-rom">' + esc(d.rom) + '</div>' : '') + (d.tr ? '<div class="lv-tr">' + esc(tr(d.tr)) + '</div>' : '') + '</div><div class="lv-say">' + play(d.t.replace(/\|/g, '')) + '</div></div>').join('');
    } else if (k === 'words') {
      h += '<div class="lv-words">' + (lesson.vocab || []).slice(step.from, step.to).map(w => '<div class="lv-word"><div class="lv-th" lang="th">' + esc(w.t) + '</div>' + (w.rom ? '<div class="lv-rom">' + esc(w.rom) + '</div>' : '') +
        '<div class="lv-tr">' + esc(tr(w.tr)) + '</div><div>' + play(w.t) + '</div></div>').join('') + '</div>';
    } else if (k === 'images') {
      const ims = (lesson.images || []).filter(im => media[im.path]);
      h += ims.length ? '<div class="lesson-images">' + ims.map(im => '<figure><img src="' + esc(media[im.path]) + '" alt="' + esc(im.caption || '') + '">' + (im.caption ? '<figcaption lang="th">' + esc(im.caption) + '</figcaption>' : '') + '</figure>').join('') + '</div>' : '<p class="muted">–</p>';
    } else if (k === 'end') h += '<div class="lv-intro"><span class="lv-icon" aria-hidden="true">🎉</span><p>' + esc(t('endText')) + '</p></div>';
    return h + '</section>';
  }

  /* the exercise on screen */
  function exerciseHTML(s, teacher) {
    const ex = s.exercise; if (!ex) return '';
    const mine = V.st.mine && V.st.mine.seq === ex.seq ? V.st.mine : null;
    const key = teacher ? V.st.key : (s.revealed ? ex.answer : null);
    const ta = teacher ? LC.tally(V.st.students, ex) : null;
    const nStudents = teacher ? V.st.students.length : 0;
    let h = '<section class="card lv-ex" aria-live="polite"><div class="row" style="margin:0"><h2 style="margin:0">✏️ ' + esc(t('onScreen')) + '</h2><span class="grow"></span>' +
      (teacher ? '<span class="pill">' + esc(t('answers', { n: ta.total, m: nStudents, r: ta.right })) + '</span>' : '') + '</div>';
    if (ex.q) h += '<p style="margin:.4rem 0 0">' + esc(ex.q) + '</p>';
    if (ex.type === 'listen') h += '<p>' + '<button class="btn" data-act="say" data-v="' + esc(ex.say || '') + '">🔊 ' + esc(t('play')) + '</button>' + (teacher ? ' <button class="btn" data-act="sayAll" data-v="' + esc(ex.say || '') + '">📢 ' + esc(t('playAll')) + '</button>' : '') + '</p>';
    else if (ex.type === 'gap') h += '<div class="lv-th big" lang="th">' + esc(ex.text) + '</div>' + (ex.sub ? '<p class="lv-tr">' + esc(ex.sub) + '</p>' : '');
    else h += '<div class="lv-th big"' + (ex.reverse ? '' : ' lang="th"') + '>' + esc(ex.prompt) + (ex.say && !ex.noSay && !ex.reverse ? ' <button class="ghost" data-act="say" data-v="' + esc(ex.say) + '">🔊</button>' : '') + '</div>' + (ex.rom && !ex.reverse ? '<div class="lv-rom">' + esc(ex.rom) + '</div>' : '');
    const closed = !teacher && (s.revealed || s.status !== 'live');
    h += '<div class="lv-opts">' + ex.opts.map(o => {
      const isKey = key != null && String(key) === o.v, chosen = mine && mine.choice === o.v;
      const cls = 'lv-opt' + (chosen ? ' chosen' : '') + (isKey ? ' key' : '') + (s.revealed && chosen && !isKey ? ' wrongpick' : '');
      const n = ta ? (ta.by[o.v] || []).length : 0;
      return teacher
        ? '<div class="' + cls + '"><span class="lv-ot" lang="th">' + esc(o.text) + (o.sub ? ' <small>' + esc(o.sub) + '</small>' : '') + '</span><span class="lv-bar"><span style="width:' + (nStudents ? Math.round(100 * n / nStudents) : 0) + '%"></span></span><b>' + n + '</b>' +
          (n ? '<small class="muted lv-names">' + esc((ta.by[o.v] || []).join(', ')) + '</small>' : '') + '</div>'
        : '<button class="' + cls + '" data-act="answer" data-v="' + esc(o.v) + '"' + (closed ? ' disabled' : '') + ' aria-pressed="' + !!chosen + '"><span class="lv-ot" lang="th">' + esc(o.text) + (o.sub ? ' <small>' + esc(o.sub) + '</small>' : '') + '</span></button>';
    }).join('') + '</div>';
    if (teacher) h += '<div class="row" style="margin:.5rem 0 0">' + (s.revealed ? '' : '<button class="btn primary" data-act="reveal">👁 ' + esc(t('reveal')) + '</button>') + '<button class="btn" data-act="clearEx">✕ ' + esc(t('clear')) + '</button></div>';
    else if (s.revealed && mine) h += '<p class="lv-result">' + esc(mine.ok ? t('right') : t('wrong')) + (mine.ok ? '' : ' ' + esc(t('correctIs', { a: (ex.opts.find(o => o.v === String(ex.answer)) || {}).text || ex.answer }))) + '</p>';
    else if (s.revealed) h += '<p class="lv-result">' + esc(t('correctIs', { a: (ex.opts.find(o => o.v === String(ex.answer)) || {}).text || ex.answer })) + '</p>';
    else if (mine) h += '<p class="muted">✓ ' + esc(t('saved')) + ' ' + esc(t('change')) + '</p>';
    return h + '</section>';
  }

  function navHTML(steps, s, teacher) {
    return '<nav class="card lv-nav" aria-label="' + esc(t('lessonNav')) + '"><h3>' + esc(t('lessonNav')) + '</h3><ol>' + steps.map((st, i) => {
      const label = t('kind.' + st.kind) + (st.from != null ? ' ' + (st.from + 1) + '–' + st.to : '');
      return '<li' + (i === s.step ? ' class="on" aria-current="step"' : '') + '>' + (teacher ? '<button class="ghost" data-act="go" data-v="' + i + '">' + esc(label) + '</button>' : '<span>' + esc(label) + '</span>') + '</li>';
    }).join('') + '</ol></nav>';
  }
  function progressHTML(s) {
    const pc = Math.round(100 * (s.step + 1) / Math.max(1, s.steps));
    return '<section class="card"><h3>' + esc(t('progress')) + '</h3><p class="muted" style="margin:0 0 .3rem">' + esc(t('step', { i: s.step + 1, n: s.steps })) + '</p><div class="meter"><span style="width:' + pc + '%"></span></div></section>';
  }
  const fmtT = ts => { try { return new Date(ts).toLocaleTimeString(K.ui() === 'th' ? 'th-TH' : K.ui() === 'sv' ? 'sv-SE' : 'en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  function talkHTML(teacher) {
    const ms = (V.st.messages || []).filter(m => m.kind !== 'note');
    let h = '<section class="card lv-talk"><h3>💬 ' + esc(t('talk')) + '</h3>';
    h += ms.length ? '<ul class="plain lv-msgs">' + ms.map(m => {
      const who = m.author_kind === 'teacher' ? '🧑‍🏫 ' + m.author_name : (m.mine ? m.author_name + ' (' + t('you') + ')' : m.author_name);
      let x = '<li class="lv-msg ' + m.kind + (m.author_kind === 'teacher' ? ' teacher' : '') + '"><div class="mh"><b>' + esc(who) + '</b><span class="muted">' + esc(m.kind === 'question' ? '❓' : '') + ' ' + esc(fmtT(m.created_at)) + '</span></div><p>' + esc(m.body || '') + '</p>';
      if (m.kind === 'question' && m.reply) x += '<p class="lv-reply"><b>' + esc(t('answered')) + ':</b> ' + esc(m.reply) + '</p>';
      else if (m.kind === 'question' && teacher) x += '<form class="row" data-form="reply" data-v="' + esc(m.id) + '" style="margin:.3rem 0 0"><input id="rp-' + esc(m.id) + '" type="text" maxlength="1000" placeholder="' + esc(t('replyPh')) + '" style="flex:1"><button class="btn small" type="submit">' + esc(t('reply')) + '</button></form>';
      else if (m.kind === 'question' && m.mine) x += '<p class="muted" style="font-size:.85rem;margin:0">' + esc(t('qOpen')) + '</p>';
      return x + '</li>';
    }).join('') + '</ul>' : '<p class="muted">' + esc(t('noTalk')) + '</p>';
    const open = S() && S().status !== 'ended';
    if (open && teacher) h += '<form class="row" data-form="tcomment" style="margin:.4rem 0 0"><input id="lvC" type="text" maxlength="1000" placeholder="' + esc(t('commentPh')) + '" style="flex:1"><button class="btn small" type="submit">' + esc(t('send')) + '</button></form>';
    if (open && !teacher) h += '<form class="stack" data-form="spost" style="margin:.4rem 0 0"><textarea id="lvQ" rows="2" maxlength="500" placeholder="' + esc(t('askPh')) + '"></textarea><div class="row" style="margin:0">' +
      '<button class="btn small primary" type="submit" data-kind="question">❓ ' + esc(t('ask')) + '</button><button class="btn small" type="submit" data-kind="comment">💬 ' + esc(t('comment')) + '</button></div></form>';
    return h + '</section>';
  }
  function notesHTML() {
    const ns = (V.st.messages || []).filter(m => m.kind === 'note');
    return '<section class="card lv-notes"><h3>🗒 ' + esc(t('notes')) + '</h3>' + (ns.length ? '<ul class="plain">' + ns.map(n => '<li><span class="muted">' + esc(fmtT(n.created_at)) + '</span> ' + esc(n.body) + '</li>').join('') + '</ul>' : '') +
      '<form class="row" data-form="note" style="margin:.3rem 0 0"><input id="lvN" type="text" maxlength="1000" placeholder="' + esc(t('notePh')) + '" style="flex:1"><button class="btn small" type="submit">' + esc(t('save')) + '</button></form></section>';
  }
  function peopleHTML() {
    const ss = V.st.students || [], here = ss.filter(x => x.here).length;
    return '<section class="card lv-people"><h3>👥 ' + esc(t('people')) + '</h3><p class="muted" style="margin:0 0 .4rem">' + esc(t('studentsHere', { n: here, m: ss.length })) + '</p><ul class="plain">' +
      ss.map(x => '<li><span class="dot ' + (x.here ? 'on' : x.joined ? 'away' : 'off') + '" title="' + esc(x.here ? t('here') : x.joined ? t('away') : t('notJoined')) + '"></span><b>' + x.no + '</b> ' + esc(x.name) +
        ' <small class="muted">' + esc(t('answeredN', { n: x.answers, r: x.right })) + (x.posts ? ' · ' + esc(t('posts', { n: x.posts })) : '') + '</small>' +
        (x.current ? ' <span aria-label="' + esc(x.current.ok ? t('right') : t('wrong')) + '">' + (x.current.ok ? '✅' : '❌') + '</span>' : '') + '</li>').join('') + '</ul></section>';
  }

  function teacherHTML() {
    const s = S(); if (!s) return '';
    const { course, lesson } = lessonOf(s), steps = LC.steps(lesson), step = steps[Math.min(s.step, steps.length - 1)];
    if (s.status === 'ended') return '<section class="card stack"><h2>⏹ ' + esc(s.title) + '</h2><p>' + esc(t('ended')) + '</p><a class="btn primary" href="teacher.html">← ' + esc(t('backTeacher')) + '</a></section>' + talkHTML(true) + notesHTML() + peopleHTML();
    const pool = LC.pool(course, lesson, EXPL);
    let h = '<div class="lv-bar-top card row" role="toolbar" aria-label="' + esc(t('title')) + '">' +
      '<span class="pill ' + (s.status === 'live' ? 'lv-on' : '') + '">' + esc(s.status === 'live' ? t('liveNow') : '⏸ ' + t('pause')) + '</span>' +
      '<button class="btn" data-act="go" data-v="' + (s.step - 1) + '"' + (s.step <= 0 ? ' disabled' : '') + '>◀ ' + esc(t('prev')) + '</button>' +
      '<button class="btn primary" data-act="go" data-v="' + (s.step + 1) + '"' + (s.step >= s.steps - 1 ? ' disabled' : '') + '>' + esc(t('next')) + ' ▶</button>' +
      (s.status === 'live' ? '<button class="btn" data-act="pause">⏸ ' + esc(t('pause')) + '</button>' : '<button class="btn primary" data-act="resume">▶ ' + esc(t('resume')) + '</button>') +
      '<button class="btn" data-act="hwToggle">📝 ' + esc(t('assignHw')) + '</button><span class="grow"></span><button class="btn danger" data-act="endAsk">⏹ ' + esc(t('end')) + '</button></div>';
    if (V.hw) h += '<form class="card row" data-form="hw" style="align-items:flex-end"><label class="field" style="flex:1">' + esc(t('hwTitle')) + '<input id="lvHt" type="text" maxlength="120" required value="' + esc(s.title) + '"></label>' +
      '<label class="field">' + esc(t('hwDue')) + '<input id="lvHd" type="datetime-local"></label><button class="btn primary" type="submit">' + esc(t('assignHw')) + '</button></form>';
    h += '<div class="live">';
    h += '<aside class="lv-left">' + navHTML(steps, s, true) +
      '<section class="card lv-pool"><h3>✏️ ' + esc(t('exercises')) + '</h3>' + (pool.length ? '<ul class="plain">' + pool.map((q, i) => '<li class="' + (s.exercise && s.exercise.id === q.id ? 'on' : '') + '"><span lang="th">' + esc(q.pub.type === 'gap' ? q.pub.text : q.pub.type === 'listen' ? '🔊 ' + (q.pub.say || '') : q.pub.prompt) + '</span>' +
        '<button class="btn small" data-act="showEx" data-v="' + i + '">' + esc(t('showEx')) + '</button></li>').join('') + '</ul>' : '<p class="muted">–</p>') + '</section></aside>';
    h += '<main class="lv-main">' + exerciseHTML(s, true) + stepHTML(lesson, step || { kind: 'intro' }, true) + '</main>';
    h += '<aside class="lv-right">' + progressHTML(s) + peopleHTML() + talkHTML(true) + notesHTML() + '</aside></div>';
    return h;
  }

  function studentHTML() {
    const s = S();
    if (!s || s.status === 'ended') {
      return '<section class="card stack center"><h2>' + (s ? '🎉 ' + esc(t('ended')) : '📡 ' + esc(t('title'))) + '</h2><p>' + esc(s ? t('endText') : t('waiting')) + '</p><a class="btn primary" href="academy.html">← ' + esc(t('backAcademy')) + '</a></section>';
    }
    if (!V.joined) return '<section class="card stack center lv-join"><p class="lv-on-big">' + esc(t('liveNow')) + '</p><h2>' + esc(s.title) + '</h2><p class="muted">🧑‍🏫 ' + esc(s.teacher_name) + '</p>' +
      '<button class="btn primary big" data-act="join">▶ ' + esc(t('join')) + '</button><p class="muted" style="font-size:.9rem">' + esc(t('joinInfo')) + '</p></section>';
    const { lesson } = lessonOf(s), steps = LC.steps(lesson), step = steps[Math.min(s.step, steps.length - 1)];
    let h = s.status === 'paused' ? '<div class="notebox lv-paused" role="status">' + esc(t('paused')) + '</div>' : '';
    if (VO && FGH.voiceUI) h += FGH.voiceUI.thaiBannerHTML(null);
    h += '<div class="live">';
    h += '<aside class="lv-left">' + navHTML(steps, s, false) + '</aside>';
    h += '<main class="lv-main">' + exerciseHTML(s, false) + stepHTML(lesson, step || { kind: 'intro' }, false) + '</main>';
    h += '<aside class="lv-right">' + progressHTML(s) + talkHTML(false) + '</aside></div>';
    return h;
  }

  /* ---------- actions ---------- */
  const sid = () => S() && S().id;
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    say(v) { say(v); },
    sayAll(v) { say(v); act(() => svc.liveControl(sid(), 'audio', { audio: v.slice(0, 400) })); },
    go(v) { const n = parseInt(v, 10); if (isNaN(n) || n < 0 || n >= S().steps) return; act(() => svc.liveControl(sid(), 'step', { step: n })); },
    pause() { act(() => svc.liveControl(sid(), 'pause')); },
    resume() { act(() => svc.liveControl(sid(), 'resume')); },
    endAsk() { V.confirm = true; render(); },
    endNo() { V.confirm = false; render(); },
    endYes() { V.confirm = false; act(() => svc.liveControl(sid(), 'end')); },
    showEx(v) {
      const { course, lesson } = lessonOf(S()), q = LC.pool(course, lesson, EXPL)[+v]; if (!q) return;
      act(() => svc.liveControl(sid(), 'exercise', { exercise: q.pub, answer: q.key }));
    },
    reveal() { act(() => svc.liveControl(sid(), 'reveal')); },
    clearEx() { act(() => svc.liveControl(sid(), 'clear')); },
    hwToggle() { V.hw = !V.hw; render(); },
    join() {
      V.joined = true;
      /* a tap: lets this page play sound later without another tap (phones and tablets) */
      try { if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) { /* ignore */ }
      render();
    },
    answer(v) { const ex = S() && S().exercise; if (!ex) return; act(() => svc.liveStudentAnswer(ex.seq, v)); }
  };
  K.bindActs(ACT);
  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.dataset.form, val = id => { const el = $(id); const x = el ? el.value.trim() : ''; return x; }, clear = id => { const el = $(id); if (el) el.value = ''; };
    if (f === 'spost') { const b = val('lvQ'); if (!b) return; const kind = (e.submitter && e.submitter.dataset.kind) || 'question'; clear('lvQ'); act(() => svc.liveStudentPost(kind, b)); }
    if (f === 'tcomment') { const b = val('lvC'); if (!b) return; clear('lvC'); act(() => svc.liveTeacherPost(sid(), 'comment', b)); }
    if (f === 'note') { const b = val('lvN'); if (!b) return; clear('lvN'); act(() => svc.liveTeacherPost(sid(), 'note', b)); }
    if (f === 'reply') { const id = e.target.dataset.v, b = val('rp-' + id); if (!b) return; clear('rp-' + id); act(() => svc.liveReply(id, b)); }
    if (f === 'hw') {
      const s = S(), title = val('lvHt'), due = val('lvHd');
      act(() => svc.createAssignment({ classId: s.class_id, title, instructions: '', due: due ? new Date(due).toISOString() : null, course: s.course_id, lesson: s.lesson_id, maxScore: 10, allowResubmit: true }),
        () => { V.hw = false; K.toast('✓ ' + t('hwSaved')); });
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && V.phase === 'live') sync(); });
  render();
  boot().catch(e => { V.phase = 'error'; V.err = errCode(e); render(); });
  window.__live = { state: () => V, sync };
})();
