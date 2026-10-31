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
      /* ---------- teaching material and homework (migration 0005) ---------- */
      teachingAccess: () => rpc('teaching_access'),
      listCourseContent: () => rpc('list_course_content'),
      getCourseContent: id => rpc('get_course_content', { p_id: id }),
      saveCourseContent: (id, title, doc) => rpc('save_course_content', { p_id: id, p_title: title, p_doc: doc }),
      createAssignment: x => rpc('create_assignment', { p_class: x.classId, p_title: x.title, p_instructions: x.instructions || '', p_due: x.due || null,
        p_course: x.course || null, p_lesson: x.lesson || null, p_max_score: x.maxScore == null ? 10 : x.maxScore, p_allow_resubmit: x.allowResubmit !== false }),
      archiveAssignment: (id, archived) => rpc('set_assignment_archived', { p_id: id, p_archived: !!archived }),
      teacherAssignments: classId => rpc('teacher_assignments', { p_class: classId }),
      teacherSubmissions: id => rpc('teacher_submissions', { p_assignment: id }),
      teacherThread: (id, studentId) => rpc('teacher_thread', { p_assignment: id, p_student: studentId }),
      reviewSubmission: (subId, status, score, comment) => rpc('review_submission', { p_submission: subId, p_status: status, p_score: score == null || score === '' ? null : parseInt(score, 10), p_comment: comment || null }),
      teacherComment: (id, studentId, body) => rpc('teacher_comment', { p_assignment: id, p_student: studentId, p_body: body }),
      studentAssignments: () => rpc('student_assignments'),
      studentThread: id => rpc('student_thread', { p_assignment: id }),
      studentSubmit: (id, answer, file) => rpc('student_submit', { p_assignment: id, p_answer: answer || '', p_file_path: file ? file.path : null, p_file_name: file ? file.name : null, p_file_type: file ? file.type : null }),
      studentComment: (id, body) => rpc('student_comment', { p_assignment: id, p_body: body }),
      /* ---------- Teacher Content Manager (migration 0006) ---------- */
      teacherCourses: () => rpc('teacher_courses'),
      getCourseDraft: id => rpc('get_course_draft', { p_course: id }),
      saveCourseDraft: (id, title, doc) => rpc('save_course_draft', { p_course: id, p_title: title, p_doc: doc }),
      deleteCourseDraft: id => rpc('delete_course_draft', { p_course: id }),
      publishCourseDraft: id => rpc('publish_course_draft', { p_course: id }),
      unpublishCourse: id => rpc('unpublish_course', { p_course: id }),
      courseHistory: id => rpc('course_history', { p_course: id }),
      restoreCourseVersion: (id, v) => rpc('restore_course_version', { p_course: id, p_version: v }),
      /* lesson audio and images: private bucket "course-media", path "<course id>/<audio|img>/<name>" */
      async uploadCourseMedia(courseId, file, kind, name) {
        if (!file) return null;
        if (file.size > 20 * 1024 * 1024) throw Object.assign(new Error('file_too_large'), { code: 'file_too_large' });
        const safe = String(name || file.name || 'fil').normalize('NFC').replace(/[^\w.\-\u0E00-\u0E7F]+/g, '_').slice(-80);
        const path = courseId + '/' + (kind === 'audio' ? 'audio' : 'img') + '/' + Date.now().toString(36) + '-' + safe;
        let res;
        try { res = await client.storage.from('course-media').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false }); } catch (e) { throw toError(e); }
        if (res.error) throw toError(res.error);
        return path;
      },
      async mediaLinks(paths) {
        paths = Array.from(new Set((paths || []).filter(Boolean))); if (!paths.length) return {};
        let res;
        try { res = await client.storage.from('course-media').createSignedUrls(paths, 3600); } catch (e) { throw toError(e); }
        if (res.error) throw toError(res.error);
        const out = {}; (res.data || []).forEach(x => { if (x && x.signedUrl) out[x.path] = x.signedUrl; }); return out;
      },
      /* files of hand-ins: private bucket "submissions", path "<student id>/<assignment id>/<time>-<name>"; read through a link valid 1 hour */
      async uploadSubmissionFile(studentId, assignmentId, file) {
        if (!file) return null;
        if (file.size > 10 * 1024 * 1024) throw Object.assign(new Error('file_too_large'), { code: 'file_too_large' });
        const safe = String(file.name || 'fil').normalize('NFC').replace(/[^\w.\-\u0E00-\u0E7F]+/g, '_').slice(-80);
        const path = studentId + '/' + assignmentId + '/' + Date.now() + '-' + safe;
        let res;
        try { res = await client.storage.from('submissions').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false }); } catch (e) { throw toError(e); }
        if (res.error) throw toError(res.error);
        return { path, name: String(file.name || safe).slice(0, 160), type: file.type || '' };
      },
      async fileLink(path) {
        let res;
        try { res = await client.storage.from('submissions').createSignedUrl(path, 3600); } catch (e) { throw toError(e); }
        if (res.error) throw toError(res.error);
        return res.data && res.data.signedUrl;
      },
      recordActivity: a => rpc('student_record_activity', { p_key: a.key, p_area: a.area, p_kind: a.kind, p_title: a.title, p_unit: a.unit || null, p_score: a.score | 0, p_max: a.max | 0, p_ms: a.ms | 0 })
    };
  }
  FGH.schoolService = { create, toError, normalizeCode };
})(typeof window !== 'undefined' ? window : globalThis);
