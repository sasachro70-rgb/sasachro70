/* School service: classes, students, student sign-in and the student's saved progress.
   Only calls the database functions of supabase/migrations/0003 and 0004 and reads what RLS allows.
   Teachers sign in with e-mail + password (js/online/auth-service.js). A student device signs in anonymously and is then
   bound to one student with class code + student number + PIN; the PIN is checked by the database. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const CODE_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

  function toError(err) {
    const msg = String((err && (err.message || err.error_description)) || err || 'error');
    const code = /failed to fetch|network|load failed|offline/i.test(msg) ? 'offline'
      : (/^[a-z_0-9]+$/.test(msg.trim()) ? msg.trim() : (/permission denied/i.test(msg) ? 'not_allowed' : 'error'));
    return Object.assign(new Error(msg), { code });
  }
  const normalizeCode = code => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  function create(client) {
    async function rpc(name, args) {
      let res;
      try { res = await client.rpc(name, args || {}); } catch (e) { throw toError(e); }
      if (res.error) throw toError(res.error);
      return res.data;
    }
    async function rows(query) {
      let res;
      try { res = await query; } catch (e) { throw toError(e); }
      if (res.error) throw toError(res.error);
      return res.data || [];
    }
    const from = t => client.from(t);
    return {
      normalizeCode,
      looksLikeCode: c => CODE_RE.test(normalizeCode(c)),
      myAccount: () => rpc('my_account'),
      recordLogin: () => rpc('record_login'),
      requestAccess: (name, lang, role, note) => rpc('request_access', { p_display_name: name, p_lang: lang, p_requested_role: role, p_note: note || null }),

      /* ---------- teacher ---------- */
      classes: () => rows(from('classes').select('id,name,code,teacher_id,created_at,archived_at').order('created_at')),
      students: classId => rows(from('students').select('id,class_id,student_no,display_name,created_at,last_active_at,archived_at').eq('class_id', classId).order('student_no')),
      activity: (classId, limit) => rows(from('student_activity').select('student_id,key,area,kind,title,unit,score,max,pct,ms,at').eq('class_id', classId).order('at', { ascending: false }).limit(limit || 500)),
      progress: studentIds => studentIds.length ? rows(from('student_progress').select('student_id,data,rev,updated_at').in('student_id', studentIds)) : Promise.resolve([]),
      createClass: (name, count, names) => rpc('create_class', { p_name: name, p_count: count || 0, p_names: names && names.length ? names : null }),
      addStudents: (classId, count, names) => rpc('add_students', { p_class: classId, p_count: count || 0, p_names: names && names.length ? names : null }),
      resetPin: studentId => rpc('reset_student_pin', { p_student: studentId }),
      renameStudent: (studentId, name) => rpc('rename_student', { p_student: studentId, p_name: name }),
      archiveStudent: (studentId, archived) => rpc('set_student_archived', { p_student: studentId, p_archived: !!archived }),
      renameClass: (classId, name) => rpc('rename_class', { p_class: classId, p_name: name }),
      archiveClass: (classId, archived) => rpc('set_class_archived', { p_class: classId, p_archived: !!archived }),

      /* ---------- student device ---------- */
      studentLogin: (code, no, pin) => rpc('student_login', { p_code: normalizeCode(code), p_student_no: parseInt(no, 10) || 0, p_pin: String(pin || '').trim() }),
      studentMe: () => rpc('student_me'),
      studentLogout: () => rpc('student_logout'),
      saveProgress: (data, rev) => rpc('student_save_progress', { p_data: data, p_rev: rev }),
      recordActivity: a => rpc('student_record_activity', { p_key: a.key, p_area: a.area, p_kind: a.kind, p_title: a.title, p_unit: a.unit || null, p_score: a.score | 0, p_max: a.max | 0, p_ms: a.ms | 0 })
    };
  }
  FGH.schoolService = { create, toError, normalizeCode };
})(typeof window !== 'undefined' ? window : globalThis);
