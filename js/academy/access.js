/* Who may open the Thai Learning Academy, and the protected course content.
   The database decides (supabase/migrations/0005: teaching_access, get_course_content): approved teachers/admins and devices
   signed in as a student. Protected courses (for example the BOOK 42 course) are never in this public repository: they are
   downloaded from the database after the check and added to FGH_CONTENT.academy.courses for this page only.
   check() → { ok, kind: 'staff'|'student', name, className, svc, client, courses: [ids] } or { ok: false, reason }
   reasons: not_configured, offline, migration_missing, not_signed_in, no_teaching_access, error */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  let pending = null;

  /* adds a protected course document to the page's course list (only in memory) */
  function register(row) {
    if (!row || !row.doc || !Array.isArray(row.doc.lessons)) return null;
    const C = G.FGH_CONTENT = G.FGH_CONTENT || {}, A = C.academy = C.academy || { courses: {} };
    const key = String(row.doc.key || row.id).replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
    if (!key) return null;
    A.courses[key] = Object.assign({ target: 'th', explain: ['sv'], passPct: 70, track: 'thai' }, row.doc, { protected: true, version: row.version });
    return key;
  }
  /* lesson audio and images live in the private bucket "course-media": links valid 1 hour, made after the access check */
  async function attachMedia(svc, keys) {
    const C = G.FGH_CONTENT, A = C.academy, paths = [], wordOf = {};
    keys.forEach(k => (A.courses[k].lessons || []).forEach(l => {
      for (const t in (l.audio || {})) { paths.push(l.audio[t]); (wordOf[l.audio[t]] = wordOf[l.audio[t]] || []).push(t); }
      (l.images || []).forEach(im => { if (im && im.path) paths.push(im.path); });
    }));
    if (!paths.length || !svc.mediaLinks) return;
    try {
      const links = await svc.mediaLinks(paths);
      C.media = Object.assign(C.media || {}, links);
      C.audio = C.audio || {}; C.audio.th = C.audio.th || {};
      for (const p in links) (wordOf[p] || []).forEach(t => { C.audio.th[String(t).replace(/\|/g, '').trim()] = links[p]; });
    } catch (e) { /* lessons still work with the synthetic voice */ }
  }
  function reasonOf(e) {
    const m = String((e && (e.message || e.code)) || e || '');
    if (/offline|failed to fetch|network|load failed/i.test(m)) return 'offline';
    if (/PGRST202|could not find the function|teaching_access|does not exist/i.test(m)) return 'migration_missing';
    if (/not_signed_in|JWT|auth/i.test(m)) return 'not_signed_in';
    return (e && e.code) || 'error';
  }
  async function run() {
    const factory = G.FGH_CLIENT_FACTORY || (FGH.supabaseClient && FGH.supabaseClient.configured() ? FGH.supabaseClient.createClient : null);
    if (!factory || !FGH.schoolService) return { ok: false, reason: 'not_configured' };
    let client, svc, acc;
    try { client = await factory(); svc = FGH.schoolService.create(client); } catch (e) { return { ok: false, reason: reasonOf(e) }; }
    try { if (client.auth && client.auth.getSession) await client.auth.getSession(); } catch (e) { /* the call below decides */ }
    try { acc = await svc.teachingAccess(); } catch (e) { return { ok: false, reason: reasonOf(e) }; }
    if (!acc || !acc.ok) return { ok: false, reason: (acc && acc.reason) || 'no_teaching_access' };
    const out = { ok: true, kind: acc.kind, name: acc.name || '', className: acc.class_name || '', studentId: acc.student_id || null, svc, client, courses: [] };
    try {
      const list = await svc.listCourseContent();
      for (const it of (list || [])) { const row = await svc.getCourseContent(it.id); const k = register(row); if (k) out.courses.push(k); }
      await attachMedia(svc, out.courses);
    } catch (e) { out.contentError = reasonOf(e); }
    return out;
  }
  FGH.teachingAccess = { check: () => pending || (pending = run()), register, reasonOf, reset: () => { pending = null; } };
})(typeof window !== 'undefined' ? window : globalThis);
