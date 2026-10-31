/* Teacher page (teacher.html): sign in, ask for teacher access, create classes (by number of students or by a list of
   names), print login cards with the PINs (shown once), see each student's progress, add students, new PIN, rename,
   archive. Every right is checked by the database (migrations 0003, 0004); this page only shows what it returns. */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit;
  const { $, esc } = K;
  const t = (k, v) => K.t('school.' + k, v);
  const V = { screen: 'loading', mode: 'signin', err: null, msg: null, acc: null, classes: [], classId: null, students: [], acts: [], prog: [],
    cards: null, showArchived: false, how: 'count', confirm: null, editing: null, hw: null, hwErr: null, hwNew: false, hwId: null, hwSubs: null, thread: null };
  let client = null, auth = null, svc = null, busy = false;

  const errText = e => { const c = e && e.code; const s = K.t('school.err_' + c); return s && s !== 'school.err_' + c ? s : t('err_generic', { m: c || (e && e.message) || '?' }); };
  async function run(fn) {
    if (busy) return; busy = true; V.err = null; V.msg = null;
    try { await fn(); } catch (e) { V.err = errText(e); }
    busy = false; render();
  }
  const fmt = ts => ts ? K.fmtDate(ts, true) : t('never');
  const studentLink = () => location.href.replace(/teacher\.html.*$/, 'student.html');

  /* ---------- start ---------- */
  async function boot() {
    const factory = window.FGH_CLIENT_FACTORY || (FGH.supabaseClient.configured() ? FGH.supabaseClient.createClient : null);
    if (!factory) { V.screen = 'setup'; return render(); }
    try { client = await factory(); } catch (e) { V.err = errText(e); V.screen = 'setup'; return render(); }
    auth = FGH.authService.create(client); svc = FGH.schoolService.create(client);
    auth.onChange(() => { refresh().catch(e => { V.err = errText(e); render(); }); });
    await auth.init();
  }
  async function refresh() {
    const st = auth.state();
    if (!st.signedIn || st.user.guest) { V.screen = 'signin'; return render(); }
    V.acc = await svc.recordLogin().catch(() => svc.myAccount());
    const a = V.acc || {};
    if (a.status === 'none') V.screen = 'ask';
    else if (!a.approved) V.screen = 'status';
    else if (!(a.role === 'teacher' || (a.permissions || []).includes('classes.manage'))) V.screen = 'notTeacher';
    else {
      V.screen = V.classId ? 'class' : 'classes'; await loadClasses(); if (V.classId) await loadClass(V.classId);
      /* protected courses (if any) so homework can point to their lessons */
      if (FGH.teachingAccess) FGH.teachingAccess.check().then(() => { if (V.hwNew) render(); }).catch(() => {});
    }
    render();
  }
  async function loadClasses() { V.classes = await svc.classes(); }
  async function loadClass(id) {
    V.classId = id;
    V.students = await svc.students(id);
    V.acts = await svc.activity(id, 500);
    V.prog = await svc.progress(V.students.map(s => s.id));
    await loadHw();
  }
  /* homework (migration 0005); without the update the class page still works and says what is missing */
  async function loadHw() {
    V.hwErr = null;
    try { V.hw = await svc.teacherAssignments(V.classId); }
    catch (e) { V.hw = null; V.hwErr = FGH.teachingAccess ? FGH.teachingAccess.reasonOf(e) : (e.code || 'error'); }
  }
  async function loadHwSubs() { V.hwSubs = await svc.teacherSubmissions(V.hwId); }
  async function loadThread(studentId) { V.thread = await svc.teacherThread(V.hwId, studentId); }

  /* ---------- screens ---------- */
  function render() {
    document.documentElement.lang = K.ui(); document.body.dataset.area = 'parent';
    const S = { loading: () => '<p class="muted">…</p>', setup: setupHTML, signin: signinHTML, ask: askHTML, status: statusHTML, notTeacher: notTeacherHTML,
      classes: classesHTML, class: classHTML, cards: cardsHTML, hw: hwHTML, thread: threadHTML };
    const out = (V.err ? '<div class="warn" role="alert">⚠️ ' + esc(V.err) + '</div>' : '') + (V.msg ? '<div class="notebox" role="status">✓ ' + esc(V.msg) + '</div>' : '');
    $('app').innerHTML = top() + out + (S[V.screen] || S.loading)() + confirmHTML();
  }
  function top() {
    const a = V.acc;
    return K.header(t('teacherTitle'), { back: V.screen === 'class' || V.screen === 'cards' ? 'toClasses' : V.screen === 'hw' ? 'toClass' : V.screen === 'thread' ? 'toHw' : null,
      extra: a && a.signed_in && !a.guest ? ((a.approved && (a.role === 'admin' || a.role === 'super_admin' || a.system_owner)) ? '<a class="btn small" href="admin.html">🛡️ ' + esc(K.t('adm.title')) + '</a>' : '') + '<a class="btn small" href="content.html">📚 ' + esc(K.t('cm.title')) + '</a><span class="pill">🧑‍🏫 ' + esc(a.display_name || '') + '</span><button class="btn small" data-act="signOut">' + esc(t('signOut')) + '</button>' : '' });
  }
  function confirmHTML() {
    if (!V.confirm) return '';
    return '<div class="overlay" role="dialog" aria-modal="true"><div class="card stack" style="max-width:440px"><p>' + esc(V.confirm.text) + '</p><div class="row">' +
      '<button class="btn primary" data-act="confirmYes">' + esc(t('yes')) + '</button><button class="btn" data-act="confirmNo">' + esc(t('no')) + '</button></div></div></div>';
  }
  const setupHTML = () => '<div class="card"><p>' + esc(t('notSetUp')) + '</p></div>';
  function signinHTML() {
    const create = V.mode === 'create';
    return '<form class="card stack" data-form="signin" style="max-width:460px"><h2>' + esc(create ? t('newAccount') : t('signIn')) + '</h2>' +
      '<label class="field">' + esc(t('email')) + '<input id="em" type="email" autocomplete="username" required></label>' +
      '<label class="field">' + esc(t('password')) + '<input id="pw" type="password" autocomplete="' + (create ? 'new-password' : 'current-password') + '" minlength="8" required></label>' +
      '<div class="row"><button class="btn primary big" type="submit">' + esc(create ? t('newAccount') : t('signIn')) + '</button>' +
      '<button class="btn" type="button" data-act="mode" data-v="' + (create ? 'signin' : 'create') + '">' + esc(create ? t('haveAccount') : t('newAccount')) + '</button></div></form>';
  }
  /* an invitation link from the Admin Panel (teacher.html?invite=…): accepting it gives the invited role at once */
  const INVITE = new URLSearchParams(location.search).get('invite');
  const askHTML = () => '<form class="card stack" data-form="ask" style="max-width:460px"><h2>' + esc(INVITE ? '✉️ ' + K.t('school.inviteTitle') : t('ask')) + '</h2><p class="muted">' + esc(INVITE ? K.t('school.inviteInfo') : t('askInfo')) + '</p>' +
    '<label class="field">' + esc(t('name')) + '<input id="nm" type="text" maxlength="40" required></label><div class="row"><button class="btn primary" type="submit">' + esc(t('ask')) + '</button></div></form>';
  function statusHTML() {
    const s = V.acc && V.acc.status;
    return '<div class="card"><p>' + esc(s === 'pending' ? t('pending') : s === 'rejected' ? t('rejected') : t('blocked')) + '</p></div>';
  }
  const notTeacherHTML = () => '<div class="card"><p>' + esc(t('notTeacher')) + '</p></div>';

  function classesHTML() {
    const list = V.classes.filter(c => V.showArchived || !c.archived_at);
    let h = '<h2 class="sec">' + esc(t('myClasses')) + '</h2>';
    h += list.length ? '<div class="grid">' + list.map(c => '<button class="tile" data-act="openClass" data-v="' + esc(c.id) + '"><span class="ic" aria-hidden="true">🏫</span><span class="nm">' + esc(c.name) + '</span>' +
      '<span class="ds">' + esc(t('code')) + ': <b class="code">' + esc(c.code) + '</b>' + (c.archived_at ? ' · ' + esc(t('archived')) : '') + '</span></button>').join('') + '</div>'
      : '<p class="muted">' + esc(t('noClasses')) + '</p>';
    if (V.classes.some(c => c.archived_at)) h += '<label class="row"><input type="checkbox" data-change="showArchived"' + (V.showArchived ? ' checked' : '') + '> ' + esc(t('showArchived')) + '</label>';
    h += '<form class="card stack" data-form="newClass"><h2>＋ ' + esc(t('newClass')) + '</h2>' +
      '<label class="field">' + esc(t('className')) + '<input id="cn" type="text" maxlength="60" required placeholder="Thai 1A" value="' + esc(V.cn || '') + '"></label>' +
      '<fieldset class="field"><legend>' + esc(t('how')) + '</legend><div class="choices">' +
      ['count', 'names'].map(m => '<button type="button" class="btn small' + (V.how === m ? ' on' : '') + '" data-act="how" data-v="' + m + '" aria-pressed="' + (V.how === m) + '">' + esc(m === 'count' ? t('byCount') : t('byNames')) + '</button>').join('') + '</div></fieldset>' +
      (V.how === 'count' ? '<label class="field">' + esc(t('count')) + '<input id="cc" type="number" min="1" max="100" value="20" required inputmode="numeric"></label>'
        : '<label class="field">' + esc(t('names')) + '<textarea id="cl" rows="8" required placeholder="Mali\nChaiyo\nPear"></textarea></label>') +
      '<div class="row"><button class="btn primary big" type="submit">' + esc(t('create')) + '</button></div></form>';
    return h;
  }
  /* lessons done and average best score from the student's saved progress document */
  function summary(sid) {
    const p = V.prog.find(x => x.student_id === sid), L = (p && p.data && p.data.learning) || {};
    let done = 0, sum = 0, n = 0;
    for (const k in L) for (const id in ((L[k] && L[k].lessons) || {})) { const r = L[k].lessons[id]; if (r.done) done++; if (r.best != null) { sum += r.best; n++; } }
    const last = V.acts.find(a => a.student_id === sid);
    return { done, avg: n ? Math.round(sum / n) : null, last };
  }
  function classHTML() {
    const c = V.classes.find(x => x.id === V.classId); if (!c) return '';
    const list = V.students.filter(s => V.showArchived || !s.archived_at);
    let h = '<section class="card"><div class="row" style="margin:0"><h2 style="margin:0">🏫 ' + esc(c.name) + '</h2><span class="pill">' + esc(t('code')) + ': <b class="code">' + esc(c.code) + '</b></span>' +
      '<span class="muted">' + V.students.filter(s => !s.archived_at).length + ' ' + esc(t('students')) + '</span><span class="grow"></span>' +
      '<button class="btn small" data-act="ask" data-v="' + (c.archived_at ? 'restoreClass' : 'archiveClass') + '">' + esc(c.archived_at ? t('restore') : t('archive')) + '</button></div>' +
      '<form class="row" data-form="renameClass"><input id="rc" type="text" maxlength="60" value="' + esc(c.name) + '" aria-label="' + esc(t('className')) + '"><button class="btn small" type="submit">' + esc(t('rename')) + '</button></form>' +
      '<p class="muted" style="margin:.4rem 0 0">' + esc(t('loginAt')) + ': <b>' + esc(studentLink()) + '</b></p></section>' + hwSectionHTML();
    h += '<div class="card tablewrap"><table><thead><tr><th>' + esc(t('studentNo')) + '</th><th>' + esc(t('studentName')) + '</th><th>' + esc(t('lastActive')) + '</th><th>' + esc(t('lessons')) + '</th><th>' + esc(t('avg')) + '</th><th>' + esc(t('latest')) + '</th><th></th></tr></thead><tbody>' +
      list.map(s => {
        const sm = summary(s.id);
        const name = V.editing === s.id
          ? '<form class="row" data-form="renameStudent" data-v="' + esc(s.id) + '" style="margin:0"><input id="rs" type="text" maxlength="40" value="' + esc(s.display_name) + '"><button class="btn small" type="submit">' + esc(t('save')) + '</button></form>'
          : esc(s.display_name) + (s.archived_at ? ' <span class="muted">(' + esc(t('archived')) + ')</span>' : '');
        return '<tr><td><b>' + s.student_no + '</b></td><td>' + name + '</td><td>' + esc(fmt(s.last_active_at)) + '</td><td>' + sm.done + '</td><td>' + (sm.avg == null ? '–' : sm.avg + ' %') + '</td>' +
          '<td>' + (sm.last ? esc(sm.last.title) + ' · ' + sm.last.pct + ' %' : '–') + '</td><td class="row" style="margin:0;flex-wrap:nowrap">' +
          '<button class="btn small" data-act="edit" data-v="' + esc(s.id) + '">' + esc(t('rename')) + '</button>' +
          '<button class="btn small" data-act="ask" data-v="resetPin:' + esc(s.id) + '">' + esc(t('resetPin')) + '</button>' +
          '<button class="btn small" data-act="ask" data-v="' + (s.archived_at ? 'restoreStudent:' : 'archiveStudent:') + esc(s.id) + '">' + esc(s.archived_at ? t('restore') : t('archive')) + '</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    if (V.students.some(s => s.archived_at)) h += '<label class="row"><input type="checkbox" data-change="showArchived"' + (V.showArchived ? ' checked' : '') + '> ' + esc(t('showArchived')) + '</label>';
    h += '<form class="card stack" data-form="addStudents"><h2>＋ ' + esc(t('addStudents')) + '</h2><div class="choices">' +
      ['count', 'names'].map(m => '<button type="button" class="btn small' + (V.how === m ? ' on' : '') + '" data-act="how" data-v="' + m + '">' + esc(m === 'count' ? t('byCount') : t('byNames')) + '</button>').join('') + '</div>' +
      (V.how === 'count' ? '<label class="field">' + esc(t('count')) + '<input id="ac" type="number" min="1" max="100" value="1" required inputmode="numeric"></label>'
        : '<label class="field">' + esc(t('names')) + '<textarea id="al" rows="4" required></textarea></label>') +
      '<div class="row"><button class="btn primary" type="submit">' + esc(t('add')) + '</button></div></form>';
    const recent = V.acts.slice(0, 30);
    h += '<section class="card"><h2>' + esc(t('recent')) + '</h2>' + (recent.length ? '<ul class="plain">' + recent.map(a => {
      const s = V.students.find(x => x.id === a.student_id);
      return '<li>' + esc(K.fmtDate(a.at, true)) + ' · <b>' + esc(s ? s.student_no + ' ' + s.display_name : '?') + '</b> · ' + esc(a.title) + ' · ' + a.pct + ' %</li>';
    }).join('') + '</ul>' : '<p class="muted">' + esc(t('noActivity')) + '</p>') + '</section>';
    return h;
  }
  /* printable login cards; the PINs exist only in this page until it is left */
  function cardsHTML() {
    const c = V.cards; if (!c) return '';
    return '<div class="warn no-print" role="alert">🔐 ' + esc(t('cardsWarn')) + '</div><div class="row no-print"><button class="btn primary big" data-act="print">🖨️ ' + esc(t('print')) + '</button>' +
      '<button class="btn big" data-act="cardsDone">' + esc(t('done')) + '</button></div>' +
      '<h2 class="sec">' + esc(t('cardsTitle')) + ' · ' + esc(c.name) + '</h2><div class="logincards">' + c.students.map(s =>
        '<div class="logincard"><div class="lc-top">🎒 ' + esc(c.name) + '</div><div class="lc-name">' + esc(s.name) + '</div>' +
        '<dl><dt>' + esc(t('code')) + '</dt><dd class="code">' + esc(c.code) + '</dd><dt>' + esc(t('studentNo')) + '</dt><dd>' + s.student_no + '</dd><dt>' + esc(t('pin')) + '</dt><dd class="code">' + esc(s.pin) + '</dd></dl>' +
        '<div class="lc-url">' + esc(studentLink()) + '</div></div>').join('') + '</div>';
  }

  /* ---------- homework (Phase H) ---------- */
  const fmtTs = ts => ts ? K.fmtDate(Date.parse(ts), true) : '';
  /* lessons a homework can point to: every Thai course on this page, including protected ones the database gave us */
  function lessonOptions() {
    const all = (window.FGH_CONTENT && window.FGH_CONTENT.academy && window.FGH_CONTENT.academy.courses) || {};
    return Object.keys(all).filter(k => all[k].target === 'th' && Array.isArray(all[k].lessons)).map(k => {
      const c = all[k], nm = c.name ? (c.name[K.ui()] || c.name.sv || c.name.en || k) : k;
      return '<optgroup label="' + esc(nm) + '">' + c.lessons.map(l => '<option value="' + esc(k + '|' + l.id) + '">' + esc((l.title && (l.title[K.ui()] || l.title.sv)) || l.id) + '</option>').join('') + '</optgroup>';
    }).join('');
  }
  function hwSectionHTML() {
    let h = '<section class="card stack"><div class="row" style="margin:0"><h2 style="margin:0">📝 ' + esc(t('hw.title')) + '</h2><span class="grow"></span>' +
      (V.hw ? '<button class="btn small primary" data-act="hwNew">＋ ' + esc(t('hw.create')) + '</button>' : '') + '</div>';
    if (!V.hw) return h + '<p class="muted" style="margin:0">' + esc(V.hwErr === 'migration_missing' ? t('hw.needsUpdate') : t('err_generic', { m: V.hwErr || '?' })) + '</p></section>';
    if (V.hwNew) h += '<form class="stack hwform" data-form="newHw"><label class="field">' + esc(t('hw.hTitle')) + '<input id="hwT" type="text" maxlength="120" required></label>' +
      '<label class="field">' + esc(t('hw.instructions')) + '<textarea id="hwI" rows="4" maxlength="4000"></textarea></label>' +
      '<div class="row" style="margin:0"><label class="field">' + esc(t('hw.due')) + '<input id="hwD" type="datetime-local"></label><label class="field">' + esc(t('hw.maxScore')) + '<input id="hwM" type="number" min="0" max="1000" value="10" inputmode="numeric"></label></div>' +
      '<label class="field">' + esc(t('hw.lesson')) + '<select id="hwL"><option value="">' + esc(t('hw.noLesson')) + '</option>' + lessonOptions() + '</select></label>' +
      '<label class="row" style="margin:0"><input id="hwR" type="checkbox" checked> ' + esc(t('hw.resubmit')) + '</label><div class="row" style="margin:0"><button class="btn primary" type="submit">' + esc(t('hw.save')) + '</button><button class="btn" type="button" data-act="hwNew">' + esc(K.t('cancel')) + '</button></div></form>';
    const list = V.hw.filter(a => V.showArchived || !a.archived_at);
    h += list.length ? '<ul class="plain hwt">' + list.map(a => '<li class="row" style="margin:0;justify-content:space-between"><span><b>' + esc(a.title) + '</b>' + (a.archived_at ? ' <span class="muted">(' + esc(t('hw.archived')) + ')</span>' : '') +
      '<br><span class="muted">' + (a.due_at ? esc(fmtTs(a.due_at)) + ' · ' : '') + esc(t('hw.counts', { p: a.pending, r: a.returned, a: a.approved, s: a.students })) + '</span></span>' +
      '<span class="row" style="margin:0"><button class="btn small primary" data-act="hwOpen" data-v="' + esc(a.id) + '">' + esc(t('hw.open')) + (a.pending ? ' (' + a.pending + ')' : '') + '</button>' +
      '<button class="btn small" data-act="hwArchive" data-v="' + esc(a.id) + '">' + esc(a.archived_at ? t('hw.restore') : t('hw.archive')) + '</button></span></li>').join('') + '</ul>'
      : '<p class="muted" style="margin:0">' + esc(t('hw.none')) + '</p>';
    return h + '</section>';
  }
  function hwHTML() {
    const a = (V.hw || []).find(x => x.id === V.hwId); if (!a) return '';
    let h = '<section class="card stack"><h2 style="margin:0">📝 ' + esc(a.title) + '</h2>' + (a.instructions ? '<p style="margin:0;white-space:pre-wrap">' + esc(a.instructions) + '</p>' : '') +
      '<p class="muted" style="margin:0">' + (a.due_at ? esc(fmtTs(a.due_at)) + ' · ' : '') + esc(t('hw.maxScore')) + ': ' + a.max_score + (a.lesson_id ? ' · 📖 ' + esc(a.lesson_id) : '') + '</p></section>';
    if (!V.hwSubs) return h + '<p class="muted">…</p>';
    return h + '<div class="card tablewrap"><h2>' + esc(t('hw.studentsTitle')) + '</h2><table><tbody>' + V.hwSubs.map(r => {
      const sb = r.submission;
      return '<tr><td><b>' + r.student_no + '</b></td><td>' + esc(r.name) + '</td><td>' + (sb ? esc(t('hw.st.' + sb.status)) + (sb.late ? ' · ' + esc(t('hw.late')) : '') + ' · v' + sb.version + (sb.score != null ? ' · ' + sb.score + '/' + a.max_score : '') + (sb.has_file ? ' · 📎' : '') : '<span class="muted">' + esc(t('hw.notHanded')) + '</span>') + '</td>' +
        '<td>' + (r.messages ? '💬 ' + r.messages : '') + '</td><td><button class="btn small' + (sb && sb.status === 'submitted' ? ' primary' : '') + '" data-act="hwThread" data-v="' + esc(r.student_id) + '">' + esc(t('hw.open')) + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function threadHTML() {
    const th = V.thread; if (!th) return '<p class="muted">…</p>';
    const a = th.assignment, last = th.submissions[th.submissions.length - 1];
    let h = '<section class="card"><h2 style="margin:0">' + esc(th.student.student_no + ' ' + th.student.name) + ' · ' + esc(a.title) + '</h2></section>';
    h += '<h2 class="sec">' + esc(t('hw.versions')) + '</h2>' + (th.submissions.length ? th.submissions.slice().reverse().map(sb => '<section class="card"><div class="row" style="margin:0"><b>v' + sb.version + '</b><span class="muted">' + esc(fmtTs(sb.submitted_at)) + (sb.late ? ' · ' + esc(t('hw.late')) : '') + '</span><span class="grow"></span><span class="pill">' + esc(t('hw.st.' + sb.status)) + (sb.score != null ? ' · ' + sb.score + '/' + a.max_score : '') + '</span></div>' +
      '<p style="white-space:pre-wrap" lang="th">' + (sb.answer ? esc(sb.answer) : '<span class="muted">' + esc(t('hw.noAnswer')) + '</span>') + '</p>' + (sb.file_path ? '<button class="btn small" data-act="hwFile" data-v="' + esc(sb.file_path) + '">📎 ' + esc(sb.file_name || t('hw.file')) + '</button>' : '') + '</section>').join('') : '<p class="muted">' + esc(t('hw.notHanded')) + '</p>');
    if (last) h += '<form class="card stack" data-form="review" data-v="' + esc(last.id) + '"><h2 style="margin:0">' + esc(t('hw.review')) + ' (v' + last.version + ')</h2>' +
      '<label class="field">' + esc(t('hw.score')) + ' (0–' + a.max_score + ')<input id="rvS" type="number" min="0" max="' + a.max_score + '" value="' + (last.score != null ? last.score : '') + '" inputmode="numeric"></label>' +
      '<label class="field">' + esc(t('hw.comment')) + '<textarea id="rvC" rows="3" maxlength="4000"></textarea></label>' +
      '<div class="row" style="margin:0"><button class="btn primary" type="submit" data-status="approved">✅ ' + esc(t('hw.approve')) + '</button><button class="btn" type="submit" data-status="returned">✏️ ' + esc(t('hw.ret')) + '</button></div></form>';
    h += '<h2 class="sec">💬 ' + esc(t('hw.talk')) + '</h2><section class="card stack">' + (th.messages.length ? th.messages.map(m => '<div class="msg ' + m.kind + '"><div class="mh"><b>' + esc(m.name) + '</b><span class="muted">' + esc(m.kind === 'teacher' ? t('hw.teacherFb') : t('hw.studentCm')) + ' · ' + esc(fmtTs(m.at)) + (m.version ? ' · v' + m.version : '') + '</span></div><p>' + esc(m.body) + '</p></div>').join('') : '<p class="muted" style="margin:0">' + esc(t('hw.noTalk')) + '</p>') +
      '<form class="row" data-form="tcomment" style="margin:0"><input id="tcB" type="text" maxlength="4000" placeholder="' + esc(t('hw.commentPh')) + '" style="flex:1;min-height:48px"><button class="btn" type="submit">' + esc(t('hw.commentOnly')) + '</button></form></section>';
    return h;
  }

  /* ---------- actions ---------- */
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    mode(v) { V.mode = v; V.err = null; render(); },
    how(v) { const n = $('cn'); if (n) V.cn = n.value; V.how = v; render(); },   // keep the typed class name
    signOut() { run(async () => { await client.auth.signOut(); V.acc = null; V.classId = null; V.screen = 'signin'; }); },
    toClasses() { V.classId = null; V.cards = null; V.screen = 'classes'; run(loadClasses); },
    openClass(v) { V.screen = 'class'; V.editing = null; run(() => loadClass(v)); },
    edit(v) { V.editing = v; render(); const i = $('rs'); if (i) i.focus(); },
    hwNew() { V.hwNew = !V.hwNew; render(); const i = $('hwT'); if (i) i.focus(); },
    hwOpen(v) { V.hwId = v; V.hwSubs = null; V.screen = 'hw'; run(loadHwSubs); },
    hwArchive(v) { const a = (V.hw || []).find(x => x.id === v); run(async () => { await svc.archiveAssignment(v, !(a && a.archived_at)); await loadHw(); V.msg = t('saved'); }); },
    hwThread(v) { V.thread = null; V.screen = 'thread'; run(() => loadThread(v)); },
    hwFile(v) { const w = window.open('', '_blank'); svc.fileLink(v).then(u => { if (w) w.location = u; else location.href = u; }).catch(() => { if (w) w.close(); V.err = t('hw.fileError'); render(); }); },
    toClass() { V.screen = 'class'; V.hwId = null; run(loadHw); },
    toHw() { V.screen = 'hw'; V.thread = null; run(async () => { await loadHw(); await loadHwSubs(); }); },
    print() { window.print(); },
    cardsDone() { V.cards = null; V.screen = V.classId ? 'class' : 'classes'; run(async () => { await loadClasses(); if (V.classId) await loadClass(V.classId); }); },
    ask(v) {
      const [what, id] = v.split(':'), s = V.students.find(x => x.id === id), n = s ? s.student_no + ' ' + s.display_name : '';
      const text = what === 'resetPin' ? t('resetAsk', { n }) : what === 'archiveStudent' ? t('archiveStudentAsk', { n }) : what === 'archiveClass' ? t('archiveClassAsk') : null;
      if (!text) return ACT.doIt(v);
      V.confirm = { v, text }; render();
    },
    confirmNo() { V.confirm = null; render(); },
    confirmYes() { const v = V.confirm.v; V.confirm = null; ACT.doIt(v); },
    doIt(v) {
      const [what, id] = v.split(':');
      run(async () => {
        if (what === 'resetPin') { const r = await svc.resetPin(id); const c = V.classes.find(x => x.id === V.classId); V.cards = { name: c.name, code: c.code, students: [r] }; V.screen = 'cards'; return; }
        if (what === 'archiveStudent' || what === 'restoreStudent') await svc.archiveStudent(id, what === 'archiveStudent');
        if (what === 'archiveClass' || what === 'restoreClass') { await svc.archiveClass(V.classId, what === 'archiveClass'); await loadClasses(); }
        await loadClass(V.classId); V.msg = t('saved');
      });
    }
  };
  K.bindActs(ACT);
  const lines = id => String(($(id) || {}).value || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  document.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target.dataset.form;
    if (form === 'signin') run(async () => {
      const em = $('em').value, pw = $('pw').value;
      if (V.mode === 'create') { const r = await auth.signUp(em, pw); if (r.needsConfirmation) { V.msg = t('checkMail'); V.mode = 'signin'; } }
      else await auth.signIn(em, pw);
    });
    if (form === 'ask') run(async () => {
      if (INVITE) { await svc.acceptInvitation(INVITE, $('nm').value, K.ui()); history.replaceState(null, '', location.pathname); }
      else await svc.requestAccess($('nm').value, K.ui(), 'teacher');
      await refresh();
    });
    if (form === 'newClass') run(async () => {
      const name = $('cn').value, r = V.how === 'count' ? await svc.createClass(name, +$('cc').value, null) : await svc.createClass(name, 0, lines('cl'));
      V.classId = r.class_id; V.cn = ''; V.cards = { name: r.name, code: r.code, students: r.students }; V.screen = 'cards'; await loadClasses();
    });
    if (form === 'addStudents') run(async () => {
      const r = V.how === 'count' ? await svc.addStudents(V.classId, +$('ac').value, null) : await svc.addStudents(V.classId, 0, lines('al'));
      const c = V.classes.find(x => x.id === V.classId); V.cards = { name: c.name, code: c.code, students: r }; V.screen = 'cards';
    });
    if (form === 'newHw') run(async () => {
      const lv = $('hwL').value, [course, lesson] = lv ? lv.split('|') : [null, null], due = $('hwD').value;
      await svc.createAssignment({ classId: V.classId, title: $('hwT').value, instructions: $('hwI').value, due: due ? new Date(due).toISOString() : null, course, lesson,
        maxScore: parseInt($('hwM').value, 10), allowResubmit: $('hwR').checked });
      V.hwNew = false; await loadHw(); V.msg = t('saved');
    });
    if (form === 'review') run(async () => {
      const status = (e.submitter && e.submitter.dataset.status) || 'approved', sid = V.thread.student.id;
      await svc.reviewSubmission(e.target.dataset.v, status, $('rvS').value, $('rvC').value); await loadThread(sid); V.msg = t('hw.reviewed');
    });
    if (form === 'tcomment') run(async () => { const b = $('tcB').value.trim(); if (!b) return; const sid = V.thread.student.id; await svc.teacherComment(V.hwId, sid, b); await loadThread(sid); });
    if (form === 'renameClass') run(async () => { await svc.renameClass(V.classId, $('rc').value); await loadClasses(); V.msg = t('saved'); });
    if (form === 'renameStudent') run(async () => { await svc.renameStudent(e.target.dataset.v, $('rs').value); V.editing = null; await loadClass(V.classId); V.msg = t('saved'); });
  });
  document.addEventListener('change', e => { if (e.target.dataset.change === 'showArchived') { V.showArchived = e.target.checked; render(); } });
  /* PINs must not stay on screen by accident */
  window.addEventListener('beforeunload', e => { if (V.screen === 'cards') { e.preventDefault(); e.returnValue = ''; } });
  render();
  boot().catch(e => { V.err = errText(e); V.screen = 'setup'; render(); });
  window.__teacher = { state: () => V };
})();
