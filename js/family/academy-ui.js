/* academy.html – two modes:
   - Thai Learning Academy (ThaiElevate, Phase C): academy.html, academy.html?course=th. Thai is the only target language; Swedish or
     Thai explanations (saved per learner as adult[pid].thExplain, missing Thai texts fall back to Swedish); its own navigation:
     Dashboard, Courses, Lessons, Thai Practice, Learning Games, Classroom, Homework, My Progress. Children and adults can learn here.
     Progress keeps the key ac:th:sv whatever the explanation language, so switching never hides progress.
   - Other language courses: academy.html?course=sv|en|es – the earlier Adult Language Academy, unchanged.
   Shared: course setup, dashboard with "Continue learning", lessons (dialogue, key words,
   grammar, exercises), level tests, spaced-repetition review and the learner's own word list. */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit, F = FGH.family, store = FGH.familyStore, A = FGH.actions, AC = FGH.academy, SRS = FGH.srs, LG = FGH.ledger;
  const VO = FGH.voice, VUI = FGH.voiceUI;
  const { $, esc, t } = K;
  const params = new URLSearchParams(location.search);
  const THAI = !params.get('course') || params.get('course') === 'th';   // Thai Learning Academy mode
  const TABS = ['home', 'courses', 'lessons', 'practice', 'games', 'classroom', 'homework', 'progress'];
  let V = { screen: 'home', pid: params.get('p') || sessionStorage.getItem('fgh.adult') || null, showTr: false, skill: null };
  /* Thai Academy access (js/academy/access.js): null while checking, then { ok, kind, … } or { ok: false, reason } */
  let ACC = THAI ? null : { ok: true };
  let R = null;    // running exercises / test
  let RV = null;   // review session

  const fam = () => store.get();
  const me = () => V.pid && F.getProfile(fam(), V.pid);
  /* in the Thai Academy the learner's setup is seen as the Thai course (their other course choice is kept untouched) */
  const setup = p => {
    const s = fam().adult[p.id] || null;
    if (!THAI || !s) return s;
    const course = thaiCourseIds().includes(s.thCourse) ? s.thCourse : 'th';
    return Object.assign({}, s, { target: 'th', course, explain: s.thExplain === 'th' ? 'th' : 'sv', level: levelFor(s, course) });
  };
  /* the Thai Academy's courses: every course whose target language is Thai ("th" conversation, "thr" reading and writing) */
  function thaiCourseIds() { const all = AC.courses(); return Object.keys(all).filter(k => all[k].target === 'th' && all[k].lessons && all[k].lessons.length); }
  const crs = p => { const s = setup(p); return s && AC.course(s.course || s.target); };
  const ckey = p => { const s = setup(p); return THAI ? AC.courseKey(s.course, crs(p).explain[0]) : AC.courseKey(s.target, s.explain); };
  const prog = p => (fam().learning[p.id] || {})[ckey(p)] || { lessons: {}, tests: [], timeMs: 0, lastAt: 0 };
  const deck = p => fam().srs[p.id] || {};
  const ex = () => setup(me()).explain;
  const T = obj => AC.tr(obj, ex());
  let warned = 0;
  /* o: { slow: true } reads at a slow speed (never faster than the learner's own), { times: 3 } repeats with pauses */
  function speak(text, lang, quiet, o) {
    o = o || {}; const l = lang || setup(me()).target;
    const r = o.slow ? Math.min(0.6, VO.rateOf(fam(), V.pid)) : null;
    if (!K.speak(text, l, r, { times: o.times }) && !quiet && Date.now() - warned > 15000) { warned = Date.now(); K.toast('🔇 ' + t('voiceMissing', { lang: t('lang.' + l) })); }
  }
  /* course and level names: the Thai course has its own name and Level 1–5; the others use the language name and CEFR */
  const cname = k => { const c = AC.course(k); return c && c.name ? K.L(c.name) : t('lang.' + k); };
  const lvShort = (c, lv) => { const i = AC.levelInfo(c, lv); return i ? t('acLevelN', { n: i.n }) : lv; };
  const lvName = (c, lv) => { const i = AC.levelInfo(c, lv); return i ? K.L(i.name) : t('cefr.' + lv); };
  const lvBadge = (c, lv) => { const i = AC.levelInfo(c, lv); return i ? String(i.n) : lv; };
  const levelFor = (s, target) => { const c = AC.course(target), ids = AC.levelIds(c); const saved = s && ((s.levels || {})[target] || (s.target === target ? s.level : null)); return ids.includes(saved) ? saved : ids[0]; };
  const isThai = str => /[\u0E00-\u0E7F]/.test(String(str || ''));
  const romHTML = r => r ? '<div class="rom" lang="th-Latn">' + esc(r) + '</div>' : '';

  function render() {
    document.documentElement.lang = K.ui(); document.body.dataset.area = 'academy';
    if (THAI && !(ACC && ACC.ok)) { $('app').innerHTML = gateHTML(); return; }
    const p = me();
    if (!p || (!THAI && p.kind !== 'adult')) { V.pid = null; V.screen = 'who'; }
    else {
      /* a course picked on the home page (academy.html?course=th&explain=sv): offer it in the setup, keeping the learner's other progress */
      const want = params.get('course');
      /* Thai Academy: ?explain=sv|th from the welcome page becomes the learner's explanation language */
      if (THAI && !V.wantDone && setup(p)) { const e0 = params.get('explain'); if ((e0 === 'sv' || e0 === 'th') && setup(p).explain !== e0) A.updateLearning(p.id, f => { f.adult[p.id].thExplain = e0; }); }
      if (THAI && !V.wantDone) V.wantDone = true;
      if (want && !V.wantDone && AC.course(want)) {
        V.wantDone = true;
        const s0 = setup(p), c0 = AC.course(want), ex0 = params.get('explain');
        if (!s0 || s0.target !== want || (ex0 && s0.explain !== ex0 && c0.explain.includes(ex0))) {
          V.draft = Object.assign({ goal: 'daily', minutes: 15 }, s0 || {}, { target: want, explain: c0.explain.includes(ex0) ? ex0 : (s0 && c0.explain.includes(s0.explain) ? s0.explain : c0.explain[0]), level: levelFor(s0, want) });
          V.screen = 'setup';
        }
      }
      if (!setup(p) || !crs(p)) V.screen = 'setup';
    }
    VO.use(V.pid);
    const S = { who: whoHTML, setup: setupHTML, home: THAI ? dashHTML : homeHTML, courses: coursesHTML, lessons: lessonsHTML, practice: practiceHTML, games: gamesHTML,
      classroom: classroomHTML, homework: homeworkHTML, hwThread: hwThreadHTML, progress: progressHTML, lesson: lessonHTML, run: runHTML, done: doneHTML, review: reviewHTML, words: wordsHTML, voice: voiceHTML };
    $('app').innerHTML = (S[V.screen] || homeHTML)();
    const inp = document.querySelector('[data-focus]'); if (inp) inp.focus();
  }
  function top(title, back) {
    const p = me();
    const who = p ? '<button class="btn small" data-act="who">' + esc(p.avatar) + ' ' + esc(p.name) + ' ⇄</button>' : '';
    if (!THAI) return K.header(title, { back, extra: who });
    /* Thai Academy: the explanation language can be switched on every screen */
    const s = p && setup(p), e = s ? s.explain : null;
    const exSeg = s ? '<div class="seg exseg" role="group" aria-label="Förklaringsspråk / ภาษาที่ใช้ในการอธิบาย"><span class="exlbl" aria-hidden="true">' + esc(t('tlaExplainShort')) + '</span>' +
      [['sv', 'SV'], ['th', 'ไทย']].map(([v, l]) => '<button data-act="setExplain" data-v="' + v + '" class="' + (e === v ? 'on' : '') + '" aria-pressed="' + (e === v) + '" title="' + esc(v === 'sv' ? 'Svenska – คำอธิบายภาษาสวีเดน' : 'ภาษาไทย – คำอธิบายภาษาไทย') + '">' + l + '</button>').join('') + '</div>' : '';
    return K.header(title, { back, extra: exSeg + who }) + (TABS.includes(V.screen) && s ? navHTML() : '');
  }
  /* the Academy's own navigation (Thai mode) */
  function navHTML() {
    const icons = { home: '🏠', courses: '🎓', lessons: '📖', practice: '🗣️', games: '🧩', classroom: '🏫', homework: '📝', progress: '📈' };
    return '<nav class="acnav" aria-label="' + esc(t('tlaTitle')) + '">' + TABS.map(k => '<button data-act="tab" data-v="' + k + '" class="' + (V.screen === k ? 'on' : '') + '"' + (V.screen === k ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + icons[k] + '</span> ' + esc(t('tlaNav.' + k)) + '</button>').join('') + '</nav>';
  }

  /* ---------- who & setup ---------- */
  function whoHTML() {
    const own = studentPid();
    const list = own ? F.activeProfiles(fam()).filter(p => p.id === own) : F.activeProfiles(fam(), THAI ? null : 'adult');
    return K.header(t(THAI ? 'tlaTitle' : 'acTitle')) + (THAI ? tlaIntroHTML() : '<p class="tagline">' + esc(t('acTag')) + '</p>') + '<h2 class="sec">' + esc(t(THAI ? 'tlaWho' : 'acWho')) + '</h2>' +
      (list.length ? '<div class="who-grid">' + list.map(p => '<button class="who-card" data-act="pick" data-v="' + esc(p.id) + '"><span class="av" aria-hidden="true">' + esc(p.avatar) + '</span><span class="nm">' + esc(p.name) + '</span>' +
        (fam().adult[p.id] && AC.course(fam().adult[p.id].target) ? '<span class="muted">' + esc(cname(fam().adult[p.id].target)) + ' · ' + esc(lvShort(AC.course(fam().adult[p.id].target), fam().adult[p.id].level)) + '</span>' : '') + '</button>').join('') + '</div>' : '<p class="muted">' + esc(t('noAdults')) + '</p>') +
      '<h2 class="sec">' + esc(t('acNewLearner')) + '</h2><form class="card row" data-form="newAdult" style="margin-top:0"><label for="an">' + esc(t('acName')) + '</label><input id="an" type="text" maxlength="20" autocomplete="off" style="min-height:48px;border-radius:12px;border:2px solid var(--line);padding:.3rem .7rem;font:inherit">' +
      '<select id="aav" style="min-height:48px;font-size:1.4rem;border-radius:12px">' + ['👩', '👨', '🧑', '👵', '👴', '🧔', '👱‍♀️', '🧕'].map(a => '<option>' + a + '</option>').join('') + '</select><button class="btn primary" type="submit">＋ ' + esc(t('acCreate')) + '</button></form>';
  }
  /* the welcome page's choice (te.explain) is the starting point for a new Thai learner */
  const thExplainDefault = () => { const e = params.get('explain') || (() => { try { return localStorage.getItem('te.explain'); } catch (x) { return null; } })(); return e === 'th' ? 'th' : 'sv'; };
  function setupHTML() {
    const p = me(), s = Object.assign({ target: 'sv', explain: K.ui() === 'th' ? 'th' : 'en', level: 'A1', goal: 'daily', minutes: 15 }, setup(p) || {}, THAI ? { target: 'th', explain: thExplainDefault() } : {}, V.draft || {});
    if (THAI && !V.draft && setup(p)) s.explain = setup(p).explain;
    if (THAI && !s.course) s.course = 'th';
    const c = AC.course(THAI ? s.course : s.target); if (!THAI && c && !c.explain.includes(s.explain)) s.explain = c.explain[0];
    if (THAI && c && !AC.levelIds(c).includes(s.level)) s.level = levelFor(setup(p), s.course);
    if (c && !AC.levelIds(c).includes(s.level)) s.level = levelFor(setup(p), s.target);
    V.draft = s;
    const chips = (act, list, cur, lbl) => '<div class="choices">' + list.map(([v, l]) => '<button class="btn' + (String(cur) === String(v) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(v) + '" aria-pressed="' + (String(cur) === String(v)) + '">' + esc(l) + '</button>').join('') + '</div>';
    return top(t('acSetup'), setup(p) ? 'home' : null) + '<div class="card stack">' +
      (THAI ? '<div class="field"><label>' + esc(t('tlaNav.courses')) + '</label>' + chips('dCourse', thaiCourseIds().map(k => [k, K.L(AC.course(k).name)]), s.course) + '</div>' : '<div class="field"><label>' + esc(t('acTarget')) + '</label>' + chips('dTarget', Object.keys(AC.courses()).filter(k => !AC.course(k).track).map(k => [k, cname(k)]), s.target) + (c && c.desc ? '<p class="muted" style="margin:.3rem 0 0">' + esc(K.L(c.desc)) + '</p>' : '') + '</div>') +
      (THAI ? '<div class="field"><label>Förklaringsspråk / <span lang="th">ภาษาที่ใช้ในการอธิบาย</span></label>' + chips('dExplain', [['sv', 'Svenska – คำอธิบายภาษาสวีเดน'], ['th', 'ภาษาไทย – คำอธิบายภาษาไทย']], s.explain) + '</div>'
        : '<div class="field"><label>' + esc(t('acExplain')) + '</label>' + chips('dExplain', (c ? c.explain : []).map(k => [k, t('lang.' + k)]), s.explain) + '</div>') +
      '<div class="field"><label>' + esc(t('acLevel')) + '</label>' + chips('dLevel', AC.levelIds(c).map(l => [l, lvShort(c, l) + ' · ' + lvName(c, l)]), s.level) + '</div>' +
      '<div class="field"><label>' + esc(t('acGoal')) + '</label>' + chips('dGoal', ['daily', 'work', 'move', 'family', 'travel'].map(g => [g, t('goal_' + g)]), s.goal) + '</div>' +
      '<div class="field"><label>' + esc(t('acMinutes')) + '</label>' + chips('dMin', [5, 10, 15, 20, 30, 45, 60].map(m => [m, m + ' ' + t('minutes')]), s.minutes) + '</div>' +
      '<p class="muted"><span class="badge-sample">' + esc(t('sample')) + '</span> ' + esc(t('sampleNote')) + '</p>' +
      '<div class="row"><button class="btn primary big" data-act="saveSetup">▶ ' + esc(setup(p) ? t('save') : t('acStartCourse')) + '</button></div></div>';
  }

  /* ---------- dashboard ---------- */
  function homeHTML() {
    const p = me(), s = setup(p), c = crs(p), pr = prog(p), dk = deck(p);
    const st = AC.stats(c, pr, dk, fam().log, p.id);
    const next = AC.nextLesson(c, pr, s.level);
    const dueN = SRS.due(dk, Date.now(), c.target + ':').length;
    const week = F.weekly(fam(), p.id).map(d => ({ label: d.day, short: K.fmtDay(d.day), value: d.minutes }));
    const goalDays = week.filter(d => d.value >= s.minutes).length, studyDays = week.filter(d => d.value > 0).length;
    let h = top(t('acTitle')) + '<div class="row" style="margin:0 0 12px"><span class="cefr">' + esc(lvBadge(c, s.level)) + '</span><b>' + esc(cname(s.target)) + '</b><span class="muted">' + esc(t('acExplain')) + ': ' + esc(t('lang.' + s.explain)) + ' · ' + esc(t('goal_' + s.goal)) + ' · ' + s.minutes + ' ' + esc(t('minutes')) + '/' + esc(t('today')) + '</span>' +
      '<span class="grow"></span><button class="btn small" data-act="go" data-v="voice">🗣️ ' + esc(t('voice.title')) + '</button><button class="btn small" data-act="go" data-v="setup">⚙️ ' + esc(t('acSettings')) + '</button><button class="btn small" data-act="go" data-v="words">⭐ ' + esc(t('acFavorites')) + '</button></div>';
    h += '<div class="split"><section class="card stack">' + (next ? '<div><p class="muted" style="margin:0">' + esc(pr.current ? t('acContinue') : t('acNext')) + '</p><h2>' + next.icon + ' ' + esc(T(next.title)) + '</h2><p class="muted" style="margin:.2rem 0 0">' + esc(lvShort(c, next.level)) + ' · ' + esc(T(next.goal)) + '</p></div>' +
      '<button class="btn primary big" data-act="openLesson" data-v="' + esc(next.id) + '">▶ ' + esc(t('acContinue')) + '</button>' : '<h2>🎉 ' + esc(t('acCompleted')) + '</h2>') +
      '<hr style="border:0;border-top:1px solid var(--line);width:100%"><p style="margin:0">' + (dueN ? esc(t('acReviewToday', { n: dueN })) : esc(t('acNoReview'))) + '</p>' + (dueN ? '<button class="btn" data-act="review">🔁 ' + esc(t('acReviewNow')) + '</button>' : '') + '</section>' +
      '<section class="card"><div class="kpis">' + [[st.pct + ' %', t('acProgress')], [st.done + '/' + st.total, t('acStats.done')], [st.words, t('acStats.words')], [st.avg == null ? '–' : st.avg + ' %', t('acStats.avg')],
        [K.fmtMin(st.timeMs), t('acStats.time')], [st.lastAt ? K.fmtDate(st.lastAt) : '–', t('acStats.last')], [studyDays + '/7', t('acStats.streak')], [goalDays + '/7', t('acStats.goalMet')]].map(([v, l]) => '<div class="kpi"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div></div>').join('') + '</div>' +
      '<div class="meter" style="margin-top:12px"><span style="width:' + st.pct + '%"></span></div></section></div>';
    h += '<div class="card">' + K.barChart(week, { title: t('pdChartMin'), unit: t('minutes') }) + '</div>';
    return h + lessonsBlock(p);
  }
  /* the course's lessons per level with the topic filter and level tests (used by the dashboard of other courses and the Thai "Lessons" screen) */
  function lessonsBlock(p) {
    const c = crs(p), pr = prog(p); let h = '';
    const skills = Array.from(new Set([].concat(...c.lessons.map(l => l.skills))));
    h += '<h2 class="sec">' + esc(t('acCourse')) + ' <span class="badge-sample">' + esc(t('sample')) + '</span></h2><div class="row" style="margin:0 0 8px"><button class="btn small' + (!V.skill ? ' on' : '') + '" data-act="skill" data-v="">' + esc(t('allTopics')) + '</button>' +
      skills.map(sk => '<button class="btn small' + (V.skill === sk ? ' on' : '') + '" data-act="skill" data-v="' + sk + '">' + esc(t('skills.' + sk)) + '</button>').join('') + '</div>';
    AC.levelIds(c).forEach(lv => {
      const ls = AC.lessonsAt(c, lv).filter(l => !V.skill || l.skills.includes(V.skill));
      const ls0 = AC.lessonsAt(c, lv), lst = AC.levelState(c, pr, lv);
      h += '<section class="card"><div class="row" style="margin:0"><span class="cefr">' + esc(lvBadge(c, lv)) + '</span><h3 style="margin:0">' + esc(lvName(c, lv)) + '</h3><span class="muted">' + lst.done + '/' + lst.total + '</span>' + (lst.passed ? '<span class="status approved">✓ ' + esc(t('acLevelTest', { l: lvShort(c, lv) })) + '</span>' : '') + '<span class="grow"></span>' +
        (ls0.length ? '<button class="btn small" data-act="test" data-v="' + lv + '">📝 ' + esc(t('acLevelTest', { l: lvShort(c, lv) })) + '</button>' : '') + '</div>' +
        (ls.length ? ls.map(l => { const r = pr.lessons[l.id]; return '<button class="lessonrow" data-act="openLesson" data-v="' + esc(l.id) + '"><span class="li" aria-hidden="true">' + l.icon + '</span><span class="lt"><b>' + esc(T(l.title)) + '</b><span>' + l.skills.map(sk => esc(t('skills.' + sk))).join(' · ') + '</span></span>' +
          '<span class="status ' + (r && r.done ? 'approved' : r ? 'pending' : '') + '">' + esc(r && r.done ? t('acCompleted') + ' · ' + r.best + ' %' : r ? t('acInProgress') : t('acNotStarted')) + '</span></button>'; }).join('') : '<p class="muted">' + esc(ls0.length ? '–' : t('none')) + '</p>') + '</section>';
    });
    return h;
  }

  /* ================= access gate (Thai Academy) ================= */
  const studentPid = () => { const sc = ACC && ACC.kind === 'student' && FGH.studentSync && FGH.studentSync.current(); return sc ? sc.pid : null; };
  function gateHTML() {
    if (!ACC) return K.header(t('tlaTitle')) + tlaIntroHTML() + '<section class="card center"><p class="muted">' + esc(t('tlaGate.checking')) + '</p></section>';
    const r = ACC.reason || 'error', msg = t('tlaGate.' + r) !== 'tlaGate.' + r ? t('tlaGate.' + r) : t('tlaGate.error');
    return K.header(t('tlaTitle')) + tlaIntroHTML() + '<section class="card stack gate"><h2>🔒 ' + esc(t('tlaGate.title')) + '</h2><p style="margin:0">' + esc(t('tlaGate.who')) + '</p>' +
      '<p class="muted" style="margin:0">' + esc(msg) + '</p><div class="row"><a class="btn primary big" href="student.html">🎒 ' + esc(t('tlaStudentLogin')) + '</a>' +
      '<a class="btn big" href="teacher.html">🧑‍🏫 ' + esc(t('tlaGate.teacher')) + '</a><button class="btn" data-act="gateRetry">↻ ' + esc(t('tlaGate.retry')) + '</button></div>' +
      '<p class="muted" style="margin:0;font-size:.9rem">' + esc(t('tlaGate.other')) + ' <a href="academy.html?course=sv">' + esc(t('tlaOtherCourses')) + '</a> · <a href="play.html">Play Zone</a></p></section>';
  }
  function startAccess() {
    if (!THAI || !FGH.teachingAccess) { if (THAI) { ACC = { ok: false, reason: 'not_configured' }; render(); } return; }
    FGH.teachingAccess.check().then(a => {
      ACC = a;
      const own = studentPid();
      if (a.ok && own) { V.pid = own; sessionStorage.setItem('fgh.adult', own); if (!setup(me())) V.screen = 'setup'; else if (!TABS.includes(V.screen)) V.screen = 'home'; }
      if (a.ok && a.kind === 'student') loadHw();
      render();
    }).catch(() => { ACC = { ok: false, reason: 'error' }; render(); });
  }

  /* ================= homework (student) ================= */
  const HW_STATUS = { submitted: '⏳', returned: '✏️', approved: '✅' };
  const fmtTime = ts => ts ? K.fmtDate(Date.parse(ts), true) : '';
  function loadHw() { if (!(ACC && ACC.kind === 'student')) return Promise.resolve(); return ACC.svc.studentAssignments().then(l => { V.hw = l || []; render(); }).catch(e => { V.hwErr = e.code || 'error'; render(); }); }
  function hwStatusText(x) { return x.status ? t('tlaHw.st.' + x.status) : (x.due_at && Date.parse(x.due_at) < Date.now() ? t('tlaHw.st.late') : t('tlaHw.st.todo')); }
  function hwListHTML() {
    if (V.hwErr) return '<section class="card"><p class="muted">⚠️ ' + esc(t('tlaHw.loadError')) + '</p></section>';
    if (!V.hw) return '<p class="muted">…</p>';
    if (!V.hw.length) return '<section class="card"><p class="muted" style="margin:0">' + esc(t('tlaHw.none')) + '</p></section>';
    return '<div class="hwlist">' + V.hw.map(x => '<button class="hwrow ' + (x.status || 'todo') + '" data-act="hwOpen" data-v="' + esc(x.id) + '"><span class="hwi" aria-hidden="true">' + (HW_STATUS[x.status] || '📝') + '</span><span class="hwt"><b>' + esc(x.title) + '</b>' +
      '<span class="muted">' + (x.due_at ? esc(t('tlaHw.due', { d: fmtTime(x.due_at) })) + ' · ' : '') + esc(hwStatusText(x)) + (x.score != null ? ' · ' + x.score + '/' + x.max_score : '') + (x.teacher_messages ? ' · 💬 ' + x.teacher_messages : '') + '</span></span><span aria-hidden="true">›</span></button>').join('') + '</div>';
  }
  function canSubmit(th) {
    const l = th.submissions[th.submissions.length - 1];
    return !l || l.status === 'returned' || (l.status === 'submitted' && th.assignment.allow_resubmit);
  }
  function hwThreadHTML() {
    const th = V.hwThread; if (!th) return top(t('tlaNav.homework'), 'hwBack') + '<p class="muted">…</p>';
    const a = th.assignment, last = th.submissions[th.submissions.length - 1];
    const lessonC = a.course_key && AC.course(a.course_key), lesson = lessonC && a.lesson_id && AC.lessonById(lessonC, a.lesson_id);
    let h = top('📝 ' + a.title, 'hwBack') + '<section class="card stack"><div class="row" style="margin:0">' + (a.due_at ? '<span class="pill">' + esc(t('tlaHw.due', { d: fmtTime(a.due_at) })) + '</span>' : '') +
      '<span class="pill">' + esc(t('tlaHw.max', { n: a.max_score })) + '</span>' + (last ? '<span class="pill">' + (HW_STATUS[last.status] || '') + ' ' + esc(t('tlaHw.st.' + last.status)) + (last.score != null ? ' · ' + last.score + '/' + a.max_score : '') + '</span>' : '') + '</div>' +
      (a.instructions ? '<p style="margin:0;white-space:pre-wrap">' + esc(a.instructions) + '</p>' : '') +
      (lesson ? '<div class="row" style="margin:0"><button class="btn" data-act="hwLesson" data-v="' + esc(a.course_key + '|' + a.lesson_id) + '">📖 ' + esc(t('tlaHw.openLesson')) + ': ' + lesson.icon + ' ' + esc(T(lesson.title)) + '</button></div>' : '') + '</section>';
    if (th.submissions.length) h += '<h2 class="sec">' + esc(t('tlaHw.myWork')) + '</h2>' + th.submissions.slice().reverse().map(sb => '<section class="card hwver"><div class="row" style="margin:0"><b>' + esc(t('tlaHw.version', { n: sb.version })) + '</b><span class="muted">' + esc(fmtTime(sb.submitted_at)) + (sb.late ? ' · ' + esc(t('tlaHw.late')) : '') + '</span><span class="grow"></span><span class="pill">' + (HW_STATUS[sb.status] || '') + ' ' + esc(t('tlaHw.st.' + sb.status)) + (sb.score != null ? ' · ' + sb.score + '/' + a.max_score : '') + '</span></div>' +
      (sb.answer ? '<p style="white-space:pre-wrap;margin:.5rem 0 0">' + esc(sb.answer) + '</p>' : '') + (sb.file_path ? '<div class="row"><button class="btn small" data-act="hwFile" data-v="' + esc(sb.file_path) + '">📎 ' + esc(sb.file_name || t('tlaHw.file')) + '</button></div>' : '') + '</section>').join('');
    h += '<h2 class="sec">💬 ' + esc(t('tlaHw.talk')) + '</h2><section class="card stack">' + (th.messages.length ? th.messages.map(m => '<div class="msg ' + m.kind + '"><div class="mh"><b>' + esc(m.kind === 'teacher' ? '🧑‍🏫 ' + m.name : '🎒 ' + m.name) + '</b><span class="muted">' + esc(m.kind === 'teacher' ? t('tlaHw.teacherFb') : t('tlaHw.studentCm')) + ' · ' + esc(fmtTime(m.at)) + '</span></div><p>' + esc(m.body) + '</p></div>').join('') : '<p class="muted" style="margin:0">' + esc(t('tlaHw.noTalk')) + '</p>') +
      '<form class="row" data-form="hwComment" style="margin:0"><input id="hwCm" type="text" maxlength="2000" placeholder="' + esc(t('tlaHw.askPh')) + '" style="flex:1;min-height:48px;border-radius:12px;border:1px solid var(--line);padding:0 .8rem"><button class="btn" type="submit">' + esc(t('tlaHw.send')) + '</button></form></section>';
    if (canSubmit(th)) h += '<h2 class="sec">📤 ' + esc(last ? t('tlaHw.again') : t('tlaHw.handIn')) + '</h2><form class="card stack" data-form="hwSubmit"><label for="hwAns">' + esc(t('tlaHw.answer')) + '</label>' +
      '<textarea id="hwAns" rows="6" maxlength="8000" lang="th" style="width:100%;border-radius:12px;border:1px solid var(--line);padding:.7rem;font:inherit"></textarea>' +
      '<label for="hwFile">' + esc(t('tlaHw.attach')) + '</label><input id="hwFile" type="file" accept=".pdf,.docx,.txt,image/*,audio/*">' +
      '<p class="muted" style="margin:0;font-size:.85rem">' + esc(t('tlaHw.fileRule')) + '</p><div class="row"><button class="btn primary big" type="submit"' + (V.hwBusy ? ' disabled' : '') + '>📤 ' + esc(t('tlaHw.submit')) + '</button></div></form>';
    else if (last && last.status === 'approved') h += '<section class="card center"><h2>✅ ' + esc(t('tlaHw.doneAll')) + '</h2></section>';
    else h += '<section class="card"><p class="muted" style="margin:0">' + esc(t('tlaHw.waiting')) + '</p></section>';
    return h;
  }
  async function hwOpen(id) { V.hwId = id; V.hwThread = null; V.screen = 'hwThread'; render(); try { V.hwThread = await ACC.svc.studentThread(id); } catch (e) { K.toast('⚠️ ' + t('tlaHw.loadError')); V.screen = 'homework'; } render(); }

  /* ================= Thai Learning Academy screens (Thai mode) ================= */
  function tlaIntroHTML() {
    return '<section class="tla-hero"><h1 class="tla-h">📚 ' + esc(t('tlaTitle')) + '</h1><p lang="sv">Strukturerad undervisning i thailändska.</p><p lang="th">ระบบเรียนการสอนภาษาไทยอย่างเป็นระบบ</p></section>';
  }
  const pctOf = (c, pr) => Math.round(100 * c.lessons.filter(l => pr.lessons[l.id] && pr.lessons[l.id].done).length / Math.max(1, c.lessons.length));
  const studentInfo = pid => { try { const x = JSON.parse(localStorage.getItem('fgh.student') || 'null'); return x && x.pid === pid ? x : null; } catch (e) { return null; } };
  const recent = (pid, n) => (fam().log || []).filter(e => e.pid === pid).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, n || 5);
  const laterCard = (icon, title, text) => '<section class="card later"><h3>' + icon + ' ' + esc(title) + '</h3><p class="muted">' + esc(text) + '</p></section>';
  /* shown only where Thai explanations are still missing (the reading course has them for titles, goals and grammar) */
  const hasThai = l => !!(l && l.grammar && l.grammar.body && l.grammar.body.th);
  function thNote(l) {
    if (setup(me()).explain !== 'th') return '';
    const missing = l ? !hasThai(l) : !crs(me()).lessons.every(hasThai);
    return missing ? '<p class="exnote">ℹ️ ' + esc(t('tlaThNote')) + '</p>' : '';
  }

  /* Dashboard */
  function dashHTML() {
    const p = me(), s = setup(p), c = crs(p), pr = prog(p), dk = deck(p);
    const next = AC.nextLesson(c, pr, s.level), st = AC.stats(c, pr, dk, fam().log, p.id);
    const dueN = SRS.due(dk, Date.now(), c.target + ':').length;
    const week = F.weekly(fam(), p.id), today = week.length ? week[week.length - 1].minutes : 0;
    let h = top(t('tlaTitle')) + '<h2 class="welcome">' + esc(t('tlaWelcome', { name: p.name })) + '</h2>' +
      '<p class="muted course-line"><span class="cefr">' + esc(lvBadge(c, s.level)) + '</span> ' + esc(K.L(c.name)) + ' · ' + esc(lvShort(c, s.level)) + ' – ' + esc(lvName(c, s.level)) + ' · ' + esc(t('tlaExplainShort')) + ': ' + (s.explain === 'th' ? 'ภาษาไทย' : 'Svenska') + '</p>' + thNote();
    h += '<div class="dash">';
    h += '<section class="card dcont stack"><p class="muted" style="margin:0">' + esc(pr.current ? t('acContinue') : t('tlaToday')) + '</p>' +
      (next ? '<h2>' + next.icon + ' ' + esc(T(next.title)) + '</h2><p class="muted" style="margin:0">' + esc(lvShort(c, next.level)) + ' · ' + esc(T(next.goal)) + '</p><button class="btn primary big" data-act="openLesson" data-v="' + esc(next.id) + '">▶ ' + esc(t('acContinue')) + '</button>'
        : '<h2>🎉 ' + esc(t('acCompleted')) + '</h2>') +
      '<p style="margin:.4rem 0 0">' + esc(t('tlaTodayMin', { m: today, g: s.minutes || 15 })) + ' · ' + esc(dueN ? t('acReviewToday', { n: dueN }) : t('acNoReview')) + '</p>' +
      (dueN ? '<button class="btn" data-act="review">🔁 ' + esc(t('acReviewNow')) + '</button>' : '') + '</section>';
    h += '<section class="card"><h3>📈 ' + esc(t('tlaNav.progress')) + '</h3><div class="meter"><span style="width:' + st.pct + '%"></span></div><p class="muted">' + esc(t('tlaProgLine', { p: st.pct, d: st.done, n: st.total, w: st.words })) + '</p>' +
      '<button class="btn small" data-act="tab" data-v="progress">' + esc(t('tlaNav.progress')) + ' →</button></section>';
    const hwOpenN = (V.hw || []).filter(x => x.status !== 'approved' && x.status !== 'submitted').length, fbN = (V.hw || []).reduce((n, x) => n + (x.teacher_messages || 0), 0);
    h += ACC && ACC.kind === 'student'
      ? '<section class="card"><h3>📝 ' + esc(t('tlaNav.homework')) + '</h3><p class="muted">' + esc(V.hw ? (hwOpenN ? t('tlaHw.openN', { n: hwOpenN }) : t('tlaHw.noneOpen')) : '…') + '</p><button class="btn small" data-act="tab" data-v="homework">' + esc(t('tlaNav.homework')) + ' →</button></section>' +
        '<section class="card"><h3>💬 ' + esc(t('tlaFeedback')) + '</h3><p class="muted">' + esc(fbN ? t('tlaHw.fbN', { n: fbN }) : t('tlaHw.noFb')) + '</p></section>'
      : '<section class="card"><h3>📝 ' + esc(t('tlaNav.homework')) + '</h3><p class="muted">' + esc(t('tlaHw.staffText')) + '</p><a class="btn small" href="teacher.html">' + esc(t('tlaTeacherPage')) + ' →</a></section>' +
        '<section class="card"><h3>🎓 ' + esc(t('tlaHw.signedInAs')) + '</h3><p class="muted">' + esc(ACC && ACC.name ? ACC.name : '') + '</p></section>';
    const rc = recent(p.id, 5);
    h += '<section class="card wide"><h3>🕒 ' + esc(t('tlaRecent')) + '</h3>' + (rc.length ? '<ul class="recent">' + rc.map(e => '<li><span>' + esc(e.title || e.kind || '') + '</span><span class="muted">' + (e.pct != null ? e.pct + ' % · ' : '') + esc(K.fmtDate(e.ts)) + '</span></li>').join('') + '</ul>' : '<p class="muted">' + esc(t('tlaNoRecent')) + '</p>') + '</section>';
    return h + '</div>';
  }

  /* Courses: the Thai course, its levels and the learner's settings */
  function coursesHTML() {
    const p = me(), s = setup(p), c = crs(p), pr = prog(p);
    let h = top(t('tlaNav.courses')) + '<div class="courselist">' + thaiCourseIds().map(k => { const cc = AC.course(k), on = k === s.course, pc = pctOf(cc, (fam().learning[p.id] || {})[AC.courseKey(k, cc.explain[0])] || { lessons: {} });
      return '<button class="coursecard' + (on ? ' on' : '') + '" data-act="setCourse" data-v="' + esc(k) + '" aria-pressed="' + on + '"><span class="ci" aria-hidden="true">' + (k === 'thr' ? '📖' : '💬') + '</span><b>' + esc(K.L(cc.name)) + '</b><span class="muted">' + esc(K.L(cc.desc)) + '</span>' +
        '<span class="meter"><span style="width:' + pc + '%"></span></span><span class="muted">' + esc(t('tlaLessonsN', { n: cc.lessons.length })) + ' · ' + pc + ' %' + (on ? ' · ✓ ' + esc(t('tlaCurrent')) : '') + '</span></button>'; }).join('') + '</div>' +
      '<section class="card stack"><h2>' + esc(K.L(c.name)) + '</h2><p class="muted" style="margin:0">' + esc(t('tlaCourseDesc')) + '</p>' +
      '<div class="levels">' + AC.levelIds(c).map(lv => { const st = AC.levelState(c, pr, lv); return '<button class="lvcard' + (lv === s.level ? ' on' : '') + '" data-act="setLevel" data-v="' + lv + '" aria-pressed="' + (lv === s.level) + '"><span class="cefr">' + esc(lvBadge(c, lv)) + '</span><b>' + esc(lvName(c, lv)) + '</b><span class="muted">' + st.done + '/' + st.total + (st.passed ? ' · ✓' : '') + '</span></button>'; }).join('') + '</div>' +
      '<p class="muted" style="margin:0">' + esc(t('tlaLevelHint')) + '</p></section>';
    h += '<section class="card stack"><h3>Förklaringsspråk / <span lang="th">ภาษาที่ใช้ในการอธิบาย</span></h3><div class="choices">' +
      [['sv', 'Svenska – คำอธิบายภาษาสวีเดน'], ['th', 'ภาษาไทย – คำอธิบายภาษาไทย']].map(([v, l]) => '<button class="btn' + (s.explain === v ? ' on' : '') + '" data-act="setExplain" data-v="' + v + '" aria-pressed="' + (s.explain === v) + '">' + esc(l) + '</button>').join('') + '</div>' + thNote() +
      '<div class="row"><button class="btn small" data-act="go" data-v="setup">⚙️ ' + esc(t('acSettings')) + '</button><a class="btn small" href="academy.html?course=sv">' + esc(t('tlaOtherCourses')) + '</a></div></section>';
    return h;
  }
  function lessonsHTML() { return top(t('tlaNav.lessons')) + thNote() + lessonsBlock(me()); }

  /* Thai Practice: pronunciation lessons, word review, my words, voice */
  function practiceHTML() {
    const p = me(), c = crs(p), pr = prog(p), dueN = SRS.due(deck(p), Date.now(), 'th:').length;
    const pron = c.lessons.filter(l => (l.skills || []).includes('pronunciation') || l.practice);
    const card = (act, v, icon, title, desc) => '<button class="card game" data-act="' + act + '" data-v="' + esc(v || '') + '"><span class="gicon" aria-hidden="true">' + icon + '</span><span class="gname">' + esc(title) + '</span><span class="gdesc">' + esc(desc) + '</span></button>';
    let h = top(t('tlaNav.practice')) + '<h2 class="sec">🗣️ ' + esc(t('tlaPron')) + '</h2><div class="games">' +
      pron.map(l => { const r = pr.lessons[l.id]; return card('openLesson', l.id, l.icon, T(l.title), T(l.goal) + (r && r.done ? ' · ✓' : '')); }).join('') + '</div>';
    h += '<h2 class="sec">🔁 ' + esc(t('tlaWordsSec')) + '</h2><div class="games">' + card('review', '', '🔁', t('acReviewNow'), dueN ? t('acReviewToday', { n: dueN }) : t('acNoReview')) +
      card('go', 'words', '⭐', t('acFavorites'), t('tlaWordsDesc')) + card('go', 'voice', '🔊', t('voice.title'), t('tlaVoiceDesc')) + '</div>';
    return h;
  }

  /* Learning Games: built from the lessons of the learner's level (and the levels below), so they follow the curriculum */
  const GAMES = { listen: '🎧', meaning: '🔤', order: '🧱' };
  function gamePool(p) {
    const c = crs(p), ids = AC.levelIds(c), upTo = ids.indexOf(setup(p).level);
    return c.lessons.filter(l => ids.indexOf(l.level) <= Math.max(0, upTo));
  }
  function gameQs(p, kind) {
    const c = crs(p), lessons = gamePool(p), all = [].concat(...lessons.map(l => AC.exercises(c, l, ex(), Math.random)));
    const pick = kind === 'listen' ? all.filter(q => q.type === 'listen' || (q.word && !q.reverse)).map(q => q.type === 'listen' ? q : Object.assign({}, q, { type: 'listen', reveal: q.prompt, opts: q.opts }))
      : kind === 'meaning' ? all.filter(q => q.word && q.reverse) : all.filter(q => q.type === 'order');
    for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
    return pick.slice(0, 10);
  }
  function gamesHTML() {
    const p = me(), lessons = gamePool(p);
    let h = top(t('tlaNav.games')) + '<p class="muted">' + esc(t('tlaGamesFrom', { n: lessons.length, l: lvShort(crs(p), setup(p).level) })) + '</p><div class="games">';
    Object.keys(GAMES).forEach(k => { const n = gameQs(p, k).length;
      h += '<button class="card game" data-act="game" data-v="' + k + '"' + (n ? '' : ' disabled') + '><span class="gicon" aria-hidden="true">' + GAMES[k] + '</span><span class="gname">' + esc(t('tlaGame.' + k)) + '</span><span class="gdesc">' + esc(t('tlaGame.' + k + 'D')) + '</span><span class="btn primary">▶ ' + esc(t('start')) + '</span></button>'; });
    return h + '</div><p class="muted" style="font-size:.9rem">' + esc(t('tlaGamesNote')) + '</p>';
  }

  /* Classroom: the signed-in student's class (Student Mode); live lessons come later */
  function classroomHTML() {
    const p = me(), si = studentInfo(p.id) || (ACC && ACC.kind === 'student' ? { className: ACC.className, name: ACC.name, classCode: '' } : null);
    let h = top(t('tlaNav.classroom'));
    h += si ? '<section class="card stack"><h2>🏫 ' + esc(si.className || '') + '</h2><p class="muted" style="margin:0">' + esc(t('tlaClassIn', { name: si.name || p.name, code: si.classCode || '' })) + '</p></section>'
      : '<section class="card stack"><h2>🏫 ' + esc(t('tlaNav.classroom')) + '</h2><p style="margin:0">' + esc(t('tlaClassJoin')) + '</p><div class="row"><a class="btn primary" href="student.html">🎒 ' + esc(t('tlaStudentLogin')) + '</a><a class="btn" href="teacher.html">🧑‍🏫 ' + esc(t('tlaTeacherPage')) + '</a></div></section>';
    return h + laterCard('📡', t('tlaLiveTitle'), t('tlaLiveLater'));
  }
  function homeworkHTML() {
    if (ACC && ACC.kind === 'student') return top(t('tlaNav.homework')) + hwListHTML();
    return top(t('tlaNav.homework')) + '<section class="card stack"><h2>🧑‍🏫 ' + esc(t('tlaHw.staffTitle')) + '</h2><p class="muted" style="margin:0">' + esc(t('tlaHw.staffText')) + '</p><div class="row"><a class="btn primary" href="teacher.html">' + esc(t('tlaTeacherPage')) + ' →</a></div></section>';
  }

  /* My Progress */
  function progressHTML() {
    const p = me(), c = crs(p), pr = prog(p), dk = deck(p), st = AC.stats(c, pr, dk, fam().log, p.id);
    const week = F.weekly(fam(), p.id).map(d => ({ label: d.day, short: K.fmtDay(d.day), value: d.minutes }));
    let h = top(t('tlaNav.progress')) + '<section class="card"><div class="kpis">' + [[st.pct + ' %', t('acProgress')], [st.done + '/' + st.total, t('acStats.done')], [st.words, t('acStats.words')], [st.avg == null ? '–' : st.avg + ' %', t('acStats.avg')], [K.fmtMin(st.timeMs), t('acStats.time')]]
      .map(([v, l]) => '<div class="kpi"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div></div>').join('') + '</div></section>';
    h += '<section class="card"><h3>' + esc(t('tlaPerLevel')) + '</h3>' + AC.levelIds(c).map(lv => { const x = AC.levelState(c, pr, lv), pc = Math.round(100 * x.done / Math.max(1, x.total));
      return '<div class="barrow"><span class="cefr">' + esc(lvBadge(c, lv)) + '</span><span class="bl">' + esc(lvName(c, lv)) + '</span><span class="meter"><span style="width:' + pc + '%"></span></span><span class="muted">' + x.done + '/' + x.total + (x.passed ? ' ✓' : '') + '</span></div>'; }).join('') + '</section>';
    const skills = Array.from(new Set([].concat(...c.lessons.map(l => l.skills || []))));
    h += '<section class="card"><h3>' + esc(t('tlaPerSkill')) + '</h3>' + skills.map(sk => { const ls = c.lessons.filter(l => (l.skills || []).includes(sk)), d = ls.filter(l => pr.lessons[l.id] && pr.lessons[l.id].done).length, pc = Math.round(100 * d / Math.max(1, ls.length));
      return '<div class="barrow"><span aria-hidden="true"></span><span class="bl">' + esc(t('skills.' + sk)) + '</span><span class="meter"><span style="width:' + pc + '%"></span></span><span class="muted">' + d + '/' + ls.length + '</span></div>'; }).join('') + '</section>';
    return h + '<div class="card">' + K.barChart(week, { title: t('pdChartMin'), unit: t('minutes') }) + '</div>';
  }

  /* ---------- a lesson ---------- */
  function lessonHTML() {
    const p = me(), c = crs(p), l = AC.lessonById(c, V.lesson);
    const fav = fam().favorites[p.id] || [];
    /* listen, slow and (for words) repeat three times */
    const sayBtns = (act, i) => '<span class="saybtns"><button class="ghost" data-act="' + act + '" data-v="' + i + '" aria-label="' + esc(t('listen')) + '" title="' + esc(t('listen')) + '">🔊</button>' +
      '<button class="ghost" data-act="' + act + 'Slow" data-v="' + i + '" aria-label="' + esc(t('voice.slow')) + '" title="' + esc(t('voice.slow')) + '">🐢</button>' +
      (act === 'sayWord' ? '<button class="ghost" data-act="sayWordRep" data-v="' + i + '" aria-label="' + esc(t('voice.repeat')) + '" title="' + esc(t('voice.repeat')) + '">🔁</button>' : '') + '</span>';
    let h = top(l.icon + ' ' + T(l.title), THAI ? 'backFromLesson' : 'home') + (THAI ? thNote(l) : '') + '<p class="muted">' + esc(lvShort(c, l.level)) + ' · ' + esc(T(l.goal)) + ' · ' + l.skills.map(sk => esc(t('skills.' + sk))).join(', ') + '</p>' + VUI.speedHTML(p.id, true);
    if (l.tones) h += tonesHTML(l);
    h += '<section class="card"><div class="row" style="margin:0 0 8px"><h2>' + esc(l.dialogue[0] && l.dialogue[0].who ? t('acDialogue') : t('skills.reading')) + '</h2><span class="grow"></span><button class="btn small" data-act="playAll">▶ ' + esc(t('acPlayAll')) + '</button><button class="btn small" data-act="toggleTr">' + esc(V.showTr ? t('acHideTr') : t('acShowTr')) + '</button></div><div class="dlg">' +
      l.dialogue.map((d, i) => '<div class="line ' + (d.who === 'B' ? 'B' : 'A') + '">' + (d.who ? '<span class="who" aria-hidden="true">' + esc(d.who) + '</span>' : '') + '<div class="bubble"><div class="tl" lang="' + c.target + '">' + esc(d.t) + ' ' + sayBtns('sayLine', i) + '</div>' + romHTML(d.rom) + (V.showTr ? '<div class="tr">' + esc(T(d.tr)) + '</div>' : '') + '</div></div>').join('') + '</div></section>';
    /* pictures of an imported lesson (private links made after the access check) */
    const media = (window.FGH_CONTENT && window.FGH_CONTENT.media) || {};
    if (l.images && l.images.some(im => media[im.path])) h += '<section class="card"><div class="lesson-images">' + l.images.filter(im => media[im.path]).map(im => '<figure><img src="' + esc(media[im.path]) + '" alt="' + esc(im.caption || '') + '" loading="lazy">' + (im.caption ? '<figcaption lang="th">' + esc(im.caption) + '</figcaption>' : '') + '</figure>').join('') + '</div></section>';
    h += '<section class="card"><h2>' + esc(t('acVocab')) + '</h2><div class="tablewrap"><table class="vocab"><tbody>' + l.vocab.map((w, i) => {
      const k = AC.itemKey(c, l, w), on = fav.includes(k), st = SRS.status(deck(p)[k]);
      return '<tr><td><b lang="' + c.target + '" class="tw">' + esc(w.t) + '</b>' + romHTML(w.rom) + sayBtns('sayWord', i) + '</td><td>' + esc(T(w.tr)) + (w.note ? '<br><small class="muted">💡 ' + esc(T(w.note)) + '</small>' : '') + '</td><td><span class="muted" style="font-size:.85rem">' + esc(st === 'known' ? t('acKnown') : st === 'weak' ? t('acWeak') : '') + '</span></td>' +
        '<td><button class="ghost" data-act="fav" data-v="' + esc(k) + '" aria-pressed="' + on + '" title="' + esc(on ? t('acUnfav') : t('acFav')) + '">' + (on ? '★' : '☆') + '</button></td></tr>';
    }).join('') + '</tbody></table></div></section>';
    /* table cells with Thai script get a listen button (consonant, vowel and number tables); only the Thai part is read */
    const cell = c2 => {
      const txt = String(c2), th = (txt.match(/[฀-๿]+/g) || []).join(' ');
      return '<td>' + esc(txt) + (c.target === 'th' && th ? ' <button class="ghost" data-act="say" data-v="' + esc(th) + '" aria-label="' + esc(t('listen')) + '">🔊</button>' : '') + '</td>';
    };
    h += '<section class="card grammar"><h2>' + esc(t('acGrammar')) + ': ' + esc(T(l.grammar.title)) + '</h2>' + T(l.grammar.body).split('\n\n').map(par => '<p>' + par.split('\n').map(esc).join('<br>') + '</p>').join('') +
      (l.grammar.table ? '<div class="tablewrap"><table><tbody>' + l.grammar.table.map((r, ri) => '<tr>' + r.map(c2 => (ri === 0 && c.target === 'th') ? '<th>' + esc(c2) + '</th>' : cell(c2)).join('') + '</tr>').join('') + '</tbody></table></div>' : '') + '</section>';
    if (c.romanization) h += '<p class="muted" style="font-size:.85rem">ℹ️ ' + esc(t('acRomNote', { sys: c.romanization })) + '</p>';
    return h + '<div class="row"><button class="btn primary big" data-act="startEx">▶ ' + esc(t('acStartEx')) + '</button></div>';
  }
  /* the five Thai tones: a schematic pitch graph (Chao tone numbers 1 = low … 5 = high) and one example word per tone */
  function tonesHTML(l) {
    const W = 340, H = 170, x0 = 34, x1 = W - 12;
    const X = v => Math.round(x0 + v * (x1 - x0)), Y = v => Math.round(H - 20 - (v - 1) * (H - 40) / 4);
    const path = pts => pts.map((q, k) => (k ? ' L' : 'M') + X(q[0]) + ',' + Y(q[1])).join('');
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="tonegraph" role="img" aria-label="' + esc(t('acToneGraph')) + '">';
    for (let v = 1; v <= 5; v++) svg += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="grid"/><text x="' + (x0 - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="cl">' + v + '</text>';
    l.tones.forEach((tn, i) => { svg += '<path d="' + path(tn.curve) + '" fill="none" class="tone t' + (i + 1) + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><title>' + esc(tn.sv + ' (' + tn.name + ')') + '</title></path>'; });
    svg += '</svg>';
    return '<section class="card"><h2>🎵 ' + esc(t('acTones')) + '</h2><figure class="chart">' + svg + '<figcaption class="muted" style="font-size:.85rem">' + esc(t('acToneGraphNote')) + '</figcaption></figure>' +
      '<div class="tones">' + l.tones.map((tn, i) => '<div class="tonecard t' + (i + 1) + '"><div class="tn"><span class="sw" aria-hidden="true"></span><b>' + esc(tn.sv) + '</b> <span lang="th">' + esc(tn.name) + '</span> <small class="muted">(' + esc(tn.rom) + ')</small></div>' +
        '<div class="tw"><b lang="th">' + esc(tn.word) + '</b> <span class="rom">' + esc(tn.wrom) + '</span> – ' + esc(tn.wsv) + '</div><p class="muted" style="margin:.2rem 0">' + esc(tn.desc) + '</p>' +
        '<div class="row" style="margin:0"><button class="btn small" data-act="say" data-v="' + esc(tn.word) + '">🔊 ' + esc(t('listen')) + '</button><button class="btn small" data-act="saySlow" data-v="' + esc(tn.word) + '">🐢 ' + esc(t('voice.slow')) + '</button></div></div>').join('') + '</div>' +
      '<div class="row"><button class="btn" data-act="sayTones">▶ ' + esc(t('acToneCompare')) + '</button></div></section>';
  }

  /* ---------- exercise runner (lessons and level tests) ---------- */
  function startRun(kind, qs, meta) {
    R = Object.assign({ kind, qs, i: 0, right: 0, scored: 0, t0: Date.now(), key: LG.newId(), st: null, wrongWords: [] }, meta);
    R.st = { answered: false, ok: null, picked: null, slots: [], text: '' };
    V.screen = 'run'; render();
  }
  const Q = () => R.qs[R.i];
  function runHTML() {
    const q = Q(), st = R.st, target = setup(me()).target;
    let h = top(R.title, 'home') + VUI.speedHTML(me().id, true) + '<div class="row" style="margin:0 0 8px"><span class="muted">' + esc(t('question', { i: R.i + 1, n: R.qs.length })) + '</span><span class="grow"></span><span class="pill">✓ ' + R.right + '</span></div><div class="meter"><span style="width:' + Math.round(100 * R.i / R.qs.length) + '%"></span></div><div class="stage stack">';
    const opts = () => '<div class="answers">' + q.opts.map(o => { let cls = ''; if (st.answered) cls = String(o.v) === String(q.answer) ? 'good' : String(o.v) === String(st.picked) ? 'bad' : 'dim'; return '<button class="ans ' + cls + (o.sub ? ' sub' : '') + '" data-act="pickAns" data-v="' + esc(o.v) + '"' + (st.answered ? ' disabled' : '') + '>' + esc(o.text) + (o.sub ? '<small class="rom">' + esc(o.sub) + '</small>' : '') + '</button>'; }).join('') + '</div>';
    const sayBtn = (txt, lbl) => '<button class="btn small" data-act="say" data-v="' + esc(txt) + '">🔊 ' + esc(lbl || t('listen')) + '</button>';
    switch (q.type) {
      case 'mc': h += '<p class="big-q">' + esc(q.prompt) + '</p>' + (q.rom ? '<p class="center rom">' + esc(q.rom) + '</p>' : '') + (q.reverse || q.noSay ? '' : '<div class="center">' + sayBtn(q.say || q.prompt) + '</div>') + (q.q ? '<p class="center muted">' + esc(q.q) + '</p>' : '') + opts(); break;
      case 'listen': h += '<p class="big-q">🎧</p><div class="center">' + sayBtn(q.say, t('again')) + '</div>' + (st.answered ? '<p class="center"><b>' + esc(q.say) + '</b></p>' : '') + opts(); break;
      case 'gap': h += '<p class="big-q">' + esc(q.text).replace('___', '<span style="border-bottom:3px solid var(--accent);padding:0 1.2em">' + (st.answered ? esc(q.answer) : '&nbsp;') + '</span>') + '</p>' + (q.sub ? '<p class="center muted">' + esc(q.sub) + '</p>' : '') + opts(); break;
      case 'order': {
        const used = new Set(st.slots.map(s => s.k));
        h += '<p class="center muted">' + esc(t('acWordOrder')) + '</p>' + (q.sub ? '<p class="center"><b>' + esc(q.sub) + '</b></p>' : '') + (st.answered && q.rom ? '<p class="center rom">' + esc(q.rom) + '</p>' : '') + '<div class="slots">' + st.slots.map((s, i) => '<button class="ltile" data-act="unslot" data-v="' + i + '"' + (st.answered ? ' disabled' : '') + '>' + esc(s.g) + '</button>').join('') + '</div><div class="tiles-row">' +
          q.tiles.map(x => '<button class="ltile' + (used.has(x.k) ? ' used' : '') + '" data-act="slot" data-v="' + x.k + '"' + (used.has(x.k) || st.answered ? ' disabled' : '') + '>' + esc(x.g) + '</button>').join('') + '</div>' +
          (st.answered ? '' : '<div class="row" style="justify-content:center"><button class="btn" data-act="clearSlots">⌫</button><button class="btn primary" data-act="checkSlots"' + (st.slots.length ? '' : ' disabled') + '>✓ ' + esc(t('check')) + '</button></div>');
        break;
      }
      case 'translate':
        h += '<p class="center muted">' + esc(t('exTranslate')) + '</p><p class="big-q">' + esc(q.from) + '</p><form data-form="answer" class="row" style="justify-content:center"><input id="ans" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" lang="' + target + '" data-focus style="min-height:52px;font:inherit;font-size:1.2rem;padding:.3rem .8rem;border-radius:12px;border:2px solid var(--line);width:min(100%,480px)"' + (st.answered ? ' disabled value="' + esc(st.text) + '"' : '') + ' placeholder="' + esc(t('acTypeAnswer')) + '">' +
          (st.answered ? '' : '<button class="btn primary" type="submit">✓ ' + esc(t('check')) + '</button>') + '</form>';
        break;
      case 'write':
        h += '<p class="big-q">✍️ ' + esc(t('acWriteTask')) + '</p><p class="center">' + esc(q.task) + '</p><p class="center muted">' + esc(t('acWriteHint')) + '</p><div class="field"><textarea id="wr" lang="' + target + '" rows="5" style="width:100%"' + (st.answered ? ' disabled' : '') + '>' + esc(st.text) + '</textarea></div>' +
          (st.answered ? '<div class="notebox"><b>' + esc(t('acModel')) + ':</b> ' + esc(q.model) + ' ' + sayBtn(q.model) + '</div>' : '<div class="row" style="justify-content:center"><button class="btn primary" data-act="writeDone">✓ ' + esc(t('acShowAnswer')) + '</button></div>');
        break;
      case 'speak':
        h += '<p class="big-q">' + esc(q.say) + '</p>' + (q.rom ? '<p class="center rom">' + esc(q.rom) + '</p>' : '') + '<p class="center muted">' + esc(q.sub) + '</p><p class="center">' + esc(t('sayIt')) + '</p><div class="row" style="justify-content:center">' + sayBtn(q.say) +
          (K.canListen ? '<button class="btn primary" data-act="mic">' + esc(t('pressMic')) + '</button>' : '') + '<button class="btn" data-act="saidIt">✓ ' + esc(t('saidIt')) + '</button></div>' +
          (st.heard ? '<p class="center">' + (st.heard.text ? esc(t('heard', { t: st.heard.text })) + '<br>' : '') + '<b>' + esc(st.heard.msg) + '</b></p>' : '') + '<p class="center muted" style="font-size:.85rem">' + esc(K.canListen ? t('speechHonest') : t('noMic')) + '</p>';
        break;
    }
    if (st.answered && q.type !== 'write' && q.type !== 'speak') h += '<p class="fb ' + (st.ok ? 'ok' : 'no') + '">' + (st.ok ? '✓ ' + esc(t('right')) : '✗ ' + esc(t('rightIs', { a: answerText(q) }))) + '</p>' + (q.say && !st.ok ? '<div class="center">' + sayBtn(q.say) + '</div>' : '');
    if (st.answered) h += '<div class="row" style="justify-content:center"><button class="btn primary big" data-act="nextQ">' + esc(R.i + 1 >= R.qs.length ? t('finish') : t('next')) + ' →</button></div>';
    return h + '</div>';
  }
  function answerText(q) { if (q.opts) { const o = q.opts.find(o => String(o.v) === String(q.answer)); return o ? o.text : q.answer; } return q.answer; }
  function answer(ok, picked, scored) {
    const st = R.st; if (st.answered) return;
    st.answered = true; st.ok = ok; st.picked = picked;
    if (scored !== false) { R.scored++; if (ok) R.right++; }
    const q = Q();
    if (q.word && !ok) R.wrongWords.push(q.id);
    ok ? K.sfx.right() : K.sfx.wrong();
    if (ok && q.say && q.type !== 'listen') speak(q.say, null, true);
    render();
  }
  function finishRun() {
    const p = me(), s = setup(p), c = crs(p), ms = Date.now() - R.t0;
    const pct = Math.round(100 * R.right / Math.max(1, R.scored));
    const ck = ckey(p);
    if (R.kind === 'lesson') {
      const l = R.lesson;
      A.recordLesson(p.id, ck, l.id, pct, ms, c.passPct);
      A.updateLearning(p.id, f => {
        const dk = f.srs[p.id] || (f.srs[p.id] = {});
        SRS.addCards(dk, l.vocab.map(w => AC.itemKey(c, l, w)), Date.now());
        R.wrongWords.forEach(k => { if (dk[k]) dk[k] = SRS.grade(dk[k], 'again', Date.now()); });
      });
    } else if (R.kind === 'game') {
      A.updateLearning(p.id, f => { const co = F.course(f, p.id, ck); co.timeMs += ms; co.lastAt = Date.now(); });
    } else {
      A.updateLearning(p.id, f => { const co = F.course(f, p.id, ck); co.tests = (co.tests || []).concat([{ level: R.level, pct, passed: pct >= c.passPct, at: Date.now() }]).slice(-50); co.timeMs += ms; co.lastAt = Date.now(); });
    }
    A.finish(p.id, { key: 'ac:' + R.key, area: 'academy', kind: R.kind === 'lesson' ? 'lesson' : R.kind === 'game' ? 'game' : 'test', title: '🎓 ' + R.title, ms, score: R.right, max: R.scored, pct, points: false });
    R.result = { pct, passed: pct >= c.passPct };
    V.screen = 'done'; K.sfx.win(); render();
  }
  function doneHTML() {
    const c = crs(me()), r = R.result;
    return top(R.title, 'home') + '<section class="card center stack"><div class="emo pop" aria-hidden="true">' + (r.passed ? '🎉' : '📚') + '</div><h2>' + esc(t('yourScore', { n: R.right, m: R.scored })) + ' · ' + r.pct + ' %</h2>' +
      '<p>' + esc(R.kind === 'game' ? t('tlaGameDone') : R.kind === 'test' ? (r.passed ? t('acTestPassed', { l: R.level }) : t('acTestFailed')) : (r.passed ? t('lessonDone') : t('acPassMark', { p: c.passPct }))) + '</p>' +
      '<div class="row" style="justify-content:center">' + (R.kind === 'lesson' ? '<button class="btn" data-act="openLesson" data-v="' + esc(R.lesson.id) + '">↻ ' + esc(t('again')) + '</button>' : R.kind === 'game' ? '<button class="btn" data-act="game" data-v="' + esc(R.game) + '">↻ ' + esc(t('again')) + '</button>' : '') + '<button class="btn primary big" data-act="go" data-v="' + (THAI && R.kind === 'game' ? 'games' : THAI && R.kind === 'lesson' && V.from ? V.from : 'home') + '">' + esc(t('acContinue')) + ' →</button></div></section>';
  }

  /* ---------- spaced repetition review ---------- */
  function wordOf(key) {
    const c = crs(me());
    if (key.startsWith(c.target + ':own:')) { const w = (fam().adult[me().id].own || []).find(x => x.key === key); return w ? { t: w.t, tr: w.tr } : null; }
    for (const c2 of (THAI ? thaiCourseIds().map(AC.course) : [c])) for (const l of c2.lessons) for (const w of l.vocab) if (AC.itemKey(c2, l, w) === key) return { t: w.t, tr: T(w.tr), note: w.note ? T(w.note) : '' };
    return null;
  }
  function startReview() {
    const p = me(), c = crs(p);
    const cards = SRS.due(deck(p), Date.now(), c.target + ':').filter(x => wordOf(x.key)).slice(0, 20);
    RV = { cards, i: 0, shown: false, done: 0, right: 0, t0: Date.now(), key: LG.newId() };
    V.screen = 'review'; render();
  }
  function reviewHTML() {
    if (!RV.cards.length || RV.i >= RV.cards.length) return top(t('acReviewNow'), 'home') + '<section class="card center"><h2>✓ ' + esc(t('acRevDone', { n: RV.done })) + '</h2><button class="btn primary" data-act="go" data-v="home">' + esc(t('acContinue')) + '</button></section>';
    const cd = RV.cards[RV.i], w = wordOf(cd.key);
    return top(t('acReviewNow'), 'home') + '<p class="muted center">' + (RV.i + 1) + ' / ' + RV.cards.length + '</p><section class="card srs-card stack"><div class="front">' + esc(w.t) + '</div><div class="center"><button class="btn small" data-act="say" data-v="' + esc(w.t) + '">🔊 ' + esc(t('listen')) + '</button></div>' +
      (RV.shown ? '<div class="back">' + esc(w.tr) + '</div>' + (w.note ? '<p class="muted">💡 ' + esc(w.note) + '</p>' : '') +
        '<div class="row" style="justify-content:center"><button class="btn" data-act="grade" data-v="again">✗ ' + esc(t('acDontKnow')) + '</button><button class="btn" data-act="grade" data-v="hard">≈ ' + esc(t('acWeak')) + '</button><button class="btn primary" data-act="grade" data-v="good">✓ ' + esc(t('acKnow')) + '</button></div>'
        : '<button class="btn primary big" data-act="showBack">' + esc(t('acShowAnswer')) + '</button>') + '</section>';
  }

  /* ---------- my words ---------- */
  function wordsHTML() {
    const p = me(), c = crs(p), dk = deck(p), fav = fam().favorites[p.id] || [];
    const rows = Object.values(dk).filter(x => x.key.startsWith(c.target + ':')).map(x => ({ x, w: wordOf(x.key) })).filter(r => r.w).sort((a, b) => fav.includes(b.x.key) - fav.includes(a.x.key) || a.x.ease - b.x.ease);
    return top(t('acFavorites'), 'home') + '<form class="card row" data-form="ownWord" style="margin-top:0"><input id="ow1" type="text" lang="' + c.target + '" placeholder="' + esc(t('lang.' + c.target)) + '" style="min-height:46px;border-radius:10px;border:2px solid var(--line);padding:.3rem .6rem;font:inherit"><input id="ow2" type="text" placeholder="' + esc(t('lang.' + setup(p).explain)) + '" style="min-height:46px;border-radius:10px;border:2px solid var(--line);padding:.3rem .6rem;font:inherit"><button class="btn primary" type="submit">＋ ' + esc(t('add')) + '</button></form>' +
      '<div class="card tablewrap"><table><thead><tr><th></th><th>' + esc(t('lang.' + c.target)) + '</th><th>' + esc(t('meaning')) + '</th><th>' + esc(t('pdResult')) + '</th></tr></thead><tbody>' +
      (rows.length ? rows.map(({ x, w }) => { const s = SRS.status(x); const days = Math.max(0, Math.ceil((x.due - Date.now()) / SRS.DAY)); return '<tr><td><button class="ghost" data-act="fav" data-v="' + esc(x.key) + '">' + (fav.includes(x.key) ? '★' : '☆') + '</button></td><td><b>' + esc(w.t) + '</b> <button class="ghost" data-act="say" data-v="' + esc(w.t) + '">🔊</button></td><td>' + esc(w.tr) + '</td><td>' + esc(s === 'known' ? t('acKnown') : s === 'weak' ? t('acWeak') : t('acInProgress')) + ' · ' + esc(t('acDueIn', { d: days })) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="muted">' + esc(t('none')) + '</td></tr>') + '</tbody></table></div>';
  }

  /* ---------- voice settings for this learner: the course language first, then the explanation language ---------- */
  function voiceHTML() {
    const p = me(), s = setup(p);
    const langs = Array.from(new Set([s.target, s.explain].concat(Object.keys(AC.courses()), ['sv', 'th', 'en', 'es'])));
    return top(t('voice.title'), 'home') + VUI.panelHTML(p.id, langs);
  }

  /* ---------- actions ---------- */
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    who() { V.pid = null; sessionStorage.removeItem('fgh.adult'); render(); },
    pick(v) { V.pid = v; sessionStorage.setItem('fgh.adult', v); V.screen = 'home'; V.draft = null; render(); },
    go(v) { V.screen = v; if (v === 'setup') V.draft = null; R = null; render(); },
    home() { V.screen = 'home'; R = null; render(); },
    dCourse(v) { V.draft.course = v; V.draft.level = levelFor(setup(me()), v); render(); },
    dTarget(v) { V.draft.target = v; V.draft.level = levelFor(setup(me()), v); render(); }, dExplain(v) { V.draft.explain = v; render(); }, dLevel(v) { V.draft.level = v; render(); }, dGoal(v) { V.draft.goal = v; render(); }, dMin(v) { V.draft.minutes = +v; render(); },
    saveSetup() {
      const p = me(), d = V.draft;
      if (THAI) {
        const k = thaiCourseIds().includes(d.course) ? d.course : 'th';
        A.updateLearning(p.id, f => { const old = f.adult[p.id]; f.adult[p.id] = Object.assign({ started: Date.now(), own: [], target: 'th', explain: 'sv', level: d.level }, old || {}, { thExplain: d.explain, thCourse: k, goal: d.goal, minutes: d.minutes }); const s2 = f.adult[p.id]; s2.levels = Object.assign({}, s2.levels, { [k]: d.level }); if (s2.target === k) s2.level = d.level; });
        A.saveProfile(p.id, { goalMin: d.minutes }); V.draft = null; V.screen = 'home'; render(); return;
      }
      A.updateLearning(p.id, f => { f.adult[p.id] = Object.assign({ started: Date.now(), own: [] }, f.adult[p.id] || {}, { target: d.target, explain: d.explain, level: d.level, goal: d.goal, minutes: d.minutes }); const s2 = f.adult[p.id]; s2.levels = Object.assign({}, s2.levels, { [d.target]: d.level }); });
      A.saveProfile(p.id, { goalMin: d.minutes });
      V.draft = null; V.screen = 'home'; render();
    },
    skill(v) { V.skill = v || null; render(); },
    /* Thai Academy */
    tab(v) { if (TABS.includes(v)) { V.screen = v; R = null; if (v === 'homework') loadHw(); render(); window.scrollTo(0, 0); } },
    gateRetry() { if (FGH.teachingAccess) FGH.teachingAccess.reset(); ACC = null; render(); startAccess(); },
    hwOpen(v) { hwOpen(v); },
    hwBack() { V.screen = 'homework'; V.hwThread = null; loadHw(); render(); },
    hwLesson(v) { const [ck, lid] = String(v).split('|'); if (thaiCourseIds().includes(ck) && setup(me()).course !== ck) A.updateLearning(me().id, f => { f.adult[me().id].thCourse = ck; }); V.from = 'homework'; ACT.openLesson(lid); },
    hwFile(v) { const w = window.open('', '_blank'); ACC.svc.fileLink(v).then(u => { if (w) w.location = u; else location.href = u; }).catch(() => { if (w) w.close(); K.toast('⚠️ ' + t('tlaHw.fileError')); }); },
    setExplain(v) { if (v !== 'sv' && v !== 'th') return; const p = me(); A.updateLearning(p.id, f => { f.adult[p.id].thExplain = v; }); try { localStorage.setItem('te.explain', v); } catch (e) { /* ignore */ } render(); },
    setLevel(v) { const p = me(), k = setup(p).course; A.updateLearning(p.id, f => { const s2 = f.adult[p.id]; s2.levels = Object.assign({}, s2.levels, { [k]: v }); if (s2.target === k) s2.level = v; }); render(); },
    setCourse(v) { if (!thaiCourseIds().includes(v)) return; const p = me(); A.updateLearning(p.id, f => { f.adult[p.id].thCourse = v; }); V.skill = null; render(); },
    game(v) { const p = me(), qs = gameQs(p, v); if (qs.length) startRun('game', qs, { game: v, title: GAMES[v] + ' ' + t('tlaGame.' + v) }); },
    backFromLesson() { V.screen = V.from && TABS.includes(V.from) ? V.from : 'lessons'; R = null; render(); },
    openLesson(v) { if (TABS.includes(V.screen)) V.from = V.screen; V.lesson = v; V.screen = 'lesson'; const p = me(); A.updateLearning(p.id, f => F.startLesson(f, p.id, ckey(p), v)); render(); window.scrollTo(0, 0); },
    toggleTr() { V.showTr = !V.showTr; render(); },
    sayLine(v) { const l = AC.lessonById(crs(me()), V.lesson); speak(l.dialogue[+v].t); },
    sayLineSlow(v) { const l = AC.lessonById(crs(me()), V.lesson); speak(l.dialogue[+v].t, null, false, { slow: true }); },
    sayWord(v) { const l = AC.lessonById(crs(me()), V.lesson); speak(l.vocab[+v].t); },
    sayWordSlow(v) { const l = AC.lessonById(crs(me()), V.lesson); speak(l.vocab[+v].t, null, false, { slow: true }); },
    sayWordRep(v) { const l = AC.lessonById(crs(me()), V.lesson); speak(l.vocab[+v].t, null, false, { times: 3 }); },
    say(v) { speak(v); },
    saySlow(v) { speak(v, null, false, { slow: true }); },
    sayTones() { const l = AC.lessonById(crs(me()), V.lesson); if (l && l.tones) speak(l.tones.map(x => x.word).join('\n'), 'th', false, { slow: true }); },
    playAll() { const l = AC.lessonById(crs(me()), V.lesson); speak(l.dialogue.map(d => d.t).join('\n')); },
    fav(v) { const p = me(); A.updateLearning(p.id, f => { const a = f.favorites[p.id] || (f.favorites[p.id] = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else { a.push(v); const dk = f.srs[p.id] || (f.srs[p.id] = {}); SRS.addCards(dk, [v], Date.now()); } }); render(); },
    startEx() { const c = crs(me()), l = AC.lessonById(c, V.lesson); startRun('lesson', AC.exercises(c, l, ex(), Math.random), { lesson: l, title: l.icon + ' ' + T(l.title) }); },
    test(v) { const c = crs(me()); startRun('test', AC.levelTest(c, v, ex(), Math.random, 10), { level: v, title: t('acLevelTest', { l: v }) }); },
    pickAns(v) { answer(AC.check(Q(), v), v); },
    slot(v) { const q = Q(), x = q.tiles.find(x => x.k === +v); if (x) { R.st.slots.push(x); if (R.st.slots.length === q.tiles.length) return ACT.checkSlots(); render(); } },
    unslot(v) { R.st.slots.splice(+v, 1); render(); },
    clearSlots() { R.st.slots = []; render(); },
    checkSlots() { const q = Q(), txt = R.st.slots.map(s => s.g).join(q.joiner == null ? ' ' : q.joiner); answer(AC.check(Q(), txt), txt); },
    writeDone() { R.st.text = ($('wr') || {}).value || ''; answer(true, R.st.text, false); },
    async mic() { const q = Q(); const r = await K.listen(setup(me()).target); if (r.error) { R.st.heard = { text: '', msg: r.error === 'denied' ? t('micDenied') : r.error === 'no_support' ? t('noMic') : t('heardNo') }; return render(); } const v = K.compareSpeech(r.alts || [r.text], q.say); R.st.heard = { text: r.text, msg: v === 'good' ? t('heardGood') : v === 'close' ? t('heardClose') : t('heardNo') }; if (v === 'good') answer(true, 'spoken', false); else render(); },
    saidIt() { answer(true, 'said', false); },
    nextQ() { R.i++; if (R.i >= R.qs.length) return finishRun(); R.st = { answered: false, ok: null, picked: null, slots: [], text: '' }; render(); },
    review() { startReview(); },
    showBack() { RV.shown = true; render(); },
    grade(v) {
      const p = me(), cd = RV.cards[RV.i];
      A.updateLearning(p.id, f => { const dk = f.srs[p.id] || (f.srs[p.id] = {}); dk[cd.key] = SRS.grade(dk[cd.key] || cd, v, Date.now()); });
      RV.done++; if (v === 'good') RV.right++; RV.i++; RV.shown = false;
      if (RV.i >= RV.cards.length) A.finish(p.id, { key: 'rv:' + RV.key, area: 'academy', kind: 'review', title: '🔁 ' + t('acReviewNow'), ms: Date.now() - RV.t0, score: RV.right, max: RV.done, pct: Math.round(100 * RV.right / Math.max(1, RV.done)), points: false });
      render();
    }
  };
  Object.assign(ACT, VUI.acts(() => V.pid, render));
  K.bindActs(ACT);
  if (VO.onVoices) VO.onVoices(() => { if (V.screen === 'voice' || V.screen === 'lesson') render(); });
  document.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target.dataset.form;
    if (form === 'hwComment') { const b = $('hwCm').value.trim(); if (!b) return; ACC.svc.studentComment(V.hwId, b).then(() => hwOpen(V.hwId)).catch(err => K.toast('⚠️ ' + (err.code === 'too_many_messages' ? t('tlaHw.tooMany') : t('tlaHw.sendError')))); }
    if (form === 'hwSubmit') {
      const ans = $('hwAns').value, file = $('hwFile').files && $('hwFile').files[0];
      if (!ans.trim() && !file) { K.toast(t('tlaHw.empty')); return; }
      V.hwBusy = true; render();
      (async () => { const up = file ? await ACC.svc.uploadSubmissionFile(ACC.studentId, V.hwId, file) : null; await ACC.svc.studentSubmit(V.hwId, ans, up); })()
        .then(() => { V.hwBusy = false; K.toast('📤 ' + t('tlaHw.sent')); loadHw(); hwOpen(V.hwId); })
        .catch(err => { V.hwBusy = false; K.toast('⚠️ ' + (t('tlaHw.err.' + err.code) !== 'tlaHw.err.' + err.code ? t('tlaHw.err.' + err.code) : t('tlaHw.sendError'))); render(); });
    }
    if (form === 'answer') { const v = $('ans').value; R.st.text = v; answer(AC.check(Q(), v), v); }
    if (form === 'newAdult') { const name = $('an').value; A.saveProfile(null, { name, avatar: $('aav').value, kind: 'adult', age: 30 }).then(r => { if (r.ok) ACT.pick(r.profile.id); else K.toast(t('err_' + r.error)); }); }
    if (form === 'ownWord') {
      const a = $('ow1').value.trim(), b = $('ow2').value.trim(); if (!a || !b) return;
      const p = me(), c = crs(p), key = c.target + ':own:' + a.toLocaleLowerCase();
      A.updateLearning(p.id, f => { const s = f.adult[p.id]; s.own = (s.own || []).filter(x => x.key !== key).concat([{ key, t: a, tr: b }]); SRS.addCards(f.srs[p.id] || (f.srs[p.id] = {}), [key], Date.now()); const fv = f.favorites[p.id] || (f.favorites[p.id] = []); if (!fv.includes(key)) fv.push(key); });
      render();
    }
  });
  if (FGH.cloud) FGH.cloud.start().then(() => render()).catch(() => {});
  render();
  startAccess();
  window.__academy = { state: () => ({ V, R, RV }) };
})();
