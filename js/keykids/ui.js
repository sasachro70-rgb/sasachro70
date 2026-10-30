(function () {
  'use strict';
  const K = window.KK;
  const LANGS = ['th', 'sv', 'en'];
  const NATIVE = { th: 'ไทย', sv: 'Svenska', en: 'English' };
  const AVATARS = ['🦊', '🐼', '🐯', '🦄', '🐵', '🐧', '🐨', '🦖', '🐙', '🐞', '🦁', '🐸'];
  const AGE_RANGES = [[3, '3–4'], [5, '5–6'], [7, '7–8'], [9, '9–10']];
  const STICKERS = ['🌟', '🍓', '🚗', '🦋', '🌈', '🍩', '🚀', '🐳', '🎨', '🦕', '🍉', '⚽', '🎸', '🧁', '🐠', '🌻', '🛸', '🐝', '🎁', '🦜', '🍕', '🏰', '🐲', '👑'];
  const BADGES = [
    { id: 'first', icon: '🎉' }, { id: 'ten', icon: '🔟' }, { id: 'perfect', icon: '🎯' }, { id: 'three5', icon: '⭐' },
    { id: 'streak3', icon: '🔥' }, { id: 'poly', icon: '🌍' }, { id: 'speed20', icon: '⚡' },
    { id: 'speller', icon: '🔤' }, { id: 'words50', icon: '📚' }, { id: 'flags', icon: '🗺️' }, { id: 'flagspot', icon: '🚩' },
    { id: 'lv1', icon: '🥉', n: 1 }, { id: 'lv2', icon: '🥈', n: 2 }, { id: 'lv3', icon: '🥇', n: 3 }, { id: 'lv4', icon: '🏆', n: 4 }
  ];
  const HINT_LIMIT = { 1: 0, 2: 3, 3: 3, 4: 1 };
  const STORE = 'keykids.v1';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = s => { const a = String(s).split('|'); return a[Math.floor(Math.random() * a.length)]; };
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* ---------- storage: one record per child, everything about a child lives in its profile ---------- */
  function navLang() { const l = (navigator.language || 'en').slice(0, 2); return LANGS.includes(l) ? l : 'en'; }
  const spellDefaults = () => ({ best: {}, missed: [], practised: 0, correct: 0, attempts: 0, games: 0, cats: {}, session: null });
  const flagDefaults = () => ({ best: {}, played: 0, correct: 0, answered: 0, attempts: 0, missed: {}, session: null });
  function defaults() {
    const l = navLang();
    return { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: today(), lastSeen: today(),
      ui: l, lang: l, name: '', age: 5, avatar: '🦊', sfx: true, voice: true, music: false, volume: 70, hints: true, breakMin: 15,
      prog: { th: {}, sv: {}, en: {} }, keyErr: { th: {}, sv: {}, en: {} }, timeMs: { th: 0, sv: 0, en: 0 },
      level: { th: 0, sv: 0, en: 0 }, maxLevel: { th: 0, sv: 0, en: 0 },
      spell: { th: spellDefaults(), sv: spellDefaults(), en: spellDefaults() }, spellD: 0, spellCat: 'animals', points: 0,
      flags: { th: flagDefaults(), sv: flagDefaults(), en: flagDefaults() }, flagD: 0, flagTimed: false, flagHide: false,
      badges: [], stickers: 0, three: 0, perfect: false, plays: 0, streak: { last: '', days: 0 }, langsUsed: [], last: null,
      kind: 'child', diffOverride: 0, ttsRate: 1, rev: 0 };
  }
  function fixProfile(o) {
    const d = defaults();
    const p = Object.assign(d, o);
    for (const k of ['prog', 'keyErr', 'timeMs', 'level', 'maxLevel']) p[k] = Object.assign(defaults()[k], o[k]);
    p.spell = {}; for (const l of LANGS) p.spell[l] = Object.assign(spellDefaults(), o.spell && o.spell[l]);
    if (!p.spellD) p.spellD = Math.min(4, K.ageLevel(p.age));
    p.flags = {}; for (const l of LANGS) p.flags[l] = Object.assign(flagDefaults(), o.flags && o.flags[l]);
    if (!p.flagD) p.flagD = K.ageLevel(p.age);
    return p;
  }
  function loadRoot() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && o.v === 2 && Array.isArray(o.profiles)) return { v: 2, ui: o.ui || navLang(), cur: o.cur, profiles: o.profiles.map(fixProfile) };
        if (o && o.prog && o.name) return { v: 2, ui: o.ui || navLang(), cur: null, profiles: [fixProfile(o)] }; /* data from the single-child version */
      }
    } catch (e) { /* storage blocked or unreadable: start fresh in memory */ }
    return { v: 2, ui: navLang(), cur: null, profiles: [] };
  }
  /* extension points used by the Family Game Hub (js/family/keykids-bridge.js). */
  const EXT = { screens: {}, acts: {}, onSave: null, onActivity: null, homeBanners: null, navButtons: null, onPick: null, onProfileDeleted: null };
  const ROOT = loadRoot();
  let S = null;          // the active child's profile (an object inside ROOT.profiles)
  let saveOk = true;
  function save() {
    if (S) { S.lastSeen = today(); ROOT.cur = S.id; ROOT.ui = S.ui; }
    if (S) S.rev = (S.rev || 0) + 1;
    if (EXT.onSave) { try { EXT.onSave(ROOT, S); } catch (e) { console.error(e); } }
    try { localStorage.setItem(STORE, JSON.stringify(ROOT)); if (!saveOk) { saveOk = true; paintSaveWarn(); } return true; }
    catch (e) { if (saveOk) { saveOk = false; paintSaveWarn(); } return false; }
  }
  const saveNote = msgKey => { if (save()) toast('✓ ' + t(msgKey || 'savedProgress')); };

  const DEV = { sfx: true, voice: true, music: false, volume: 70, ui: ROOT.ui };
  const C = () => S || DEV;
  let screen = 'profiles';
  let P = null;          // current typing lesson
  let SG = null;         // current spelling game
  let FG = null;         // current flag game
  let lastResult = null, lastSpell = null, lastFlag = null;
  let ED = null;         // profile editor draft
  let PG = { a: 0, b: 0, ok: false, wrong: false, confirmReset: false };
  let oskShift = false;
  let lastBreak = Date.now();

  function uiLang() { return S ? S.ui : ROOT.ui; }
  function t(key, vars) {
    const ui = uiLang();
    let s = (K.T[ui] && K.T[ui][key]) ?? K.T.en[key] ?? key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  const lessonName = l => (K.T[uiLang()]['l_' + l.id + '_' + S.lang] ? t('l_' + l.id + '_' + S.lang) : t('l_' + l.id));
  const starStr = n => '<span class="stars" aria-label="' + n + '/3">' + [0, 1, 2].map(i => i < n ? '<span class="s">★</span>' : '★').join('') + '</span>';
  const prog = () => S.prog[S.lang];
  const spellStarsOf = p => LANGS.reduce((sum, l) => sum + Object.values(p.spell[l].best).reduce((a, n) => a + n, 0) + Object.values(p.flags[l].best).reduce((a, n) => a + n, 0), 0);
  const starsOf = p => LANGS.reduce((sum, l) => sum + Object.values(p.prog[l]).reduce((a, r) => a + (r.stars || 0), 0), 0) + spellStarsOf(p);
  const totalStars = () => starsOf(S);
  const levelOf = p => K.effectiveLevel(p.prog[p.lang], p.age);
  const ageLabel = age => AGE_RANGES[K.ageLevel(age) - 1][1];
  function fmtDay(d) {
    if (!d) return '–';
    if (d === today()) return t('today');
    try { return new Date(d + 'T12:00:00').toLocaleDateString(uiLang() === 'th' ? 'th-TH' : uiLang() === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; }
  }

  /* ---------- audio: sound effects, music, voices ---------- */
  const Audio = (function () {
    let ac = null, master = null, sfxBus = null, musicBus = null, musicTimer = null;
    function ctx() {
      if (ac === false) return null;
      if (!ac) {
        try {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          master = ac.createGain(); master.connect(ac.destination);
          sfxBus = ac.createGain(); sfxBus.connect(master);
          musicBus = ac.createGain(); musicBus.gain.value = 0.18; musicBus.connect(master);
          setVolume();
        } catch (e) { ac = false; return null; }
      }
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return ac;
    }
    function setVolume() { if (master) master.gain.value = (C().volume / 100) * 0.9; }
    function tone(freq, dur, type, vol, when, bus) {
      const a = ctx(); if (!a) return;
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      const t0 = a.currentTime + (when || 0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function slide(f1, f2, dur, type, vol) {
      const a = ctx(); if (!a) return;
      const o = a.createOscillator(), g = a.createGain(); const t0 = a.currentTime;
      o.type = type; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + dur + 0.03);
    }
    const SFX = {
      click: () => tone(1400, 0.035, 'square', 0.03),
      key: () => tone(900, 0.04, 'triangle', 0.05),
      correct: n => { const f = 523 * Math.pow(2, (Math.min(n || 0, 12) % 8) / 12); tone(f, 0.12, 'triangle', 0.16); tone(f * 1.5, 0.14, 'sine', 0.07, 0.05); },
      wrong: () => { tone(330, 0.16, 'sine', 0.07); tone(294, 0.2, 'sine', 0.06, 0.1); },
      star: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.09)),
      win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, i * 0.11)),
      badge: () => [659, 784, 988, 1319].forEach((f, i) => { tone(f, 0.3, 'sine', 0.12, i * 0.08); tone(f * 2, 0.2, 'triangle', 0.04, i * 0.08); }),
      pop: () => { slide(900, 200, 0.12, 'square', 0.06); tone(1800, 0.05, 'triangle', 0.05); },
      hop: () => slide(300, 900, 0.18, 'sine', 0.12),
      whoosh: () => slide(200, 60, 0.35, 'sawtooth', 0.025)
    };
    function sfx(name, arg) { if (!C().sfx) return; try { SFX[name] && SFX[name](arg); } catch (e) { /* audio unavailable */ } }

    /* gentle pentatonic music box, generated so nothing has to load */
    const MELODY = [0, 2, 4, 7, 4, 2, 9, 7, 0, 4, 7, 9, 7, 4, 2, 0];
    function startMusic() {
      if (musicTimer || !C().music) return;
      if (!ctx()) return;
      let step = 0;
      musicTimer = setInterval(() => {
        if (!C().music || document.hidden) return;
        const semi = MELODY[step % MELODY.length];
        tone(392 * Math.pow(2, semi / 12), 0.6, 'sine', 0.25, 0, musicBus);
        if (step % 4 === 0) tone(196 * Math.pow(2, MELODY[(step / 4) % 4 * 2] / 12), 1.4, 'triangle', 0.18, 0, musicBus);
        step++;
      }, 520);
    }
    function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
    function duck(on) { if (musicBus && ac) musicBus.gain.setTargetAtTime(on ? 0.06 : 0.18, ac.currentTime, 0.1); }

    /* voices */
    const LOCALE = { th: 'th-TH', sv: 'sv-SE', en: 'en-GB' };
    const hasTTS = 'speechSynthesis' in window;
    function voiceFor(lang) {
      if (!hasTTS) return null;
      const vs = speechSynthesis.getVoices();
      return vs.find(v => v.lang.replace('_', '-').toLowerCase() === LOCALE[lang].toLowerCase())
        || vs.find(v => v.lang.toLowerCase().startsWith(lang)) || null;
    }
    function speak(text, lang, buddy) {
      if (!C().voice || !hasTTS || !text) return false;
      const v = voiceFor(lang); if (!v) return false;
      try {
        const u = new SpeechSynthesisUtterance(text);
        const b = K.BUDDIES[buddy] || K.BUDDIES.bear;
        u.voice = v; u.lang = v.lang; u.pitch = b.pitch; u.rate = b.rate; u.volume = Math.min(1, (C().volume / 100) * 0.85);
        u.onstart = () => duck(true); u.onend = u.onerror = () => duck(false);
        speechSynthesis.cancel(); speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; }
    }
    if (hasTTS) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => { if (screen === 'parents' || screen === 'spellplay') render(); }; } catch (e) { /* ignore */ } }
    return { ctx, sfx, speak, setVolume, startMusic, stopMusic, voiceFor, hasTTS };
  })();

  /* Buddy line: shows the speech bubble in the menu language and speaks it if a voice exists. */
  let lastSaid = null; const lastSaidAt = {};
  function say(key, vars, opts) {
    opts = opts || {};
    const lang = uiLang();
    const entry = K.VOICE[lang][key] || K.VOICE.en[key]; if (!entry) return;
    const now = Date.now();
    if (opts.cooldown && lastSaidAt[key] && now - lastSaidAt[key] < opts.cooldown) return;
    lastSaidAt[key] = now;
    let text = pick(entry[1]);
    if (vars) for (const k in vars) text = text.split('{' + k + '}').join(vars[k]);
    lastSaid = { buddy: entry[0], text, lang };
    paintBuddy();
    Audio.speak(text, lang, entry[0]);
  }
  /* Read a letter or word aloud in the practice language (no bubble). */
  function sayPractice(text, lang) { return Audio.speak(text, lang || S.lang, 'bear'); }
  function buddyHTML() {
    if (!lastSaid) return '<div class="buddy" id="buddy"></div>';
    const b = K.BUDDIES[lastSaid.buddy];
    return '<div class="buddy" id="buddy"><div class="face talk" aria-hidden="true">' + b.face + '</div><div class="bubble"><b>' + esc(t(b.name)) + '</b>' + esc(lastSaid.text) +
      '<button class="ghost replay" data-act="replay" aria-label="' + esc(t('replay')) + '" title="' + esc(t('replay')) + '">🔊</button></div></div>';
  }
  function paintBuddy() { const el = $('buddy'); if (el) el.outerHTML = buddyHTML(); }

  /* ---------- toasts, overlay, save warning ---------- */
  function toast(msg) { const el = document.createElement('div'); el.className = 't'; el.textContent = msg; $('toast').appendChild(el); setTimeout(() => el.remove(), 2600); }
  function overlay(html) { const ov = $('ov'); ov.innerHTML = '<div class="box" role="dialog" aria-modal="true">' + html + '</div>'; ov.hidden = false; const b = ov.querySelector('button'); if (b) b.focus(); }
  function closeOverlay() { $('ov').hidden = true; $('ov').innerHTML = ''; }
  const saveWarnHTML = () => saveOk ? '<div id="savewarn" hidden></div>' : '<div id="savewarn" class="savewarn" role="alert">⚠️ ' + esc(t('saveFailed')) + '</div>';
  function paintSaveWarn() { const el = $('savewarn'); if (el) el.outerHTML = saveWarnHTML(); }

  /* ---------- top bar ---------- */
  function topHTML() {
    const seg = (act, cur, lbl) => '<div class="seg" role="group" aria-label="' + esc(lbl) + '"><span class="lbl">' + esc(lbl) + '</span>' +
      LANGS.map(l => '<button data-act="' + act + '" data-v="' + l + '" class="' + (cur === l ? 'on' : '') + '" aria-pressed="' + (cur === l) + '">' + (act === 'setUi' ? NATIVE[l] : esc(t('lang_' + l))) + '</button>').join('') + '</div>';
    return '<header class="top"><button class="ghost brand" data-act="go" data-v="map"><span class="k">K</span>KeyKids</button><span class="grow"></span>' +
      seg('setUi', S.ui, t('uiLang')) + seg('setLang', S.lang, t('practiceLang')) +
      '<span class="pill" title="' + esc(t('totalStars')) + '">★ ' + totalStars() + '</span>' +
      (S.streak.days > 1 ? '<span class="pill">🔥 ' + esc(t('streak', { n: S.streak.days })) + '</span>' : '') +
      '<button class="cap small" data-act="go" data-v="spell">🔤 ' + esc(t('spellingShort')) + '</button>' +
      (EXT.navButtons ? EXT.navButtons() : '') +
      '<button class="cap small" data-act="go" data-v="rewards">🏅 ' + esc(t('rewards')) + '</button>' +
      '<button class="cap small" data-act="go" data-v="parents">🔒 ' + esc(t('parents')) + '</button>' +
      '<button class="cap small avpill" data-act="go" data-v="profiles" title="' + esc(t('switchPlayer')) + '"><span aria-hidden="true">' + esc(S.avatar) + '</span>' + esc(S.name) + ' ⇄</button></header>' + saveWarnHTML();
  }

  /* ---------- screens ---------- */
  function render() {
    stopGameLoop();
    document.documentElement.lang = uiLang();
    const app = $('app');
    if (!S && screen !== 'profileEdit' && !(EXT.screens[screen] && EXT.screens[screen].noProfile)) screen = 'profiles';
    if (screen === 'profiles') app.innerHTML = profilesHTML();
    else if (screen === 'profileEdit') app.innerHTML = profileEditHTML();
    else if (screen === 'map') app.innerHTML = topHTML() + buddyHTML() + mapHTML();
    else if (screen === 'play') { app.innerHTML = playHTML(); paintPlay(); }
    else if (screen === 'result') app.innerHTML = topHTML() + buddyHTML() + resultHTML();
    else if (screen === 'spell') app.innerHTML = topHTML() + buddyHTML() + spellHomeHTML();
    else if (screen === 'spellplay') { app.innerHTML = spellPlayHTML(); paintSpell(); }
    else if (screen === 'spellres') app.innerHTML = topHTML() + buddyHTML() + spellResultHTML();
    else if (screen === 'flags') app.innerHTML = topHTML() + buddyHTML() + flagHomeHTML();
    else if (screen === 'flagplay') { app.innerHTML = flagPlayHTML(); paintFlag(); }
    else if (screen === 'flagres') app.innerHTML = topHTML() + buddyHTML() + flagResultHTML();
    else if (screen === 'rewards') app.innerHTML = topHTML() + rewardsHTML();
    else if (screen === 'parents') app.innerHTML = topHTML() + parentsHTML();
    else if (EXT.screens[screen]) { const X = EXT.screens[screen]; app.innerHTML = (X.top ? topHTML() : '') + X.html(); if (X.after) X.after(); }
    document.body.dataset.area = (EXT.screens[screen] && EXT.screens[screen].area) || (screen === 'profiles' || screen === 'profileEdit' ? 'start' : 'kids');
  }

  /* profile picker: shown every time the app opens */
  function profilesHTML() {
    const uiSeg = '<div class="seg"><span class="lbl">' + esc(t('menuLang')) + '</span>' + LANGS.map(l => '<button data-act="setUi" data-v="' + l + '" class="' + (uiLang() === l ? 'on' : '') + '">' + NATIVE[l] + '</button>').join('') + '</div>';
    const cards = ROOT.profiles.map(p => '<div class="pwrap"><button class="cap pcard' + (p.kind === 'adult' ? ' adultcard' : '') + '" data-act="pickProfile" data-v="' + p.id + '"><span class="av" aria-hidden="true">' + esc(p.avatar) + '</span><span class="nm">' + esc(p.name) + '</span>' +
      '<span class="meta">' + (p.kind === 'adult' && EXT.adultMeta ? EXT.adultMeta(p) : esc(t('practisingLevel', { n: levelOf(p) })) + ' · ' + esc(t('lang_' + p.lang))) + '</span><span class="meta">★ ' + starsOf(p) + ' · ' + esc(t('lastSeen', { d: fmtDay(p.lastSeen) })) + '</span></button>' +
      '<button class="cap small edit" data-act="editProfile" data-v="' + p.id + '" aria-label="' + esc(t('editProfile') + ': ' + p.name) + '" title="' + esc(t('editProfile')) + '">✏️</button></div>').join('');
    return '<header class="top"><span class="brand"><span class="k">K</span>KeyKids</span><span class="grow"></span>' + uiSeg + '<a class="cap small" href="index.html">🏠 Family Game Hub</a></header>' + saveWarnHTML() + buddyHTML() +
      '<h1 style="margin-bottom:16px">' + esc(t('whoLearns')) + '</h1><div class="profiles">' + cards +
      '<button class="cap pcard add" data-act="newProfile"><span class="av" aria-hidden="true">＋</span><span class="nm">' + esc(t('addLearner')) + '</span></button></div>';
  }

  /* create / edit a profile */
  function openEditor(p) {
    ED = p ? { kind: p.kind || 'child', id: p.id, name: p.name, age: p.age, avatar: p.avatar, lang: p.lang, ui: p.ui, sfx: p.sfx, voice: p.voice, music: p.music, hints: p.hints, confirmDelete: false, err: false }
      : { kind: 'child', id: null, name: '', age: 5, avatar: AVATARS[ROOT.profiles.length % AVATARS.length], lang: uiLang(), ui: uiLang(), sfx: true, voice: true, music: false, hints: true, confirmDelete: false, err: false };
    screen = 'profileEdit'; render();
    const nm = $('nm'); if (nm && !ED.id) nm.focus();
  }
  function profileEditHTML() {
    const choice = (act, list, cur, label) => '<div class="choices">' + list.map(([v, l]) => '<button class="cap ' + (String(cur) === String(v) ? 'on' : '') + '" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '">' + l + '</button>').join('') + '</div>';
    const tog = (k, lbl) => '<div class="row"><label for="ed-' + k + '">' + esc(t(lbl)) + '</label><input id="ed-' + k + '" type="checkbox" data-ed="' + k + '"' + (ED[k] ? ' checked' : '') + '></div>';
    const p = ED.id && ROOT.profiles.find(x => x.id === ED.id);
    return '<div class="setup"><header class="top"><span class="brand"><span class="k">K</span>KeyKids</span><span class="grow"></span>' +
      (ROOT.profiles.length ? '<button class="cap small" data-act="go" data-v="profiles">← ' + esc(t('back')) + '</button>' : '<a class="cap small" href="index.html">🏠 Family Game Hub</a>') + '</header>' + saveWarnHTML() + buddyHTML() +
      '<div class="panel"><h1>' + esc(ED.id ? t('editProfile') : t('newProfile')) + '</h1><p class="muted" style="margin:0">' + esc(t('profileHint')) + '</p>' +
      '<div class="field"><label for="nm">' + esc(t('nickname')) + '</label><input id="nm" type="text" maxlength="20" autocomplete="off" placeholder="' + esc(t('namePh')) + '" value="' + esc(ED.name) + '"></div>' +
      (EXT.kindField ? EXT.kindField(ED) : '') +
      (ED.kind === 'adult' ? '' : '<div class="field"><label>' + esc(t('age')) + '</label>' + choice('edAge', AGE_RANGES.map(([v, l]) => [v, esc(t('ages', { a: l }))]), K.ageLevel(ED.age) * 2 + 1, '') + '</div>') +
      '<div class="field"><label>' + esc(t('pickAvatar')) + '</label><div class="choices avatars">' + AVATARS.map(a => '<button class="cap ' + (ED.avatar === a ? 'on' : '') + '" data-act="edAvatar" data-v="' + a + '">' + a + '</button>').join('') + '</div></div>' +
      '<div class="field"><label>' + esc(t('practiceLang')) + '</label>' + choice('edLang', LANGS.map(l => [l, esc(t('lang_' + l))]), ED.lang) + '</div>' +
      '<div class="field"><label>' + esc(t('menuLang')) + '</label>' + choice('edUi', LANGS.map(l => [l, NATIVE[l]]), ED.ui) + '</div>' +
      '<div class="field">' + tog('sfx', 'sfxLbl') + tog('voice', 'voiceLbl') + tog('music', 'musicLbl') + tog('hints', 'hintsLbl') + '</div>' +
      (ED.err ? '<p class="warn">' + esc(t('nameMissing')) + '</p>' : '') +
      (p ? '<p class="muted" style="margin:0">' + esc(t('createdOn', { d: fmtDay(p.created) })) + ' · ' + esc(t('lastSeen', { d: fmtDay(p.lastSeen) })) + '</p>' : '') +
      '<div class="actions" style="justify-content:flex-start"><button class="cap primary" data-act="saveProfile">' + esc(ED.id ? t('save') : t('start')) + '</button>' +
      (ROOT.profiles.length ? '<button class="cap" data-act="go" data-v="profiles">' + esc(t('cancel')) + '</button>' : '') + '</div>' +
      (p ? (ED.confirmDelete
        ? '<div class="savewarn" role="alert"><p style="margin:0 0 .6rem">' + esc(t('deleteConfirm', { name: p.name })) + '</p><div class="actions" style="justify-content:flex-start"><button class="cap" data-act="deleteProfile">' + esc(t('yesDelete')) + '</button><button class="cap" data-act="cancelDelete">' + esc(t('cancel')) + '</button></div></div>'
        : '<div><button class="cap small" data-act="askDelete">🗑 ' + esc(t('deleteProfile')) + '</button></div>') : '') +
      '</div></div>';
  }

  function pickProfile(id) {
    const p = ROOT.profiles.find(x => x.id === id); if (!p) return;
    S = p; P = null; SG = null;
    save();
    if (EXT.onPick && EXT.onPick(S)) return;
    screen = 'map'; render();
    say('welcomeName', { name: S.name });
    Audio.setVolume(); if (S.music) Audio.startMusic(); else Audio.stopMusic();
  }

  /* where "Continue" takes the child: an unfinished spelling game, an unfinished lesson, or the next planned lesson */
  function continueTarget() {
    const sess = S.spell[S.lang].session;
    const fs = S.flags[S.lang].session;
    const spellT = sess && { kind: 'spell', label: '🔤 ' + t('spellTitle') + ' · ' + (sess.review ? t('reviewTitle') : t('c_' + sess.cat)) + ' (' + (sess.i + 1) + '/' + sess.ids.length + ')' };
    const flagT = fs && { kind: 'flags', label: '🚩 ' + t('flagTitle') + ' · ' + t('d' + fs.d) + ' (' + Math.min(fs.i + 1, fs.qs.length) + '/' + fs.qs.length + ')' };
    /* the unfinished game played most recently comes first */
    if (S.last && S.last.type === 'flags' && flagT) return flagT;
    if (spellT || flagT) return spellT || flagT;
    const la = S.last && S.last.lang === S.lang && S.last.type === 'lesson' && !S.last.done ? K.LESSON_BY_ID[S.last.id] : null;
    const l = la || K.LESSON_BY_ID[K.plan(prog(), S.age)[0]];
    return { kind: 'lesson', id: l.id, label: l.icon + ' ' + lessonName(l) };
  }
  function lastTimeText() {
    const la = S.last; if (!la || la.lang !== S.lang) return '';
    let what = la.type === 'lesson' ? K.LESSON_BY_ID[la.id].icon + ' ' + lessonName(K.LESSON_BY_ID[la.id])
      : la.type === 'flags' ? '🚩 ' + t('flagTitle') : '🔤 ' + (la.review ? t('reviewTitle') : t('c_' + la.cat));
    if (!la.done) what += ' (' + t('notFinished') + ')';
    return t('lastTime', { what });
  }

  function mapHTML() {
    const pr = prog();
    const lv = K.effectiveLevel(pr, S.age);
    const ct = continueTarget();
    const missed = S.spell[S.lang].missed.length;
    const lt = lastTimeText();
    let h = '<section class="hello"><div class="av" aria-hidden="true">' + esc(S.avatar) + '</div><div><h1>' + esc(t('hello', { name: S.name })) + '</h1>' +
      (lt ? '<p>' + esc(lt) + '</p>' : '') + '<p>' + esc(t('nextUp')) + ' <strong>' + esc(ct.label) + '</strong></p>' +
      '<p>' + esc(t('currentLevel')) + ': <strong>' + lv + '</strong> · ' + esc(t('maxLevel')) + ': <strong>' + Math.max(lv, S.maxLevel[S.lang] || 0) + '</strong> · ★ ' + totalStars() + ' · ' + esc(t('points')) + ' ' + S.points + '</p></div>' +
      '<button class="cap primary go" data-act="continue">▶ ' + esc(t('continueBtn')) + '</button></section>';
    h += '<section class="banner"><div class="bi" aria-hidden="true">🔤</div><div><h2>' + esc(t('spellTitle')) + '</h2><p>' + esc(t('spellDesc')) + '</p>' +
      (missed ? '<p><button class="cap small" data-act="spReview">🔁 ' + esc(t('reviewMissed', { n: missed })) + '</button></p>' : '') + '</div>' +
      '<button class="cap primary go" data-act="go" data-v="spell">▶ ' + esc(t('play')) + '</button></section>' +
      '<section class="banner"><div class="bi" aria-hidden="true">' + flagSVG('se', 'small') + '</div><div><h2>' + esc(t('flagTitle')) + '</h2><p>' + esc(t('flagDesc')) + '</p></div>' +
      '<button class="cap primary go" data-act="go" data-v="flags">▶ ' + esc(t('play')) + '</button></section>' + (EXT.homeBanners ? EXT.homeBanners() : '');
    const ages = { 1: '3–4', 2: '5–6', 3: '7–8', 4: '9–10' };
    for (let n = 1; n <= 4; n++) {
      h += '<section class="level ' + (n === lv ? 'rec' : '') + '"><div class="lvhead"><span class="lvnum">' + n + '</span><h2>' + esc(t('lv' + n)) + '</h2><span class="ages">' + esc(t('ages', { a: ages[n] })) + '</span>' +
        (n === lv ? '<span class="chip">' + esc(t('recommended')) + '</span>' : '') + '</div><div class="tiles">';
      K.LESSONS.filter(l => l.level === n).forEach(l => {
        const r = pr[l.id];
        h += '<button class="cap tile" data-act="startLesson" data-v="' + l.id + '"><span class="ic" aria-hidden="true">' + l.icon + '</span><span class="nm">' + esc(lessonName(l)) + '</span>' + starStr(r ? r.stars : 0) + '</button>';
      });
      h += '</div></section>';
    }
    return h;
  }

  /* ---------- typing lessons ---------- */
  function startLesson(id) {
    const L = K.LESSON_BY_ID[id];
    P = { sid: uid(), L, items: K.makeItems(L, S.lang), i: 0, pos: 0, keys: 0, correct: 0, wrongStreak: 0, streak: 0, t0: 0, tEnd: 0, errChars: {},
      forceHint: false, hintTimer: null, ended: false, explored: 0, popped: 0, spawned: 0, balloons: [], escaped: 0, deadline: 0 };
    SG = null; oskShift = false;
    S.last = { type: 'lesson', id, lang: S.lang, done: false }; save();
    screen = 'play';
    render();
    say('intro_' + (L.type === 'balloon' ? 'balloon' : L.type));
    if (L.type === 'balloon') startBalloons();
    if (L.type === 'speed') { P.deadline = Date.now() + L.seconds * 1000; P.t0 = Date.now(); tickTimer(); }
    armItem();
  }

  function playHTML() {
    return '<div class="play"><div class="playbar"><button class="cap small" data-act="quit">✕ ' + esc(t('quit')) + '</button>' +
      '<span class="ttl">' + P.L.icon + ' ' + esc(lessonName(P.L)) + '</span><div class="meter" aria-hidden="true"><span id="meter" style="width:0%"></span></div>' +
      '<span class="timer" id="timer"></span><span class="capswarn" id="caps" hidden>⇪ ' + esc(t('capsOn')) + '</span></div>' + saveWarnHTML() +
      buddyHTML() +
      '<div class="stage ' + (P.L.type === 'balloon' ? 'game' : '') + '" id="stage"></div><div class="helper" id="helper"></div><div class="kb" id="kb">' + kbHTML() + '</div>' +
      '<p class="kbnote">' + esc(t('noKeyboard')) + '</p></div>';
  }

  function curItem() { return P.items[P.i]; }
  function curCps() { const it = curItem(); return it ? Array.from(it.text) : []; }
  function expectedChar() {
    if (!P || P.ended) return null;
    if (P.L.type === 'explore') return null;
    if (P.L.type === 'balloon') { const b = topBalloon(); return b ? b.ch : null; }
    const c = curCps(); return c[P.pos] ?? null;
  }
  const lenient = () => P.L.level <= 2;
  function showHintNow() {
    const ty = P.L.type;
    if (ty === 'findkey' || ty === 'picture') return P.wrongStreak >= 1 || P.forceHint;
    return S.hints || P.wrongStreak >= 2 || ty === 'space' || P.L.level === 1;
  }
  /* what the keyboard and the hands should point at right now */
  function hintState() {
    if (screen === 'spellplay') return spellHint();
    if (!P) return { ch: null };
    return { ch: expectedChar(), show: showHintNow(), lenient: lenient() };
  }

  function stageHTML() {
    const L = P.L, it = curItem();
    if (L.type === 'explore') return '<div id="tgt"><p class="prompt">' + esc(t('pressAny')) + '</p><div class="glyph" id="exg">⌨️</div><div class="word" id="exw"></div></div>';
    if (L.type === 'balloon') return '<div class="sky" id="sky"></div><p class="skyhint">' + esc(t('popBalloons')) + '</p>';
    if (!it) return '';
    if (L.type === 'findkey') return '<div id="tgt"><p class="prompt">' + esc(t('pressKey')) + '</p><div class="glyph pop">' + esc(K.displayChar(it.text)) + '</div></div>';
    if (L.type === 'picture') {
      const gs = K.graphemes(it.word); const idx = Array.from(it.word).indexOf(it.text);
      const w = gs.map(g => (idx >= g.start && idx < g.end) ? '<span class="tg">' + esc(g.text) + '</span>' : esc(g.text)).join('');
      return '<div id="tgt"><div class="emoji pop" aria-hidden="true">' + it.emoji + '</div><div class="word">' + w + '</div><p class="prompt">' + esc(t('whichLetter', { word: it.word })) + '</p></div>';
    }
    if (L.type === 'space') {
      return '<div class="pond" id="tgt"><p class="prompt">' + esc(t('pressSpace')) + '</p><div class="pads"><div class="frog" id="frog" style="transform:translateX(' + (P.i * 100) + '%)">🐸</div>' +
        Array.from({ length: 9 }, () => '<div class="pad"></div>').join('') + '</div><span class="spacecap">space</span></div>';
    }
    if (L.type === 'keys') {
      const from = Math.max(0, P.i - 2), list = P.items.slice(from, from + 8);
      return '<div id="tgt"><p class="prompt">' + esc(t('typeThis')) + '</p><div class="strip">' + list.map((x, j) => {
        const k = from + j; return '<span class="c ' + (k < P.i ? 'done' : k === P.i ? 'cur' : '') + '">' + esc(K.displayChar(x.text)) + '</span>';
      }).join('') + '</div></div>';
    }
    const nx = P.items[P.i + 1];
    return '<div id="tgt" style="max-width:100%"><p class="prompt">' + esc(t('typeThis')) + '</p>' + copyLineHTML(curCps(), P.pos) +
      (nx && L.type !== 'speed' ? '<p class="nextitem">' + esc(t('nextLabel')) + ' ' + esc(nx.text) + '</p>' : '') + '</div>';
  }
  /* a line to copy, letter clusters marked done / current; inside a Thai cluster like น้ำ it names the exact next mark */
  function copyLineHTML(cps, pos) {
    const s = cps.join(''), gs = K.graphemes(s);
    const line = gs.map(g => {
      const cls = pos >= g.end ? 'done' : (pos >= g.start ? 'cur' : '');
      const txt = g.text === ' ' ? '<span class="sp">' + (cls === 'cur' ? '␣' : ' ') + '</span>' : esc(g.text);
      return '<span class="g ' + cls + '">' + txt + '</span>';
    }).join('');
    const g = gs.find(x => pos >= x.start && pos < x.end);
    const sub = g && Array.from(g.text).length > 1 ? '<span class="substep">' + esc(t('nextLabel')) + ' ' + esc(K.displayChar(cps[pos])) + '</span>' : '';
    return '<div class="line">' + line + '</div>' + sub;
  }

  function paintPlay() {
    if (!P) return;
    if (P.L.type !== 'balloon' || !$('sky')) $('stage').innerHTML = stageHTML();
    paintHelper(); paintKb(); paintMeter();
  }
  function paintMeter() {
    const m = $('meter'); if (!m) return;
    let pct = 0;
    if (screen === 'spellplay') pct = SG ? SG.i / SG.ids.length : 0;
    else if (screen === 'flagplay') pct = FG ? (FG.i + (FG.q && FG.q.done ? 1 : 0)) / FG.qs.length : 0;
    else if (P.L.type === 'explore') pct = P.explored / 20;
    else if (P.L.type === 'balloon') pct = (P.popped + P.escaped) / P.L.count;
    else if (P.L.type === 'speed') pct = 1 - Math.max(0, P.deadline - Date.now()) / (P.L.seconds * 1000);
    else pct = P.i / P.items.length;
    m.style.width = Math.min(100, Math.round(pct * 100)) + '%';
  }

  function paintHelper() {
    const h = $('helper'); if (!h) return;
    const hs = hintState();
    if (hs.show && hs.code === 'Backspace') { h.innerHTML = handsSVG('rp', false) + '<div><strong>⌫ ' + esc(t('erase')) + '</strong></div>'; return; }
    const info = hs.ch != null ? K.LAYOUTS[S.lang].byChar[hs.ch] : null;
    if (!info || !hs.show) { h.innerHTML = handsSVG(null, false); return; }
    const needShift = info.shift && !(hs.lenient && hs.ch.toLowerCase() !== hs.ch.toUpperCase());
    h.innerHTML = handsSVG(info.finger, needShift) + '<div><strong>' + esc(t('useFinger', { finger: t('f_' + info.finger) })) + '</strong>' +
      (needShift ? '<br>⇧ ' + esc(t('holdShift')) : '') + '</div>';
  }

  function handsSVG(f, shift) {
    const shiftF = f && shift ? (f[0] === 'l' ? 'rp' : 'lp') : null;
    const on = id => (id === f || id === shiftF || (f === 'th' && id === 'th')) ? ' on' : '';
    const hand = (p, mirror) => '<g' + (mirror ? ' transform="translate(240,0) scale(-1,1)"' : '') + '>' +
        '<rect class="palm" x="12" y="54" width="78" height="46" rx="18"/>' +
        '<rect class="fg fp' + on(p + 'p') + '" x="13" y="30" width="15" height="36" rx="7.5"/>' +
        '<rect class="fg fr' + on(p + 'r') + '" x="31" y="16" width="15" height="48" rx="7.5"/>' +
        '<rect class="fg fm' + on(p + 'm') + '" x="49" y="10" width="15" height="54" rx="7.5"/>' +
        '<rect class="fg fi' + on(p + 'i') + '" x="67" y="18" width="15" height="46" rx="7.5"/>' +
        '<rect class="fg ft' + on('th') + '" x="84" y="60" width="32" height="15" rx="7.5" transform="rotate(-28 84 67)"/></g>';
    return '<svg class="hands" viewBox="0 0 240 104" aria-hidden="true">' + hand('l', false) + hand('r', true) + '</svg>';
  }

  /* on-screen keyboard (Backspace and Enter are live for the spelling game) */
  function kbHTML() {
    const lay = K.LAYOUTS[S.lang];
    const key = k => {
      const main = oskShift ? k.s : k.n;
      const letter = k.n.toLowerCase() !== k.n.toUpperCase();
      const alt = (!letter || S.lang === 'th') && k.s !== k.n ? '<span class="alt">' + esc(K.displayChar(oskShift ? k.n : k.s)) + '</span>' : '';
      return '<button class="key ' + (k.code === 'KeyF' || k.code === 'KeyJ' ? 'bump' : '') + '" data-code="' + k.code + '" data-f="' + k.finger + '" tabindex="-1" aria-label="' + esc(main) + '">' + alt + esc(K.displayChar(main)) + '</button>';
    };
    const mod = (lbl, w) => '<span class="key mod ' + w + '" aria-hidden="true">' + lbl + '</span>';
    const live = (code, lbl, w, f) => '<button class="key mod shift ' + w + '" data-code="' + code + '" data-f="' + f + '" tabindex="-1" aria-label="' + code + '">' + lbl + '</button>';
    const r = lay.rows, sv = S.lang === 'sv';
    const sh = code => '<button class="key mod shift w22 ' + (oskShift ? 'latched' : '') + '" data-code="' + code + '" data-f="' + (code === 'ShiftLeft' ? 'lp' : 'rp') + '" tabindex="-1" aria-label="Shift">⇧</button>';
    return '<div class="kr">' + r[0].map(key).join('') + live('Backspace', '⌫', 'w18', 'rp') + '</div>' +
      '<div class="kr">' + mod('⇥', 'w15') + r[1].map(key).join('') + (sv ? live('Enter', '↵', 'w15', 'rp') : '') + '</div>' +
      '<div class="kr">' + mod('⇪', 'w18') + r[2].map(key).join('') + (sv ? '' : live('Enter', '↵', 'w22', 'rp')) + '</div>' +
      '<div class="kr">' + sh('ShiftLeft') + r[3].map(key).join('') + sh('ShiftRight') + '</div>' +
      '<div class="kr">' + mod('', 'w22') + '<button class="key space" data-code="Space" data-f="th" tabindex="-1" aria-label="Space">space</button>' + mod('', 'w22') + '</div>';
  }
  function paintKb() {
    const kb = $('kb'); if (!kb) return;
    kb.querySelectorAll('.target').forEach(e => e.classList.remove('target'));
    const hs = hintState(); if (!hs.show) return;
    if (hs.code) { const el = kb.querySelector('[data-code="' + hs.code + '"]'); if (el) el.classList.add('target'); return; }
    if (hs.ch == null) return;
    const info = K.LAYOUTS[S.lang].byChar[hs.ch]; if (!info) return;
    const el = kb.querySelector('[data-code="' + info.code + '"]'); if (el) el.classList.add('target');
    if (info.shift && !(hs.lenient && hs.ch.toLowerCase() !== hs.ch.toUpperCase())) {
      const shEl = kb.querySelector('[data-code="' + (info.finger[0] === 'l' ? 'ShiftRight' : 'ShiftLeft') + '"]'); if (shEl) shEl.classList.add('target');
    }
  }
  function flashKey(code, good) {
    const el = $('kb') && $('kb').querySelector('[data-code="' + code + '"]'); if (!el) return;
    el.classList.remove('hit', 'miss'); void el.offsetWidth; el.classList.add(good ? 'hit' : 'miss');
    setTimeout(() => el.classList.remove('hit', 'miss'), 200);
  }
  function shake() { const tg = $('tgt'); if (tg) { tg.classList.remove('shake'); void tg.offsetWidth; tg.classList.add('shake'); } }

  function armItem() {
    if (!P) return;
    clearTimeout(P.hintTimer); P.forceHint = false;
    const ty = P.L.type;
    if (ty === 'findkey' || ty === 'picture') {
      P.hintTimer = setTimeout(() => { if (P && !P.ended) { P.forceHint = true; paintHelper(); paintKb(); } }, 5000);
      const it = curItem();
      if (it) setTimeout(() => { if (P && curItem() === it) sayPractice(ty === 'picture' ? it.word : it.text); }, lastSaid && P.i === 0 ? 2600 : 150);
    }
  }

  function onInput(cands, code) {
    if (!P || P.ended) return;
    Audio.ctx();
    const ty = P.L.type;
    if (!P.t0) P.t0 = Date.now();
    if (ty === 'explore') return explorePress(cands, code);
    if (ty === 'balloon') return balloonPress(cands, code);
    const exp = expectedChar(); if (exp == null) return;
    P.keys++;
    if (K.matches(exp, cands, lenient())) {
      P.correct++; P.pos++; P.wrongStreak = 0; P.streak++;
      flashKey(code, true);
      if (P.pos >= curCps().length) return itemDone();
      Audio.sfx('key');
      paintPlay();
    } else {
      P.wrongStreak++; P.streak = 0;
      P.errChars[exp] = (P.errChars[exp] || 0) + 1;
      flashKey(code, false); Audio.sfx('wrong'); shake();
      if (P.wrongStreak >= 2) say('wrong', null, { cooldown: 7000 });
      paintHelper(); paintKb();
    }
  }

  function itemDone() {
    const ty = P.L.type;
    Audio.sfx(ty === 'space' ? 'hop' : 'correct', P.streak);
    if (ty === 'findkey' || ty === 'picture') say('correct');
    else if ((ty === 'words' || ty === 'sentences') && Math.random() < 0.35) say('correct', null, { cooldown: 6000 });
    if (ty === 'space') { const fr = $('frog'); if (fr) fr.style.transform = 'translateX(' + ((P.i + 1) * 100) + '%)'; }
    P.i++; P.pos = 0;
    if (ty === 'speed' && P.i >= P.items.length) { P.items = P.items.concat(K.makeItems(P.L, S.lang)); }
    if (P.i >= P.items.length) { setTimeout(finish, ty === 'space' ? 450 : 250); paintMeter(); return; }
    if (ty === 'space') { paintMeter(); paintKb(); return; }
    paintPlay(); armItem();
  }

  /* explore mode: every key is a little surprise */
  const EXPLORE_COLORS = ['var(--f-p)', 'var(--f-r)', 'var(--f-m)', 'var(--f-i)', 'var(--f-t)', 'var(--accent)'];
  function explorePress(cands, code) {
    const ch = cands[0] || cands[1]; if (!ch) return;
    P.explored++; P.keys++; P.correct++;
    const lay = K.LAYOUTS[S.lang]; const k = lay.byCode[code];
    let col = 6; if (k) lay.rows.forEach(r => { const i = r.indexOf(k); if (i >= 0) col = i; });
    Audio.sfx('correct', col);
    flashKey(code, true);
    const g = $('exg'), w = $('exw');
    const pic = K.CONTENT[S.lang].pictures.find(p => p[2] === ch || p[2] === ch.toLowerCase());
    if (g) { g.textContent = ch === ' ' ? '🐸' : K.displayChar(ch); g.style.color = EXPLORE_COLORS[P.explored % EXPLORE_COLORS.length]; g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); }
    if (w) w.textContent = pic ? pic[0] + ' ' + pic[1] : '';
    sayPractice(pic ? pic[1] : (ch === ' ' ? '' : ch));
    paintMeter();
    if (P.explored >= 20) setTimeout(finish, 400);
  }

  /* balloon game */
  let raf = 0, lastT = 0, spawnAcc = 0;
  const BAL_COLORS = ['var(--f-p)', 'var(--f-r)', 'var(--f-m)', 'var(--f-i)', 'var(--f-t)'];
  function startBalloons() { lastT = performance.now(); spawnAcc = P.L.every; raf = requestAnimationFrame(loop); }
  function stopGameLoop() { cancelAnimationFrame(raf); raf = 0; }
  function topBalloon() { let best = null; for (const b of P.balloons) if (!b.dead && (!best || b.y > best.y)) best = b; return best; }
  function loop(now) {
    if (!P || P.ended || P.L.type !== 'balloon') return;
    const dt = Math.min(50, now - lastT); lastT = now;
    const sky = $('sky'); if (!sky) return;
    const H = sky.clientHeight;
    spawnAcc += dt;
    if (P.spawned < P.L.count && (spawnAcc >= P.L.every || P.balloons.filter(b => !b.dead).length === 0)) {
      spawnAcc = 0;
      const ch = P.items[P.spawned].text; P.spawned++;
      const el = document.createElement('div'); el.className = 'balloon';
      el.textContent = K.displayChar(ch);
      el.style.background = BAL_COLORS[P.spawned % BAL_COLORS.length];
      el.style.left = (10 + Math.random() * 80) + '%';
      sky.appendChild(el);
      P.balloons.push({ ch, el, y: -80, dead: false });
      paintHelper(); paintKb();
    }
    let changed = false;
    for (const b of P.balloons) {
      if (b.dead) continue;
      b.y += P.L.speed * dt / 1000;
      b.el.style.setProperty('--t', 'translateY(' + (-b.y) + 'px)');
      b.el.style.transform = 'translateY(' + (-b.y) + 'px)';
      if (b.y > H + 10) { b.dead = true; b.el.remove(); P.escaped++; changed = true; }
    }
    if (changed) { paintHelper(); paintKb(); paintMeter(); }
    if (P.spawned >= P.L.count && P.balloons.every(b => b.dead)) { setTimeout(finish, 300); return; }
    raf = requestAnimationFrame(loop);
  }
  function balloonPress(cands, code) {
    P.keys++;
    const alive = P.balloons.filter(b => !b.dead && K.matches(b.ch, cands, lenient())).sort((a, b) => b.y - a.y);
    if (alive.length) {
      const b = alive[0]; b.dead = true; P.correct++; P.popped++; P.streak++;
      b.el.classList.add('boom'); setTimeout(() => b.el.remove(), 260);
      Audio.sfx('pop'); flashKey(code, true);
      if (P.streak > 0 && P.streak % 5 === 0) say('gameCheer', null, { cooldown: 5000 });
    } else {
      const tb = topBalloon(); if (tb) P.errChars[tb.ch] = (P.errChars[tb.ch] || 0) + 1;
      P.streak = 0; P.wrongStreak++; Audio.sfx('wrong'); flashKey(code, false);
    }
    paintHelper(); paintKb(); paintMeter();
  }

  /* speed test timer */
  function tickTimer() {
    if (!P || P.ended || P.L.type !== 'speed') return;
    const left = Math.max(0, P.deadline - Date.now());
    const el = $('timer'); if (el) el.textContent = '⏱ ' + Math.ceil(left / 1000) + 's';
    paintMeter();
    if (left <= 0) return finish();
    setTimeout(tickTimer, 250);
  }

  /* shared bookkeeping after any finished activity */
  function afterActivity() {
    if (!S.langsUsed.includes(S.lang)) S.langsUsed.push(S.lang);
    const td = today(), y = new Date(); y.setDate(y.getDate() - 1);
    if (S.streak.last !== td) { S.streak.days = S.streak.last === today(y) ? S.streak.days + 1 : 1; S.streak.last = td; }
    const lv = K.effectiveLevel(prog(), S.age);
    S.level[S.lang] = lv; S.maxLevel[S.lang] = Math.max(S.maxLevel[S.lang] || 0, lv);
    const newBadges = checkBadges();
    const stickerCount = Math.min(STICKERS.length, Math.floor(totalStars() / 5));
    const newSticker = stickerCount > S.stickers; S.stickers = stickerCount;
    return { newBadges, newSticker };
  }
  function celebrate(news) {
    news.newBadges.forEach((b, i) => setTimeout(() => { toast(b.icon + ' ' + t('newBadge', { name: badgeName(b) })); Audio.sfx('badge'); }, 900 + i * 900));
    if (news.newSticker) setTimeout(() => toast(STICKERS[S.stickers - 1] + ' ' + t('newSticker')), 900 + news.newBadges.length * 900);
    if (news.newBadges.length) setTimeout(() => say('badge', null, { cooldown: 2000 }), 4800);
  }

  function finish() {
    if (!P || P.ended) return;
    P.ended = true; clearTimeout(P.hintTimer); stopGameLoop();
    const L = P.L, ms = Math.max(1, Date.now() - (P.t0 || Date.now()));
    const acc = K.accuracy(P.correct, P.keys);
    let stars;
    if (L.type === 'explore') stars = 3;
    else if (L.type === 'balloon') { const r = P.popped / L.count; stars = r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1; }
    else stars = K.starsFor(acc);
    const speed = (L.level >= 2 && L.type !== 'balloon') ? K.wpm(P.correct, ms) : null;
    const pr = prog();
    const rec = pr[L.id] || (pr[L.id] = { stars: 0, plays: 0, bestAcc: 0, bestWpm: 0, lastAcc: 0 });
    const starsBefore = totalStars();
    rec.plays++; rec.lastAcc = acc; rec.bestAcc = Math.max(rec.bestAcc, acc); rec.stars = Math.max(rec.stars, stars);
    if (speed != null) rec.bestWpm = Math.max(rec.bestWpm || 0, speed);
    const gained = totalStars() - starsBefore;
    S.plays++; if (stars === 3) S.three++;
    if (acc === 100 && P.keys >= 10 && L.type !== 'explore') S.perfect = true;
    S.timeMs[S.lang] += ms;
    for (const c in P.errChars) S.keyErr[S.lang][c] = (S.keyErr[S.lang][c] || 0) + P.errChars[c];
    S.last = { type: 'lesson', id: L.id, lang: S.lang, done: true };
    if (EXT.onActivity) EXT.onActivity({ kind: 'typing', sid: P.sid, lang: S.lang, lesson: L.id, level: L.level, acc, stars, firstClear: rec.plays === 1 || gained > 0, ms });
    const news = afterActivity();
    saveNote();
    const weak = Object.entries(P.errChars).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const suggestAcc = L.type === 'balloon' ? Math.round(100 * P.popped / L.count) : acc;
    lastResult = { id: L.id, stars, acc, speed, ms, popped: P.popped, keys: P.keys, weak, suggest: K.suggestAfter(L.id, suggestAcc, stars), gained };
    screen = 'result';
    Audio.sfx(stars >= 2 ? 'win' : 'star');
    render();
    if (stars >= 2) say(gained === 1 ? 'star' : 'stars', { n: stars }); else say('tryMore');
    if (lastResult.suggest.kind === 'up' && stars === 3) setTimeout(() => { if (screen === 'result') say('ready'); }, 3200);
    celebrate(news);
  }

  const badgeName = b => b.n ? t('b_lv', { n: b.n }) : t('b_' + b.id);
  function badgeEarned(b) {
    const sp = LANGS.map(l => S.spell[l]);
    switch (b.id) {
      case 'first': return S.plays >= 1;
      case 'ten': return S.plays >= 10;
      case 'perfect': return S.perfect;
      case 'three5': return S.three >= 5;
      case 'streak3': return S.streak.days >= 3;
      case 'poly': return S.langsUsed.length >= 3;
      case 'speed20': return LANGS.some(l => Object.values(S.prog[l]).some(r => (r.bestWpm || 0) >= 20));
      case 'speller': return sp.some(s => s.games >= 1);
      case 'words50': return sp.reduce((a, s) => a + s.correct, 0) >= 50;
      case 'flags': return sp.some(s => Object.keys(s.best).some(k => k.startsWith('countries:') && s.best[k] >= 3));
      case 'flagspot': return LANGS.some(l => Object.values(S.flags[l].best).some(n => n >= 3));
      default: return LANGS.some(l => K.LESSONS.filter(x => x.level === b.n).every(x => S.prog[l][x.id] && S.prog[l][x.id].stars >= 1));
    }
  }
  function checkBadges() {
    const out = [];
    BADGES.forEach(b => { if (!S.badges.includes(b.id) && badgeEarned(b)) { S.badges.push(b.id); out.push(b); } });
    return out;
  }

  function resultHTML() {
    const R = lastResult, L = K.LESSON_BY_ID[R.id];
    const stat = (v, l) => '<div class="stat"><div class="v">' + v + '</div><div class="l">' + esc(l) + '</div></div>';
    let stats = '';
    if (L.type === 'balloon') stats += stat(R.popped + '/' + L.count, t('popped'));
    else if (L.type === 'explore') stats += stat(R.keys, t('keysPressed'));
    else stats += stat(R.acc + '%', t('accuracy'));
    if (R.speed != null) stats += stat(R.speed + ' <small>' + esc(t('wpm')) + '</small>', t('speed'));
    stats += stat(Math.floor(R.ms / 60000) + ':' + String(Math.round(R.ms / 1000) % 60).padStart(2, '0'), t('time'));
    const sug = K.LESSON_BY_ID[R.suggest.id];
    const sugLbl = { up: 'suggestUp', down: 'suggestDown', again: 'suggestAgain' }[R.suggest.kind];
    const nextL = K.LESSONS[L.index + 1];
    return '<section class="result"><div class="bigstars" aria-label="' + R.stars + '/3">' + [0, 1, 2].map(i => i < R.stars ? '<span class="s">★</span>' : '★').join('') + '</div>' +
      '<h1>' + esc(R.stars >= 2 ? pick(t('great')) : t('tryMore')) + '</h1><div class="stats">' + stats + '</div>' +
      (R.weak.length ? '<p class="weak">' + esc(t('weakKeys')) + ' ' + R.weak.map(c => '<span class="kc">' + esc(K.displayChar(c)) + '</span>').join('') + '</p>' : '') +
      '<div class="suggest"><span>' + esc(t(sugLbl)) + ' <strong>' + sug.icon + ' ' + esc(lessonName(sug)) + '</strong></span><button class="cap small primary" data-act="startLesson" data-v="' + sug.id + '">▶ ' + esc(t('play')) + '</button></div>' +
      '<div class="actions"><button class="cap" data-act="startLesson" data-v="' + L.id + '">↻ ' + esc(t('again')) + '</button>' +
      (nextL ? '<button class="cap" data-act="startLesson" data-v="' + nextL.id + '">' + esc(t('next')) + ' →</button>' : '') +
      '<button class="cap" data-act="go" data-v="map">' + esc(t('map')) + '</button></div></section>';
  }

  /* ---------- pictures for vocabulary: emoji, flags, colours, shapes ---------- */
  function starPts(cx, cy, r) { const p = []; for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r * 0.382 : r; p.push((cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2)); } return p.join(' '); }
  const star = (cx, cy, r, fill) => '<polygon points="' + starPts(cx, cy, r) + '" fill="' + fill + '"/>';
  const h3 = (a, b, c) => '<rect width="30" height="20" fill="' + a + '"/><rect y="6.67" width="30" height="6.67" fill="' + b + '"/><rect y="13.33" width="30" height="6.67" fill="' + c + '"/>';
  const v3 = (a, b, c) => '<rect width="30" height="20" fill="' + a + '"/><rect x="10" width="10" height="20" fill="' + b + '"/><rect x="20" width="10" height="20" fill="' + c + '"/>';
  const h2 = (a, b) => '<rect width="30" height="20" fill="' + a + '"/><rect y="10" width="30" height="10" fill="' + b + '"/>';
  const nordic = (bg, outer, inner) => '<rect width="30" height="20" fill="' + bg + '"/><rect x="8.2" width="5.5" height="20" fill="' + outer + '"/><rect y="7.5" width="30" height="5" fill="' + outer + '"/>' +
    (inner ? '<rect x="9.6" width="2.7" height="20" fill="' + inner + '"/><rect y="8.75" width="30" height="2.5" fill="' + inner + '"/>' : '');
  const FLAGS = {
    th: '<rect width="30" height="20" fill="#A51931"/><rect y="3.33" width="30" height="13.34" fill="#F4F5F8"/><rect y="6.67" width="30" height="6.66" fill="#2D2A4A"/>',
    jp: '<rect width="30" height="20" fill="#FFFFFF"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>',
    se: '<rect width="30" height="20" fill="#006AA7"/><rect x="9.4" width="3.75" height="20" fill="#FECC00"/><rect y="8" width="30" height="4" fill="#FECC00"/>',
    no: nordic('#BA0C2F', '#FFFFFF', '#00205B'), is: nordic('#02529C', '#FFFFFF', '#DC1E35'),
    dk: '<rect width="30" height="20" fill="#C8102E"/><rect x="9" width="3" height="20" fill="#FFFFFF"/><rect y="8.5" width="30" height="3" fill="#FFFFFF"/>',
    fi: '<rect width="30" height="20" fill="#FFFFFF"/><rect x="8.3" width="5" height="20" fill="#002F6C"/><rect y="7.5" width="30" height="5" fill="#002F6C"/>',
    de: h3('#000000', '#DD0000', '#FFCE00'), nl: h3('#AE1C28', '#FFFFFF', '#21468B'), at: h3('#C8102E', '#FFFFFF', '#C8102E'),
    fr: v3('#0055A4', '#FFFFFF', '#EF4135'), it: v3('#009246', '#FFFFFF', '#CE2B37'), ie: v3('#169B62', '#FFFFFF', '#FF883E'), be: v3('#000000', '#FDDA24', '#EF3340'),
    pl: h2('#FFFFFF', '#DC143C'), ua: h2('#0057B7', '#FFD700'), id: h2('#CE1126', '#FFFFFF'),
    es: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>',
    ch: '<rect width="30" height="20" fill="#DA291C"/><rect x="13" y="4" width="4" height="12" fill="#FFFFFF"/><rect x="9" y="8" width="12" height="4" fill="#FFFFFF"/>',
    cn: '<rect width="30" height="20" fill="#DE2910"/>' + star(5, 5, 3, '#FFDE00') + star(10, 2, 1, '#FFDE00') + star(12, 4, 1, '#FFDE00') + star(12, 7, 1, '#FFDE00') + star(10, 9, 1, '#FFDE00'),
    vn: '<rect width="30" height="20" fill="#DA251D"/>' + star(15, 10, 6, '#FFFF00'),
    gr: Array.from({ length: 9 }, (_, i) => '<rect y="' + (i * 20 / 9).toFixed(3) + '" width="30" height="2.23" fill="' + (i % 2 ? '#FFFFFF' : '#0D5EAF') + '"/>').join('') +
      '<rect width="11.11" height="11.11" fill="#0D5EAF"/><rect y="4.44" width="11.11" height="2.23" fill="#FFFFFF"/><rect x="4.44" width="2.23" height="11.11" fill="#FFFFFF"/>'
  };
  const SHAPES = {
    circle: '<circle cx="50" cy="50" r="40"/>', triangle: '<polygon points="50,10 92,88 8,88"/>', square: '<rect x="14" y="14" width="72" height="72" rx="4"/>',
    star: '<polygon points="' + starPts(50, 54, 44) + '"/>', heart: '<path d="M50 88 C20 66 6 50 6 32 C6 18 18 8 31 8 C40 8 47 13 50 20 C53 13 60 8 69 8 C82 8 94 18 94 32 C94 50 80 66 50 88Z"/>',
    rectangle: '<rect x="6" y="26" width="88" height="48" rx="4"/>', oval: '<ellipse cx="50" cy="50" rx="44" ry="30"/>'
  };
  function picHTML(pic, small) {
    if (pic.startsWith('flag:')) return '<svg class="flag" viewBox="0 0 30 20" role="img" aria-label="flag">' + FLAGS[pic.slice(5)] + '</svg>';
    if (pic.startsWith('color:')) return '<svg class="picsvg" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 C72 8 92 24 92 48 C92 74 74 92 50 92 C24 92 8 76 8 52 C8 26 28 8 50 8Z" fill="' + pic.slice(6) + '" stroke="var(--line)" stroke-width="3"/></svg>';
    if (pic.startsWith('shape:')) return '<svg class="picsvg" viewBox="0 0 100 100" aria-hidden="true"><g fill="var(--f-t)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round">' + SHAPES[pic.slice(6)] + '</g></svg>';
    return small ? pic : '<div class="emoji pop" aria-hidden="true">' + pic + '</div>';
  }

  /* ---------- Spelling Challenge ---------- */
  function spellHomeHTML() {
    const sp = S.spell[S.lang], cat = S.spellCat, d = S.spellD;
    const best = (c, dd) => sp.best[c + ':' + dd] || 0;
    let h = '<div class="sphead"><h1>🔤 ' + esc(t('spellTitle')) + '</h1><span class="pill">' + esc(t('practiceLang')) + ': ' + esc(t('lang_' + S.lang)) + '</span>' +
      '<button class="cap small" data-act="go" data-v="flags">🚩 ' + esc(t('flagTitle')) + '</button></div>';
    if (sp.session) {
      const s = sp.session;
      h += '<div class="suggest" style="display:flex;justify-content:space-between"><span>⏸ ' + esc(t('continueGame')) + ': <strong>' + esc(s.review ? t('reviewTitle') : t('c_' + s.cat)) + ' · ' + esc(t('d' + s.d)) + ' (' + (s.i + 1) + '/' + s.ids.length + ')</strong></span><button class="cap small primary" data-act="spResume">▶ ' + esc(t('continueBtn')) + '</button></div>';
    }
    if (sp.missed.length) h += '<p><button class="cap" data-act="spReview">🔁 ' + esc(t('reviewMissed', { n: sp.missed.length })) + '</button></p>';
    h += '<section class="spsec"><h2>1. ' + esc(t('chooseCat')) + '</h2><div class="tiles">';
    for (const c in K.VOCAB) {
      const top = Math.max(0, ...[1, 2, 3, 4].map(x => best(c, x)));
      h += '<button class="cap tile ' + (c === cat ? 'on' : '') + '" data-act="spCat" data-v="' + c + '" aria-pressed="' + (c === cat) + '"><span class="ic" aria-hidden="true">' + K.VOCAB[c].icon + '</span><span class="nm">' + esc(t('c_' + c)) + '</span><span class="cnt">' + esc(t('words', { n: K.VOCAB[c].items.length })) + '</span>' + starStr(top) + '</button>';
    }
    h += '</div></section><section class="spsec"><h2>2. ' + esc(t('chooseLevel')) + '</h2><div class="dlv">';
    for (let x = 1; x <= 4; x++) h += '<button class="cap ' + (x === d ? 'on' : '') + '" data-act="spD" data-v="' + x + '" aria-pressed="' + (x === d) + '"><b>' + x + ' · ' + esc(t('d' + x)) + '</b><span>' + esc(t('d' + x + 'x')) + '</span>' + starStr(best(cat, x)) + '</button>';
    h += '</div></section><button class="cap primary" data-act="spStart">▶ ' + esc(t('play')) + ': ' + K.VOCAB[cat].icon + ' ' + esc(t('c_' + cat)) + ' · ' + esc(t('d' + d)) + '</button>';
    return h;
  }

  function startSpell(sess) {
    P = null; oskShift = false;
    SG = Object.assign({ lang: S.lang, keys: 0, sid: uid(), t0: Date.now() }, sess);
    if (!SG.mini) { S.last = { type: 'spell', cat: SG.cat, review: !!SG.review, lang: S.lang, done: false }; saveSession(); }
    screen = 'spellplay'; render();
    if (!SG.mini) say('intro_spell');
    armWord(!SG.mini);
  }
  function newSpellGame(cat, d, review) {
    const ids = review ? S.spell[S.lang].missed.slice(0, 8) : K.spellPool(cat, S.lang, d, 8);
    const max = ids.length * K.spellPoints(d, 'first', 0);
    startSpell({ cat, d, review: !!review, ids, i: 0, score: 0, max, results: [] });
  }
  function saveSession() {
    if (!SG || SG.mini) return;   /* a one-word practice from the flag game is not a game of its own */
    S.spell[SG.lang].session = { sid: SG.sid, t0: SG.t0, cat: SG.cat, d: SG.d, review: SG.review, ids: SG.ids, i: SG.i, score: SG.score, max: SG.max, results: SG.results };
    save();
  }
  const spItem = () => K.VOCAB_INDEX[SG.ids[SG.i]];
  function armWord(first) {
    const it = spItem(); if (!it) return spellFinish();
    const cps = Array.from(it.word[SG.lang]);
    SG.w = { it, cps, buf: [], pos: 0, tries: 0, hints: 0, wrong: 0, phase: SG.d === 1 ? 'copy' : SG.d === 2 ? 'gated' : 'free',
      reveal: SG.d === 2 ? 1 : 0, hintKey: false, peek: false, marks: null, locked: false, shown: false };
    paintSpell();
    setTimeout(() => { if (SG && SG.w && SG.w.it === it) speakWord(); }, first ? 2800 : 300);
  }
  function speakWord() { if (SG && SG.w) sayPractice(SG.w.cps.join(''), SG.lang); }
  function spellHint() {
    const w = SG && SG.w; if (!w || w.phase === 'done') return { ch: null };
    if (w.phase === 'copy' || w.phase === 'gated') return { ch: w.cps[w.pos], show: w.phase === 'copy' || w.hintKey || w.wrong >= 2, lenient: SG.d <= 2 || w.shown };
    for (let i = 0; i < w.buf.length; i++) if (w.buf[i] !== w.cps[i]) return { code: 'Backspace', show: w.hintKey };
    return { ch: w.cps[w.buf.length] ?? null, show: w.hintKey, lenient: false };
  }

  function spellPlayHTML() {
    return '<div class="play"><div class="playbar"><button class="cap small" data-act="spQuit">✕ ' + esc(t('quit')) + '</button>' +
      '<span class="ttl">' + (SG.mini ? '🚩 ' + esc(t('typeCountry')) : '🔤 ' + esc(SG.review ? t('reviewTitle') : t('c_' + SG.cat)) + ' · ' + esc(t('d' + SG.d))) + '</span><div class="meter" aria-hidden="true"><span id="meter" style="width:0%"></span></div>' +
      '<span class="score" id="spscore"></span><span class="capswarn" id="caps" hidden>⇪ ' + esc(t('capsOn')) + '</span></div>' + saveWarnHTML() +
      buddyHTML() + '<div class="stage" id="stage"></div><div class="helper" id="helper"></div><div class="kb" id="kb">' + kbHTML() + '</div>' +
      '<p class="kbnote">' + esc(t('noKeyboard')) + '</p></div>';
  }

  function boxesHTML(w) {
    const tg = K.graphemes(w.cps.join(''));
    let cells;
    if (w.phase === 'gated') {
      cells = tg.map((g, i) => {
        if (g.text === ' ') return '<span class="box gap">' + (w.pos > g.start ? '' : '·') + '</span>';
        if (w.pos >= g.end) return '<span class="box ok">' + esc(g.text) + '</span>';
        if (w.pos > g.start) return '<span class="box cur">' + esc(w.cps.slice(g.start, w.pos).join('')) + '</span>';
        const ghost = i < w.reveal;
        return '<span class="box ' + (w.pos === g.start ? 'cur ' : '') + (ghost ? 'ghost' : '') + '">' + (ghost ? esc(g.text) : '') + '</span>';
      });
    } else {
      const yg = K.graphemes(w.buf.join(''));
      const n = Math.max(tg.length, yg.length);
      cells = [];
      for (let i = 0; i < n; i++) {
        const y = yg[i], g = tg[i];
        let cls = '';
        if (w.marks && y) cls = w.marks[i] ? 'ok' : 'bad';
        else if (!g) cls = 'bad';
        if (!y && i === yg.length) cls += ' cur';
        if (g && g.text === ' ' && !y) { cells.push('<span class="box gap">·</span>'); continue; }
        const ghost = !y && g && i < w.reveal;
        cells.push('<span class="box ' + cls + (ghost ? ' ghost' : '') + '">' + (y ? esc(y.text) : ghost ? esc(g.text) : '') + '</span>');
      }
    }
    return '<div class="boxes" aria-live="polite">' + cells.join('') + '</div>';
  }
  function freeLineHTML(w) {
    const yg = K.graphemes(w.buf.join(''));
    return '<div class="ansline" aria-live="polite">' + yg.map((g, i) => '<span class="' + (w.marks ? (w.marks[i] ? 'ok' : 'bad') : '') + '">' + (g.text === ' ' ? '&nbsp;' : esc(g.text)) + '</span>').join('') + (w.locked ? '' : '<span class="caret"></span>') + '</div>';
  }

  function spellStageHTML() {
    const w = SG.w; if (!w) return '';
    const it = w.it;
    const info = it.info ? '<p class="info">' + esc(t('capital', { c: it.info[SG.lang] })) + '</p>' : '';
    let ans;
    if (w.phase === 'done') ans = '<div class="doneword pop">✓ ' + esc(w.cps.join('')) + '</div>';
    else if (w.phase === 'copy') ans = '<p class="prompt">' + esc(w.shown ? t('answerWas') : t('typeThis')) + '</p>' + copyLineHTML(w.cps, w.pos) + (w.shown ? '<p class="prompt">' + esc(t('typeItNow')) + '</p>' : '');
    else ans = '<p class="prompt">' + esc(t('spellWhat')) + '</p>' + (w.peek ? '<div class="peekword">' + esc(w.cps.join('')) + '</div>' : '') +
      (w.phase === 'gated' || SG.d === 3 ? boxesHTML(w) : freeLineHTML(w));
    const voiceOk = !!Audio.voiceFor(SG.lang) && S.voice;
    const limit = HINT_LIMIT[SG.d], left = limit - w.hints;
    let tools = '<button class="cap small" data-act="spListen"' + (voiceOk ? '' : ' disabled title="' + esc(t('noVoiceWord')) + '"') + '>🔊 ' + esc(t('listen')) + '</button>';
    if (limit && (w.phase === 'gated' || w.phase === 'free')) tools += '<button class="cap small" data-act="spHint"' + (left > 0 ? '' : ' disabled') + '>💡 ' + esc(t('hint')) + ' · ' + esc(t('hintsLeft', { n: left })) + '</button>';
    if (w.phase === 'free') tools += '<button class="cap small" data-act="spErase">⌫ ' + esc(t('erase')) + '</button><button class="cap small primary" data-act="spCheck"' + (w.buf.length ? '' : ' disabled') + '>✓ ' + esc(t('check')) + '</button>';
    return '<div class="spgrid" id="tgt"><div class="sppic">' + picHTML(it.pic) + info + '</div><div class="spans">' + ans +
      (w.phase === 'done' ? '' : '<div class="tools">' + tools + '</div>') + (voiceOk ? '' : '<p class="info">' + esc(t('noVoiceWord')) + '</p>') + '</div></div>';
  }
  function paintSpell() {
    if (!SG || screen !== 'spellplay') return;
    const st = $('stage'); if (st) st.innerHTML = spellStageHTML();
    const sc = $('spscore'); if (sc) sc.textContent = '★ ' + SG.score;
    paintHelper(); paintKb(); paintMeter();
  }

  function spellInput(cands, code) {
    const w = SG && SG.w; if (!w || w.locked || w.phase === 'done') return;
    Audio.ctx(); SG.keys++;
    if (w.phase === 'free') {
      if (code === 'Backspace') { if (w.buf.length) { w.buf.pop(); w.marks = null; Audio.sfx('click'); paintSpell(); } return; }
      if (code === 'Enter') { if (w.buf.length) spellCheck(); return; }
      const ch = cands[0] || cands[1]; if (!ch || w.buf.length >= w.cps.length + 4) return;
      w.buf.push(ch); w.marks = null; Audio.sfx('key'); flashKey(code, true); paintSpell();
      if (w.buf.length === w.cps.length) setTimeout(() => { if (SG && SG.w === w && !w.locked && w.buf.length === w.cps.length) spellCheck(); }, 350);
      return;
    }
    if (code === 'Backspace' || code === 'Enter') return;
    const exp = w.cps[w.pos];
    if (K.matches(exp, cands, SG.d <= 2 || w.shown)) {
      w.pos++; flashKey(code, true);
      if (w.pos >= w.cps.length) return wordDone(w.shown ? 'shown' : w.wrong <= 1 ? 'first' : 'second');
      Audio.sfx('key'); paintSpell();
    } else {
      w.wrong++; flashKey(code, false); Audio.sfx('wrong'); shake();
      if (w.wrong >= 2) say('wrong', null, { cooldown: 7000 });
      paintHelper(); paintKb();
    }
  }
  function spellCheck() {
    const w = SG.w; if (!w || w.locked || w.phase !== 'free') return;
    w.locked = true; w.tries++;
    const r = K.checkSpelling(w.buf.join(''), w.cps.join(''));
    if (r.kind === 'exact') return wordDone(w.tries === 1 ? 'first' : 'second');
    if (r.kind === 'case') { toast(t('capitalTip', { w: w.cps.join('') })); return wordDone(w.tries === 1 ? 'case' : 'second'); }
    w.marks = r.marks; Audio.sfx('wrong'); paintSpell(); shake();
    if (w.tries < 2) {
      say('almost');
      setTimeout(() => {
        if (!SG || SG.w !== w) return;
        let k = 0; while (k < w.buf.length && w.buf[k] === w.cps[k]) k++;   /* keep the part that was right */
        w.buf = w.buf.slice(0, k); w.marks = null; w.locked = false; w.hintKey = SG.d === 3; paintSpell();
      }, 1500);
    } else {
      say('showAnswer');
      setTimeout(() => {
        if (!SG || SG.w !== w) return;
        w.phase = 'copy'; w.shown = true; w.pos = 0; w.buf = []; w.marks = null; w.locked = false; paintSpell(); speakWord();
      }, 1700);
    }
  }
  function spHint() {
    const w = SG && SG.w; if (!w || w.phase === 'done' || w.phase === 'copy') return;
    if (w.hints >= HINT_LIMIT[SG.d]) return;
    w.hints++;
    const tg = K.graphemes(w.cps.join(''));
    const peek = () => { w.peek = true; paintSpell(); setTimeout(() => { if (SG && SG.w === w) { w.peek = false; paintSpell(); } }, 1800); };
    if (SG.d === 2) { const cur = tg.findIndex(g => w.pos < g.end); w.reveal = Math.max(w.reveal, cur + 1); w.hintKey = true; }
    else if (SG.d === 3) { if (w.hints === 1) { w.reveal = 1; w.hintKey = true; } else if (w.hints === 2) w.reveal = Math.ceil(tg.length / 2); else peek(); }
    else peek();
    Audio.sfx('whoosh'); speakWord(); paintSpell();
  }
  function wordDone(how) {
    const w = SG.w; w.phase = 'done'; w.locked = true;
    const pts = K.spellPoints(SG.d, how, w.hints);
    SG.score += pts; SG.results.push({ id: w.it.id, how, pts });
    const sp = S.spell[SG.lang];
    sp.practised++; sp.attempts += Math.max(1, w.tries);
    if (how !== 'shown') sp.correct++;
    const cs = sp.cats[w.it.cat] || (sp.cats[w.it.cat] = { practised: 0, correct: 0 });
    cs.practised++; if (how === 'first' || how === 'case') cs.correct++;
    const mi = sp.missed.indexOf(w.it.id);
    if (how === 'first' || how === 'case') { if (mi >= 0) sp.missed.splice(mi, 1); }
    else if (mi < 0) sp.missed.push(w.it.id);
    Audio.sfx('correct', SG.i * 2); setTimeout(() => Audio.sfx('star'), 180);
    if (how === 'first' || how === 'case') say('correct');
    paintSpell();
    SG.i++; saveSession();
    setTimeout(() => {
      if (!SG || screen !== 'spellplay') return;
      if (SG.mini) { save(); backToFlags(SG.score); return; }
      if (SG.i >= SG.ids.length) spellFinish(); else armWord(false);
    }, 1500);
  }
  function spellFinish() {
    const sp = S.spell[SG.lang];
    const stars = K.spellStars(SG.score, SG.max);
    const starsBefore = totalStars();
    if (!SG.review) { const k = SG.cat + ':' + SG.d; sp.best[k] = Math.max(sp.best[k] || 0, stars); }
    sp.games++; sp.session = null;
    if (EXT.onActivity) EXT.onActivity({ kind: 'spell', sid: SG.sid, lang: SG.lang, cat: SG.cat, d: SG.d, review: !!SG.review, score: SG.score, max: SG.max, stars, ms: Date.now() - (SG.t0 || Date.now()) });
    else S.points += SG.score;
    S.last = { type: 'spell', cat: SG.cat, review: !!SG.review, lang: SG.lang, done: true };
    const gained = totalStars() - starsBefore;
    const news = afterActivity();
    saveNote();
    lastSpell = { cat: SG.cat, d: SG.d, review: SG.review, score: SG.score, max: SG.max, stars, results: SG.results, lang: SG.lang };
    SG = null; screen = 'spellres';
    Audio.sfx(stars >= 2 ? 'win' : 'star');
    render();
    if (stars >= 2) say(gained === 1 ? 'star' : 'stars', { n: stars }); else say('tryMore');
    celebrate(news);
  }
  function spellResultHTML() {
    const R = lastSpell;
    const first = R.results.filter(r => r.how === 'first' || r.how === 'case').length;
    const missed = S.spell[S.lang].missed.length;
    const icon = { first: '✅', case: '✅', second: '🟡', shown: '🔁' };
    const lbl = { first: t('firstTry'), case: t('firstTry'), second: t('secondTry'), shown: t('shown') };
    return '<section class="result"><div class="bigstars" aria-label="' + R.stars + '/3">' + [0, 1, 2].map(i => i < R.stars ? '<span class="s">★</span>' : '★').join('') + '</div>' +
      '<h1>' + esc(R.stars >= 2 ? pick(t('great')) : t('tryMore')) + '</h1><div class="stats">' +
      '<div class="stat"><div class="v">' + R.score + '/' + R.max + '</div><div class="l">' + esc(t('points')) + '</div></div>' +
      '<div class="stat"><div class="v">' + first + '/' + R.results.length + '</div><div class="l">' + esc(t('firstTry')) + '</div></div></div>' +
      '<ul class="wordlist">' + R.results.map(r => { const it = K.VOCAB_INDEX[r.id]; return '<li><span class="mini">' + picHTML(it.pic, true) + '</span><span class="w">' + esc(it.word[R.lang]) + '</span><span title="' + esc(lbl[r.how]) + '" aria-label="' + esc(lbl[r.how]) + '">' + icon[r.how] + '</span></li>'; }).join('') + '</ul>' +
      '<div class="actions">' + (R.review ? '' : '<button class="cap primary" data-act="spAgain">↻ ' + esc(t('again')) + '</button>') +
      (missed ? '<button class="cap" data-act="spReview">🔁 ' + esc(t('reviewMissed', { n: missed })) + '</button>' : '') +
      '<button class="cap" data-act="go" data-v="spell">' + esc(t('playOther')) + '</button><button class="cap" data-act="go" data-v="map">' + esc(t('map')) + '</button></div></section>';
  }

  /* ---------- Guess the Country by Flag ---------- */
  const FLAG_SECONDS = 15;
  const MINI_SPELL_D = { 1: 1, 2: 2, 3: 2, 4: 3 };
  const flagSVG = (code, cls) => '<svg class="flag ' + (cls || '') + '" viewBox="0 0 30 20" role="img" aria-label="' + esc(t('flagTitle')) + '">' + FLAGS[code] + '</svg>';
  const cname = (code, lang) => K.VOCAB_INDEX['countries:' + code].word[lang || (FG ? FG.lang : S.lang)];

  function flagHomeHTML() {
    const fl = S.flags[S.lang], d = S.flagD;
    let h = '<div class="sphead"><h1>🚩 ' + esc(t('flagTitle')) + '</h1><span class="pill">' + esc(t('practiceLang')) + ': ' + esc(t('lang_' + S.lang)) + '</span></div>';
    if (fl.session) {
      const s = fl.session;
      h += '<div class="suggest" style="display:flex;justify-content:space-between"><span>⏸ ' + esc(t('continueGame')) + ': <strong>' + esc(t('d' + s.d)) + ' (' + Math.min(s.i + 1, s.qs.length) + '/' + s.qs.length + ')</strong></span><button class="cap small primary" data-act="fgResume">▶ ' + esc(t('continueBtn')) + '</button></div>';
    }
    h += '<section class="spsec"><h2>' + esc(t('chooseLevel')) + '</h2><div class="dlv">';
    for (let x = 1; x <= 4; x++) h += '<button class="cap ' + (x === d ? 'on' : '') + '" data-act="fgD" data-v="' + x + '" aria-pressed="' + (x === d) + '"><b>' + x + ' · ' + esc(t('d' + x)) + ' · ' + esc(t('ages', { a: AGE_RANGES[x - 1][1] })) + '</b><span>' + esc(t('fd' + x + 'x')) + '</span>' + starStr(fl.best[x] || 0) + '</button>';
    h += '</div>';
    if (d === 4) h += '<div class="toggles"><div class="row"><label for="fg-timed">⏱ ' + esc(t('timed')) + ' (' + esc(t('optional')) + ')</label><input id="fg-timed" type="checkbox" data-fset="flagTimed"' + (S.flagTimed ? ' checked' : '') + '></div>' +
      '<div class="row"><label for="fg-hide">🙈 ' + esc(t('hideChoices')) + '</label><input id="fg-hide" type="checkbox" data-fset="flagHide"' + (S.flagHide ? ' checked' : '') + '></div></div>';
    h += '</section><div class="actions" style="justify-content:flex-start"><button class="cap primary" data-act="fgStart">▶ ' + esc(t('play')) + ': ' + esc(t('d' + d)) + '</button>' +
      '<button class="cap" data-act="fgToSpell">🔤 ' + esc(t('spellTitle')) + ': ' + esc(t('c_countries')) + '</button></div>';
    return h;
  }

  function newFlagGame() {
    const d = S.flagD, qs = K.flagRound(d, S.flags[S.lang].missed, 8);
    startFlags({ d, timed: d === 4 && S.flagTimed, hide: d === 4 && S.flagHide, qs, i: 0, score: 0, max: qs.length * K.flagPoints(d, 'first'), results: [] });
  }
  function startFlags(sess) {
    leavePlay();
    FG = Object.assign({ lang: S.lang, tick: 0, bonus: 0, sid: uid(), t0: Date.now() }, sess);
    S.last = { type: 'flags', lang: S.lang, done: false };
    screen = 'flagplay'; render();
    say('intro_flags');
    armFlag(true);
  }
  function saveFlagSession() {
    if (!FG) return;
    const i = FG.q && FG.q.done ? FG.i + 1 : FG.i;   /* an answered question is not asked again after a reload */
    S.flags[FG.lang].session = i >= FG.qs.length ? null : { sid: FG.sid, t0: FG.t0, d: FG.d, timed: FG.timed, hide: FG.hide, qs: FG.qs, i, score: FG.score, bonus: FG.bonus, max: FG.max, results: FG.results };
    save();
  }
  function armFlag(first) {
    clearInterval(FG.tick);
    const q = FG.qs[FG.i]; if (!q) return flagFinish();
    FG.q = { code: q.code, opts: q.opts, tries: 0, picked: [], removed: [], done: false, timedOut: false, shown: !FG.hide, hinted: false, spelled: false, langs: false, t0: Date.now() };
    saveFlagSession();
    paintFlag();
    if (FG.d <= 2 && !first) setTimeout(() => { if (FG && FG.q && !FG.q.done) say('flagAsk'); }, 200);
    if (FG.timed && FG.q.shown) startFlagTimer();
  }
  function startFlagTimer() {
    const q = FG.q; q.deadline = Date.now() + FLAG_SECONDS * 1000; q.t0 = Date.now();
    clearInterval(FG.tick);
    FG.tick = setInterval(() => {
      if (!FG || FG.q !== q || q.done) { clearInterval(FG && FG.tick); return; }
      const left = q.deadline - Date.now(), bar = $('tbar');
      if (bar) bar.style.width = Math.max(0, 100 * left / (FLAG_SECONDS * 1000)) + '%';
      if (left <= 0) { clearInterval(FG.tick); q.timedOut = true; Audio.sfx('wrong'); paintFlag(); }
    }, 200);
  }
  function flagPick(code) {
    const q = FG && FG.q; if (!q || q.done || !q.shown || !q.opts.includes(code)) return;
    if (q.picked.includes(code) || q.removed.includes(code)) return;
    if (q.timedOut && code !== q.code) return;
    Audio.ctx();
    if (code === q.code) {
      clearInterval(FG.tick); q.done = true;
      const how = q.timedOut ? 'late' : q.tries === 0 ? 'first' : 'second';
      const pts = K.flagPoints(FG.d, how);
      if (FG.timed && how === 'first' && Date.now() - q.t0 < 8000) FG.bonus += 5;   /* quick-answer bonus in the timed challenge */
      FG.score += pts; FG.results.push({ code, how, pts });
      const st = S.flags[FG.lang];
      st.answered++; st.attempts += q.tries + 1;
      if (how === 'first') { st.correct++; if (st.missed[code]) { st.missed[code]--; if (!st.missed[code]) delete st.missed[code]; } }
      else st.missed[code] = (st.missed[code] || 0) + 1;
      Audio.sfx('correct', FG.i * 2); setTimeout(() => Audio.sfx('star'), 160);
      say('correct');
      setTimeout(() => { if (FG && FG.q === q) sayPractice(cname(code), FG.lang); }, 1900);
      saveFlagSession(); paintFlag();
      if (FG.d === 4) setTimeout(() => { if (FG && FG.q === q && !q.spelled && screen === 'flagplay') { say('typeCountry'); flagSpell(); } }, 1800);
    } else {
      q.tries++; q.picked.push(code);
      Audio.sfx('wrong'); say('flagNearly', null, { cooldown: 6000 });
      paintFlag(); shake();
    }
  }
  function flagSpell() {
    const q = FG && FG.q; if (!q || !q.done) return;
    clearInterval(FG.tick);
    const d = MINI_SPELL_D[FG.d];
    startSpell({ cat: 'countries', d, ids: ['countries:' + q.code], i: 0, score: 0, max: K.spellPoints(d, 'first', 0), results: [], mini: true });
  }
  /* back from the one-word spelling practice into the flag game */
  function backToFlags(pts) {
    SG = null;
    if (!FG) { screen = 'flags'; render(); return; }
    if (pts != null) { FG.bonus += pts; FG.q.spelled = true; }   /* spelling points are a bonus; stars come from the flag answers */
    screen = 'flagplay'; render(); saveFlagSession();
  }
  function flagNext() {
    if (!FG || !FG.q || !FG.q.done) return;
    FG.i++;
    if (FG.i >= FG.qs.length) flagFinish(); else armFlag(false);
  }
  function flagFinish() {
    clearInterval(FG.tick);
    const st = S.flags[FG.lang];
    const stars = K.spellStars(FG.score, FG.max);
    const starsBefore = totalStars();
    st.best[FG.d] = Math.max(st.best[FG.d] || 0, stars); st.played++; st.session = null;
    if (EXT.onActivity) EXT.onActivity({ kind: 'flags', sid: FG.sid, lang: FG.lang, d: FG.d, score: FG.score + FG.bonus, max: FG.max, stars, ms: Date.now() - (FG.t0 || Date.now()) });
    else S.points += FG.score + FG.bonus;
    S.last = { type: 'flags', lang: FG.lang, done: true };
    const gained = totalStars() - starsBefore;
    const news = afterActivity();
    saveNote();
    lastFlag = { d: FG.d, score: FG.score, bonus: FG.bonus, max: FG.max, stars, results: FG.results, lang: FG.lang };
    FG = null; screen = 'flagres';
    Audio.sfx(stars >= 2 ? 'win' : 'star');
    render();
    if (stars >= 2) say(gained === 1 ? 'star' : 'stars', { n: stars }); else say('tryMore');
    celebrate(news);
  }

  function flagPlayHTML() {
    return '<div class="play"><div class="playbar"><button class="cap small" data-act="fgQuit">✕ ' + esc(t('quit')) + '</button>' +
      '<span class="ttl">🚩 ' + esc(t('flagTitle')) + ' · ' + esc(t('d' + FG.d)) + '</span><div class="meter" aria-hidden="true"><span id="meter" style="width:0%"></span></div>' +
      '<span class="score" id="fgscore"></span></div>' + saveWarnHTML() + buddyHTML() + '<div class="stage" id="stage"></div></div>';
  }
  function flagStageHTML() {
    const q = FG.q; if (!q) return '';
    const reveal = q.timedOut || (FG.d === 1 && q.hinted) || (q.tries > 0 && (FG.d <= 2 || q.tries >= 2));
    let h = '<div class="fq" id="tgt"><p class="prompt">' + esc(t('questionN', { i: FG.i + 1, n: FG.qs.length })) + '</p>' + flagSVG(q.code, 'big') + '<h2>' + esc(t('flagQ')) + '</h2>';
    if (FG.timed && q.shown && !q.done && !q.timedOut) h += '<div class="tbar"><span id="tbar" style="width:' + Math.max(0, 100 * ((q.deadline || Date.now() + FLAG_SECONDS * 1000) - Date.now()) / (FLAG_SECONDS * 1000)) + '%"></span></div>';
    if (!q.shown) h += '<button class="cap primary" data-act="fgShow">👀 ' + esc(t('showChoices')) + '</button>';
    else {
      h += '<div class="opts">' + q.opts.map((c, i) => {
        let cls = '';
        if (q.removed.includes(c)) cls = 'gone';
        else if (q.picked.includes(c)) cls = 'bad';
        else if (q.done && c === q.code) cls = 'good';
        else if (!q.done && reveal && c === q.code) cls = 'reveal';
        const off = cls === 'bad' || cls === 'gone' || (q.done && c !== q.code) || (q.timedOut && c !== q.code);
        return '<div class="opt ' + cls + '"><button class="cap pickbtn" data-act="fgPick" data-v="' + c + '"' + (off ? ' disabled' : '') + '><span class="num" aria-hidden="true">' + (i + 1) + '</span>' + esc(cname(c)) + '</button>' +
          (FG.d <= 2 ? '<button class="cap small saybtn" data-act="fgSay" data-v="' + c + '" aria-label="' + esc(t('listen') + ': ' + cname(c)) + '">🔊</button>' : '') + '</div>';
      }).join('') + '</div>';
    }
    if (q.done) {
      h += '<div class="fmsg ok">' + flagSVG(q.code, 'small') + '<span>' + esc(t('flagRight', { c: cname(q.code) })) + '</span></div>' +
        '<div class="after">' + (q.spelled ? '<span class="pill">' + esc(t('spelledOk')) + '</span>' : '<button class="cap" data-act="fgSpell">🔤 ' + esc(t('afterSpell')) + '</button>') +
        '<button class="cap" data-act="fgListen">🔊 ' + esc(t('afterListen')) + '</button><button class="cap" data-act="fgLangs" aria-expanded="' + q.langs + '">🌐 ' + esc(t('afterLangs')) + '</button>' +
        '<button class="cap primary" data-act="fgNext">' + esc(t('nextQ')) + ' →</button></div>' +
        (q.langs ? '<div class="langnames">' + LANGS.filter(l => l !== FG.lang).map(l => '<button class="cap small" data-act="fgSayLang" data-v="' + l + '">' + esc(t('lang_' + l)) + ': <b>' + esc(cname(q.code, l)) + '</b> 🔊</button>').join('') + '</div>' : '');
    } else if (q.timedOut) h += '<div class="fmsg no">⏰ ' + esc(t('timeUp')) + ' ' + esc(t('correctIs', { c: cname(q.code) })) + '</div>';
    else if (q.picked.length) { const last = q.picked[q.picked.length - 1]; h += '<div class="fmsg no">' + flagSVG(last, 'small') + '<span>' + esc(t('flagWrong', { c: cname(last) })) + '</span></div>'; }
    if (!q.done && q.shown && FG.d <= 2 && !q.hinted && !q.timedOut) h += '<button class="cap small" data-act="fgHint">💡 ' + esc(FG.d === 1 ? t('hint') : t('fiftyHint')) + '</button>';
    if (!q.done && q.shown) h += '<p class="muted" style="margin:0">' + esc(t('keysHint')) + '</p>';
    return h + '</div>';
  }
  function paintFlag() {
    if (!FG || screen !== 'flagplay') return;
    const st = $('stage'); if (st) st.innerHTML = flagStageHTML();
    const sc = $('fgscore'); if (sc) sc.textContent = '★ ' + (FG.score + FG.bonus);
    paintMeter();
  }
  function flagResultHTML() {
    const R = lastFlag;
    const first = R.results.filter(r => r.how === 'first').length;
    const icon = { first: '✅', second: '🟡', late: '⏰' };
    return '<section class="result"><div class="bigstars" aria-label="' + R.stars + '/3">' + [0, 1, 2].map(i => i < R.stars ? '<span class="s">★</span>' : '★').join('') + '</div>' +
      '<h1>' + esc(R.stars >= 2 ? pick(t('great')) : t('tryMore')) + '</h1><div class="stats">' +
      '<div class="stat"><div class="v">' + R.score + '/' + R.max + '</div><div class="l">' + esc(t('points')) + '</div></div>' +
      '<div class="stat"><div class="v">' + first + '/' + R.results.length + '</div><div class="l">' + esc(t('firstTry')) + '</div></div>' +
      (R.bonus ? '<div class="stat"><div class="v">+' + R.bonus + '</div><div class="l">🔤 ' + esc(t('spellingShort')) + '</div></div>' : '') + '</div>' +
      '<ul class="wordlist">' + R.results.map(r => '<li><span class="mini">' + flagSVG(r.code, 'tiny') + '</span><span class="w">' + esc(cname(r.code, R.lang)) + '</span><span>' + icon[r.how] + '</span></li>').join('') + '</ul>' +
      '<div class="actions"><button class="cap primary" data-act="fgAgain">↻ ' + esc(t('again')) + '</button><button class="cap" data-act="go" data-v="flags">' + esc(t('chooseLevel')) + '</button>' +
      '<button class="cap" data-act="fgToSpell">🔤 ' + esc(t('c_countries')) + '</button><button class="cap" data-act="go" data-v="map">' + esc(t('map')) + '</button></div></section>';
  }

  /* ---------- rewards ---------- */
  function rewardsHTML() {
    const n = S.stickers;
    return '<div class="panel"><h2>🏅 ' + esc(t('badges')) + '</h2><div class="badges">' + BADGES.map(b => '<div class="badge ' + (S.badges.includes(b.id) ? '' : 'off') + '"><div class="bi" aria-hidden="true">' + b.icon + '</div><div class="bn">' + esc(badgeName(b)) + '</div></div>').join('') + '</div></div>' +
      '<div class="panel"><h2>' + esc(t('stickers')) + ' · ★ ' + totalStars() + ' · ' + esc(t('points')) + ' ' + S.points + '</h2><p class="muted">' + esc(t('stickerHint')) + '</p><div class="stickers">' +
      STICKERS.map((s, i) => i < n ? '<div class="sticker">' + s + '</div>' : '<div class="sticker off">' + ((i + 1) * 5) + '★</div>').join('') + '</div></div>';
  }

  /* ---------- parents ---------- */
  function newGate() { PG.a = 3 + Math.floor(Math.random() * 7); PG.b = 3 + Math.floor(Math.random() * 7); PG.wrong = false; }
  function parentsHTML(noGate) {
    if (!PG.ok && !noGate) {
      return '<div class="panel" style="max-width:480px;margin:0 auto"><h2>🔒 ' + esc(t('parents')) + '</h2><form data-form="gate" class="row"><label for="gate">' + esc(t('gateQ', { a: PG.a, b: PG.b })) + '</label>' +
        '<input id="gate" type="number" inputmode="numeric" style="width:6rem" autocomplete="off"><button class="cap primary" type="submit">' + esc(t('ok')) + '</button></form>' +
        (PG.wrong ? '<p class="warn">' + esc(t('gateWrong')) + '</p>' : '') + '<p><button class="cap small" data-act="go" data-v="map">← ' + esc(t('back')) + '</button></p></div>';
    }
    const rows = LANGS.map(l => {
      const p = S.prog[l], recs = Object.values(p);
      const done = recs.filter(r => r.plays > 0).length;
      const stars = recs.reduce((a, r) => a + r.stars, 0);
      const avg = recs.length ? Math.round(recs.reduce((a, r) => a + r.lastAcc, 0) / recs.length) + '%' : '–';
      const best = Math.max(0, ...recs.map(r => r.bestWpm || 0));
      return '<tr><td>' + esc(t('lang_' + l)) + '</td><td>' + K.effectiveLevel(p, S.age) + ' / ' + Math.max(K.effectiveLevel(p, S.age), S.maxLevel[l] || 0) + '</td><td>' + done + ' / ' + K.LESSONS.length + '</td><td>' + stars + ' / ' + K.LESSONS.length * 3 + '</td><td>' + avg + '</td><td>' + (best ? best + ' ' + esc(t('wpm')) : '–') + '</td><td>' + Math.round(S.timeMs[l] / 60000) + ' ' + esc(t('min')) + '</td></tr>';
    }).join('');
    const srows = LANGS.map(l => {
      const s = S.spell[l];
      return '<tr><td>' + esc(t('lang_' + l)) + '</td><td>' + s.practised + '</td><td>' + s.correct + '</td><td>' + s.attempts + '</td><td>' + (s.practised ? Math.round(100 * s.correct / s.practised) + '%' : '–') + '</td><td>' + s.missed.length + '</td></tr>';
    }).join('');
    const sp = S.spell[S.lang];
    const catRows = Object.keys(K.VOCAB).map(c => { const cs = sp.cats[c]; return '<tr><td>' + K.VOCAB[c].icon + ' ' + esc(t('c_' + c)) + '</td>' + [1, 2, 3, 4].map(x => '<td>' + starStr(sp.best[c + ':' + x] || 0) + '</td>').join('') + '<td>' + (cs ? cs.correct + ' / ' + cs.practised : '–') + '</td></tr>'; }).join('');
    const missedWords = sp.missed.map(id => K.VOCAB_INDEX[id]).filter(Boolean);
    const frows = LANGS.map(l => {
      const f = S.flags[l];
      return '<tr><td>' + esc(t('lang_' + l)) + '</td><td>' + f.played + '</td><td>' + f.correct + ' / ' + f.answered + '</td><td>' + f.attempts + '</td>' + [1, 2, 3, 4].map(x => '<td>' + starStr(f.best[x] || 0) + '</td>').join('') + '</tr>';
    }).join('');
    const tricky = Object.entries(S.flags[S.lang].missed).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const weak = Object.entries(S.keyErr[S.lang]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const planIds = K.plan(prog(), S.age);
    const tog = (k, lbl) => '<div class="row"><label for="tg-' + k + '">' + esc(t(lbl)) + '</label><input id="tg-' + k + '" type="checkbox" data-set="' + k + '"' + (S[k] ? ' checked' : '') + '></div>';
    const voiceOk = Audio.voiceFor(S.ui);
    return '<div class="panel"><h2>' + esc(t('progress')) + ' · ' + esc(S.avatar) + ' ' + esc(S.name) + '</h2><p class="muted">' + esc(t('ages', { a: ageLabel(S.age) })) + ' · ' + esc(t('createdOn', { d: fmtDay(S.created) })) + ' · ' + esc(t('lastSeen', { d: fmtDay(S.lastSeen) })) + ' · ★ ' + totalStars() + ' · ' + esc(t('points')) + ' ' + S.points + '</p>' +
      '<div class="tablewrap"><table><thead><tr><th></th><th>' + esc(t('currentLevel')) + ' / max</th><th>' + esc(t('lessonsDone')) + '</th><th>' + esc(t('totalStars')) + '</th><th>' + esc(t('avgAcc')) + '</th><th>' + esc(t('bestWpm')) + '</th><th>' + esc(t('practiceTime')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="panel"><h2>🔤 ' + esc(t('spellTitle')) + '</h2><div class="tablewrap"><table><thead><tr><th></th><th>' + esc(t('spelled')) + '</th><th>' + esc(t('correctLbl')) + '</th><th>' + esc(t('attempts')) + '</th><th>' + esc(t('accuracy')) + '</th><th>' + esc(t('missedCount')) + '</th></tr></thead><tbody>' + srows + '</tbody></table></div>' +
      '<h2 style="margin-top:1rem">' + esc(t('topicProgress')) + ' (' + esc(t('lang_' + S.lang)) + ')</h2><div class="tablewrap"><table><thead><tr><th></th>' + [1, 2, 3, 4].map(x => '<th>' + esc(t('d' + x)) + '</th>').join('') + '<th>' + esc(t('firstTry')) + '</th></tr></thead><tbody>' + catRows + '</tbody></table></div>' +
      '<p class="muted">' + esc(t('missedCount')) + ': ' + (missedWords.length ? missedWords.map(it => '<span class="pill">' + esc(it.word[S.lang]) + '</span>').join(' ') : esc(t('none'))) + '</p></div>' +
      '<div class="panel"><h2>🚩 ' + esc(t('flagTitle')) + '</h2><div class="tablewrap"><table><thead><tr><th></th><th>' + esc(t('played')) + '</th><th>' + esc(t('firstTry')) + '</th><th>' + esc(t('attempts')) + '</th>' + [1, 2, 3, 4].map(x => '<th>' + esc(t('d' + x)) + '</th>').join('') + '</tr></thead><tbody>' + frows + '</tbody></table></div>' +
      '<p class="muted">' + esc(t('trickyFlags')) + ' (' + esc(t('lang_' + S.lang)) + '): ' + (tricky.length ? tricky.map(([c, n]) => '<span class="pill">' + flagSVG(c, 'tiny') + ' ' + esc(cname(c, S.lang)) + ' ×' + n + '</span>').join(' ') : esc(t('none'))) + '</p></div>' +
      '<div class="panel"><h2>' + esc(t('plan')) + ' (' + esc(t('lang_' + S.lang)) + ')</h2><ol class="plan">' + planIds.map(id => { const l = K.LESSON_BY_ID[id]; return '<li>' + esc(t('level')) + ' ' + l.level + ': ' + l.icon + ' ' + esc(lessonName(l)) + '</li>'; }).join('') + '</ol>' +
      '<p class="muted">' + esc(t('weakAll')) + ': ' + (weak.length ? weak.map(([c, n]) => '<span class="pill">' + esc(K.displayChar(c)) + ' ×' + n + '</span>').join(' ') : esc(t('none'))) + '</p></div>' +
      '<div class="panel"><h2>' + esc(t('settings')) + '</h2>' + tog('sfx', 'sfxLbl') + tog('voice', 'voiceLbl') + tog('music', 'musicLbl') +
      '<div class="row"><label for="vol">' + esc(t('volume')) + '</label><input id="vol" type="range" min="0" max="100" step="5" value="' + S.volume + '" data-set="volume"></div>' +
      (S.voice && !voiceOk ? '<p class="muted">' + esc(t('voiceMissing', { lang: t('lang_' + S.ui) })) + '</p>' : '') +
      tog('hints', 'hintsLbl') +
      '<div class="row"><label for="brk">' + esc(t('breakLbl')) + '</label><select id="brk" data-set="breakMin">' + [0, 10, 15, 20, 30].map(n => '<option value="' + n + '"' + (S.breakMin === n ? ' selected' : '') + '>' + esc(n ? t('everyMin', { n }) : t('off')) + '</option>').join('') + '</select></div>' +
      '<div class="row"><button class="cap small" data-act="editProfile" data-v="' + S.id + '">✏️ ' + esc(t('editProfile')) + '</button></div></div>' +
      '<div class="panel"><p class="muted">🛡️ ' + esc(t('privacy')) + '</p>' +
      (PG.confirmReset ? '<p class="warn">' + esc(t('resetConfirm')) + '</p><div class="actions" style="justify-content:flex-start"><button class="cap" data-act="doReset">' + esc(t('yesReset')) + '</button><button class="cap" data-act="cancelReset">' + esc(t('cancel')) + '</button></div>'
        : '<button class="cap small" data-act="askReset">' + esc(t('reset')) + '</button>') + '</div>';
  }

  /* ---------- break reminder ---------- */
  setInterval(() => {
    if (!S || !S.breakMin || document.hidden || !$('ov').hidden) return;
    if (!['play', 'result', 'map', 'spellplay', 'spellres', 'spell', 'flags', 'flagplay', 'flagres'].includes(screen)) return;
    if (Date.now() - lastBreak >= S.breakMin * 60000) {
      if (P && !P.ended) { stopGameLoop(); P.paused = true; }
      overlay('<div class="bi" aria-hidden="true">🧘</div><h2>' + esc(t('breakTitle')) + '</h2><p>' + esc(t('breakText')) + '</p><button class="cap primary" data-act="endBreak">' + esc(t('breakBtn')) + '</button>');
      say('breakTime');
    }
  }, 15000);

  /* ---------- events ---------- */
  function leavePlay() {
    if (P) { P.ended = true; clearTimeout(P.hintTimer); }
    if (FG) { clearInterval(FG.tick); saveFlagSession(); }
    stopGameLoop(); P = null; SG = null; FG = null;
  }
  const ACT = {
    go(v) {
      if (screen === 'play' || screen === 'spellplay' || screen === 'flagplay') leavePlay();
      if (v === 'parents' && EXT.screens.pdgate) { PG.confirmReset = false; v = 'pdgate'; }
      else if (v === 'parents') { PG.ok = false; PG.confirmReset = false; newGate(); }
      if (v === 'profiles') { leavePlay(); S = null; ROOT.cur = null; save(); Audio.stopMusic(); }
      screen = v; render();
      if (v === 'parents') { const g = $('gate'); if (g) g.focus(); }
    },
    setUi(v) { if (S) S.ui = v; ROOT.ui = v; DEV.ui = v; if (ED) ED.ui = ED.id ? ED.ui : v; save(); render(); },
    setLang(v) {
      S.lang = v; save();
      if (screen === 'play' && P) startLesson(P.L.id);
      else if (screen === 'spellplay') { leavePlay(); screen = 'spell'; render(); }
      else if (screen === 'flagplay') { leavePlay(); screen = 'flags'; render(); }
      else render();
    },
    pickProfile(v) { pickProfile(v); },
    newProfile() { openEditor(null); },
    editProfile(v) { openEditor(ROOT.profiles.find(p => p.id === v)); },
    edAge(v) { ED.age = +v; render(); },
    edKind(v) { ED.kind = v === 'adult' ? 'adult' : 'child'; render(); },
    edAvatar(v) { ED.avatar = v; render(); },
    edLang(v) { ED.lang = v; render(); },
    edUi(v) { ED.ui = v; if (!ED.id && !S) { ROOT.ui = v; } render(); },
    saveProfile() {
      const name = ED.name.trim();
      if (!name) { ED.err = true; render(); $('nm').focus(); return; }
      let p = ED.id && ROOT.profiles.find(x => x.id === ED.id);
      const isNew = !p;
      if (isNew) { p = defaults(); ROOT.profiles.push(p); }
      const ageChanged = p.age !== ED.age;
      Object.assign(p, { kind: ED.kind, name, age: ED.age, avatar: ED.avatar, lang: ED.lang, ui: ED.ui, sfx: ED.sfx, voice: ED.voice, music: ED.music, hints: ED.hints });
      if (isNew || ageChanged) p.spellD = Math.min(4, K.ageLevel(p.age));
      ED = null;
      S = p; if (save()) toast('✓ ' + t('saved'));
      if (isNew) { if (EXT.onPick && EXT.onPick(S)) return; screen = 'map'; render(); say('welcomeName', { name: S.name }); if (S.music) Audio.startMusic(); }
      else { pickProfile(p.id); }
    },
    askDelete() { ED.confirmDelete = true; render(); },
    cancelDelete() { ED.confirmDelete = false; render(); },
    deleteProfile() {
      const id = ED.id; ED = null;
      const i = ROOT.profiles.findIndex(p => p.id === id); if (i >= 0) ROOT.profiles.splice(i, 1);
      if (EXT.onProfileDeleted) EXT.onProfileDeleted(id);
      if (S && S.id === id) S = null;
      ROOT.cur = null; save(); toast('✓ ' + t('saved'));
      if (ROOT.profiles.length) { screen = 'profiles'; render(); } else openEditor(null);
    },
    continue() { const ct = continueTarget(); if (ct.kind === 'spell') ACT.spResume(); else if (ct.kind === 'flags') ACT.fgResume(); else startLesson(ct.id); },
    startLesson(v) { startLesson(v); },
    quit() { leavePlay(); screen = 'map'; render(); },
    replay() { if (lastSaid) Audio.speak(lastSaid.text, lastSaid.lang, lastSaid.buddy); },
    askReset() { PG.confirmReset = true; render(); },
    cancelReset() { PG.confirmReset = false; render(); },
    doReset() {
      const keep = { id: S.id, created: S.created, ui: S.ui, lang: S.lang, name: S.name, age: S.age, avatar: S.avatar, sfx: S.sfx, voice: S.voice, music: S.music, volume: S.volume, hints: S.hints, breakMin: S.breakMin };
      const fresh = Object.assign(defaults(), keep); fresh.spellD = Math.min(4, K.ageLevel(fresh.age));
      const i = ROOT.profiles.indexOf(S); ROOT.profiles[i] = fresh; S = fresh;
      PG.confirmReset = false; saveNote('saved'); render();
    },
    endBreak() {
      lastBreak = Date.now(); closeOverlay();
      if (P && P.paused && !P.ended) { P.paused = false; if (P.L.type === 'balloon') startBalloons(); }
    },
    /* spelling */
    spCat(v) { S.spellCat = v; save(); render(); },
    spD(v) { S.spellD = +v; save(); render(); },
    spStart() { newSpellGame(S.spellCat, S.spellD, false); },
    spAgain() { newSpellGame(lastSpell.cat, lastSpell.d, false); },
    spReview() { if (S.spell[S.lang].missed.length) newSpellGame('review', Math.max(2, Math.min(3, S.spellD)), true); },
    spResume() { const s = S.spell[S.lang].session; if (s && s.ids.every(id => K.VOCAB_INDEX[id])) startSpell(Object.assign({}, s)); else { S.spell[S.lang].session = null; save(); render(); } },
    spQuit() {
      if (SG && SG.mini) { save(); backToFlags(null); return; }
      saveSession(); leavePlay(); screen = 'spell'; render(); toast('✓ ' + t('savedProgress'));
    },
    spListen() { speakWord(); },
    /* flag game */
    fgD(v) { S.flagD = +v; save(); render(); },
    fgStart() { newFlagGame(); },
    fgAgain() { newFlagGame(); },
    fgResume() {
      const s = S.flags[S.lang].session;
      if (s && s.i < s.qs.length && s.qs.every(q => FLAGS[q.code])) startFlags(Object.assign({}, s)); else { S.flags[S.lang].session = null; save(); screen = 'flags'; render(); }
    },
    fgQuit() { leavePlay(); screen = 'flags'; render(); toast('✓ ' + t('savedProgress')); },
    fgPick(v) { flagPick(v); },
    fgShow() { if (FG && FG.q) { FG.q.shown = true; paintFlag(); if (FG.timed) startFlagTimer(); } },
    fgHint() {
      const q = FG && FG.q; if (!q || q.done || q.hinted) return;
      q.hinted = true;
      if (FG.d >= 2) { const wrong = q.opts.filter(c => c !== q.code && !q.picked.includes(c) && !q.removed.includes(c)); if (wrong.length) q.removed.push(wrong[Math.floor(Math.random() * wrong.length)]); }
      Audio.sfx('whoosh'); paintFlag();
    },
    fgSay(v) { if (!sayPractice(cname(v), FG ? FG.lang : S.lang)) toast(t('noVoiceWord')); },
    fgListen() { if (FG && FG.q && !sayPractice(cname(FG.q.code), FG.lang)) toast(t('noVoiceWord')); },
    fgLangs() { if (FG && FG.q) { FG.q.langs = !FG.q.langs; paintFlag(); } },
    fgSayLang(v) { if (FG && FG.q && !sayPractice(cname(FG.q.code, v), v)) toast(t('noVoiceWord')); },
    fgSpell() { flagSpell(); },
    fgNext() { flagNext(); },
    fgToSpell() { S.spellCat = 'countries'; save(); ACT.go('spell'); },
    spHint() { spHint(); },
    spErase() { spellInput([], 'Backspace'); },
    spCheck() { const w = SG && SG.w; if (w && w.buf.length) spellCheck(); }
  };

  document.addEventListener('click', e => {
    const nm = $('nm'); if (nm && ED) ED.name = nm.value;
    const key = e.target.closest('.key[data-code]');
    if (key && (screen === 'play' || screen === 'spellplay')) { oskPress(key.dataset.code); return; }
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    Audio.ctx(); Audio.sfx('click');
    if (C().music) Audio.startMusic();
    const fn = ACT[el.dataset.act] || EXT.acts[el.dataset.act];
    if (fn) fn(el.dataset.v, el);
  });
  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.dataset.form === 'gate') {
      const v = parseInt($('gate').value, 10);
      if (v === PG.a * PG.b) PG.ok = true; else { newGate(); PG.wrong = true; }
      render(); const g = $('gate'); if (g) g.focus();
    }
  });
  document.addEventListener('change', e => {
    const ek = e.target.dataset && e.target.dataset.ed;
    if (ek && ED) { ED[ek] = e.target.checked; return; }
    const fk = e.target.dataset && e.target.dataset.fset;
    if (fk && S) { S[fk] = e.target.checked; save(); return; }
    const k = e.target.dataset && e.target.dataset.set; if (!k || !S) return;
    if (e.target.type === 'checkbox') S[k] = e.target.checked; else S[k] = +e.target.value;
    if (k === 'volume') Audio.setVolume();
    if (k === 'music') { if (S.music) Audio.startMusic(); else Audio.stopMusic(); }
    if (k === 'voice' && !S.voice && Audio.hasTTS) { try { speechSynthesis.cancel(); } catch (err) { /* ignore */ } }
    if (save()) toast('✓ ' + t('saved'));
    if (k === 'voice' || k === 'breakMin') render();
  });
  document.addEventListener('input', e => { if (e.target.id === 'vol' && S) { S.volume = +e.target.value; Audio.setVolume(); } if (e.target.id === 'nm' && ED) ED.name = e.target.value; });

  function oskPress(code) {
    if (!$('ov').hidden) return;
    if (screen === 'play' && (!P || P.ended)) return;
    if (code === 'ShiftLeft' || code === 'ShiftRight') { oskShift = !oskShift; $('kb').innerHTML = kbHTML(); paintKb(); return; }
    if (code === 'Backspace' || code === 'Enter') { if (screen === 'spellplay') spellInput([], code); return; }
    const k = K.LAYOUTS[S.lang].byCode[code]; if (!k) return;
    const ch = oskShift ? k.s : k.n;
    if (oskShift) { oskShift = false; $('kb').innerHTML = kbHTML(); }
    if (screen === 'spellplay') spellInput([ch], code); else onInput([ch], code);
  }

  document.addEventListener('keydown', e => {
    /* flag game: 1–4 pick an answer, Enter or Space goes to the next flag */
    if (screen === 'flagplay' && FG && FG.q && $('ov').hidden && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = e.target.tagName; if (tag === 'INPUT' || tag === 'SELECT') return;
      const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
      if (m && FG.q.opts[+m[1] - 1]) { e.preventDefault(); if (!e.repeat) flagPick(FG.q.opts[+m[1] - 1]); return; }
      if ((e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') && FG.q.done && !(tag === 'BUTTON' && e.code !== 'Space')) { e.preventDefault(); if (!e.repeat) flagNext(); return; }
      return;
    }
    const inGame = (screen === 'play' && P && !P.ended) || (screen === 'spellplay' && SG);
    if (!inGame || !$('ov').hidden) return;
    const tag = e.target.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || (e.altKey && !(e.getModifierState && e.getModifierState('AltGraph')))) return;
    const caps = !!(e.getModifierState && e.getModifierState('CapsLock'));
    const cw = $('caps'); if (cw) cw.hidden = !(caps && S.lang !== 'th');
    if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') return;
    if (screen === 'spellplay' && (e.code === 'Backspace' || e.code === 'Enter' || e.key === 'Backspace' || e.key === 'Enter')) {
      e.preventDefault(); spellInput([], e.key === 'Enter' || e.code === 'Enter' ? 'Enter' : 'Backspace'); return;
    }
    const cands = K.candidates(K.LAYOUTS[S.lang], e.code, e.key, e.shiftKey, caps);
    if (!cands.some(Boolean)) return;
    e.preventDefault();
    if (e.repeat) return; /* holding a key down should not count as many mistakes */
    if (screen === 'spellplay') spellInput(cands, e.code); else onInput(cands, e.code);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Audio.hasTTS) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    if (document.hidden && S) save();
  });

  /* exposed for automated checks only */
  window.__kk = { root: () => ROOT, active: () => S, state: () => ({ screen, SG, P }) };
  window.KKApp = { EXT, ROOT, K, LANGS, NATIVE, AVATARS, esc, t, uiLang, today, uid, save, saveNote, render, toast, overlay, closeOverlay, say, Audio, ACT,
    S: () => S, setS: p => { S = p; }, screen: () => screen, setScreen: v => { screen = v; }, go: v => ACT.go(v), parentsHTML, starsOf, levelOf, fmtDay, picHTML, flagSVG, openEditor, starStr, topHTML };
  if (window.FGH_BOOT) window.FGH_BOOT(window.KKApp);
  /* ---------- boot: always start on the profile picker (or the first-profile form) ---------- */
  if (ROOT.profiles.length) {
    screen = 'profiles';
    lastSaid = { buddy: 'bunny', text: K.VOICE[ROOT.ui].welcome[1], lang: ROOT.ui };
    render();
  } else {
    lastSaid = { buddy: 'bunny', text: K.VOICE[ROOT.ui].welcome[1], lang: ROOT.ui };
    openEditor(null);
  }
})();
