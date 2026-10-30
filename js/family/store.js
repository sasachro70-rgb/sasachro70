/* Family store: the family's learners, points ledger, rewards, activity history and learning progress.
   One record for the whole family in localStorage ("fgh.family.v1"); with a family account connected,
   js/family/cloud-sync.js copies it to Supabase and the server's points rules win.
   Existing data is never moved or deleted: hub players ("fgh.v1") and KeyKids learners ("keykids.v1")
   stay where they are and are only *linked* to a family profile. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const LG = FGH.ledger;
  const KEY = 'fgh.family.v1';
  const MAX_LOG = 1500;

  const newId = () => LG.newId();
  const dayOf = LG.dayOf;
  const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  const ageBand = age => { age = +age || 6; return age <= 4 ? 1 : age <= 6 ? 2 : age <= 8 ? 3 : 4; };

  function emptyFamily() {
    return {
      v: 1, created: Date.now(), ui: null,
      profiles: [],                 // { id, kind: child|adult, name, avatar, age, diff, goalMin, ttsRate, links: { hub: [], keykids: [] }, cloudId, removed }
      parent: { pin: null, failed: 0, lockUntil: 0 },
      ledger: LG.emptyState(),      // tx, rewards, redemptions, rules
      log: [],                      // finished activities: { id, pid, ts, area, kind, title, ms, score, max, pct, key }
      done: {},                     // unit keys already completed once (for the repeat rule)
      learning: {},                 // [pid][courseKey] = { lessons: { id: { best, attempts, done, last } }, current, timeMs, lastAt }
      srs: {},                      // [pid][itemKey] = review card (js/family/srs.js)
      favorites: {},                // [pid] = [itemKey]
      adult: {},                    // [pid] = { target, explain, level, goal, minutesPerDay, started }
      custom: { kidsWords: [], disabledLessons: [] },
      imported: { hub: [], keykids: [] },
      sync: { familyId: null, lastPull: 0, outbox: [] }
    };
  }
  function loadFamily(raw) {
    let o = null;
    try { o = raw ? JSON.parse(raw) : null; } catch (e) { o = null; }
    const f = emptyFamily();
    if (!o || o.v !== 1) return f;
    Object.assign(f, o);
    f.parent = Object.assign(emptyFamily().parent, o.parent);
    f.ledger = Object.assign(LG.emptyState(), o.ledger);
    f.ledger.rules = Object.assign({}, LG.DEFAULT_RULES, o.ledger && o.ledger.rules);
    f.custom = Object.assign(emptyFamily().custom, o.custom);
    f.imported = Object.assign(emptyFamily().imported, o.imported);
    f.sync = Object.assign(emptyFamily().sync, o.sync);
    for (const k of ['learning', 'srs', 'favorites', 'adult', 'done']) if (!f[k] || typeof f[k] !== 'object') f[k] = {};
    f.profiles = (Array.isArray(f.profiles) ? f.profiles : []).filter(p => p && p.id).map(fixProfile);
    if (!Array.isArray(f.log)) f.log = [];
    return f;
  }
  function fixProfile(p) {
    return Object.assign({ kind: 'child', name: '?', avatar: '🙂', age: 6, diff: 0, goalMin: 15, ttsRate: 0.9, links: { hub: [], keykids: [] }, cloudId: null, removed: false, created: Date.now() },
      p, { links: Object.assign({ hub: [], keykids: [] }, p.links) });
  }

  /* ---------- profiles ---------- */
  const activeProfiles = (f, kind) => f.profiles.filter(p => !p.removed && (!kind || p.kind === kind));
  const getProfile = (f, id) => f.profiles.find(p => p.id === id && !p.removed) || null;
  function addProfile(f, data) {
    const name = cleanName(data.name); if (!name) return { ok: false, error: 'name_required' };
    const p = fixProfile({ id: newId(), kind: data.kind === 'adult' ? 'adult' : 'child', name, avatar: data.avatar || '🙂',
      age: Math.max(2, Math.min(99, +data.age || 6)), diff: +data.diff || 0, created: Date.now() });
    f.profiles.push(p);
    return { ok: true, profile: p };
  }
  function updateProfile(f, id, ch) {
    const p = getProfile(f, id); if (!p) return { ok: false, error: 'not_found' };
    if ('name' in ch) { const n = cleanName(ch.name); if (!n) return { ok: false, error: 'name_required' }; p.name = n; }
    if ('avatar' in ch) p.avatar = String(ch.avatar || '🙂').slice(0, 8);
    if ('age' in ch) p.age = Math.max(2, Math.min(99, +ch.age || 6));
    if ('diff' in ch) p.diff = Math.max(0, Math.min(4, +ch.diff || 0));
    if ('goalMin' in ch) p.goalMin = Math.max(0, Math.min(180, +ch.goalMin || 0));
    if ('ttsRate' in ch) p.ttsRate = Math.max(0.5, Math.min(1.3, +ch.ttsRate || 1));
    if ('kind' in ch) p.kind = ch.kind === 'adult' ? 'adult' : 'child';
    return { ok: true, profile: p };
  }
  /* The profile disappears from every list, but its points history stays so the ledger keeps adding up. */
  function removeProfile(f, id) {
    const p = getProfile(f, id); if (!p) return { ok: false, error: 'not_found' };
    f.ledger.redemptions.filter(r => r.profileId === id && r.status === 'pending').forEach(r => LG.reject(f.ledger, r.id, Date.now(), 'profile removed'));
    p.removed = true; p.removedAt = Date.now();
    return { ok: true };
  }
  const level = p => p.diff || ageBand(p.age);   // the parent's choice wins over the age

  /* ---------- links to the existing hub players and KeyKids learners ---------- */
  const byLink = (f, kind, legacyId) => f.profiles.find(p => !p.removed && p.links[kind].includes(legacyId)) || null;
  const sameName = (a, b) => cleanName(a).toLocaleLowerCase() === cleanName(b).toLocaleLowerCase();

  /* KeyKids learners and hub players with the same name become one family profile. Runs every time; only new ones are added. */
  function importLegacy(f, hubState, kkRoot) {
    let added = 0, linked = 0;
    const kk = (kkRoot && Array.isArray(kkRoot.profiles)) ? kkRoot.profiles : [];
    const hub = (hubState && Array.isArray(hubState.players)) ? hubState.players : [];
    for (const k of kk) {
      if (!k || !k.id || f.imported.keykids.includes(k.id)) continue;
      f.imported.keykids.push(k.id);
      let p = byLink(f, 'keykids', k.id) || activeProfiles(f).find(x => sameName(x.name, k.name));
      if (!p) { p = addProfile(f, { name: k.name || '?', avatar: k.avatar, age: k.age, kind: 'child' }).profile; added++; } else linked++;
      if (!p.links.keykids.includes(k.id)) p.links.keykids.push(k.id);
      /* KeyKids "points" from before the ledger become one opening entry, so nothing a child earned is lost */
      if (k.points > 0) LG.openingBalance(f.ledger, p.id, k.points, Date.now());
    }
    for (const h of hub) {
      if (!h || !h.id || f.imported.hub.includes(h.id)) continue;
      f.imported.hub.push(h.id);
      let p = byLink(f, 'hub', h.id) || activeProfiles(f).find(x => sameName(x.name, h.name));
      if (!p) { p = addProfile(f, { name: h.name || '?', avatar: h.avatar, age: 6 + 2 * ((h.level || 1) - 1), kind: /^[👩👨👵👴]/u.test(h.avatar || '') ? 'adult' : 'child' }).profile; added++; } else linked++;
      if (!p.links.hub.includes(h.id)) p.links.hub.push(h.id);
    }
    return { added, linked };
  }
  /* a KeyKids learner or hub player created after the import gets a family profile the first time it plays */
  function profileForLegacy(f, kind, legacy) {
    let p = byLink(f, kind, legacy.id);
    if (p) return p;
    p = activeProfiles(f).find(x => sameName(x.name, legacy.name));
    if (!p) p = addProfile(f, { name: legacy.name || '?', avatar: legacy.avatar, age: legacy.age || 6, kind: 'child' }).profile;
    p.links[kind].push(legacy.id);
    f.imported[kind].push(legacy.id);
    return p;
  }

  /* ---------- activities & points ---------- */
  /* act: { key (unique per finished game), unit (what was completed, for the repeat rule), area, kind, title, ms, score, max, pct, ...ledger fields } */
  function finishActivity(f, pid, act, now) {
    now = now || Date.now();
    const p = getProfile(f, pid); if (!p) return { ok: false, error: 'not_found' };
    if (!act.key) return { ok: false, error: 'bad_request' };
    if (f.log.some(x => x.key === act.key)) return { ok: false, error: 'duplicate' };
    const repeat = !!(act.unit && f.done[pid + '|' + act.unit]);
    const entry = { id: newId(), pid, ts: now, area: act.area || 'kids', kind: act.kind, title: act.title || '', ms: Math.max(0, Math.round(act.ms || 0)),
      score: act.score == null ? null : act.score, max: act.max == null ? null : act.max, pct: act.pct == null ? null : Math.round(act.pct), key: act.key };
    f.log.push(entry);
    if (f.log.length > MAX_LOG) f.log = f.log.slice(-MAX_LOG);
    if (act.unit && act.completed !== false) f.done[pid + '|' + act.unit] = now;
    let award = { ok: true, amount: 0 };
    if (p.kind === 'child' && act.points !== false) {
      award = LG.award(f.ledger, pid, Object.assign({}, act, { repeat }), now);
      const goal = p.goalMin || 0, day = dayOf(now);
      if (goal && minutesOnDay(f, pid, day) >= goal) {
        const g = LG.award(f.ledger, pid, { key: 'dailygoal:' + pid + ':' + day, kind: 'dailygoal' }, now);
        if (g.ok && g.amount) award.bonus = g.amount;
      }
    }
    return { ok: true, entry, award, repeat };
  }
  const minutesOnDay = (f, pid, day) => Math.round(f.log.filter(x => x.pid === pid && dayOf(x.ts) === day).reduce((a, x) => a + x.ms, 0) / 60000);
  function lastDays(n, now) { const out = []; const d = new Date(now || Date.now()); d.setHours(12, 0, 0, 0); for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); out.push(dayOf(x.getTime())); } return out; }
  function weekly(f, pid, now) {
    return lastDays(7, now).map(day => ({
      day,
      minutes: minutesOnDay(f, pid, day),
      points: f.ledger.tx.filter(x => x.profileId === pid && x.amount > 0 && x.kind === 'earn' && dayOf(x.ts) === day).reduce((a, x) => a + x.amount, 0),
      activities: f.log.filter(x => x.pid === pid && dayOf(x.ts) === day).length
    }));
  }

  /* ---------- learning progress (kids language course and adult academy) ---------- */
  function course(f, pid, courseKey) {
    const L = f.learning[pid] || (f.learning[pid] = {});
    return L[courseKey] || (L[courseKey] = { lessons: {}, current: null, timeMs: 0, lastAt: 0, tests: [] });
  }
  /* records one lesson attempt; the best score is kept, a lesson counts as done at passPct or more */
  function recordLesson(f, pid, courseKey, lessonId, pct, ms, passPct, now) {
    now = now || Date.now();
    const c = course(f, pid, courseKey);
    const r = c.lessons[lessonId] || (c.lessons[lessonId] = { best: 0, attempts: 0, done: false, last: 0, firstDone: 0 });
    r.attempts++; r.best = Math.max(r.best, Math.round(pct)); r.last = now;
    if (pct >= (passPct == null ? 60 : passPct) && !r.done) { r.done = true; r.firstDone = now; }
    c.timeMs += Math.max(0, ms || 0); c.lastAt = now; c.current = lessonId;
    return r;
  }
  /* merges two copies of one learner's courses (two devices): best scores, done flags, words and tests from both */
  function mergeLearning(a, b) {
    const out = Object.assign({}, a);
    for (const k in b) {
      const x = a[k], y = b[k];
      if (!x || typeof y !== 'object' || y === null || !y.lessons) { if (x === undefined) out[k] = y; continue; }
      const m = Object.assign({}, x, { lessons: Object.assign({}, x.lessons) });
      for (const id in y.lessons) {
        const p = x.lessons[id], q = y.lessons[id];
        m.lessons[id] = !p ? q : { best: Math.max(p.best, q.best), attempts: Math.max(p.attempts, q.attempts), done: p.done || q.done, last: Math.max(p.last, q.last),
          firstDone: p.firstDone && q.firstDone ? Math.min(p.firstDone, q.firstDone) : (p.firstDone || q.firstDone || 0) };
      }
      m.timeMs = Math.max(x.timeMs || 0, y.timeMs || 0);
      if ((y.lastAt || 0) > (x.lastAt || 0)) { m.lastAt = y.lastAt; m.current = y.current; }
      const seen = new Set((x.tests || []).map(t => t.at)); m.tests = (x.tests || []).concat((y.tests || []).filter(t => !seen.has(t.at)));
      if (x.words || y.words) { m.words = Object.assign({}, y.words); for (const w in (x.words || {})) { const p = x.words[w], q = m.words[w]; m.words[w] = !q ? p : { right: Math.max(p.right, q.right), wrong: Math.max(p.wrong, q.wrong), last: Math.max(p.last || 0, q.last || 0) }; } }
      out[k] = m;
    }
    return out;
  }
  function startLesson(f, pid, courseKey, lessonId, now) { const c = course(f, pid, courseKey); c.current = lessonId; c.lastAt = now || Date.now(); }

  /* ---------- parent PIN (PBKDF2 when the browser has WebCrypto, else iterated SHA-256) ---------- */
  function sha256Hex(str) {
    /* small, dependency-free SHA-256 for browsers without crypto.subtle (e.g. file:// on some devices) */
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const bytes = Array.from(unescape(encodeURIComponent(str)), c => c.charCodeAt(0));
    const l = bytes.length * 8; bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = [];
      for (let i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, b, c, d, e, f2, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f2) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f2; f2 = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h = h.map((x, i) => (x + [a, b, c, d, e, f2, g, hh][i]) | 0);
    }
    return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  async function hashPin(pin, salt) {
    const subtle = G.crypto && G.crypto.subtle;
    if (subtle && G.TextEncoder) {
      try {
        const base = await subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
        const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120000 }, base, 256);
        return { algo: 'pbkdf2-120k', hash: Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('') };
      } catch (e) { /* fall through */ }
    }
    let x = salt + ':' + pin; for (let i = 0; i < 2000; i++) x = sha256Hex(x);
    return { algo: 'sha256-2k', hash: x };
  }
  const validPin = pin => /^\d{4,8}$/.test(String(pin || ''));
  async function setPin(f, pin) {
    if (!validPin(pin)) return { ok: false, error: 'pin_format' };
    const salt = newId();
    const h = await hashPin(String(pin), salt);
    f.parent.pin = { salt, algo: h.algo, hash: h.hash, set: Date.now() }; f.parent.failed = 0; f.parent.lockUntil = 0;
    return { ok: true };
  }
  /* 5 wrong PINs lock the dashboard for a minute, then 5 more for 5 minutes */
  async function checkPin(f, pin, now) {
    now = now || Date.now();
    if (!f.parent.pin) return { ok: false, error: 'no_pin' };
    if (f.parent.lockUntil > now) return { ok: false, error: 'locked', until: f.parent.lockUntil };
    let h;
    if (f.parent.pin.algo === 'sha256-2k') { let x = f.parent.pin.salt + ':' + pin; for (let i = 0; i < 2000; i++) x = sha256Hex(x); h = x; }
    else h = (await hashPin(String(pin), f.parent.pin.salt)).hash;
    if (h === f.parent.pin.hash) { f.parent.failed = 0; return { ok: true }; }
    f.parent.failed++;
    if (f.parent.failed % 5 === 0) f.parent.lockUntil = now + (f.parent.failed >= 10 ? 300000 : 60000);
    return { ok: false, error: 'wrong_pin', left: 5 - (f.parent.failed % 5) };
  }

  /* ---------- browser persistence: every change re-reads first, so two open pages don't overwrite each other ---------- */
  const listeners = [];
  let cache = null, saveOk = true;
  function storage() { try { return G.localStorage; } catch (e) { return null; } }
  function read() { const s = storage(); let raw = null; try { raw = s && s.getItem(KEY); } catch (e) { raw = null; } return loadFamily(raw); }
  function write(f) {
    const s = storage();
    try { s.setItem(KEY, JSON.stringify(f)); saveOk = true; } catch (e) { saveOk = false; }
    cache = f;
    listeners.forEach(fn => { try { fn(f); } catch (e) { console.error(e); } });
    return saveOk;
  }
  function legacy(key) { const s = storage(); try { return JSON.parse((s && s.getItem(key)) || 'null'); } catch (e) { return null; } }
  function get() {
    if (!cache) {
      cache = read();
      const r = importLegacy(cache, legacy('fgh.v1'), legacy('keykids.v1'));
      if (r.added || r.linked) write(cache);
    }
    return cache;
  }
  /* mutate(fn): fn gets the latest family record; its return value is passed back. Async functions are awaited. */
  function mutate(fn) {
    const f = read(); cache = f;
    const out = fn(f);
    if (out && typeof out.then === 'function') return out.then(v => { write(f); return v; });
    write(f); return out;
  }
  if (G.addEventListener) G.addEventListener('storage', e => { if (e.key === KEY) { cache = null; const f = get(); listeners.forEach(fn => fn(f)); } });

  FGH.family = { KEY, emptyFamily, loadFamily, fixProfile, activeProfiles, getProfile, addProfile, updateProfile, removeProfile, level, ageBand,
    importLegacy, profileForLegacy, byLink, finishActivity, minutesOnDay, weekly, lastDays, course, recordLesson, startLesson, mergeLearning,
    hashPin, setPin, checkPin, validPin, sha256Hex };
  FGH.familyStore = { get, mutate, onChange: fn => listeners.push(fn), saveOk: () => saveOk, legacy };
})(typeof window !== 'undefined' ? window : globalThis);
