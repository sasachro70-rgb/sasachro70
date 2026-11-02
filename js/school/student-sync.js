/* Student Mode on a device: keeps the signed-in student's learning saved on the server.
   - student.html signs the device in (class code + number + PIN) and calls begin(); every learning page that loads this
     file (kids.html, student.html) then saves the student's progress automatically:
       progress document (same format as the family learning document: courses, lessons, words, review cards, voice)
       → student_save_progress (with a revision; a newer server copy is merged, never overwritten);
       every finished lesson / round in the activity log → student_record_activity (stored once per key).
   - On this device the student is a normal local learner profile (kind child) with studentId set, so all existing
     games and lessons work unchanged. Logging out saves, signs the device out and removes the student's local copy
     (the server keeps everything), so the next student on a shared school iPad sees nothing of it.
   Local key: localStorage "fgh.student" = { studentId, pid, name, no, className, classCode, rev, sent: [activity keys] }. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const F = FGH.family, store = FGH.familyStore;
  const KEY = 'fgh.student';
  const read = () => { try { return JSON.parse(G.localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const write = s => { try { if (s) G.localStorage.setItem(KEY, JSON.stringify(s)); else G.localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };
  let svc = null, timer = 0, pushing = null, lastSent = '', status = 'idle', listeners = [];
  const setStatus = s => { status = s; listeners.forEach(fn => { try { fn(s); } catch (e) { /* ignore */ } }); };

  /* ---------- the progress document (pure; tested in Node) ---------- */
  function docOf(f, pid) {
    const done = {}; Object.keys(f.done || {}).filter(k => k.startsWith(pid + '|')).forEach(k => { done[k.slice(pid.length + 1)] = f.done[k]; });
    return { v: 1, learning: f.learning[pid] || {}, srs: f.srs[pid] || {}, favorites: f.favorites[pid] || [], adult: f.adult[pid] || null,
      voice: (f.voice || {})[pid] || null, done, profile: (() => { const p = F.getProfile(f, pid); return p ? { age: p.age, diff: p.diff, avatar: p.avatar } : null; })() };
  }
  /* merges a server document into this device: best results and newest cards from both, nothing is lost */
  function mergeInto(f, pid, d) {
    if (!d || typeof d !== 'object') return;
    f.learning[pid] = F.mergeLearning(f.learning[pid] || {}, d.learning || {});
    const srs = f.srs[pid] || (f.srs[pid] = {});
    for (const k in (d.srs || {})) if (!srs[k] || (d.srs[k].last || 0) > (srs[k].last || 0)) srs[k] = d.srs[k];
    f.favorites[pid] = Array.from(new Set((f.favorites[pid] || []).concat(d.favorites || [])));
    if (d.adult && !f.adult[pid]) f.adult[pid] = d.adult;
    if (d.voice && FGH.voice) { f.voice = f.voice || {}; f.voice[pid] = FGH.voice.merge(f.voice[pid], d.voice); }
    for (const u in (d.done || {})) if (!f.done[pid + '|' + u]) f.done[pid + '|' + u] = d.done[u];
    const p = F.getProfile(f, pid);
    if (p && d.profile) { if (d.profile.age) p.age = d.profile.age; if (d.profile.diff != null) p.diff = d.profile.diff; if (d.profile.avatar) p.avatar = d.profile.avatar; }
  }
  /* the local learner for this student: found by studentId, created once */
  function ensureProfile(f, me) {
    let p = f.profiles.find(x => !x.removed && x.studentId === me.student_id);
    if (!p) { const r = F.addProfile(f, { name: me.name, kind: 'child', avatar: '🎒', age: 8 }); p = r.profile; p.studentId = me.student_id; }
    else if (p.name !== me.name) p.name = me.name;
    return p.id;
  }
  /* activity entries of this learner not sent yet */
  function unsent(f, pid, sent) {
    const s = new Set(sent || []);
    return f.log.filter(e => e.pid === pid && !s.has('log:' + e.id)).map(e => ({ key: 'log:' + e.id, area: e.area || 'other', kind: e.kind || 'other',
      title: String(e.title || '').slice(0, 120), unit: e.key ? String(e.key).slice(0, 120) : null, score: e.score | 0, max: e.max | 0, ms: e.ms | 0 }));
  }

  /* ---------- device ---------- */
  /* after student_login / student_me: remember who is signed in and bring their saved progress onto this device */
  function begin(service, me) {
    svc = service;
    const pid = store.mutate(f => { const id = ensureProfile(f, me); mergeInto(f, id, me.progress || {}); return id; });
    const old = read();
    write({ studentId: me.student_id, pid, name: me.name, no: me.student_no, className: me.class_name, classCode: me.class_code, rev: me.rev || 0,
      sent: old && old.studentId === me.student_id ? old.sent || [] : (me.recent || []).map(r => r.key) });
    lastSent = '';
    schedule(200);
    return pid;
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(() => { push().catch(() => {}); }, ms == null ? 2000 : ms); }
  async function push() {
    if (pushing) return pushing.then(() => push());   // a change made while saving is saved right after
    pushing = (async () => {
      const s = read(); if (!s || !svc) return;
      setStatus('saving');
      try {
        /* finished activities first (idempotent, so a retry never counts twice) */
        for (const a of unsent(store.get(), s.pid, s.sent).slice(0, 50)) {
          await svc.recordActivity(a);
          const cur = read(); if (!cur) return; cur.sent = (cur.sent || []).concat([a.key]).slice(-2000); write(cur);
        }
        for (let attempt = 0; attempt < 3; attempt++) {
          const cur = read(); if (!cur) return;
          const doc = docOf(store.get(), cur.pid), json = JSON.stringify(doc);
          if (json === lastSent) break;
          const r = await svc.saveProgress(doc, cur.rev);
          if (r && r.ok) { cur.rev = r.rev; write(cur); lastSent = json; break; }
          if (r && r.error === 'stale') { store.mutate(f => mergeInto(f, cur.pid, r.data)); cur.rev = r.rev; write(cur); continue; }
          throw Object.assign(new Error('save_failed'), { code: (r && r.error) || 'save_failed' });
        }
        setStatus('saved');
      } catch (e) {
        setStatus(e.code === 'not_a_student' ? 'signed_out' : 'offline');
        if (e.code !== 'not_a_student') schedule(30000);
      }
    })();
    const mine = pushing;
    mine.then(() => { if (pushing === mine) pushing = null; }, () => { if (pushing === mine) pushing = null; });
    return mine;
  }
  /* saves, signs the device out, removes this student's local copy */
  async function end(service) {
    const s = read(); svc = service || svc;
    if (s && svc) { try { await push(); } catch (e) { /* keep going */ } try { await svc.studentLogout(); } catch (e) { /* offline: the session ends anyway */ } }
    if (s) store.mutate(f => {
      const p = F.getProfile(f, s.pid); if (p) { F.removeProfile(f, s.pid); p.name = 'Elev'; }
      delete f.learning[s.pid]; delete f.srs[s.pid]; delete f.favorites[s.pid]; delete f.adult[s.pid]; if (f.voice) delete f.voice[s.pid];
      Object.keys(f.done).filter(k => k.startsWith(s.pid + '|')).forEach(k => { delete f.done[k]; });
      f.log = f.log.filter(e => e.pid !== s.pid);
    });
    write(null); lastSent = ''; setStatus('idle');
  }
  /* on learning pages: if a student is signed in on this device, connect and save every change */
  async function attach() {
    const s = read(); if (!s) return false;
    if (!FGH.supabaseClient || !FGH.supabaseClient.configured() || !FGH.schoolService) return false;
    try {
      const factory = G.FGH_CLIENT_FACTORY || FGH.supabaseClient.createClient;
      svc = FGH.schoolService.create(await factory());
      const me = await svc.studentMe();
      begin(svc, me);
      return true;
    } catch (e) {
      setStatus(e.code === 'not_a_student' ? 'signed_out' : 'offline');
      return false;
    }
  }
  if (store && store.onChange) store.onChange(() => { if (read() && svc) schedule(); });
  G.addEventListener && G.addEventListener('online', () => { if (read() && svc) schedule(0); });
  G.addEventListener && G.addEventListener('pagehide', () => { if (read() && svc) push().catch(() => {}); });

  FGH.studentSync = { KEY, current: read, begin, push, end, attach, docOf, mergeInto, ensureProfile, unsent, status: () => status, onStatus: fn => listeners.push(fn) };
})(typeof window !== 'undefined' ? window : globalThis);
/* learning pages (not student.html, which signs in itself) reconnect a signed-in student automatically */
(function (G) {
  if (typeof document === 'undefined' || !G.FGH || !G.FGH.studentSync) return;
  const go = () => { if (document.body && document.body.dataset.page !== 'student' && G.FGH.studentSync.current()) G.FGH.studentSync.attach(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})(typeof window !== 'undefined' ? window : globalThis);
