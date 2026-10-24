/* Family Game Hub screens: home, players, match setup, pass-the-iPad turns with a timer, results and history.
   Game-specific drawing comes from the registered game (questionHTML); everything else is shared. */
(function () {
  'use strict';
  const FGH = window.FGH, core = FGH.core;
  const STORE = 'fgh.v1';
  const LANGS = ['th', 'sv', 'en'];
  const NATIVE = { th: 'ไทย', sv: 'Svenska', en: 'English' };
  const LOCALE = { th: 'th-TH', sv: 'sv-SE', en: 'en-GB' };
  const AVATARS = ['🦊', '🐼', '🐯', '🦄', '🐵', '🐧', '🐨', '🦖', '🐙', '🦁', '🐸', '🐳', '👩', '👨', '👧', '👦', '👵', '👴'];
  const COLORS = ['#E5484D', '#F76B15', '#E2A400', '#30A46C', '#0090FF', '#8E4EC6', '#D6409F', '#12A594'];
  const ROUNDS = [3, 5, 8, 10];
  const TIMERS = [0, 10, 15, 20, 30];
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- state ---------- */
  function navLang() { const l = (navigator.language || 'en').slice(0, 2); return LANGS.includes(l) ? l : 'en'; }
  let saveOk = true;
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) { saveOk = false; }
    const s = core.loadState(raw);
    if (!s.ui) s.ui = navLang();
    return s;
  }
  const S = load();
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(S)); saveOk = true; } catch (e) { saveOk = false; }
    const w = $('warn'); if (w) w.outerHTML = warnHTML();
    return saveOk;
  }
  function t(key, vars) {
    let s = (FGH.T[S.ui] && FGH.T[S.ui][key]) ?? FGH.T.en[key] ?? key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  const L = obj => (obj && (obj[S.ui] || obj.en)) || '';

  let screen = 'home';
  let ED = null;        // player editor draft
  let SET = null;       // match setup draft
  let confirmKey = null;
  let lastEntry = null; // the match that just finished
  let paused = false, turnStart = 0, tick = 0, wakeLock = null;

  /* ---------- sound (Web Audio, unlocked by the first tap as iPad Safari requires) ---------- */
  let ac = null;
  function audio() {
    if (ac === false) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = false; return null; } }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function tone(f, dur, when, type, vol) {
    if (!S.sound) return; const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (when || 0);
    o.type = type || 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const sfx = {
    tap: () => tone(1200, 0.04, 0, 'square', 0.03),
    right: () => { tone(659, 0.12); tone(988, 0.18, 0.08); },
    wrong: () => { tone(330, 0.16, 0, 'sine', 0.08); tone(262, 0.22, 0.1, 'sine', 0.07); },
    tick: () => tone(1500, 0.03, 0, 'square', 0.025),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, i * 0.11))
  };

  /* keep the iPad screen on during a match where Safari allows it */
  async function keepAwake(on) {
    try {
      if (on && !wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }

  /* ---------- small pieces ---------- */
  const warnHTML = () => saveOk ? '<div id="warn" hidden></div>' : '<div id="warn" class="warn" role="alert">⚠️ ' + esc(t('saveFailed')) + '</div>';
  const chip = p => '<span class="pchip" style="--pc:' + esc(p.color) + '"><span aria-hidden="true">' + esc(p.avatar) + '</span>' + esc(p.name) + '</span>';
  const fmtDate = iso => { try { return new Date(iso).toLocaleString(LOCALE[S.ui], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } };
  const secs = ms => (ms / 1000).toFixed(1) + ' s';
  function langSeg() {
    return '<div class="seg" role="group" aria-label="' + esc(t('menuLang')) + '">' + LANGS.map(l => '<button data-act="ui" data-v="' + l + '" class="' + (S.ui === l ? 'on' : '') + '" aria-pressed="' + (S.ui === l) + '">' + NATIVE[l] + '</button>').join('') + '</div>';
  }
  function topHTML(title, backTo) {
    return '<header class="top">' + (backTo ? '<button class="btn small" data-act="go" data-v="' + backTo + '">← ' + esc(t('back')) + '</button>' : '<span class="brand"><span class="logo" aria-hidden="true">🎲</span>Family Game Hub</span>') +
      (title ? '<h1 class="ttl">' + esc(title) + '</h1>' : '') + '<span class="grow"></span>' + langSeg() +
      '<button class="btn small" data-act="sound" aria-pressed="' + S.sound + '">' + (S.sound ? '🔊' : '🔇') + ' ' + esc(t('sound')) + '</button></header>' + warnHTML();
  }
  function confirmHTML(key, text, yes) {
    if (confirmKey !== key) return '';
    return '<div class="confirm" role="alertdialog"><p>' + esc(text) + '</p><div class="row"><button class="btn danger" data-act="yes-' + key + '">' + esc(yes) + '</button><button class="btn" data-act="noConfirm">' + esc(t('cancel')) + '</button></div></div>';
  }

  /* ---------- render ---------- */
  function render() {
    document.documentElement.lang = S.ui;
    const app = $('app');
    stopTick();
    if (screen === 'home') app.innerHTML = homeHTML();
    else if (screen === 'players') app.innerHTML = playersHTML();
    else if (screen === 'edit') app.innerHTML = editHTML();
    else if (screen === 'setup') app.innerHTML = setupHTML();
    else if (screen === 'match') { app.innerHTML = matchHTML(); startTickIfNeeded(); }
    else if (screen === 'results') app.innerHTML = resultsHTML();
    else if (screen === 'history') app.innerHTML = historyHTML();
    keepAwake(screen === 'match');
  }

  function homeHTML() {
    let h = topHTML() + '<p class="tagline">' + esc(t('tagline')) + '</p>';
    const m = S.current;
    if (m) {
      const g = core.getGame(m.gameId);
      h += '<section class="card resume"><div><h2>⏸ ' + esc(t('resume')) + '</h2><p>' + esc(t('resumeInfo', { game: L(g.name), t: Math.min(m.t + 1, m.turns.length), n: m.turns.length })) + '</p><p>' + m.players.map(chip).join(' ') + '</p></div>' +
        '<div class="row"><button class="btn primary big" data-act="resume">▶ ' + esc(t('cont')) + '</button><button class="btn" data-act="askConfirm" data-v="quit">' + esc(t('quit')) + '</button></div>' + confirmHTML('quit', t('quitConfirm'), t('yesQuit')) + '</section>';
    }
    h += '<h2 class="sec">' + esc(t('games')) + '</h2><div class="games">' +
      core.listGames().map(g => '<button class="card game" data-act="setup" data-v="' + g.id + '"><span class="gicon" aria-hidden="true">' + g.icon + '</span><span class="gname">' + esc(L(g.name)) + '</span><span class="gdesc">' + esc(L(g.desc)) + '</span><span class="btn primary">▶ ' + esc(t('play')) + '</span></button>').join('') +
      '<a class="card game" href="keykids.html"><span class="gicon" aria-hidden="true">⌨️</span><span class="gname">' + esc(t('keykidsName')) + '</span><span class="gdesc">' + esc(t('keykidsDesc')) + '</span><span class="btn">' + esc(t('open')) + ' →</span></a>' +
      '<a class="card game" href="online.html"><span class="gicon" aria-hidden="true">🌐</span><span class="gname">' + esc(t('onlineName')) + '</span><span class="gdesc">' + esc(t('onlineDesc')) + '</span><span class="btn">' + esc(t('open')) + ' →</span></a></div>';
    h += '<h2 class="sec">' + esc(t('players')) + '</h2><div class="card"><p class="chips">' + (S.players.length ? S.players.map(chip).join(' ') : esc(t('noPlayers'))) + '</p>' +
      '<div class="row"><button class="btn" data-act="go" data-v="players">👥 ' + esc(t('players')) + '</button><button class="btn" data-act="newPlayer">＋ ' + esc(t('addPlayer')) + '</button></div></div>';
    h += '<h2 class="sec">' + esc(t('history')) + '</h2><div class="card">' + (S.history.length ? historyList(S.history.slice(0, 3)) : '<p class="muted">' + esc(t('noHistory')) + '</p>') +
      '<div class="row"><button class="btn" data-act="go" data-v="history">📜 ' + esc(t('history')) + '</button></div></div>';
    return h;
  }

  /* ---------- players ---------- */
  function playersHTML() {
    const g = core.listGames()[0];
    let h = topHTML(t('players'), 'home') + '<div class="row" style="margin-bottom:16px"><button class="btn primary" data-act="newPlayer">＋ ' + esc(t('addPlayer')) + '</button>' +
      (kkProfiles().length ? '<button class="btn" data-act="importKK">⌨️ ' + esc(t('importKK')) + '</button>' : '') + '</div>';
    if (!S.players.length) return h + '<p class="muted">' + esc(t('noPlayers')) + '</p>';
    h += '<div class="pgrid">' + S.players.map(p => {
      const st = core.playerStats(S, p.id);
      return '<button class="card pcard" data-act="editPlayer" data-v="' + p.id + '" style="--pc:' + esc(p.color) + '"><span class="pav" aria-hidden="true">' + esc(p.avatar) + '</span><span class="pname">' + esc(p.name) + '</span>' +
        '<span class="muted">' + esc(t('level')) + ' ' + p.level + (g && g.levelNames ? ' · ' + esc(L(g.levelNames)[p.level - 1] || '') : '') + '</span>' +
        '<span class="muted">' + esc(t('statGames')) + ' ' + st.games + ' · ' + esc(t('statWins')) + ' ' + st.wins + ' · ' + esc(t('statBest')) + ' ' + st.best + '</span></button>';
    }).join('') + '</div>';
    return h;
  }
  function openEditor(p, returnToSetup) {
    ED = p ? { id: p.id, name: p.name, avatar: p.avatar, color: p.color, level: p.level, err: false }
      : { id: null, name: '', avatar: AVATARS[S.players.length % AVATARS.length], color: COLORS[S.players.length % COLORS.length], level: 1, err: false, returnToSetup: !!returnToSetup };
    confirmKey = null; screen = 'edit'; render();
    if (!p) { const n = $('pname'); if (n) n.focus(); }
  }
  function editHTML() {
    const g = core.listGames()[0];
    const p = ED.id && S.players.find(x => x.id === ED.id);
    const back = ED.returnToSetup ? 'setup' : 'players';
    return topHTML(ED.id ? t('editPlayer') : t('addPlayer'), back) + '<div class="card form">' +
      '<label for="pname">' + esc(t('name')) + '</label><input id="pname" type="text" maxlength="20" autocomplete="off" autocapitalize="words" value="' + esc(ED.name) + '">' +
      (ED.err ? '<p class="warn">' + esc(t('nameMissing')) + '</p>' : '') +
      '<label>' + esc(t('avatar')) + '</label><div class="choices">' + AVATARS.map(a => '<button class="btn av ' + (ED.avatar === a ? 'on' : '') + '" data-act="edAvatar" data-v="' + a + '" aria-pressed="' + (ED.avatar === a) + '">' + a + '</button>').join('') + '</div>' +
      '<label>' + esc(t('color')) + '</label><div class="choices">' + COLORS.map(c => '<button class="swatch ' + (ED.color === c ? 'on' : '') + '" style="background:' + c + '" data-act="edColor" data-v="' + c + '" aria-label="' + c + '" aria-pressed="' + (ED.color === c) + '"></button>').join('') + '</div>' +
      '<label>' + esc(t('level')) + '</label><div class="choices">' + [1, 2, 3].map(l => '<button class="btn ' + (ED.level === l ? 'on' : '') + '" data-act="edLevel" data-v="' + l + '" aria-pressed="' + (ED.level === l) + '">' + l + (g && g.levelNames ? ' · ' + esc(L(g.levelNames)[l - 1]) : '') + '</button>').join('') + '</div>' +
      '<div class="row"><button class="btn primary big" data-act="savePlayer">' + esc(t('save')) + '</button><button class="btn" data-act="go" data-v="' + back + '">' + esc(t('cancel')) + '</button>' +
      (p ? '<button class="btn danger" data-act="askConfirm" data-v="delPlayer">🗑 ' + esc(t('del')) + '</button>' : '') + '</div>' +
      (p ? confirmHTML('delPlayer', t('delConfirm', { name: p.name }), t('yesDel')) : '') + '</div>';
  }
  /* KeyKids profiles live under the same site, so the family can reuse them as players */
  function kkProfiles() {
    try {
      const o = JSON.parse(localStorage.getItem('keykids.v1') || 'null');
      const list = o && o.v === 2 ? o.profiles : o && o.name ? [o] : [];
      return list.filter(p => p && p.name && !S.players.some(x => x.name === core.cleanName(p.name)));
    } catch (e) { return []; }
  }

  /* ---------- setup ---------- */
  function openSetup(gameId, from) {
    const last = S.last[gameId] || {};
    const ids = (from || last.playerIds || []).filter(id => S.players.some(p => p.id === id));
    SET = { gameId, order: ids, rounds: last.rounds || 5, timer: last.timer ?? 15, nameLang: last.nameLang || S.ui, err: false, levels: {} };
    ids.forEach(id => { SET.levels[id] = (last.levels && last.levels[id]) || S.players.find(p => p.id === id).level || 1; });
    screen = 'setup'; render();
  }
  function setupHTML() {
    const g = core.getGame(SET.gameId);
    let h = topHTML(g.icon + ' ' + L(g.name), 'home');
    if (!S.players.length) return h + '<div class="card"><p>' + esc(t('noPlayers')) + '</p><button class="btn primary" data-act="newPlayer">＋ ' + esc(t('addPlayer')) + '</button></div>';
    h += '<div class="card form"><label>' + esc(t('choosePlayers')) + '</label><div class="choices">' +
      S.players.map(p => { const i = SET.order.indexOf(p.id); return '<button class="btn pick ' + (i >= 0 ? 'on' : '') + '" style="--pc:' + esc(p.color) + '" data-act="togglePlayer" data-v="' + p.id + '" aria-pressed="' + (i >= 0) + '">' + (i >= 0 ? '<span class="ord">' + (i + 1) + '</span>' : '') + esc(p.avatar) + ' ' + esc(p.name) + '</button>'; }).join('') +
      '<button class="btn" data-act="newPlayer">＋</button></div>';
    if (SET.order.length) {
      h += '<label>' + esc(t('order')) + ' · ' + esc(t('level')) + '</label><p class="muted">' + esc(t('levelHelp')) + '</p><ol class="order">' + SET.order.map(id => {
        const p = S.players.find(x => x.id === id);
        return '<li>' + chip(p) + '<span class="choices">' + Array.from({ length: g.levels }, (_, i) => i + 1).map(l => '<button class="btn small ' + (SET.levels[id] === l ? 'on' : '') + '" data-act="setLevel" data-v="' + id + ':' + l + '" aria-pressed="' + (SET.levels[id] === l) + '">' + (g.levelNames ? esc(L(g.levelNames)[l - 1]) : l) + '</button>').join('') + '</span></li>';
      }).join('') + '</ol>' + (SET.order.length > 1 ? '<button class="btn small" data-act="shuffleOrder">🔀 ' + esc(t('shuffle')) + '</button>' : '');
    }
    h += '<label>' + esc(t('rounds')) + '</label><div class="choices">' + ROUNDS.map(r => '<button class="btn ' + (SET.rounds === r ? 'on' : '') + '" data-act="setRounds" data-v="' + r + '" aria-pressed="' + (SET.rounds === r) + '">' + r + '</button>').join('') + '<span class="muted">' + esc(t('roundsHelp', { n: SET.rounds })) + '</span></div>' +
      '<label>' + esc(t('timer')) + '</label><div class="choices">' + TIMERS.map(s => '<button class="btn ' + (SET.timer === s ? 'on' : '') + '" data-act="setTimer" data-v="' + s + '" aria-pressed="' + (SET.timer === s) + '">' + esc(s ? t('sec', { n: s }) : t('noTimer')) + '</button>').join('') + '</div>' +
      '<label>' + esc(t('nameLang')) + '</label><div class="choices">' + LANGS.map(l => '<button class="btn ' + (SET.nameLang === l ? 'on' : '') + '" data-act="setNameLang" data-v="' + l + '" aria-pressed="' + (SET.nameLang === l) + '">' + NATIVE[l] + '</button>').join('') + '</div>' +
      (SET.err ? '<p class="warn">' + esc(t('needPlayer')) + '</p>' : '') +
      '<div class="row"><button class="btn primary big" data-act="startMatch">▶ ' + esc(t('start')) + '</button></div></div>';
    return h;
  }

  /* ---------- match ---------- */
  function startMatch() {
    if (!SET.order.length) { SET.err = true; render(); return; }
    const m = core.createMatch(S, { gameId: SET.gameId, playerIds: SET.order, levels: SET.levels, rounds: SET.rounds, timer: SET.timer, options: { nameLang: SET.nameLang } });
    S.last[SET.gameId] = { playerIds: SET.order.slice(), levels: Object.assign({}, SET.levels), rounds: SET.rounds, timer: SET.timer, nameLang: SET.nameLang };
    S.current = m; paused = false; save();
    screen = 'match'; render();
  }
  const M = () => S.current;
  const turnPlayer = m => m.players[core.currentTurn(m).p];
  function standingsMini(m) {
    return '<ol class="mini">' + core.standings(m).map(r => '<li>' + chip(r) + '<b>' + r.score + '</b></li>').join('') + '</ol>';
  }
  function matchHTML() {
    const m = M(); if (!m) return homeHTML();
    const g = core.getGame(m.gameId), turn = core.currentTurn(m), p = turnPlayer(m);
    const round = t('roundOf', { r: turn.r + 1, n: m.rounds });
    if (m.phase === 'pass') {
      return '<div class="pass" style="--pc:' + esc(p.color) + '"><div class="passbar"><span>' + g.icon + ' ' + esc(L(g.name)) + ' · ' + esc(round) + '</span><button class="btn small" data-act="askConfirm" data-v="quit">' + esc(t('quit')) + '</button></div>' +
        confirmHTML('quit', t('quitConfirm'), t('yesQuit')) + warnHTML() +
        '<p class="passlbl">' + esc(t('passTo')) + '</p><div class="passav" aria-hidden="true">' + esc(p.avatar) + '</div><h1 class="passname">' + esc(p.name) + '</h1>' +
        '<button class="btn primary huge" data-act="ready">' + esc(t('ready')) + ' ▶</button>' + (m.players.length > 1 ? standingsMini(m) : '') + '</div>';
    }
    const view = { lang: m.options.nameLang || S.ui, esc, t, answer: turn.answer, locked: paused };
    let fb = '';
    if (turn.answer) {
      const a = turn.answer, name = g.answerText(turn.q, view.lang), extra = g.answerExtra ? g.answerExtra(turn.q, view.lang) : '';
      const bonus = a.correct && m.timer ? a.points - 10 : 0;
      fb = '<div class="feedback ' + (a.correct ? 'ok' : 'no') + '" role="status"><p class="fbmain">' + (a.correct ? '✅ ' + esc(t('correct')) : a.timedOut ? '⏰ ' + esc(t('timeUp', { c: name })) : '❌ ' + esc(t('wrong', { c: name }))) + '</p>' +
        '<p>' + esc(t('pts', { n: a.points })) + (bonus > 0 ? ' · ' + esc(t('speedBonus', { n: bonus })) : '') + (extra ? ' · ' + esc(t('capital', { c: extra })) : '') + '</p>' +
        '<button class="btn primary huge" data-act="next">' + esc(m.t + 1 >= m.turns.length ? t('seeResults') : t('nextPlayer')) + ' ▶</button></div>';
    }
    return '<div class="turn"><div class="turnbar" style="--pc:' + esc(p.color) + '">' + chip(p) + '<span class="muted">' + esc(round) + '</span><span class="grow"></span>' +
      (m.timer && !turn.answer ? '<span class="clock" id="clock">' + m.timer + '</span>' : '') +
      (!turn.answer ? '<button class="btn small" data-act="pause">⏸ ' + esc(t('pause')) + '</button>' : '') + '</div>' +
      (m.timer && !turn.answer ? '<div class="tbar"><span id="tbar"></span></div>' : '') + warnHTML() +
      '<div class="stage">' + g.questionHTML(turn.q, view) + fb + (!turn.answer ? '<p class="muted hint">' + esc(t('keysHint')) + '</p>' : '') + '</div>' +
      (paused ? '<div class="overlay"><div class="card"><h2>⏸ ' + esc(t('paused')) + '</h2><p>' + esc(t('pausedHelp')) + '</p><div class="row"><button class="btn primary big" data-act="unpause">▶ ' + esc(t('cont')) + '</button><button class="btn" data-act="askConfirm" data-v="quit">' + esc(t('quit')) + '</button></div>' + confirmHTML('quit', t('quitConfirm'), t('yesQuit')) + '</div></div>' : '') +
      '</div>';
  }
  function beginTurn() {
    const m = M(); m.phase = 'turn'; m.elapsedMs = 0; paused = false; save();
    render();
  }
  function startTickIfNeeded() {
    const m = M(); if (!m || m.phase !== 'turn' || paused) return;
    turnStart = performance.now() - (m.elapsedMs || 0);
    let lastSec = null;
    const step = () => {
      const el = performance.now() - turnStart;
      m.elapsedMs = el;
      if (m.timer) {
        const left = Math.max(0, m.timer * 1000 - el), sec = Math.ceil(left / 1000);
        const c = $('clock'), b = $('tbar');
        if (c) { c.textContent = sec; c.classList.toggle('low', sec <= 5); }
        if (b) b.style.width = (100 * left / (m.timer * 1000)) + '%';
        if (sec !== lastSec && sec <= 5 && sec > 0) sfx.tick();
        lastSec = sec;
        if (left <= 0) { stopTick(); answer(null); }
      }
    };
    step();
    tick = setInterval(step, 100);
  }
  function stopTick() { clearInterval(tick); tick = 0; }
  function answer(value) {
    const m = M(); if (!m || m.phase !== 'turn' || paused) return;
    stopTick();
    const ms = value == null ? m.timer * 1000 : performance.now() - turnStart;
    const a = core.answerTurn(m, value, ms);
    a.correct ? sfx.right() : sfx.wrong();
    save(); render();
  }
  function next() {
    const m = M(); if (!m) return;
    const phase = core.nextTurn(m);
    if (phase === 'done') {
      lastEntry = core.finishMatch(S, m);
      save(); sfx.win();
      screen = 'results'; render();
    } else { save(); render(); }
  }
  function pause() {
    const m = M(); if (!m || m.phase !== 'turn' || paused) return;
    stopTick(); m.elapsedMs = performance.now() - turnStart; paused = true; save(); render();
  }

  /* ---------- results & history ---------- */
  function resultsHTML() {
    const e = lastEntry, g = core.getGame(e.gameId);
    const winners = e.players.filter(p => p.rank === 1);
    const head = e.players.length === 1 ? t('practice', { n: e.players[0].score }) : winners.length > 1 ? t('tie') : t('wins', { name: winners[0].name });
    const podium = e.players.filter(p => p.rank <= 3);
    return topHTML(g.icon + ' ' + L(g.name)) + '<div class="card results"><h1 class="win">🏆 ' + esc(head) + '</h1>' +
      (e.players.length > 1 ? '<div class="podium">' + podium.map(p => '<div class="step r' + p.rank + '" style="--pc:' + esc(p.color) + '"><span class="pav">' + esc(p.avatar) + '</span><b>' + esc(p.name) + '</b><span class="pts">' + p.score + '</span><span class="place">' + ['🥇', '🥈', '🥉'][p.rank - 1] + '</span></div>').join('') + '</div>' : '') +
      '<div class="tablewrap"><table><thead><tr><th>' + esc(t('place')) + '</th><th></th><th>' + esc(t('score')) + '</th><th>' + esc(t('correctN')) + '</th><th>' + esc(t('avgTime')) + '</th></tr></thead><tbody>' +
      e.players.map(p => '<tr><td>' + p.rank + '</td><td>' + chip(p) + '</td><td><b>' + p.score + '</b></td><td>' + p.correct + '/' + p.answered + '</td><td>' + (p.avgMs ? secs(p.avgMs) : '–') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="row"><button class="btn primary big" data-act="rematch">↻ ' + esc(t('rematch')) + '</button><button class="btn" data-act="newMatch">' + esc(t('newMatch')) + '</button><button class="btn" data-act="go" data-v="home">🏠 ' + esc(t('home')) + '</button></div></div>';
  }
  function historyList(list) {
    return '<ul class="hist">' + list.map(h => {
      const g = core.getGame(h.gameId);
      return '<li><div class="hhead"><span>' + (g ? g.icon + ' ' + esc(L(g.name)) : esc(h.gameId)) + '</span><span class="muted">' + esc(fmtDate(h.date)) + '</span></div><div class="hplayers">' +
        h.players.map(p => '<span class="hp ' + (h.players.length > 1 && h.winners.includes(p.id) ? 'won' : '') + '">' + (h.players.length > 1 && h.winners.includes(p.id) ? '👑 ' : '') + chip(p) + ' <b>' + p.score + '</b></span>').join('') + '</div></li>';
    }).join('') + '</ul>';
  }
  function historyHTML() {
    let h = topHTML(t('history'), 'home');
    if (!S.history.length) return h + '<p class="muted">' + esc(t('noHistory')) + '</p>';
    const ids = Array.from(new Set(S.history.flatMap(e => e.players.map(p => p.id))));
    const nameOf = id => { const p = S.players.find(x => x.id === id); if (p) return p; for (const e of S.history) { const q = e.players.find(x => x.id === id); if (q) return q; } return { name: '?', avatar: '', color: '#888' }; };
    h += '<div class="card"><div class="tablewrap"><table><thead><tr><th></th><th>' + esc(t('statGames')) + '</th><th>' + esc(t('statWins')) + '</th><th>' + esc(t('statBest')) + '</th><th>' + esc(t('statAcc')) + '</th></tr></thead><tbody>' +
      ids.map(id => { const st = core.playerStats(S, id); return '<tr><td>' + chip(nameOf(id)) + '</td><td>' + st.games + '</td><td>' + st.wins + '</td><td>' + st.best + '</td><td>' + (st.accuracy == null ? '–' : st.accuracy + '%') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    h += '<div class="card">' + historyList(S.history) + '<div class="row"><button class="btn danger" data-act="askConfirm" data-v="clear">🗑 ' + esc(t('clearHistory')) + '</button></div>' + confirmHTML('clear', t('clearConfirm'), t('yesClear')) + '</div>';
    return h;
  }

  /* ---------- actions ---------- */
  const ACT = {
    go(v) { confirmKey = null; screen = v; render(); },
    ui(v) { S.ui = v; save(); render(); },
    sound() { S.sound = !S.sound; save(); render(); },
    askConfirm(v) { confirmKey = v; render(); },
    noConfirm() { confirmKey = null; render(); },
    'yes-quit'() { S.current = null; confirmKey = null; paused = false; save(); screen = 'home'; render(); },
    'yes-delPlayer'() { core.removePlayer(S, ED.id); ED = null; confirmKey = null; save(); screen = 'players'; render(); },
    'yes-clear'() { S.history = []; confirmKey = null; save(); render(); },
    newPlayer() { openEditor(null, screen === 'setup' && !!SET); },
    editPlayer(v) { openEditor(S.players.find(p => p.id === v)); },
    edAvatar(v) { ED.avatar = v; render(); },
    edColor(v) { ED.color = v; render(); },
    edLevel(v) { ED.level = +v; render(); },
    savePlayer() {
      ED.name = $('pname').value;
      try {
        if (ED.id) core.updatePlayer(S, ED.id, { name: ED.name, avatar: ED.avatar, color: ED.color, level: ED.level });
        else {
          const p = core.addPlayer(S, ED);
          if (ED.returnToSetup && SET) { SET.order.push(p.id); SET.levels[p.id] = p.level; }
        }
      } catch (e) { ED.err = true; render(); return; }
      const back = ED.returnToSetup && SET ? 'setup' : 'players';
      ED = null; save(); toast('✓ ' + t('saved')); screen = back; render();
    },
    importKK() {
      const list = kkProfiles();
      list.forEach((k, i) => { const age = +k.age || 6; core.addPlayer(S, { name: k.name, avatar: k.avatar, color: COLORS[(S.players.length + i) % COLORS.length], level: age <= 6 ? 1 : age <= 8 ? 2 : 3 }); });
      save(); toast('✓ ' + t('imported', { n: list.length })); render();
    },
    setup(v) { openSetup(v); },
    togglePlayer(v) {
      const i = SET.order.indexOf(v);
      if (i >= 0) { SET.order.splice(i, 1); delete SET.levels[v]; }
      else { SET.order.push(v); SET.levels[v] = S.players.find(p => p.id === v).level || 1; }
      SET.err = false; render();
    },
    setLevel(v) { const [id, l] = v.split(':'); SET.levels[id] = +l; render(); },
    shuffleOrder() { SET.order = core.shuffle(SET.order); render(); },
    setRounds(v) { SET.rounds = +v; render(); },
    setTimer(v) { SET.timer = +v; render(); },
    setNameLang(v) { SET.nameLang = v; render(); },
    startMatch() { startMatch(); },
    resume() { paused = !!(M() && M().phase === 'turn'); screen = 'match'; render(); },
    ready() { beginTurn(); },
    next() { next(); },
    pause() { pause(); },
    unpause() { paused = false; confirmKey = null; render(); },
    rematch() { openSetup(lastEntry.gameId, lastEntry.players.map(p => p.id)); startMatch(); },
    newMatch() { openSetup(lastEntry.gameId, lastEntry.players.map(p => p.id)); }
  };

  function toast(msg) { const el = document.createElement('div'); el.className = 't'; el.textContent = msg; $('toast').appendChild(el); setTimeout(() => el.remove(), 2200); }

  document.addEventListener('click', e => {
    const n = $('pname'); if (n && ED) ED.name = n.value;
    const ans = e.target.closest('[data-answer]');
    if (ans && !ans.disabled) { audio(); answer(ans.dataset.answer); return; }
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    audio(); sfx.tap();
    const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset.v);
  });
  document.addEventListener('keydown', e => {
    if (screen !== 'match' || !M() || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName; if (tag === 'INPUT') return;
    const m = M();
    const d = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (d && m.phase === 'turn' && !paused) {
      const btn = document.querySelectorAll('[data-answer]')[+d[1] - 1];
      if (btn && !btn.disabled) { e.preventDefault(); answer(btn.dataset.answer); }
      return;
    }
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && tag !== 'BUTTON') {
      if (m.phase === 'pass') { e.preventDefault(); beginTurn(); }
      else if (m.phase === 'feedback') { e.preventDefault(); next(); }
    }
  });
  /* the iPad locks or the app is switched: stop the clock so nobody loses time */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (screen === 'match') pause(); else save(); }
    else if (screen === 'match') keepAwake(true);
  });
  window.addEventListener('pagehide', () => { if (screen === 'match') pause(); save(); });

  /* boot: an unfinished match is offered on the home screen; a reload in the middle of a turn comes back paused */
  if (S.current && S.current.phase === 'turn') paused = true;
  render();
  window.__fgh = { state: () => S, screen: () => screen, paused: () => paused };
})();
