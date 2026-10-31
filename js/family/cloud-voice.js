/* Natural Thai voice from the cloud (Supabase Edge Function "tts" → Google Cloud Text-to-Speech).
   - Used by js/family/voice.js for Thai when the device has no Thai voice (mode "auto", the default) or always (mode "cloud").
     The mode is kept per device in localStorage "pasathai.thVoice": auto | cloud | device.
   - Each sentence is fetched once: kept in memory for this page and in the browser's Cache Storage between visits,
     and on the server in the private bucket "tts-cache", so the same sentence is never generated twice.
   - If the function is not set up yet (404/503), the daily limit is reached (429) or there is no internet, the cloud voice
     switches itself off for a while and the device voice (or the text) is used instead. Nothing breaks.
   - Sends only the Thai text and, when signed in, the user's session token (so the limit is per user). No other data. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const MODE_KEY = 'pasathai.thVoice';
  const MODES = ['auto', 'cloud', 'device'];
  const CACHE = 'pasathai-tts-v1';
  const MAX = 400;
  const mem = new Map();            // "gender|text" → Promise<blob URL | null>
  let down = 0, why = '', okSeen = false;   // switched off until this time (ms) and why
  const listeners = [];

  const cfg = () => G.FGH_CONFIG || {};
  const configured = () => !!(cfg().supabaseUrl && cfg().supabaseAnonKey);
  const endpoint = () => String(cfg().supabaseUrl || '').replace(/\/+$/, '') + '/functions/v1/tts';
  function mode() { try { const m = G.localStorage && G.localStorage.getItem(MODE_KEY); return MODES.includes(m) ? m : 'auto'; } catch (e) { return 'auto'; } }
  function setMode(m) { if (!MODES.includes(m)) return; try { G.localStorage.setItem(MODE_KEY, m); } catch (e) { /* this device only */ } emit(); }
  const available = () => configured() && mode() !== 'device' && Date.now() >= down;
  /* "ok" (a sentence came back), "unknown" (not tried yet), "down" (temporarily off: why = setup | limit | offline), "off" */
  function status() {
    if (!configured()) return { state: 'off', why: 'not_configured' };
    if (mode() === 'device') return { state: 'off', why: 'device_mode' };
    if (Date.now() < down) return { state: 'down', why };
    return { state: okSeen ? 'ok' : 'unknown', why: '' };
  }
  function emit() { listeners.forEach(fn => { try { fn(status()); } catch (e) { /* ignore */ } }); }
  const onChange = fn => listeners.push(fn);
  function off(ms, reason) { down = Date.now() + ms; why = reason; emit(); }

  /* the signed-in user's token if the Supabase library saved one on this device; otherwise the public key is enough */
  function token() {
    try {
      const ls = G.localStorage; if (!ls) return '';
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (/^sb-.+-auth-token$/.test(k)) { const s = JSON.parse(ls.getItem(k) || 'null'); const tk = s && (s.access_token || (s.currentSession && s.currentSession.access_token)); if (tk && (!s.expires_at || s.expires_at * 1000 > Date.now())) return tk; }
      }
    } catch (e) { /* none */ }
    return '';
  }
  const tidy = s => String(s == null ? '' : s).replace(/\|/g, '').replace(/\s+/g, ' ').trim();
  const cacheUrl = (text, gender) => 'https://pasathai.local/tts/th/' + gender + '/' + encodeURIComponent(text);

  async function fromCache(key) {
    try { if (!G.caches) return null; const c = await G.caches.open(CACHE); const r = await c.match(key); return r ? await r.blob() : null; } catch (e) { return null; }
  }
  async function toCache(key, blob) {
    try { if (!G.caches) return; const c = await G.caches.open(CACHE); await c.put(key, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } })); } catch (e) { /* not important */ }
  }

  async function fetchOne(text, gender) {
    const key = cacheUrl(text, gender);
    const cached = await fromCache(key);
    if (cached) return URL.createObjectURL(cached);
    if (!available()) return null;
    let r;
    try {
      const tk = token();
      r = await G.fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg().supabaseAnonKey, Authorization: 'Bearer ' + (tk || cfg().supabaseAnonKey) },
        body: JSON.stringify({ text, lang: 'th', gender })
      });
    } catch (e) { off(60e3, 'offline'); return null; }
    if (r.status === 429) { off(30 * 60e3, 'limit'); return null; }
    if (r.status === 404 || r.status === 503 || r.status === 401 || r.status === 403) { off(10 * 60e3, 'setup'); return null; }
    if (!r.ok) { off(30e3, 'error'); return null; }
    const blob = await r.blob();
    if (!blob || !blob.size) return null;
    toCache(key, blob);
    if (!okSeen) { okSeen = true; emit(); }
    return URL.createObjectURL(blob);
  }
  /* a playable URL for one piece of Thai text, or null */
  function get(text, gender) {
    text = tidy(text); gender = gender === 'male' ? 'male' : 'female';
    if (!text || text.length > MAX || !configured()) return Promise.resolve(null);
    const k = gender + '|' + text;
    if (!mem.has(k)) mem.set(k, fetchOne(text, gender).then(u => { if (!u) mem.delete(k); return u; }, () => { mem.delete(k); return null; }));
    return mem.get(k);
  }
  /* fetches in the background so pressing ▶ plays at once (e.g. the words of the lesson that is open) */
  function prefetch(texts, gender) { (texts || []).slice(0, 40).forEach(x => { get(x, gender); }); }

  /* for the admin system check: asks the function directly (no caches); { ok, status, voice, error } */
  async function check() {
    if (!configured()) return { ok: false, status: 0, error: 'not_configured' };
    try {
      const r = await G.fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg().supabaseAnonKey, Authorization: 'Bearer ' + (token() || cfg().supabaseAnonKey) }, body: JSON.stringify({ text: 'สวัสดีครับ', lang: 'th', gender: 'female' }) });
      let error = ''; if (!r.ok) { try { error = (await r.json()).error || ''; } catch (e) { error = ''; } }
      return { ok: r.ok, status: r.status, voice: (r.headers && r.headers.get && r.headers.get('x-voice')) || '', error };
    } catch (e) { return { ok: false, status: 0, error: 'offline' }; }
  }
  FGH.cloudVoice = { MODES, MAX, mode, setMode, configured, available, status, onChange, get, prefetch, check, _reset() { mem.clear(); down = 0; why = ''; okSeen = false; } };
})(typeof window !== 'undefined' ? window : globalThis);
