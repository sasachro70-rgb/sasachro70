/* Voice & pronunciation settings, shared by every learning page.
   - Only voices the device really has are listed, and only for the language asked for (a Swedish word is never read by an English voice).
   - Accent = the region of the voice's language tag (sv-SE, sv-FI, en-GB, en-US, es-ES, es-MX, th-TH …), as the browser reports it.
   - Browsers do not report a voice's gender. It is guessed from well-known voice names; when the name is not known it is shown as "not stated".
   - Each learner keeps: chosen voice per language (id, name, accent, gender), speed, last language and when it was changed.
     It is stored in the family record (fgh.family.v1 → voice[pid]) and synced with the learner's learning document,
     so another device picks the same voice if it has it, otherwise the closest one (same accent and gender).
   - Long text is split into sentences with short pauses; Thai is never given extra spaces (the "|" word marks in content are removed).
   - A recorded audio file is used instead of the synthetic voice when content/audio lists one for that exact text.
   The logic part (no DOM) is tested in Node: tests/voice.test.js. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const LOCALE = { th: 'th-TH', sv: 'sv-SE', en: 'en-GB', es: 'es-ES' };
  const RATES = [0.5, 0.75, 0.85, 1, 1.25, 1.5];
  const DEFAULT_RATE = 0.85;
  const SAMPLE = { th: 'สวัสดีครับ ยินดีที่ได้รู้จัก', sv: 'Hej! Trevligt att träffas.', en: 'Hello! Nice to meet you.', es: '¡Hola! Encantado de conocerte.' };

  /* ---------- voices (pure) ---------- */
  const tagOf = v => String((v && v.lang) || '').replace(/_/g, '-');
  const langOf = v => tagOf(v).split('-')[0].toLowerCase();
  const regionOf = v => { const p = tagOf(v).split('-'); return (p.length > 1 ? p[p.length - 1] : '').toUpperCase(); };
  const FEMALE = /female|woman|kvinna|\b(alva|klara|astrid|hillevi|sofie|elin|kanya|narisa|achara|premwadee|samantha|karen|moira|tessa|serena|kate|susan|hazel|zira|libby|sonia|maisie|emma|amy|aria|jenny|ava|allison|catherine|fiona|veena|victoria|monica|mónica|paulina|elvira|laura|helena|lucia|lucía|marisol|ximena|esperanza|sabina|dalia|elena)\b/i;
  const MALE = /\bmale\b|\bman\b|\b(oskar|bengt|mattias|daniel|oliver|arthur|ryan|guy|george|thomas|rishi|fred|aaron|alex|tom|david|mark|james|jorge|juan|diego|alvaro|álvaro|pablo|carlos|enrique|raul|raúl|jorge|niwat|pattara)\b/i;
  const genderOf = name => FEMALE.test(name || '') ? 'female' : MALE.test(name || '') ? 'male' : 'unknown';
  const idOf = v => (v && (v.voiceURI || v.name)) || '';

  /* the device's voices for one language, the language's main region first, then voices that work offline */
  function listFor(voices, lang) {
    const main = (LOCALE[lang] || '').split('-')[1] || '';
    return (voices || []).filter(v => v && langOf(v) === lang)
      .map(v => ({ id: idOf(v), name: v.name || idOf(v), lang: tagOf(v), region: regionOf(v), gender: genderOf(v.name), local: v.localService !== false, voice: v }))
      .sort((a, b) => (b.region === main) - (a.region === main) || (b.local - a.local) || a.name.localeCompare(b.name));
  }
  const regions = list => Array.from(new Set(list.map(x => x.region).filter(Boolean)));
  /* the learner's choice if this device has it; else the same name, else same accent and gender, else same accent, else same gender, else the first */
  function choose(voices, lang, pref) {
    const list = listFor(voices, lang); if (!list.length) return null;
    pref = pref || {};
    return (pref.id && list.find(x => x.id === pref.id)) || (pref.name && list.find(x => x.name === pref.name)) ||
      (pref.region && pref.gender && list.find(x => x.region === pref.region && x.gender === pref.gender)) ||
      (pref.region && list.find(x => x.region === pref.region)) || (pref.gender && pref.gender !== 'unknown' && list.find(x => x.gender === pref.gender)) || list[0];
  }

  /* ---------- text (pure) ---------- */
  const THAI = /[฀-๿]/;
  const LATIN = /[A-Za-zÀ-ÿ]/;
  const tidy = s => String(s == null ? '' : s).replace(/\|/g, '').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').trim();
  /* sentences (and, for Thai, the phrases that Thai separates with a space); very short pieces are joined back; nothing is added inside a phrase */
  function chunks(text, lang) {
    text = tidy(text); if (!text) return [];
    const out = [];
    /* each line stays separate (a dialogue line is never joined to the next speaker's line) */
    text.split('\n').forEach(line => {
      const parts = (lang === 'th' ? line.split(' ') : line.split(/(?<=[.!?…;:])\s+/)).map(p => p.trim()).filter(Boolean);
      const mine = [];
      parts.forEach(p => {
        const last = mine[mine.length - 1];
        if (last != null && (last.length < 12 || p.length < 4) && last.length + p.length < 60 && !/[.!?…]$/.test(last)) mine[mine.length - 1] = last + ' ' + p;
        else mine.push(p);
      });
      out.push(...mine);
    });
    /* engines cut very long utterances: split anything over 180 characters at commas */
    return [].concat(...out.map(p => p.length <= 180 ? [p] : p.split(/(?<=,)\s+/)));
  }
  /* mixed text such as a Swedish explanation with a Thai word in it: Thai runs go to the Thai voice, the rest to the main language */
  function segments(text, lang) {
    text = tidy(text); if (!text) return [];
    if (lang === 'th' || !THAI.test(text)) return [{ text, lang }];
    const out = []; let cur = null;
    for (const ch of text) {
      const l = THAI.test(ch) ? 'th' : LATIN.test(ch) ? lang : null;
      if (!cur) cur = { text: '', lang: l || lang };
      if (l && l !== cur.lang) { if (cur.text.trim()) out.push(cur); cur = { text: '', lang: l }; }
      cur.text += ch;
    }
    if (cur && cur.text.trim()) out.push(cur);
    return out.map(s => ({ text: s.text.trim(), lang: s.lang })).filter(s => /[\p{L}\p{N}]/u.test(s.text));
  }
  const clampRate = r => { r = +r; return isFinite(r) && r > 0 ? Math.max(0.5, Math.min(1.5, r)) : DEFAULT_RATE; };
  /* the gap after a sentence, longer at slow speed */
  const pauseAfter = (piece, rate) => Math.round((/[.!?…]$/.test(piece) ? 420 : 240) / clampRate(rate));

  /* ---------- learner settings in the family record (pure) ---------- */
  function prefsOf(f, pid) { const v = (f.voice || {})[pid]; return v ? v : { rate: null, langs: {}, lastLang: null, updated: 0 }; }
  function slot(f, pid) { f.voice = f.voice || {}; return f.voice[pid] || (f.voice[pid] = { rate: null, langs: {}, lastLang: null, updated: 0 }); }
  function setVoice(f, pid, lang, v, now) {
    now = now == null ? Date.now() : now;
    const s = slot(f, pid);
    s.langs[lang] = { id: v.id, name: v.name, region: v.region || '', gender: v.gender || 'unknown', at: now };
    s.lastLang = lang; s.updated = now; return s;
  }
  function resetVoice(f, pid, lang, now) { now = now == null ? Date.now() : now; const s = slot(f, pid); s.langs[lang] = { reset: true, at: now }; s.lastLang = lang; s.updated = now; return s; }
  function setRate(f, pid, rate, now) { now = now == null ? Date.now() : now; const s = slot(f, pid); s.rate = clampRate(rate); s.rateAt = now; s.updated = now; return s; }
  function used(f, pid, lang, now) { const s = slot(f, pid); s.lastLang = lang; s.lastUsed = now == null ? Date.now() : now; return s; }
  /* the speed for a learner: their saved speed; a speed set earlier on the old slider is kept; otherwise 0.85 */
  function rateOf(f, pid) {
    const s = prefsOf(f, pid); if (s.rate) return clampRate(s.rate);
    const p = (f.profiles || []).find(x => x.id === pid);
    return p && p.ttsRate && Math.abs(p.ttsRate - 0.9) > 0.001 ? clampRate(p.ttsRate) : DEFAULT_RATE;
  }
  const prefFor = (f, pid, lang) => { const x = prefsOf(f, pid).langs[lang]; return x && !x.reset ? x : null; };
  /* two devices: per language and for the speed, the newer choice wins */
  function merge(a, b) {
    if (!a) return b ? JSON.parse(JSON.stringify(b)) : a; if (!b) return a;
    const out = Object.assign({}, a, { langs: Object.assign({}, a.langs) });
    for (const l in (b.langs || {})) if (!out.langs[l] || (b.langs[l].at || 0) > (out.langs[l].at || 0)) out.langs[l] = b.langs[l];
    if ((b.rateAt || 0) > (a.rateAt || 0)) { out.rate = b.rate; out.rateAt = b.rateAt; }
    if ((b.updated || 0) > (a.updated || 0)) { out.lastLang = b.lastLang; out.updated = b.updated; }
    out.lastUsed = Math.max(a.lastUsed || 0, b.lastUsed || 0);
    return out;
  }

  /* ---------- playing (browser) ---------- */
  const hasTTS = typeof G.speechSynthesis !== 'undefined' && typeof G.SpeechSynthesisUtterance !== 'undefined';
  const voices = () => { try { return hasTTS ? G.speechSynthesis.getVoices() : []; } catch (e) { return []; } };
  let activePid = null, playToken = 0, audioEl = null;
  const fam = () => FGH.familyStore ? FGH.familyStore.get() : { voice: {}, profiles: [] };
  const use = pid => { activePid = pid || null; };
  const current = (lang, pid) => choose(voices(), lang, prefFor(fam(), pid || activePid, lang));
  const audioFor = (text, lang) => { const m = G.FGH_CONTENT && G.FGH_CONTENT.audio && G.FGH_CONTENT.audio[lang]; return m ? m[tidy(text)] || null : null; };
  function stop() { playToken++; try { if (hasTTS) G.speechSynthesis.cancel(); } catch (e) { /* ignore */ } if (audioEl) { try { audioEl.pause(); } catch (e) { /* ignore */ } audioEl = null; } }
  /* plays a queue of { text, lang, voice } pieces with pauses; a new call stops the old one */
  function playQueue(queue, rate, token, onDone) {
    let i = 0;
    const next = () => {
      if (token !== playToken) return;
      if (i >= queue.length) { if (onDone) onDone(); return; }
      const q = queue[i++];
      try {
        const u = new G.SpeechSynthesisUtterance(q.text);
        u.voice = q.voice.voice; u.lang = q.voice.lang; u.rate = rate;
        let ended = false;
        const fin = () => { if (ended) return; ended = true; setTimeout(next, q.pause); };
        u.onend = fin; u.onerror = fin;
        G.speechSynthesis.speak(u);
      } catch (e) { setTimeout(next, 0); }
    };
    next();
  }
  /* reads text aloud for the active learner; false when the device has no voice for that language (the caller then shows the text).
     opts: { rate, pid, voice (a voice entry from listFor, for preview), times (repeat), onDone } */
  function say(text, lang, opts) {
    opts = opts || {};
    const pid = opts.pid || activePid;
    const rate = opts.rate != null ? clampRate(opts.rate) : rateOf(fam(), pid);
    if (!tidy(text)) return false;
    const file = !opts.voice && audioFor(text, lang);
    stop(); const token = playToken;
    if (file && typeof G.Audio !== 'undefined') {
      try { audioEl = new G.Audio(file); audioEl.playbackRate = rate; audioEl.preservesPitch = true; const p = audioEl.play(); if (p && p.catch) p.catch(() => { if (token === playToken) sayTTS(); }); return true; } catch (e) { /* fall back to the voice */ }
    }
    return sayTTS();
    function sayTTS() {
      if (!hasTTS) return false;
      const main = opts.voice || current(lang, pid); if (!main) return false;
      const queue = [];
      const times = Math.max(1, Math.min(5, opts.times || 1));
      for (let r = 0; r < times; r++) {
        segments(text, lang).forEach(seg => {
          const v = seg.lang === lang ? main : current(seg.lang, pid);
          if (!v) return;   // a Thai word inside Swedish text with no Thai voice: skipped rather than read by the wrong voice
          chunks(seg.text, seg.lang).forEach(c => queue.push({ text: c, voice: v, pause: pauseAfter(c, rate) }));
        });
        if (queue.length && r < times - 1) queue[queue.length - 1].pause = Math.round(900 / rate);
      }
      if (!queue.length) return false;
      playQueue(queue, rate, token, opts.onDone);
      try { const f = fam(); if (pid && FGH.familyStore) { const s = prefsOf(f, pid); if (s.lastLang !== lang) FGH.familyStore.mutate(ff => { used(ff, pid, lang); }); } } catch (e) { /* not important */ }
      return true;
    }
  }
  if (hasTTS) { try { G.speechSynthesis.getVoices(); } catch (e) { /* ignore */ } }
  const listeners = [];
  if (hasTTS && G.speechSynthesis.addEventListener) { try { G.speechSynthesis.addEventListener('voiceschanged', () => listeners.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } })); } catch (e) { /* ignore */ } }
  const onVoices = fn => listeners.push(fn);

  FGH.voice = { LOCALE, RATES, DEFAULT_RATE, SAMPLE, genderOf, regionOf, langOf, listFor, regions, choose, chunks, segments, tidy, clampRate, pauseAfter,
    prefsOf, prefFor, setVoice, resetVoice, setRate, used, rateOf, merge,
    hasTTS, voices, use, current, say, stop, audioFor, onVoices, active: () => activePid };
})(typeof window !== 'undefined' ? window : globalThis);
