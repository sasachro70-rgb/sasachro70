/* Adult Language Academy (academy.html): course setup, dashboard with "Continue learning", lessons (dialogue, key words,
   grammar, exercises), level tests, spaced-repetition review and the learner's own word list. */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit, F = FGH.family, store = FGH.familyStore, A = FGH.actions, AC = FGH.academy, SRS = FGH.srs, LG = FGH.ledger;
  const { $, esc, t } = K;
  const params = new URLSearchParams(location.search);
  let V = { screen: 'home', pid: params.get('p') || sessionStorage.getItem('fgh.adult') || null, showTr: false, skill: null };
  let R = null;    // running exercises / test
  let RV = null;   // review session

  const fam = () => store.get();
  const me = () => V.pid && F.getProfile(fam(), V.pid);
  const setup = p => fam().adult[p.id] || null;
  const crs = p => { const s = setup(p); return s && AC.course(s.target); };
  const ckey = p => { const s = setup(p); return AC.courseKey(s.target, s.explain); };
  const prog = p => (fam().learning[p.id] || {})[ckey(p)] || { lessons: {}, tests: [], timeMs: 0, lastAt: 0 };
  const deck = p => fam().srs[p.id] || {};
  const ex = () => setup(me()).explain;
  const T = obj => AC.tr(obj, ex());
  const rate = () => (me() ? me().ttsRate : 0.9);
  let warned = 0;
  function speak(text, lang, quiet) { const l = lang || setup(me()).target; if (!K.speak(text, l, rate()) && !quiet && Date.now() - warned > 15000) { warned = Date.now(); K.toast('🔇 ' + t('voiceMissing', { lang: t('lang.' + l) })); } }

  function render() {
    document.documentElement.lang = K.ui(); document.body.dataset.area = 'academy';
    const p = me();
    if (!p || p.kind !== 'adult') { V.pid = null; V.screen = 'who'; }
    else if (!setup(p) || !crs(p)) V.screen = V.screen === 'setup' ? 'setup' : 'setup';
    const S = { who: whoHTML, setup: setupHTML, home: homeHTML, lesson: lessonHTML, run: runHTML, done: doneHTML, review: reviewHTML, words: wordsHTML };
    $('app').innerHTML = (S[V.screen] || homeHTML)();
    const inp = document.querySelector('[data-focus]'); if (inp) inp.focus();
  }
  function top(title, back) {
    const p = me();
    return K.header(title, { back, extra: p ? '<button class="btn small" data-act="who">' + esc(p.avatar) + ' ' + esc(p.name) + ' ⇄</button>' : '' });
  }

  /* ---------- who & setup ---------- */
  function whoHTML() {
    const list = F.activeProfiles(fam(), 'adult');
    return K.header(t('acTitle')) + '<p class="tagline">' + esc(t('acTag')) + '</p><h2 class="sec">' + esc(t('acWho')) + '</h2>' +
      (list.length ? '<div class="who-grid">' + list.map(p => '<button class="who-card" data-act="pick" data-v="' + esc(p.id) + '"><span class="av" aria-hidden="true">' + esc(p.avatar) + '</span><span class="nm">' + esc(p.name) + '</span>' +
        (fam().adult[p.id] ? '<span class="muted">' + esc(t('lang.' + fam().adult[p.id].target)) + ' · ' + esc(fam().adult[p.id].level) + '</span>' : '') + '</button>').join('') + '</div>' : '<p class="muted">' + esc(t('noAdults')) + '</p>') +
      '<h2 class="sec">' + esc(t('acNewLearner')) + '</h2><form class="card row" data-form="newAdult" style="margin-top:0"><label for="an">' + esc(t('acName')) + '</label><input id="an" type="text" maxlength="20" autocomplete="off" style="min-height:48px;border-radius:12px;border:2px solid var(--line);padding:.3rem .7rem;font:inherit">' +
      '<select id="aav" style="min-height:48px;font-size:1.4rem;border-radius:12px">' + ['👩', '👨', '🧑', '👵', '👴', '🧔', '👱‍♀️', '🧕'].map(a => '<option>' + a + '</option>').join('') + '</select><button class="btn primary" type="submit">＋ ' + esc(t('acCreate')) + '</button></form>';
  }
  function setupHTML() {
    const p = me(), s = Object.assign({ target: 'sv', explain: K.ui() === 'th' ? 'th' : 'en', level: 'A1', goal: 'daily', minutes: 15 }, setup(p) || {}, V.draft || {});
    const c = AC.course(s.target); if (c && !c.explain.includes(s.explain)) s.explain = c.explain[0];
    V.draft = s;
    const chips = (act, list, cur, lbl) => '<div class="choices">' + list.map(([v, l]) => '<button class="btn' + (String(cur) === String(v) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(v) + '" aria-pressed="' + (String(cur) === String(v)) + '">' + esc(l) + '</button>').join('') + '</div>';
    return top(t('acSetup'), setup(p) ? 'home' : null) + '<div class="card stack">' +
      '<div class="field"><label>' + esc(t('acTarget')) + '</label>' + chips('dTarget', Object.keys(AC.courses()).map(k => [k, t('lang.' + k)]), s.target) + '</div>' +
      '<div class="field"><label>' + esc(t('acExplain')) + '</label>' + chips('dExplain', (c ? c.explain : []).map(k => [k, t('lang.' + k)]), s.explain) + '</div>' +
      '<div class="field"><label>' + esc(t('acLevel')) + '</label>' + chips('dLevel', AC.LEVELS.map(l => [l, l + ' · ' + t('cefr.' + l)]), s.level) + '</div>' +
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
    let h = top(t('acTitle')) + '<div class="row" style="margin:0 0 12px"><span class="cefr">' + esc(s.level) + '</span><b>' + esc(t('lang.' + s.target)) + '</b><span class="muted">' + esc(t('acExplain')) + ': ' + esc(t('lang.' + s.explain)) + ' · ' + esc(t('goal_' + s.goal)) + ' · ' + s.minutes + ' ' + esc(t('minutes')) + '/' + esc(t('today')) + '</span>' +
      '<span class="grow"></span><button class="btn small" data-act="go" data-v="setup">⚙️ ' + esc(t('acSettings')) + '</button><button class="btn small" data-act="go" data-v="words">⭐ ' + esc(t('acFavorites')) + '</button></div>';
    h += '<div class="split"><section class="card stack">' + (next ? '<div><p class="muted" style="margin:0">' + esc(pr.current ? t('acContinue') : t('acNext')) + '</p><h2>' + next.icon + ' ' + esc(T(next.title)) + '</h2><p class="muted" style="margin:.2rem 0 0">' + esc(next.level) + ' · ' + esc(T(next.goal)) + '</p></div>' +
      '<button class="btn primary big" data-act="openLesson" data-v="' + esc(next.id) + '">▶ ' + esc(t('acContinue')) + '</button>' : '<h2>🎉 ' + esc(t('acCompleted')) + '</h2>') +
      '<hr style="border:0;border-top:1px solid var(--line);width:100%"><p style="margin:0">' + (dueN ? esc(t('acReviewToday', { n: dueN })) : esc(t('acNoReview'))) + '</p>' + (dueN ? '<button class="btn" data-act="review">🔁 ' + esc(t('acReviewNow')) + '</button>' : '') + '</section>' +
      '<section class="card"><div class="kpis">' + [[st.pct + ' %', t('acProgress')], [st.done + '/' + st.total, t('acStats.done')], [st.words, t('acStats.words')], [st.avg == null ? '–' : st.avg + ' %', t('acStats.avg')],
        [K.fmtMin(st.timeMs), t('acStats.time')], [st.lastAt ? K.fmtDate(st.lastAt) : '–', t('acStats.last')], [studyDays + '/7', t('acStats.streak')], [goalDays + '/7', t('acStats.goalMet')]].map(([v, l]) => '<div class="kpi"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div></div>').join('') + '</div>' +
      '<div class="meter" style="margin-top:12px"><span style="width:' + st.pct + '%"></span></div></section></div>';
    h += '<div class="card">' + K.barChart(week, { title: t('pdChartMin'), unit: t('minutes') }) + '</div>';
    const skills = Array.from(new Set([].concat(...c.lessons.map(l => l.skills))));
    h += '<h2 class="sec">' + esc(t('acCourse')) + ' <span class="badge-sample">' + esc(t('sample')) + '</span></h2><div class="row" style="margin:0 0 8px"><button class="btn small' + (!V.skill ? ' on' : '') + '" data-act="skill" data-v="">' + esc(t('allTopics')) + '</button>' +
      skills.map(sk => '<button class="btn small' + (V.skill === sk ? ' on' : '') + '" data-act="skill" data-v="' + sk + '">' + esc(t('skills.' + sk)) + '</button>').join('') + '</div>';
    AC.LEVELS.forEach(lv => {
      const ls = AC.lessonsAt(c, lv).filter(l => !V.skill || l.skills.includes(V.skill));
      const ls0 = AC.lessonsAt(c, lv), lst = AC.levelState(c, pr, lv);
      h += '<section class="card"><div class="row" style="margin:0"><span class="cefr">' + lv + '</span><h3 style="margin:0">' + esc(t('cefr.' + lv)) + '</h3><span class="muted">' + lst.done + '/' + lst.total + '</span>' + (lst.passed ? '<span class="status approved">✓ ' + esc(t('acLevelTest', { l: lv })) + '</span>' : '') + '<span class="grow"></span>' +
        (ls0.length ? '<button class="btn small" data-act="test" data-v="' + lv + '">📝 ' + esc(t('acLevelTest', { l: lv })) + '</button>' : '') + '</div>' +
        (ls.length ? ls.map(l => { const r = pr.lessons[l.id]; return '<button class="lessonrow" data-act="openLesson" data-v="' + esc(l.id) + '"><span class="li" aria-hidden="true">' + l.icon + '</span><span class="lt"><b>' + esc(T(l.title)) + '</b><span>' + l.skills.map(sk => esc(t('skills.' + sk))).join(' · ') + '</span></span>' +
          '<span class="status ' + (r && r.done ? 'approved' : r ? 'pending' : '') + '">' + esc(r && r.done ? t('acCompleted') + ' · ' + r.best + ' %' : r ? t('acInProgress') : t('acNotStarted')) + '</span></button>'; }).join('') : '<p class="muted">' + esc(ls0.length ? '–' : t('none')) + '</p>') + '</section>';
    });
    return h;
  }

  /* ---------- a lesson ---------- */
  function lessonHTML() {
    const p = me(), s = setup(p), c = crs(p), l = AC.lessonById(c, V.lesson);
    const fav = fam().favorites[p.id] || [];
    let h = top(l.icon + ' ' + T(l.title), 'home') + '<p class="muted">' + esc(l.level) + ' · ' + esc(T(l.goal)) + ' · ' + l.skills.map(sk => esc(t('skills.' + sk))).join(', ') + '</p>';
    h += '<section class="card"><div class="row" style="margin:0 0 8px"><h2>' + esc(l.dialogue[0] && l.dialogue[0].who ? t('acDialogue') : t('skills.reading')) + '</h2><span class="grow"></span><button class="btn small" data-act="playAll">▶ ' + esc(t('acPlayAll')) + '</button><button class="btn small" data-act="toggleTr">' + esc(V.showTr ? t('acHideTr') : t('acShowTr')) + '</button></div><div class="dlg">' +
      l.dialogue.map((d, i) => '<div class="line ' + (d.who === 'B' ? 'B' : 'A') + '">' + (d.who ? '<span class="who" aria-hidden="true">' + esc(d.who) + '</span>' : '') + '<div class="bubble"><div class="tl">' + esc(d.t) + ' <button class="ghost" data-act="sayLine" data-v="' + i + '" aria-label="' + esc(t('listen')) + '">🔊</button></div>' + (V.showTr ? '<div class="tr">' + esc(T(d.tr)) + '</div>' : '') + '</div></div>').join('') + '</div></section>';
    h += '<section class="card"><h2>' + esc(t('acVocab')) + '</h2><div class="tablewrap"><table><tbody>' + l.vocab.map((w, i) => {
      const k = AC.itemKey(c, l, w), on = fav.includes(k), st = SRS.status(deck(p)[k]);
      return '<tr><td><button class="ghost" data-act="sayWord" data-v="' + i + '" aria-label="' + esc(t('listen')) + '">🔊</button> <b>' + esc(w.t) + '</b></td><td>' + esc(T(w.tr)) + (w.note ? '<br><small class="muted">💡 ' + esc(T(w.note)) + '</small>' : '') + '</td><td><span class="muted" style="font-size:.85rem">' + esc(st === 'known' ? t('acKnown') : st === 'weak' ? t('acWeak') : '') + '</span></td>' +
        '<td><button class="ghost" data-act="fav" data-v="' + esc(k) + '" aria-pressed="' + on + '" title="' + esc(on ? t('acUnfav') : t('acFav')) + '">' + (on ? '★' : '☆') + '</button></td></tr>';
    }).join('') + '</tbody></table></div></section>';
    h += '<section class="card grammar"><h2>' + esc(t('acGrammar')) + ': ' + esc(T(l.grammar.title)) + '</h2>' + T(l.grammar.body).split('\n\n').map(par => '<p>' + par.split('\n').map(esc).join('<br>') + '</p>').join('') +
      (l.grammar.table ? '<div class="tablewrap"><table><tbody>' + l.grammar.table.map(r => '<tr>' + r.map(c2 => '<td>' + esc(c2) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '') + '</section>';
    return h + '<div class="row"><button class="btn primary big" data-act="startEx">▶ ' + esc(t('acStartEx')) + '</button></div>';
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
    let h = top(R.title, 'home') + '<div class="row" style="margin:0 0 8px"><span class="muted">' + esc(t('question', { i: R.i + 1, n: R.qs.length })) + '</span><span class="grow"></span><span class="pill">✓ ' + R.right + '</span></div><div class="meter"><span style="width:' + Math.round(100 * R.i / R.qs.length) + '%"></span></div><div class="stage stack">';
    const opts = () => '<div class="answers">' + q.opts.map(o => { let cls = ''; if (st.answered) cls = String(o.v) === String(q.answer) ? 'good' : String(o.v) === String(st.picked) ? 'bad' : 'dim'; return '<button class="ans ' + cls + '" data-act="pickAns" data-v="' + esc(o.v) + '"' + (st.answered ? ' disabled' : '') + '>' + esc(o.text) + '</button>'; }).join('') + '</div>';
    const sayBtn = (txt, lbl) => '<button class="btn small" data-act="say" data-v="' + esc(txt) + '">🔊 ' + esc(lbl || t('listen')) + '</button>';
    switch (q.type) {
      case 'mc': h += '<p class="big-q">' + esc(q.prompt) + '</p>' + (q.reverse ? '' : '<div class="center">' + sayBtn(q.prompt) + '</div>') + (q.q ? '<p class="center muted">' + esc(q.q) + '</p>' : '') + opts(); break;
      case 'listen': h += '<p class="big-q">🎧</p><div class="center">' + sayBtn(q.say, t('again')) + '</div>' + (st.answered ? '<p class="center"><b>' + esc(q.say) + '</b></p>' : '') + opts(); break;
      case 'gap': h += '<p class="big-q">' + esc(q.text).replace('___', '<span style="border-bottom:3px solid var(--accent);padding:0 1.2em">' + (st.answered ? esc(q.answer) : '&nbsp;') + '</span>') + '</p>' + opts(); break;
      case 'order': {
        const used = new Set(st.slots.map(s => s.k));
        h += '<p class="center muted">' + esc(t('acWordOrder')) + '</p><div class="slots">' + st.slots.map((s, i) => '<button class="ltile" data-act="unslot" data-v="' + i + '"' + (st.answered ? ' disabled' : '') + '>' + esc(s.g) + '</button>').join('') + '</div><div class="tiles-row">' +
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
        h += '<p class="big-q">' + esc(q.say) + '</p><p class="center muted">' + esc(q.sub) + '</p><p class="center">' + esc(t('sayIt')) + '</p><div class="row" style="justify-content:center">' + sayBtn(q.say) +
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
    } else {
      A.updateLearning(p.id, f => { const co = F.course(f, p.id, ck); co.tests = (co.tests || []).concat([{ level: R.level, pct, passed: pct >= c.passPct, at: Date.now() }]).slice(-50); co.timeMs += ms; co.lastAt = Date.now(); });
    }
    A.finish(p.id, { key: 'ac:' + R.key, area: 'academy', kind: R.kind === 'lesson' ? 'lesson' : 'test', title: '🎓 ' + R.title, ms, score: R.right, max: R.scored, pct, points: false });
    R.result = { pct, passed: pct >= c.passPct };
    V.screen = 'done'; K.sfx.win(); render();
  }
  function doneHTML() {
    const c = crs(me()), r = R.result;
    return top(R.title, 'home') + '<section class="card center stack"><div class="emo pop" aria-hidden="true">' + (r.passed ? '🎉' : '📚') + '</div><h2>' + esc(t('yourScore', { n: R.right, m: R.scored })) + ' · ' + r.pct + ' %</h2>' +
      '<p>' + esc(R.kind === 'test' ? (r.passed ? t('acTestPassed', { l: R.level }) : t('acTestFailed')) : (r.passed ? t('lessonDone') : t('acPassMark', { p: c.passPct }))) + '</p>' +
      '<div class="row" style="justify-content:center">' + (R.kind === 'lesson' ? '<button class="btn" data-act="openLesson" data-v="' + esc(R.lesson.id) + '">↻ ' + esc(t('again')) + '</button>' : '') + '<button class="btn primary big" data-act="go" data-v="home">' + esc(t('acContinue')) + ' →</button></div></section>';
  }

  /* ---------- spaced repetition review ---------- */
  function wordOf(key) {
    const c = crs(me());
    if (key.startsWith(c.target + ':own:')) { const w = (fam().adult[me().id].own || []).find(x => x.key === key); return w ? { t: w.t, tr: w.tr } : null; }
    for (const l of c.lessons) for (const w of l.vocab) if (AC.itemKey(c, l, w) === key) return { t: w.t, tr: T(w.tr), note: w.note ? T(w.note) : '' };
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

  /* ---------- actions ---------- */
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    who() { V.pid = null; sessionStorage.removeItem('fgh.adult'); render(); },
    pick(v) { V.pid = v; sessionStorage.setItem('fgh.adult', v); V.screen = 'home'; V.draft = null; render(); },
    go(v) { V.screen = v; if (v === 'setup') V.draft = null; R = null; render(); },
    home() { V.screen = 'home'; R = null; render(); },
    dTarget(v) { V.draft.target = v; render(); }, dExplain(v) { V.draft.explain = v; render(); }, dLevel(v) { V.draft.level = v; render(); }, dGoal(v) { V.draft.goal = v; render(); }, dMin(v) { V.draft.minutes = +v; render(); },
    saveSetup() {
      const p = me(), d = V.draft;
      A.updateLearning(p.id, f => { f.adult[p.id] = Object.assign({ started: Date.now(), own: [] }, f.adult[p.id] || {}, { target: d.target, explain: d.explain, level: d.level, goal: d.goal, minutes: d.minutes }); });
      A.saveProfile(p.id, { goalMin: d.minutes });
      V.draft = null; V.screen = 'home'; render();
    },
    skill(v) { V.skill = v || null; render(); },
    openLesson(v) { V.lesson = v; V.screen = 'lesson'; const p = me(); A.updateLearning(p.id, f => F.startLesson(f, p.id, ckey(p), v)); render(); window.scrollTo(0, 0); },
    toggleTr() { V.showTr = !V.showTr; render(); },
    sayLine(v) { const l = AC.lessonById(crs(me()), V.lesson); speak(l.dialogue[+v].t); },
    sayWord(v) { const l = AC.lessonById(crs(me()), V.lesson); speak(l.vocab[+v].t); },
    say(v) { speak(v); },
    playAll() {
      const l = AC.lessonById(crs(me()), V.lesson), lang = setup(me()).target, vo = K.voiceFor(lang);
      if (!vo) return K.toast('🔇 ' + t('voiceMissing', { lang: t('lang.' + lang) }));
      speechSynthesis.cancel();
      l.dialogue.forEach(d => { const u = new SpeechSynthesisUtterance(d.t); u.voice = vo; u.lang = vo.lang; u.rate = rate(); speechSynthesis.speak(u); });
    },
    fav(v) { const p = me(); A.updateLearning(p.id, f => { const a = f.favorites[p.id] || (f.favorites[p.id] = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else { a.push(v); const dk = f.srs[p.id] || (f.srs[p.id] = {}); SRS.addCards(dk, [v], Date.now()); } }); render(); },
    startEx() { const c = crs(me()), l = AC.lessonById(c, V.lesson); startRun('lesson', AC.exercises(c, l, ex(), Math.random), { lesson: l, title: l.icon + ' ' + T(l.title) }); },
    test(v) { const c = crs(me()); startRun('test', AC.levelTest(c, v, ex(), Math.random, 10), { level: v, title: t('acLevelTest', { l: v }) }); },
    pickAns(v) { answer(AC.check(Q(), v), v); },
    slot(v) { const q = Q(), x = q.tiles.find(x => x.k === +v); if (x) { R.st.slots.push(x); if (R.st.slots.length === q.tiles.length) return ACT.checkSlots(); render(); } },
    unslot(v) { R.st.slots.splice(+v, 1); render(); },
    clearSlots() { R.st.slots = []; render(); },
    checkSlots() { const txt = R.st.slots.map(s => s.g).join(' '); answer(AC.check(Q(), txt), txt); },
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
  K.bindActs(ACT);
  document.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target.dataset.form;
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
  window.__academy = { state: () => ({ V, R, RV }) };
})();
