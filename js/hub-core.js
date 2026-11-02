/* Family Game Hub core: players, matches with turns, scoring, standings, history and the game registry.
   No DOM here, so it runs in Node for the tests. Every game shares these players, scores and history. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const MAX_HISTORY = 200;
  const POINTS_CORRECT = 10;
  const POINTS_SPEED_MAX = 5;

  /* ---------- game registry ----------
     A game is an object with:
       id, icon, name {th, sv, en}, desc {th, sv, en}, levels (number of difficulty levels)
       makeQuestion({ level, used, rnd, options }) -> a JSON-safe question (used: Set of keys already asked in this match)
       isCorrect(question, answer) -> boolean
       questionHTML(question, view) -> HTML; every answer button carries data-answer="<value>"
       answerText(question, lang) -> the right answer as text, for the "it was ..." message
     The hub handles players, turns, timer, scoring and history for every game. */
  const games = {}, gameOrder = [];
  function registerGame(def) {
    for (const k of ['id', 'name', 'makeQuestion', 'isCorrect', 'questionHTML', 'answerText']) {
      if (!def || def[k] == null) throw new Error('Game is missing "' + k + '"');
    }
    if (!games[def.id]) gameOrder.push(def.id);
    games[def.id] = Object.assign({ icon: '🎲', levels: 1, desc: {} }, def);
    return games[def.id];
  }
  const getGame = id => games[id] || null;
  const listGames = () => gameOrder.map(id => games[id]);

  /* ---------- state & storage ---------- */
  function emptyState() { return { v: 1, ui: null, sound: true, players: [], history: [], current: null, last: {} }; }
  function loadState(raw) {
    let o;
    try { o = raw ? JSON.parse(raw) : null; } catch (e) { o = null; }
    if (!o || o.v !== 1) return emptyState();
    const s = Object.assign(emptyState(), o);
    s.players = Array.isArray(s.players) ? s.players.filter(p => p && p.id && p.name) : [];
    s.history = Array.isArray(s.history) ? s.history.filter(h => h && Array.isArray(h.players)) : [];
    if (s.current && (!getGame(s.current.gameId) || !Array.isArray(s.current.turns))) s.current = null;
    return s;
  }
  const newId = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- players ---------- */
  const cleanName = name => String(name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  function addPlayer(state, p) {
    const name = cleanName(p.name);
    if (!name) throw new Error('name');
    const player = { id: newId('p'), name, avatar: p.avatar || '🙂', color: p.color || '#2463D1', level: p.level || 1, created: Date.now() };
    state.players.push(player);
    return player;
  }
  function updatePlayer(state, id, changes) {
    const p = state.players.find(x => x.id === id); if (!p) return null;
    if ('name' in changes) { const n = cleanName(changes.name); if (!n) throw new Error('name'); p.name = n; }
    for (const k of ['avatar', 'color', 'level']) if (k in changes) p[k] = changes[k];
    return p;
  }
  /* removes the player; finished matches in the history keep their own copy of the name */
  function removePlayer(state, id) {
    state.players = state.players.filter(p => p.id !== id);
    if (state.current && state.current.players.some(p => p.id === id)) state.current = null;
  }

  /* ---------- matches ---------- */
  function createMatch(state, cfg) {
    const game = getGame(cfg.gameId); if (!game) throw new Error('game');
    const rnd = cfg.rnd || Math.random;
    const players = cfg.playerIds.map(id => state.players.find(p => p.id === id)).filter(Boolean)
      .map(p => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, level: Math.min(game.levels, Math.max(1, (cfg.levels && cfg.levels[p.id]) || p.level || 1)) }));
    if (!players.length) throw new Error('players');
    const rounds = Math.max(1, Math.min(20, cfg.rounds || 5));
    const used = new Set(), turns = [];
    for (let r = 0; r < rounds; r++) {
      players.forEach((p, i) => turns.push({ r, p: i, q: game.makeQuestion({ level: p.level, used, rnd, options: cfg.options || {} }), answer: null }));
    }
    return { id: newId('m'), gameId: game.id, created: Date.now(), rounds, timer: cfg.timer || 0, options: cfg.options || {},
      players, turns, t: 0, phase: 'pass', elapsedMs: 0 };
  }
  const currentTurn = m => m.turns[m.t] || null;
  /* points: 10 for a right answer, plus up to 5 for answering quickly when the timer is on */
  function pointsFor(correct, msUsed, timerSec) {
    if (!correct) return 0;
    if (!timerSec) return POINTS_CORRECT;
    const left = Math.max(0, Math.min(1, 1 - msUsed / (timerSec * 1000)));
    return POINTS_CORRECT + Math.round(POINTS_SPEED_MAX * left);
  }
  /* answer === null means the time ran out */
  function answerTurn(m, answer, msUsed) {
    const turn = currentTurn(m); if (!turn) return null;
    if (turn.answer) return turn.answer;
    const correct = answer != null && !!getGame(m.gameId).isCorrect(turn.q, answer);
    const ms = Math.max(0, Math.round(msUsed || 0));
    turn.answer = { value: answer, correct, ms, timedOut: answer == null, points: pointsFor(correct, ms, m.timer) };
    m.phase = 'feedback';
    return turn.answer;
  }
  function nextTurn(m) {
    if (m.phase !== 'feedback') return m.phase;
    m.t++; m.elapsedMs = 0;
    m.phase = m.t >= m.turns.length ? 'done' : 'pass';
    return m.phase;
  }
  function totals(m) {
    return m.players.map((p, i) => {
      const mine = m.turns.filter(tu => tu.p === i && tu.answer);
      const ms = mine.filter(tu => !tu.answer.timedOut).map(tu => tu.answer.ms);
      return Object.assign({}, p, {
        score: mine.reduce((a, tu) => a + tu.answer.points, 0),
        correct: mine.filter(tu => tu.answer.correct).length,
        answered: mine.length,
        avgMs: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0
      });
    });
  }
  /* highest score first; equal score and equal right answers share a place */
  function standings(m) {
    const rows = totals(m).sort((a, b) => b.score - a.score || b.correct - a.correct);
    rows.forEach((r, i) => { r.rank = i > 0 && r.score === rows[i - 1].score && r.correct === rows[i - 1].correct ? rows[i - 1].rank : i + 1; });
    return rows;
  }
  function finishMatch(state, m) {
    const rows = standings(m);
    const entry = { id: m.id, gameId: m.gameId, date: new Date().toISOString(), rounds: m.rounds, timer: m.timer,
      players: rows.map(r => ({ id: r.id, name: r.name, avatar: r.avatar, color: r.color, level: r.level, score: r.score, correct: r.correct, answered: r.answered, avgMs: r.avgMs, rank: r.rank })),
      winners: rows.filter(r => r.rank === 1).map(r => r.id) };
    state.history = [entry].concat(state.history.filter(h => h.id !== m.id)).slice(0, MAX_HISTORY);
    if (state.current && state.current.id === m.id) state.current = null;
    return entry;
  }
  function playerStats(state, playerId, gameId) {
    const entries = state.history.filter(h => (!gameId || h.gameId === gameId) && h.players.some(p => p.id === playerId));
    const mine = entries.map(h => h.players.find(p => p.id === playerId));
    const answered = mine.reduce((a, p) => a + p.answered, 0), correct = mine.reduce((a, p) => a + p.correct, 0);
    return {
      games: entries.length,
      wins: entries.filter(h => h.players.length > 1 && h.winners.includes(playerId)).length,
      best: mine.reduce((a, p) => Math.max(a, p.score), 0),
      accuracy: answered ? Math.round(100 * correct / answered) : null
    };
  }

  /* small helpers games can use */
  function shuffle(arr, rnd) { const a = arr.slice(); rnd = rnd || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  FGH.core = { registerGame, getGame, listGames, emptyState, loadState, addPlayer, updatePlayer, removePlayer, cleanName,
    createMatch, currentTurn, pointsFor, answerTurn, nextTurn, totals, standings, finishMatch, playerStats, shuffle, MAX_HISTORY };
})(typeof window !== 'undefined' ? window : globalThis);
