/* Shared pieces for the family pages: texts, speech (read aloud and, where the browser can, listen), pictures,
   a small bar chart, sounds, toasts and the page header. No game logic here. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const UI_LANGS = ['th', 'sv', 'en'];
  const NATIVE = { th: 'ไทย', sv: 'Svenska', en: 'English', es: 'Español' };
  const LOCALE = { th: 'th-TH', sv: 'sv-SE', en: 'en-GB', es: 'es-ES' };
  const store = FGH.familyStore;

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = s => String(s || '').replace(/\|/g, '');
  function navLang() { const l = (navigator.language || 'en').slice(0, 2); return UI_LANGS.includes(l) ? l : 'en'; }
  function ui() {
    const f = store.get(); if (f.ui && UI_LANGS.includes(f.ui)) return f.ui;
    try { const h = JSON.parse(localStorage.getItem('fgh.v1') || 'null'); if (h && UI_LANGS.includes(h.ui)) return h.ui; } catch (e) { /* ignore */ }
    return navLang();
  }
  function setUi(l) { if (UI_LANGS.includes(l)) store.mutate(f => { f.ui = l; }); document.documentElement.lang = l; }
  function t(key, vars) {
    const get = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
    let s = get(FGH.FT[ui()], key); if (s == null) s = get(FGH.FT.en, key); if (s == null) s = key;
    if (vars && typeof s === 'string') for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  const L = obj => obj ? (obj[ui()] != null ? obj[ui()] : obj.en) : '';

  /* ---------- speech ---------- */
  const hasTTS = typeof speechSynthesis !== 'undefined';
  /* the learner's chosen voice (js/family/voice.js); the first matching voice when that file is not loaded */
  function voiceFor(lang) {
    if (FGH.voice) { const c = FGH.voice.current(lang); return c ? c.voice : null; }
    if (!hasTTS) return null;
    const vs = speechSynthesis.getVoices(), loc = LOCALE[lang] || lang;
    return vs.find(v => v.lang.replace('_', '-').toLowerCase() === loc.toLowerCase()) || vs.find(v => v.lang.toLowerCase().startsWith(lang)) || null;
  }
  if (hasTTS) { try { speechSynthesis.getVoices(); } catch (e) { /* ignore */ } }
  /* reads text aloud in that language; false when the device has no voice for it (the caller then shows the text) */
  function speak(text, lang, rate, opts) {
    if (FGH.voice) return FGH.voice.say(text, lang, Object.assign({}, opts, rate != null ? { rate } : {}));
    text = clean(text);
    if (!hasTTS || !text) return false;
    const v = voiceFor(lang); if (!v) return false;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = v.lang; u.rate = Math.max(0.5, Math.min(1.3, rate || 0.9));
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  const Recog = G.SpeechRecognition || G.webkitSpeechRecognition || null;
  /* listens once; resolves { text } or { error: 'no_support' | 'denied' | 'nothing' } */
  function listen(lang) {
    return new Promise(resolve => {
      if (!Recog) return resolve({ error: 'no_support' });
      let done = false;
      try {
        const r = new Recog(); r.lang = LOCALE[lang] || lang; r.interimResults = false; r.maxAlternatives = 3;
        r.onresult = e => { done = true; const alts = Array.from(e.results[0] || []).map(a => a.transcript); resolve({ text: alts[0] || '', alts }); };
        r.onerror = e => { if (!done) { done = true; resolve({ error: /not-allowed|service-not-allowed/.test(e.error) ? 'denied' : 'nothing' }); } };
        r.onend = () => { if (!done) { done = true; resolve({ error: 'nothing' }); } };
        r.start();
        setTimeout(() => { if (!done) { try { r.stop(); } catch (e) { /* ignore */ } } }, 7000);
      } catch (e) { resolve({ error: 'no_support' }); }
    });
  }
  const norm = s => clean(s).toLocaleLowerCase().normalize('NFC').replace(/[¿?¡!.,;:"'’“”]/g, '').replace(/\s+/g, ' ').trim();
  function distance(a, b) {
    a = Array.from(a); b = Array.from(b);
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  /* how close the recognised text is to the target: 'good' | 'close' | 'no' (a text match, not a pronunciation grade) */
  function compareSpeech(alts, target) {
    const tg = norm(target).replace(/ /g, ''); if (!tg) return 'no';
    let best = 0;
    for (const a of [].concat(alts || [])) {
      const h = norm(a).replace(/ /g, ''); if (!h) continue;
      if (h.includes(tg)) return 'good';
      best = Math.max(best, 1 - distance(h, tg) / Math.max(h.length, tg.length));
    }
    return best >= 0.8 ? 'good' : best >= 0.55 ? 'close' : 'no';
  }

  /* ---------- pictures ---------- */
  const SHAPES = {
    circle: '<circle cx="50" cy="50" r="40"/>', triangle: '<polygon points="50,10 92,88 8,88"/>', square: '<rect x="14" y="14" width="72" height="72" rx="4"/>',
    star: '<polygon points="50,8 61,38 94,38 67,58 77,90 50,70 23,90 33,58 6,38 39,38"/>', heart: '<path d="M50 88 C20 66 6 50 6 32 C6 18 18 8 31 8 C40 8 47 13 50 20 C53 13 60 8 69 8 C82 8 94 18 94 32 C94 50 80 66 50 88Z"/>',
    rectangle: '<rect x="6" y="26" width="88" height="48" rx="4"/>', oval: '<ellipse cx="50" cy="50" rx="44" ry="30"/>'
  };
  function pic(p, cls) {
    p = String(p || '');
    cls = cls || '';
    if (p.startsWith('flag:') && FGH.countries) return FGH.countries.flagSVG(p.slice(5), 'flag ' + cls, 'flag');
    if (p.startsWith('color:')) return '<svg class="picsvg ' + cls + '" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 C72 8 92 24 92 48 C92 74 74 92 50 92 C24 92 8 76 8 52 C8 26 28 8 50 8Z" fill="' + esc(p.slice(6)) + '" stroke="var(--line)" stroke-width="3"/></svg>';
    if (p.startsWith('shape:')) return '<svg class="picsvg ' + cls + '" viewBox="0 0 100 100" aria-hidden="true"><g fill="var(--accent)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round">' + (SHAPES[p.slice(6)] || '') + '</g></svg>';
    if (p.startsWith('num:')) { const n = +p.slice(4); return '<span class="numpic ' + cls + '" aria-hidden="true"><b>' + n + '</b><span>' + '●'.repeat(Math.min(n, 10)) + '</span></span>'; }
    return '<span class="emo ' + cls + '" aria-hidden="true">' + esc(p) + '</span>';
  }

  /* ---------- a single-series bar chart (one hue, rounded tops on the baseline, every value in a tooltip and in a table) ---------- */
  function barChart(rows, opts) {
    opts = opts || {};
    const W = 320, H = 150, pad = 22, n = rows.length, max = Math.max(1, ...rows.map(r => r.value));
    const bw = (W - pad * 2) / n, gap = Math.min(10, bw * 0.3);
    let bars = '', labels = '';
    rows.forEach((r, i) => {
      const h = Math.round((H - 42) * r.value / max), x = pad + i * bw + gap / 2, y = H - 22 - h, w = bw - gap;
      const tip = esc(r.label + ': ' + r.value + (opts.unit ? ' ' + opts.unit : ''));
      bars += '<g class="bar"><rect class="hit" x="' + (pad + i * bw) + '" y="0" width="' + bw + '" height="' + (H - 22) + '" fill="transparent"><title>' + tip + '</title></rect>' +
        (h > 0 ? '<path d="M' + x + ',' + (H - 22) + ' v' + -(h - 4) + ' q0,-4 4,-4 h' + (w - 8) + ' q4,0 4,4 v' + (h - 4) + ' z" fill="var(--chart)"><title>' + tip + '</title></path>' : '') +
        (r.value ? '<text x="' + (x + w / 2) + '" y="' + (y - 4) + '" text-anchor="middle" class="cv">' + r.value + '</text>' : '') + '</g>';
      labels += '<text x="' + (x + w / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="cl">' + esc(r.short || r.label) + '</text>';
    });
    const empty = rows.every(r => !r.value) ? '<text x="' + W / 2 + '" y="' + (H / 2) + '" text-anchor="middle" class="cl">' + esc(t('none')) + '</text>' : '';
    return '<figure class="chart"><figcaption>' + esc(opts.title || '') + '</figcaption><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title || '') + '">' +
      '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (H - 22) + '" y2="' + (H - 22) + '" class="axis"/>' + empty + bars + labels + '</svg>' +
      '<details><summary>' + esc(t('pdDate')) + ' / ' + esc(opts.unit || '') + '</summary><table class="ctab"><tbody>' + rows.map(r => '<tr><td>' + esc(r.label) + '</td><td>' + r.value + '</td></tr>').join('') + '</tbody></table></details></figure>';
  }

  /* ---------- sounds ---------- */
  let ac = null;
  function tone(f, dur, when, vol) {
    if (ac === false) return;
    try { if (!ac) ac = new (G.AudioContext || G.webkitAudioContext)(); } catch (e) { ac = false; return; }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + (when || 0);
    o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.14, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const sfx = { right: () => { tone(659, 0.12); tone(988, 0.18, 0.08); }, wrong: () => { tone(330, 0.16, 0, 0.07); tone(262, 0.22, 0.1, 0.06); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, i * 0.11)), tap: () => tone(1200, 0.03, 0, 0.03) };

  /* ---------- small helpers ---------- */
  function toast(msg) { const box = $('toast'); if (!box) return; const el = document.createElement('div'); el.className = 't'; el.textContent = msg; box.appendChild(el); setTimeout(() => el.remove(), 2800); }
  function shuffle(a, rnd) { a = a.slice(); rnd = rnd || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const sample = (a, n, rnd) => shuffle(a, rnd).slice(0, n);
  const locale = () => ({ th: 'th-TH', sv: 'sv-SE', en: 'en-GB' }[ui()]);
  function fmtDate(ts, withTime) {
    if (!ts) return '–';
    try { return new Date(ts).toLocaleString(locale(), withTime ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return new Date(ts).toISOString().slice(0, 10); }
  }
  const fmtDay = day => { try { return new Date(day + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'short' }); } catch (e) { return day.slice(5); } };
  const fmtMin = ms => { const m = Math.round((ms || 0) / 60000); return m < 60 ? m + ' ' + t('minutes') : Math.floor(m / 60) + ' h ' + (m % 60) + ' ' + t('minutes'); };
  function langSeg() {
    return '<div class="seg" role="group" aria-label="' + esc(t('menuLang')) + '">' + UI_LANGS.map(l => '<button data-act="setUi" data-v="' + l + '" class="' + (ui() === l ? 'on' : '') + '" aria-pressed="' + (ui() === l) + '">' + NATIVE[l] + '</button>').join('') + '</div>';
  }
  function header(title, opts) {
    opts = opts || {};
    return '<header class="top"><a class="btn small" href="' + (opts.home || 'index.html') + '">🏠 ' + esc(t('hub')) + '</a>' + (opts.back ? '<button class="btn small" data-act="' + opts.back + '">← ' + esc(t('back')) + '</button>' : '') +
      '<h1 class="ptitle">' + esc(title) + '</h1><span class="grow"></span>' + (opts.extra || '') + langSeg() + '</header>' +
      (store.saveOk() ? '' : '<div class="warn" role="alert">⚠️ ' + esc(t('saveFailed')) + '</div>');
  }
  /* one click handler per page: data-act="name" calls acts[name](value, element) */
  function bindActs(acts, after) {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]'); if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      const fn = acts[el.dataset.act]; if (!fn) return;
      e.preventDefault(); sfx.tap();
      fn(el.dataset.v, el);
      if (after) after();
    });
  }

  FGH.kit = { $, esc, clean, t, L, ui, setUi, NATIVE, LOCALE, UI_LANGS, speak, voiceFor, hasTTS, listen, canListen: !!Recog, compareSpeech, norm, distance,
    pic, barChart, sfx, toast, shuffle, sample, fmtDate, fmtDay, fmtMin, header, langSeg, bindActs };
})(window);
