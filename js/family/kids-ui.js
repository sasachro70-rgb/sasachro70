/* Kids area (kids.html): pick a child, then Knowledge & Word Games, Kids Language Learning and the Reward shop.
   One exercise runner shows every question type; finished rounds go to FGH.actions (points and progress). */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit, F = FGH.family, LG = FGH.ledger, store = FGH.familyStore, A = FGH.actions;
  const KG = FGH.knowledgeGames, KL = FGH.kidsLanguage;
  const { $, esc, t, L } = K;
  const params = new URLSearchParams(location.search);
  let V = { screen: 'home', pid: params.get('p') || sessionStorage.getItem('fgh.kid') || null };
  let R = null;          // the running round / lesson
  let MEM = null;        // memory game
  let busy = false;

  const fam = () => store.get();
  const me = () => V.pid && F.getProfile(fam(), V.pid);
  const band = p => F.level(p);
  const bal = p => LG.balance(fam().ledger, p.id);
  const avail = p => LG.available(fam().ledger, p.id);
  const pairOf = p => { const l = fam().learning[p.id]; return KL.pairById((l && l.kidsPair) || '') || null; };
  const AGES = { 1: '3–4', 2: '5–6', 3: '7–8', 4: '9–10' };
  const VO = FGH.voice, VUI = FGH.voiceUI;
  const rate = () => VO.rateOf(fam(), V.pid);
  let warned = 0;
  function speak(text, lang) { if (!K.speak(text, lang, rate())) { if (Date.now() - warned > 15000) { warned = Date.now(); K.toast('🔇 ' + t('voiceMissing', { lang: t('lang.' + lang) })); } return false; } return true; }

  /* ---------- screens ---------- */
  function render() {
    document.documentElement.lang = K.ui();
    document.body.dataset.area = 'kids';
    const p = me();
    if (!p || p.kind !== 'child') { V.pid = null; V.screen = 'who'; }
    VO.use(V.pid);
    const app = $('app');
    const S = { who: whoHTML, home: homeHTML, games: homeHTML, setup: setupHTML, run: runHTML, result: resultHTML, lang: langHTML, intro: introHTML, memory: memoryHTML, shop: shopHTML, voice: voiceHTML };
    app.innerHTML = (S[V.screen] || homeHTML)();
    if (V.screen === 'run') afterRun();
  }
  const pts = p => '<span class="pill sun">⭐ ' + bal(p) + '</span>';
  function top(title, back) {
    const p = me();
    return K.header(title, { back, extra: p ? pts(p) + '<button class="btn small" data-act="who">' + esc(p.avatar) + ' ' + esc(p.name) + ' ⇄</button>' : '' });
  }

  function whoHTML() {
    const kids = F.activeProfiles(fam(), 'child');
    return K.header(t('kidsTitle')) + '<h2 class="sec">' + esc(t('whoPlays')) + '</h2>' +
      (kids.length ? '<div class="who-grid">' + kids.map(p => '<button class="who-card" data-act="pick" data-v="' + esc(p.id) + '"><span class="av" aria-hidden="true">' + esc(p.avatar) + '</span><span class="nm">' + esc(p.name) + '</span><span class="muted">⭐ ' + bal(p) + '</span></button>').join('') + '</div>'
        : '<div class="card"><p>' + esc(t('noChildren')) + '</p><a class="btn primary" href="parent.html">🔒 ' + esc(t('pdTitle')) + '</a></div>');
  }

  const GAMES = [
    { id: 'words', icon: '🖼️', n: 'gWords', d: 'gWordsD', cats: true },
    { id: 'quiz', icon: '🌍', n: 'gQuiz', d: 'gQuizD', cats: true },
    { id: 'sounds', icon: '🔊', n: 'gSounds', d: 'gSoundsD' },
    { id: 'math', icon: '➕', n: 'gMath', d: 'gMathD' },
    { id: 'flags', icon: '🚩', n: 'gFlags', d: 'gFlagsD' },
    { id: 'memory', icon: '🃏', n: 'gMemory', d: 'gMemoryD' }
  ];
  function homeHTML() {
    const p = me(), b = band(p), pair = pairOf(p);
    const c = pair && fam().learning[p.id] && fam().learning[p.id][KL.courseKey(pair.id)];
    const cur = c && c.current && KL.lessons(fam().custom).find(l => l.id === c.current);
    let h = top(t('kidsTitle')) + '<section class="kidhello"><span class="av" aria-hidden="true">' + esc(p.avatar) + '</span><div><h2>' + esc(t('kidsHi', { name: p.name })) + '</h2><p class="muted" style="margin:.2rem 0 0">' +
      esc(t('kidsBal', { n: bal(p) })) + ' · ' + esc(t('levelFor', { n: b, a: AGES[b] })) + (p.diff ? ' (' + esc(t('setByParent')) + ')' : '') + '</p></div>' +
      (cur ? '<button class="btn primary big" data-act="openLesson" data-v="' + esc(cur.id) + '">▶ ' + esc(t('resume', { l: L(cur.name) })) + '</button>' : '') + '</section>';
    h += '<h2 class="sec">🧠 ' + esc(t('gamesSec')) + '</h2><div class="grid small">' + GAMES.map(g => '<button class="tile" data-act="game" data-v="' + g.id + '"><span class="ic" aria-hidden="true">' + g.icon + '</span><span class="nm">' + esc(t(g.n)) + '</span><span class="ds">' + esc(t(g.d)) + '</span></button>').join('') + '</div>';
    h += '<h2 class="sec">🌍 ' + esc(t('langSec')) + '</h2><div class="grid small">' + KL.content().pairs.map(pr => '<button class="tile' + (pair && pair.id === pr.id ? ' on' : '') + '" data-act="pair" data-v="' + pr.id + '"><span class="ic" aria-hidden="true">' + flagOf(pr.to) + '</span><span class="nm">' + esc(t('pairs.' + pr.id)) + '</span>' + progressLine(p, pr) + '</button>').join('') + '</div>';
    h += '<h2 class="sec">🎁 ' + esc(t('shopSec')) + '</h2><div class="grid small"><button class="tile" data-act="go" data-v="shop"><span class="ic" aria-hidden="true">🎁</span><span class="nm">' + esc(t('shopTitle')) + '</span><span class="ds">' + esc(t('youHave', { n: bal(p) })) + '</span></button>' +
      '<a class="tile" href="keykids.html"><span class="ic" aria-hidden="true">⌨️</span><span class="nm">' + esc(t('typingSec')) + '</span><span class="ds">KeyKids</span></a></div>';
    return h;
  }
  const flagOf = l => ({ es: FGH.countries.flagSVG('es', 'tiny'), sv: FGH.countries.flagSVG('se', 'tiny'), th: FGH.countries.flagSVG('th', 'tiny'), en: FGH.countries.hasFlag('gb') ? FGH.countries.flagSVG('gb', 'tiny') : '🇬🇧' })[l];
  function progressLine(p, pair) {
    const all = KL.lessons(fam().custom).filter(l => KL.usable(l, pair).length);
    const c = (fam().learning[p.id] || {})[KL.courseKey(pair.id)];
    const d = c ? all.filter(l => c.lessons[l.id] && c.lessons[l.id].done).length : 0;
    return '<span class="ds">' + esc(t('lessonsDone', { d, n: all.length })) + '</span><span class="meter"><span style="width:' + Math.round(100 * d / Math.max(1, all.length)) + '%"></span></span>';
  }

  /* topic choice for word and quiz games */
  function setupHTML() {
    const g = GAMES.find(x => x.id === V.game);
    const cats = V.game === 'words'
      ? Object.keys(KK.VOCAB).filter(c => c !== 'countries').map(c => ({ id: c, icon: KK.VOCAB[c].icon, name: KK.T[K.ui()]['c_' + c] || KK.T.en['c_' + c] || c }))
      : Object.keys(FGH_CONTENT.knowledge.categories).filter(c => c !== 'sounds').map(c => ({ id: c, icon: FGH_CONTENT.knowledge.categories[c].icon, name: L(FGH_CONTENT.knowledge.categories[c].name) }));
    return top(t(g.n), 'home') + '<h2 class="sec">' + esc(t('chooseTopic')) + ' <span class="badge-sample">' + esc(t('sample')) + '</span></h2><div class="grid small">' +
      '<button class="tile" data-act="startGame" data-v="all"><span class="ic" aria-hidden="true">✨</span><span class="nm">' + esc(t('allTopics')) + '</span></button>' +
      cats.map(c => '<button class="tile" data-act="startGame" data-v="' + esc(c.id) + '"><span class="ic" aria-hidden="true">' + c.icon + '</span><span class="nm">' + esc(c.name) + '</span></button>').join('') + '</div>';
  }

  /* ---------- the runner: one question at a time ---------- */
  function startRound(kind, title, qs, meta) {
    R = Object.assign({ kind, title, qs, i: 0, right: 0, state: null, t0: Date.now(), key: LG.newId(), wordStats: {} }, meta || {});
    R.qs = qs.filter(Boolean);
    newQuestion(); V.screen = 'run'; render();
  }
  function newQuestion() { R.state = { answered: false, picked: null, ok: null, slots: [], matched: [], selL: null, mistakes: 0, heard: null }; R.qStart = Date.now(); }
  const Q = () => R.qs[R.i];
  function runHTML() {
    const q = Q(), st = R.state;
    let h = top(R.title, 'quitRound') + '<div class="row" style="margin:0 0 10px"><span class="muted">' + esc(t('question', { i: R.i + 1, n: R.qs.length })) + '</span><span class="grow"></span><span class="pill">✓ ' + R.right + '</span></div>' +
      '<div class="meter"><span style="width:' + Math.round(100 * R.i / R.qs.length) + '%"></span></div><div class="stage stack">';
    h += questionHTML(q, st);
    h += '<p class="fb ' + (st.ok === true ? 'ok' : st.ok === false ? 'no' : '') + '" aria-live="polite">' + (st.ok === true ? '✓ ' + esc(t('right')) : st.ok === false ? '✗ ' + esc(t('wrong')) + ' ' + esc(t('rightIs', { a: answerText(q) })) : '') + '</p>';
    if (st.answered) h += '<div class="row" style="justify-content:center"><button class="btn primary big" data-act="nextQ" id="nextQ">' + esc(R.i + 1 >= R.qs.length ? t('finish') : t('next')) + ' →</button></div>';
    return h + '</div>';
  }
  function answerText(q) {
    if (q.type === 'spell' || q.type === 'build' || q.type === 'complete') return KL.clean(q.answer);
    const o = (q.opts || []).find(o => String(o.v) === String(q.answer)); return o ? o.text : '';
  }
  const listenBtn = (text, lang, label) => '<button class="btn small" data-act="say" data-v="' + esc(lang + '|' + KL.clean(text)) + '">🔊 ' + esc(label || t('listen')) + '</button>';
  const isSpeaker = p => p === 'A' || p === 'B';
  function optBtns(q, st, withPic, withSub) {
    return '<div class="answers' + (withPic ? ' pics' : '') + '">' + q.opts.map(o => {
      let cls = '';
      if (st.answered) cls = String(o.v) === String(q.answer) ? 'good' : (String(o.v) === String(st.picked) ? 'bad' : 'dim');
      return '<button class="ans' + (withPic ? ' pic' : '') + ' ' + cls + '" data-act="pickAns" data-v="' + esc(o.v) + '"' + (st.answered ? ' disabled' : '') + '>' +
        (withPic && o.pic && !isSpeaker(o.pic) ? K.pic(o.pic, 'md') : '') + (withPic && !st.answered && R.kind !== 'lang' ? '' : '<span>' + esc(o.text) + (withSub && o.sub ? '<br><small class="muted">' + esc(o.sub) + '</small>' : '') + '</span>') + '</button>';
    }).join('') + '</div>';
  }
  function questionHTML(q, st) {
    const pic = q.pic && !isSpeaker(q.pic) ? '<div class="picbox">' + K.pic(q.pic, q.flag ? 'lg' : '') + '</div>' : '';
    switch (q.type) {
      case 'pickpic':
        return '<p class="big-q">' + esc(q.sound ? t('whichAnimal', { s: q.sound }) : t('tapPicture')) + '</p>' + (q.sound ? '' : '<p class="big-q" style="color:var(--accent)">' + esc(q.word) + '</p>') +
          '<div class="center">' + listenBtn(q.word, q.lang || K.ui()) + '</div>' + optBtns(q, st, true);
      case 'listen':
        return '<p class="big-q">' + esc(t('whichWord')) + '</p><div class="center">' + listenBtn(q.say, q.lang, t('again')) + '</div>' + optBtns(q, st, true);
      case 'pickword': case 'picture': case 'translate':
        return pic + (q.prompt ? '<p class="big-q">' + esc(q.prompt) + '</p>' : (q.math ? '<p class="big-q">' + esc(t('howMany')) + '</p>' : '')) +
          (q.prompt && !q.math && q.type === 'pickword' ? '<div class="center">' + listenBtn(q.prompt, K.ui()) + '</div>' : '') + optBtns(q, st, false, q.type === 'translate' && st.answered);
      case 'reply':
        return '<div class="dlg"><div class="line A"><span class="who">A</span><div class="bubble"><div class="tl">' + esc(q.line) + ' ' + listenBtn(q.say, q.lang, '') + '</div><div class="tr">' + esc(q.lineSub) + '</div></div></div></div><p class="big-q">' + esc(t('exReply')) + '</p>' + optBtns(q, st, false, st.answered);
      case 'question':
        return '<p class="big-q">' + esc(q.prompt) + '</p><p class="center muted">' + esc(q.promptSub) + '</p><div class="center">' + listenBtn(q.prompt, q.lang) + '</div>' + optBtns(q, st, false, true);
      case 'complete':
        return pic + '<p class="center muted">' + esc(q.prompt) + '</p><p class="big-q">' + esc(q.before) + ' <span style="border-bottom:4px solid var(--accent);padding:0 1.5em">' + (st.answered ? esc(q.answer) : '&nbsp;') + '</span> ' + esc(q.after) + '</p><p class="center muted">' + esc(t('fillGap')) + '</p>' + optBtns(q, st, false);
      case 'spell': case 'build': {
        const used = new Set(st.slots.map(s => s.k));
        return pic + (q.prompt ? '<p class="big-q">' + esc(q.prompt) + '</p>' : '') + '<p class="center muted">' + esc(q.type === 'spell' ? t('tapLetters') : t('tapWords')) + '</p>' + (q.say ? '<div class="center">' + listenBtn(q.say, q.lang) + '</div>' : '') +
          '<div class="slots" aria-live="polite">' + st.slots.map((s, i) => '<button class="ltile" data-act="unslot" data-v="' + i + '"' + (st.answered ? ' disabled' : '') + '>' + esc(s.g) + '</button>').join('') + '</div>' +
          '<div class="tiles-row">' + q.tiles.map(x => '<button class="ltile' + (used.has(x.k) ? ' used' : '') + '" data-act="slot" data-v="' + x.k + '"' + (used.has(x.k) || st.answered ? ' disabled' : '') + '>' + esc(x.g) + '</button>').join('') + '</div>' +
          (!st.answered ? '<div class="row" style="justify-content:center"><button class="btn" data-act="clearSlots">⌫</button><button class="btn primary" data-act="checkSlots"' + (st.slots.length ? '' : ' disabled') + '>✓ ' + esc(t('check')) + '</button></div>' : '');
      }
      case 'match': {
        const done = new Set(st.matched);
        const col = (list, side) => '<div class="stack" style="gap:8px">' + list.map(o => '<button class="ans' + (done.has(o.v) ? ' good' : (side === 'L' && st.selL === o.v ? ' bad' : '')) + '" data-act="match' + side + '" data-v="' + esc(o.v) + '"' + (done.has(o.v) ? ' disabled' : '') + '>' + (o.pic && side === 'L' ? K.pic(o.pic, 'sm') + ' ' : '') + esc(o.text) + '</button>').join('') + '</div>';
        return '<p class="big-q">' + esc(t('exMatch')) + '</p><div class="split">' + col(q.left, 'L') + col(q.right, 'R') + '</div>';
      }
      case 'speak': {
        const hs = st.heard;
        return pic + '<p class="big-q" style="color:var(--accent)">' + esc(KL.clean(q.say)) + '</p><p class="center muted">' + esc(q.prompt) + '</p><p class="center">' + esc(t('sayIt')) + '</p>' +
          '<div class="row" style="justify-content:center">' + listenBtn(q.say, q.lang) + (K.canListen ? '<button class="btn primary" data-act="mic">' + esc(t('pressMic')) + '</button>' : '') + '<button class="btn" data-act="saidIt">✓ ' + esc(t('saidIt')) + '</button></div>' +
          (hs ? '<p class="center">' + (hs.text ? esc(t('heard', { t: hs.text })) + '<br>' : '') + '<b>' + esc(hs.msg) + '</b></p>' : '') +
          '<p class="center muted" style="font-size:.85rem">' + esc(K.canListen ? t('speechHonest') : t('noMic')) + '</p>';
      }
    }
    return '';
  }
  function afterRun() {
    const q = Q(), st = R.state;
    if (!st.spoken && !st.answered) {
      st.spoken = true;
      const auto = q.type === 'listen' ? [q.say, q.lang] : q.type === 'pickpic' ? [q.word, q.lang || K.ui()] : q.type === 'speak' ? [q.say, q.lang] : (q.type === 'pickword' && band(me()) <= 2 && q.prompt && !q.math) ? [q.prompt, K.ui()] : null;
      if (auto) setTimeout(() => { if (R && Q() === q) K.speak(auto[0], auto[1], rate()); }, 250);
    }
    const n = $('nextQ'); if (n && st.ok) n.focus();
  }
  function answer(ok, picked) {
    const st = R.state, q = Q(); if (st.answered) return;
    st.answered = true; st.ok = ok; st.picked = picked;
    if (ok) { R.right++; K.sfx.right(); } else K.sfx.wrong();
    if (q.id && R.kind === 'lang') { const w = R.wordStats[q.id] || (R.wordStats[q.id] = { right: 0, wrong: 0 }); ok ? w.right++ : w.wrong++; }
    if (ok && q.say && R.kind === 'lang' && q.type !== 'listen' && q.type !== 'speak') setTimeout(() => K.speak(q.say, q.lang, rate()), 200);
    render();
  }
  function nextQ() {
    R.i++;
    if (R.i >= R.qs.length) return finishRound();
    newQuestion(); render();
  }
  function finishRound() {
    const p = me(); const total = R.qs.length, pct = Math.round(100 * R.right / Math.max(1, total)), ms = Date.now() - R.t0;
    let res;
    if (R.kind === 'lang') {
      const ck = KL.courseKey(R.pair.id);
      A.updateLearning(p.id, f => {
        const c = F.course(f, p.id, ck); c.words = c.words || {};
        for (const id in R.wordStats) { const w = c.words[id] || (c.words[id] = { right: 0, wrong: 0, last: 0 }); w.right += R.wordStats[id].right; w.wrong += R.wordStats[id].wrong; w.last = Date.now(); }
      });
      if (R.lesson.id !== 'review') A.recordLesson(p.id, ck, R.lesson.id, pct, ms, 60);
      res = A.finish(p.id, { key: 'kl:' + R.key, unit: R.lesson.id === 'review' ? null : ck + ':' + R.lesson.id, completed: pct >= 60, area: 'kidslang',
        kind: R.lesson.id === 'review' ? 'review' : 'kidslesson', title: '🌍 ' + t('pairs.' + R.pair.id) + ' · ' + L(R.lesson.name), ms, score: R.right, max: total, pct, correct: R.right });
    } else {
      res = A.finish(p.id, { key: 'kg:' + R.key, area: 'kids', kind: 'quiz', title: R.icon + ' ' + R.title, ms, score: R.right, max: total, pct, correct: R.right, d: band(p) });
    }
    R.result = { total, pct, award: res && res.ok ? res.award : { amount: 0 }, repeat: res && res.repeat };
    V.screen = 'result'; K.sfx.win(); render();
  }
  function resultHTML() {
    const r = R.result, a = r.award || {};
    return top(R.title, 'home') + '<section class="card center stack"><div class="emo pop" aria-hidden="true">' + (r.pct >= 80 ? '🏆' : r.pct >= 50 ? '⭐' : '💪') + '</div>' +
      '<h2>' + esc(R.kind === 'lang' ? t('lessonDone') : t('yourScore', { n: R.right, m: r.total })) + '</h2>' + (R.kind === 'lang' ? '<p>' + esc(t('lessonPct', { p: r.pct })) + '</p>' : '') +
      (a.amount ? '<p class="big-q" style="color:var(--good)">' + esc(t('earned', { n: a.amount })) + '</p>' : '') + (a.bonus ? '<p>🎯 ' + esc(t('bonus', { n: a.bonus })) + '</p>' : '') +
      (r.repeat ? '<p class="muted">' + esc(t('noPointsRepeat')) + '</p>' : '') + (a.capped ? '<p class="muted">' + esc(t('capped')) + '</p>' : '') +
      '<div class="row" style="justify-content:center"><button class="btn primary big" data-act="again">↻ ' + esc(t('again')) + '</button>' +
      (R.kind === 'lang' ? '<button class="btn big" data-act="go" data-v="lang">' + esc(t('langSec')) + '</button>' : '') + '<button class="btn big" data-act="go" data-v="home">🏠 ' + esc(t('home')) + '</button></div></section>';
  }

  /* ---------- kids language ---------- */
  function langHTML() {
    const p = me(), pair = pairOf(p);
    if (!pair) return top(t('langSec'), 'home') + '<h2 class="sec">' + esc(t('pickPair')) + '</h2><div class="grid small">' + KL.content().pairs.map(pr => '<button class="tile" data-act="pair" data-v="' + pr.id + '"><span class="ic">' + flagOf(pr.to) + '</span><span class="nm">' + esc(t('pairs.' + pr.id)) + '</span></button>').join('') + '</div>';
    const all = KL.lessons(fam().custom).filter(l => KL.usable(l, pair).length);
    const c = (fam().learning[p.id] || {})[KL.courseKey(pair.id)] || { lessons: {} };
    const rec = KL.recommendedLevel(band(p));
    const review = KL.reviewLesson(all, c.words, pair);
    let h = top(t('pairs.' + pair.id), 'home') + '<div class="row" style="margin:0 0 6px">' + KL.content().pairs.map(pr => '<button class="btn small' + (pr.id === pair.id ? ' on' : '') + '" data-act="pair" data-v="' + pr.id + '">' + esc(t('pairs.' + pr.id)) + '</button>').join('') + '</div>' +
      '<p class="muted"><span class="badge-sample">' + esc(t('sample')) + '</span> ' + esc(t('sampleNote')) + '</p>' +
      '<div class="row">' + VUI.speedHTML(p.id, true) + '<button class="btn small" data-act="go" data-v="voice">🗣️ ' + esc(t('voice.title')) + '</button></div>';
    const cur = c.current && all.find(l => l.id === c.current);
    h += '<div class="row">' + (cur ? '<button class="btn primary big" data-act="openLesson" data-v="' + esc(cur.id) + '">▶ ' + esc(t('resume', { l: L(cur.name) })) + '</button>' : '') +
      (review ? '<button class="btn big" data-act="openLesson" data-v="review">🔁 ' + esc(L(review.name)) + ' (' + review.items.length + ')</button>' : '') + '</div>';
    KL.content().levels.forEach(lv => {
      const ls = all.filter(l => l.level === lv.n); if (!ls.length) return;
      h += '<h2 class="sec">' + lv.icon + ' ' + esc(t('lvl', { n: lv.n })) + ' · ' + esc(L(lv.name)) + ' <span class="muted" style="font-size:.9rem">(' + esc(lv.ages) + ')</span>' + (lv.n === rec ? ' <span class="badge-sample" style="background:var(--sun)">' + esc(t('recommended')) + '</span>' : '') + '</h2><div class="grid small">' +
        ls.map(l => { const r = c.lessons[l.id]; return '<button class="tile' + (r && r.done ? ' done' : '') + (lv.n === rec && !(r && r.done) ? ' rec' : '') + '" data-act="openLesson" data-v="' + esc(l.id) + '"><span class="ic" aria-hidden="true">' + l.icon + '</span><span class="nm">' + esc(L(l.name)) + '</span><span class="ds">' + (r ? (r.done ? '✅ ' : '') + esc(t('pdBest')) + ' ' + r.best + ' %' : '') + '</span></button>'; }).join('') + '</div>';
    });
    return h;
  }
  function findLesson(id) {
    const p = me(), pair = pairOf(p), all = KL.lessons(fam().custom);
    if (id === 'review') { const c = (fam().learning[p.id] || {})[KL.courseKey(pair.id)] || {}; return KL.reviewLesson(all, c.words, pair); }
    return all.find(l => l.id === id);
  }
  function introHTML() {
    const p = me(), pair = pairOf(p), l = findLesson(V.lesson); if (!l) { V.screen = 'lang'; return langHTML(); }
    const items = KL.usable(l, pair), to = pair.to, from = pair.from;
    let h = top(L(l.name), 'go:lang') + '<p class="muted">' + esc(t('pairs.' + pair.id)) + ' · <span class="badge-sample">' + esc(t('sample')) + '</span></p>' + VUI.speedHTML(p.id, true);
    if (l.type === 'words') {
      h += '<h2 class="sec">' + esc(t('learnWords')) + '</h2><p class="muted">' + esc(t('tapToHear')) + '</p><div class="flash">' + items.map(it => '<button class="fcard" data-act="say" data-v="' + esc(to + '|' + KL.clean(it[to])) + '">' + K.pic(it.pic, 'md') + '<span class="tw">' + esc(KL.clean(it[to])) + '</span><span class="sw">' + esc(KL.clean(it[from])) + '</span></button>').join('') + '</div>';
    } else {
      h += '<div class="row"><button class="btn" data-act="playAll">▶ ' + esc(t(l.type === 'dialogue' ? 'acPlayAll' : 'exRead')) + '</button></div><div class="dlg card">' + items.map(it => {
        const who = isSpeaker(it.pic) ? it.pic : 'A';
        return '<div class="line ' + (l.type === 'dialogue' ? who : 'A') + '"><span class="who" aria-hidden="true">' + (isSpeaker(it.pic) ? it.pic : esc(it.pic)) + '</span><div class="bubble"><div class="tl">' + esc(KL.clean(it[to])) + ' <button class="ghost" data-act="say" data-v="' + esc(to + '|' + KL.clean(it[to])) + '" aria-label="' + esc(t('listen')) + '">🔊</button></div><div class="tr">' + esc(KL.clean(it[from])) + '</div></div></div>';
      }).join('') + '</div>';
    }
    const notes = items.filter(it => it.note).map(it => '<li><b>' + esc(KL.clean(it[to])) + '</b> – ' + esc(L(it.note)) + '</li>');
    if (notes.length) h += '<div class="notebox"><b>💡 ' + esc(t('noteLbl')) + '</b><ul style="margin:.3rem 0 0">' + notes.join('') + '</ul></div>';
    return h + '<div class="row"><button class="btn primary huge" data-act="startLesson">▶ ' + esc(t('practice')) + '</button></div>';
  }
  function startLesson() {
    const p = me(), pair = pairOf(p), l = findLesson(V.lesson);
    const qs = KL.exercises(l, pair, band(p), Math.random);
    if (l.id !== 'review') A.updateLearning(p.id, f => F.startLesson(f, p.id, KL.courseKey(pair.id), l.id));
    startRound('lang', L(l.name), qs, { lesson: l, pair, icon: l.icon });
  }
  let playing = 0;
  function playAll() {
    const p = me(), pair = pairOf(p), l = findLesson(V.lesson), items = KL.usable(l, pair);
    speak(items.map(it => KL.clean(it[pair.to])).join('\n'), pair.to);
  }
  /* ---------- voice settings for this child (the languages of the kids' courses) ---------- */
  function voiceHTML() {
    const p = me(), pair = pairOf(p);
    const langs = Array.from(new Set((pair ? [pair.to, pair.from] : []).concat(...KL.content().pairs.map(x => [x.to, x.from]))));
    return top(t('voice.title'), 'go:lang') + VUI.panelHTML(p.id, langs);
  }

  /* ---------- memory cards: picture ↔ word ---------- */
  function startMemory() {
    const p = me(), b = band(p), lang = K.ui();
    const nPairs = b === 1 ? 3 : b === 2 ? 6 : 8;
    const items = K.sample(KG.vocabItems('all').filter(it => !it.pic.startsWith('shape:') && Array.from(it.word[lang]).length <= 10), nPairs);
    const cards = K.shuffle([].concat(...items.map(it => [{ id: it.id, face: 'pic', it }, { id: it.id, face: 'word', it }])).map((c, i) => Object.assign(c, { n: i })));
    MEM = { cards, up: [], gone: [], turns: 0, t0: Date.now(), lang, key: LG.newId(), done: false, award: null };
    V.screen = 'memory'; render();
  }
  function memoryHTML() {
    const M = MEM, cols = M.cards.length <= 6 ? 3 : 4;
    let h = top(t('gMemory'), 'home') + '<p class="center">' + esc(t('memoryTurns', { n: M.turns })) + '</p><div class="memory" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' + M.cards.map(c => {
      const open = M.up.includes(c.n) || M.gone.includes(c.id);
      return '<button class="mcard' + (M.gone.includes(c.id) ? ' gone' : open ? ' up' : '') + '" data-act="flip" data-v="' + c.n + '"' + (M.gone.includes(c.id) ? ' disabled' : '') + ' aria-label="' + (open ? esc(c.it.word[M.lang]) : '?') + '">' + (open ? (c.face === 'pic' ? K.pic(c.it.pic, 'sm') : esc(c.it.word[M.lang])) : '?') + '</button>';
    }).join('') + '</div>';
    if (M.done) h += '<section class="card center" style="margin-top:14px"><h2>🎉 ' + esc(t('memoryDone', { n: M.turns })) + '</h2>' + (M.award && M.award.amount ? '<p class="big-q" style="color:var(--good)">' + esc(t('earned', { n: M.award.amount })) + '</p>' : '') +
      '<div class="row" style="justify-content:center"><button class="btn primary big" data-act="game" data-v="memory">↻ ' + esc(t('again')) + '</button><button class="btn big" data-act="go" data-v="home">🏠 ' + esc(t('home')) + '</button></div></section>';
    return h;
  }
  function flip(n) {
    const M = MEM; n = +n; if (M.done || M.up.length >= 2 || M.up.includes(n)) return;
    const c = M.cards[n]; M.up.push(n);
    if (c.face === 'word') K.speak(c.it.word[M.lang], M.lang, rate());
    if (M.up.length === 2) {
      M.turns++;
      const [a, b] = M.up.map(i => M.cards[i]);
      if (a.id === b.id) { M.gone.push(a.id); M.up = []; K.sfx.right(); if (M.gone.length * 2 === M.cards.length) memoryDone(); }
      else setTimeout(() => { M.up = []; if (V.screen === 'memory') render(); }, 1100);
    }
    render();
  }
  function memoryDone() {
    const M = MEM, p = me(); M.done = true; K.sfx.win();
    const pairs = M.cards.length / 2, extra = Math.max(0, M.turns - pairs);
    const res = A.finish(p.id, { key: 'km:' + M.key, area: 'kids', kind: 'quiz', title: '🃏 ' + t('gMemory'), ms: Date.now() - M.t0, score: pairs, max: pairs, pct: Math.round(100 * pairs / Math.max(pairs, M.turns)), correct: Math.max(1, pairs - Math.floor(extra / 2)), d: band(p) });
    M.award = res && res.ok ? res.award : null;
  }

  /* ---------- reward shop ---------- */
  function shopHTML() {
    const p = me(), f = fam(), st = f.ledger, list = LG.visibleRewards(st, p.id);
    const held = LG.held(st, p.id);
    let h = top(t('shopTitle'), 'home') + '<div class="row" style="margin:0 0 12px"><span class="pill sun">⭐ ' + esc(t('youHave', { n: bal(p) })) + '</span>' + (held ? '<span class="pill">⏳ ' + esc(t('reserved', { n: held })) + '</span>' : '') + '</div>';
    if (!list.length) h += '<div class="card"><p>' + esc(t('shopEmpty')) + '</p></div>';
    else h += '<div class="shop">' + list.map(r => {
      const why = LG.blockReason(st, r, p.id, Date.now());
      const leftAll = r.totalLimit != null ? r.totalLimit - LG.usedBy(st, r.id) : null;
      return '<div class="card reward">' + (r.image ? '<img class="rimg" src="' + esc(r.image) + '" alt="">' : '<span class="ric" aria-hidden="true">' + esc(r.icon) + '</span>') + '<span class="rn">' + esc(r.name) + '</span>' +
        (r.description ? '<span class="muted">' + esc(r.description) + '</span>' : '') + '<span class="rc">⭐ ' + esc(t('costs', { n: r.cost })) + '</span>' +
        '<span class="why">' + [leftAll != null ? t('left', { n: Math.max(0, leftAll) }) : '', r.endsOn ? t('untilDate', { d: K.fmtDate(Date.parse(r.endsOn + 'T12:00:00')) }) : '', r.startsOn && why === 'not_started' ? t('fromDate', { d: K.fmtDate(Date.parse(r.startsOn + 'T12:00:00')) }) : ''].filter(Boolean).map(esc).join(' · ') + '</span>' +
        (why ? '<span class="why">🔒 ' + esc(why === 'not_enough' ? t('needMore', { n: r.cost - avail(p) }) : t('why_' + why)) + '</span>' : '') +
        '<button class="btn ' + (why ? '' : 'primary') + '" data-act="redeem" data-v="' + esc(r.id) + '"' + (why ? ' disabled' : '') + '>🎁 ' + esc(t('redeem')) + '</button></div>';
    }).join('') + '</div>';
    const mine = st.redemptions.filter(r => r.profileId === p.id).slice(-12).reverse();
    if (mine.length) h += '<h2 class="sec">' + esc(t('myRequests')) + '</h2><div class="card"><ul class="plain">' + mine.map(r => '<li><span aria-hidden="true">' + esc(r.rewardIcon || '🎁') + '</span><b>' + esc(r.rewardName) + '</b> · ⭐ ' + r.cost + ' <span class="status ' + r.status + '">' + esc(t('st_' + r.status)) + '</span>' +
      (r.note ? ' <span class="muted">' + esc(r.note) + '</span>' : '') + (r.status === 'pending' ? ' <button class="btn small" data-act="cancelReq" data-v="' + esc(r.id) + '">' + esc(t('cancelReq')) + '</button>' : '') + '</li>').join('') + '</ul></div>';
    const tx = LG.txOf(st, p.id).slice(-15).reverse();
    if (tx.length) h += '<h2 class="sec">' + esc(t('history')) + '</h2><div class="card tablewrap"><table><tbody>' + tx.map(x => '<tr><td>' + esc(K.fmtDate(x.ts, true)) + '</td><td>' + esc(x.note || t('pdTx.' + x.kind)) + '</td><td class="num ' + (x.amount >= 0 ? 'pos' : 'neg') + '">' + (x.amount > 0 ? '+' : '') + x.amount + '</td><td class="num">' + x.balanceAfter + '</td></tr>').join('') + '</tbody></table></div>';
    return h;
  }
  function overlay(html) {
    let ov = $('ov'); if (!ov) { ov = document.createElement('div'); ov.id = 'ov'; ov.className = 'overlay'; document.body.appendChild(ov); }
    ov.innerHTML = '<div class="card stack" role="dialog" aria-modal="true">' + html + '</div>'; ov.hidden = false;
    const b = ov.querySelector('button'); if (b) b.focus();
  }
  const closeOv = () => { const ov = $('ov'); if (ov) { ov.hidden = true; ov.innerHTML = ''; } };

  /* ---------- actions ---------- */
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    who() { V.pid = null; sessionStorage.removeItem('fgh.kid'); V.screen = 'who'; render(); },
    pick(v) { V.pid = v; sessionStorage.setItem('fgh.kid', v); V.screen = location.hash === '#shop' ? 'shop' : location.hash === '#lang' ? 'lang' : 'home'; render(); },
    go(v) { if (v === 'lang' && !pairOf(me())) { V.screen = 'lang'; } V.screen = v; R = null; render(); },
    home() { V.screen = 'home'; R = null; render(); },
    'go:lang'() { V.screen = 'lang'; render(); },
    quitRound() { R = null; V.screen = 'home'; render(); },
    game(v) {
      V.game = v;
      if (v === 'memory') return startMemory();
      const g = GAMES.find(x => x.id === v);
      if (g.cats) { V.screen = 'setup'; return render(); }
      ACT.startGame('all');
    },
    startGame(cat) {
      const g = GAMES.find(x => x.id === V.game), p = me();
      startRound('game', t(g.n), KG.makeRound(V.game, K.ui(), band(p), cat, Math.random), { icon: g.icon, cat });
    },
    again() { if (R.kind === 'lang') startLesson(); else ACT.startGame(R.cat || 'all'); },
    pair(v) { const p = me(); A.updateLearning(p.id, f => { (f.learning[p.id] || (f.learning[p.id] = {})).kidsPair = v; }); V.screen = 'lang'; render(); },
    openLesson(v) { V.lesson = v; const p = me(); if (!pairOf(p)) { V.screen = 'lang'; return render(); } V.screen = 'intro'; render(); },
    startLesson() { startLesson(); },
    playAll() { playAll(); },
    say(v) { const i = v.indexOf('|'); speak(v.slice(i + 1), v.slice(0, i)); },
    pickAns(v) { const q = Q(); answer(KG.isRight(q, v) || (R.kind === 'lang' && KL.check(q, v)), v); },
    slot(v) { const q = Q(), x = q.tiles.find(x => x.k === +v); if (x && !R.state.slots.some(s => s.k === x.k)) { R.state.slots.push(x); if (R.state.slots.length === q.tiles.length) return ACT.checkSlots(); render(); } },
    unslot(v) { R.state.slots.splice(+v, 1); render(); },
    clearSlots() { R.state.slots = []; render(); },
    checkSlots() {
      const q = Q(), txt = R.state.slots.map(s => s.g).join(q.sep || '');
      const ok = KL.clean(txt) === KL.clean(q.answer);
      if (!ok && R.state.mistakes < 1 && q.type === 'spell') { R.state.mistakes++; R.state.slots = []; K.sfx.wrong(); K.toast(t('retry')); return render(); }
      answer(ok, txt);
    },
    matchL(v) { R.state.selL = v; render(); },
    matchR(v) {
      const st = R.state; if (!st.selL) return;
      if (st.selL === v) { st.matched.push(v); K.sfx.right(); const q = Q(); const it = q.right.find(o => o.v === v); if (it) K.speak(it.text, q.lang, rate()); }
      else { st.mistakes++; K.sfx.wrong(); }
      st.selL = null;
      if (st.matched.length === Q().left.length) { st.answered = true; st.ok = st.mistakes <= 2; if (st.ok) R.right++; }
      render();
    },
    async mic() {
      if (busy) return; busy = true;
      const q = Q(); const r = await K.listen(q.lang); busy = false;
      if (r.error) { R.state.heard = { text: '', msg: r.error === 'denied' ? t('micDenied') : r.error === 'no_support' ? t('noMic') : t('heardNo') }; return render(); }
      const v = K.compareSpeech(r.alts || [r.text], q.say);
      R.state.heard = { text: r.text, msg: v === 'good' ? t('heardGood') : v === 'close' ? t('heardClose') : t('heardNo') };
      if (v === 'good') answer(true, 'spoken'); else render();
    },
    saidIt() { answer(true, 'said'); },
    nextQ() { nextQ(); },
    flip(v) { flip(v); },
    redeem(v) {
      const p = me(), r = fam().ledger.rewards.find(x => x.id === v); if (!r) return;
      overlay('<div class="ric" style="font-size:3rem">' + esc(r.icon) + '</div><h2>' + esc(t('redeemAsk', { n: r.cost, r: r.name })) + '</h2><div class="row" style="justify-content:center"><button class="btn primary big" data-act="redeemYes" data-v="' + esc(r.id) + '">✓ ' + esc(t('yes')) + '</button><button class="btn big" data-act="closeOv">' + esc(t('no')) + '</button></div>');
    },
    async redeemYes(v) {
      if (busy) return; busy = true;
      const p = me(); closeOv();
      const res = await A.request(p.id, v).catch(e => ({ ok: false, error: e.code || 'error' })); busy = false;
      if (res.ok) { const red = res.redemption; K.sfx.win(); K.toast(red && red.status === 'approved' ? '🎉 ' + t('approvedNow') : '📨 ' + t('requested')); }
      else K.toast('⚠️ ' + t('why_' + res.error));
      render();
    },
    async cancelReq(v) { const p = me(); await A.cancel(p.id, v); render(); },
    closeOv() { closeOv(); }
  };
  Object.assign(ACT, VUI.acts(() => V.pid, render));
  K.bindActs(ACT);
  if (VO.onVoices) VO.onVoices(() => { if (V.screen === 'voice') render(); });
  store.onChange(() => { if (V.screen === 'shop' || V.screen === 'home') render(); });
  if (V.pid && location.hash) { const h = location.hash.slice(1); if (h === 'shop' || h === 'lang') V.screen = h; }
  if (FGH.cloud) FGH.cloud.start().then(() => render()).catch(() => {});
  render();
  window.__kids = { state: () => ({ V, R, MEM }) };
})();
