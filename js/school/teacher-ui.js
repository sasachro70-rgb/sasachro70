/* Teacher page (teacher.html): sign in, ask for teacher access, create classes (by number of students or by a list of
   names), print login cards with the PINs (shown once), see each student's progress, add students, new PIN, rename,
   archive. Every right is checked by the database (migrations 0003, 0004); this page only shows what it returns. */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit;
  const { $, esc } = K;
  const t = (k, v) => K.t('school.' + k, v);
  const V = { screen: 'loading', mode: 'signin', err: null, msg: null, acc: null, classes: [], classId: null, students: [], acts: [], prog: [],
    cards: null, showArchived: false, how: 'count', confirm: null, editing: null };
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
    else { V.screen = V.classId ? 'class' : 'classes'; await loadClasses(); if (V.classId) await loadClass(V.classId); }
    render();
  }
  async function loadClasses() { V.classes = await svc.classes(); }
  async function loadClass(id) {
    V.classId = id;
    V.students = await svc.students(id);
    V.acts = await svc.activity(id, 500);
    V.prog = await svc.progress(V.students.map(s => s.id));
  }

  /* ---------- screens ---------- */
  function render() {
    document.documentElement.lang = K.ui(); document.body.dataset.area = 'parent';
    const S = { loading: () => '<p class="muted">…</p>', setup: setupHTML, signin: signinHTML, ask: askHTML, status: statusHTML, notTeacher: notTeacherHTML,
      classes: classesHTML, class: classHTML, cards: cardsHTML };
    const out = (V.err ? '<div class="warn" role="alert">⚠️ ' + esc(V.err) + '</div>' : '') + (V.msg ? '<div class="notebox" role="status">✓ ' + esc(V.msg) + '</div>' : '');
    $('app').innerHTML = top() + out + (S[V.screen] || S.loading)() + confirmHTML();
  }
  function top() {
    const a = V.acc;
    return K.header(t('teacherTitle'), { back: V.screen === 'class' || V.screen === 'cards' ? 'toClasses' : null,
      extra: a && a.signed_in && !a.guest ? '<span class="pill">🧑‍🏫 ' + esc(a.display_name || '') + '</span><button class="btn small" data-act="signOut">' + esc(t('signOut')) + '</button>' : '' });
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
  const askHTML = () => '<form class="card stack" data-form="ask" style="max-width:460px"><h2>' + esc(t('ask')) + '</h2><p class="muted">' + esc(t('askInfo')) + '</p>' +
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
      '<p class="muted" style="margin:.4rem 0 0">' + esc(t('loginAt')) + ': <b>' + esc(studentLink()) + '</b></p></section>';
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

  /* ---------- actions ---------- */
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    mode(v) { V.mode = v; V.err = null; render(); },
    how(v) { const n = $('cn'); if (n) V.cn = n.value; V.how = v; render(); },   // keep the typed class name
    signOut() { run(async () => { await client.auth.signOut(); V.acc = null; V.classId = null; V.screen = 'signin'; }); },
    toClasses() { V.classId = null; V.cards = null; V.screen = 'classes'; run(loadClasses); },
    openClass(v) { V.screen = 'class'; V.editing = null; run(() => loadClass(v)); },
    edit(v) { V.editing = v; render(); const i = $('rs'); if (i) i.focus(); },
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
    if (form === 'ask') run(async () => { await svc.requestAccess($('nm').value, K.ui(), 'teacher'); await refresh(); });
    if (form === 'newClass') run(async () => {
      const name = $('cn').value, r = V.how === 'count' ? await svc.createClass(name, +$('cc').value, null) : await svc.createClass(name, 0, lines('cl'));
      V.classId = r.class_id; V.cn = ''; V.cards = { name: r.name, code: r.code, students: r.students }; V.screen = 'cards'; await loadClasses();
    });
    if (form === 'addStudents') run(async () => {
      const r = V.how === 'count' ? await svc.addStudents(V.classId, +$('ac').value, null) : await svc.addStudents(V.classId, 0, lines('al'));
      const c = V.classes.find(x => x.id === V.classId); V.cards = { name: c.name, code: c.code, students: r }; V.screen = 'cards';
    });
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
