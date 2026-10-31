/* Admin Panel (admin.html): access requests, users and roles, Admin permissions, invitations, all classes, courses,
   the security log and a system check (are migrations 0001–0006 run, do the storage buckets exist, is BOOK 42 loaded).
   Only the System Creator and Admins get in; every action is checked again by the database (migration 0003). */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit;
  const { $, esc } = K;
  const t = (k, v) => K.t('adm.' + k, v);
  const TABS = [['requests', '📨', 'users.approve'], ['users', '👥', 'users.view'], ['invites', '✉️', null], ['classes', '🏫', 'classes.manage'], ['courses', '📚', null], ['log', '🛡️', 'security.manage'], ['system', '🩺', null]];
  const ROLES = ['teacher', 'parent', 'student', 'user', 'admin'];
  const V = { screen: 'loading', tab: 'requests', acc: null, err: null, msg: null, data: {}, q: '', fRole: '', fStatus: '', invite: null, confirm: null, sys: null, busy: false };
  let client = null, svc = null;

  const errText = e => { const c = e && e.code; const s = K.t('school.err_' + c); return s && s !== 'school.err_' + c ? s : String(c || (e && e.message) || '?'); };
  async function run(fn) { if (V.busy) return; V.busy = true; V.err = null; V.msg = null; try { await fn(); } catch (e) { V.err = errText(e); } V.busy = false; render(); }
  const can = p => !p || !!(V.acc && (V.acc.system_owner || (V.acc.permissions || []).includes(p)));
  const fmt = ts => ts ? K.fmtDate(Date.parse(ts), true) : '–';
  const nameOf = id => { const a = (V.data.accounts || []).find(x => x.user_id === id); return a ? a.display_name + ' (#' + a.account_no + ')' : (id ? String(id).slice(0, 8) : '–'); };

  async function boot() {
    const factory = window.FGH_CLIENT_FACTORY || (FGH.supabaseClient.configured() ? FGH.supabaseClient.createClient : null);
    if (!factory) { V.screen = 'gate'; return render(); }
    client = await factory(); svc = FGH.schoolService.create(client);
    const auth = FGH.authService.create(client); await auth.init();
    V.acc = await svc.myAccount().catch(() => null);
    const a = V.acc || {};
    if (!a.approved || !(a.role === 'super_admin' || a.role === 'admin' || a.system_owner)) { V.screen = 'gate'; return render(); }
    V.screen = 'panel'; V.tab = can('users.approve') ? 'requests' : 'system';
    await loadTab();
  }
  async function loadTab() {
    const d = V.data, tab = V.tab;
    try {
      if ((tab === 'requests' || tab === 'users' || tab === 'log' || tab === 'invites' || tab === 'classes') && can('users.view')) d.accounts = await svc.accounts();
      if (tab === 'users') { d.perms = await svc.adminPermissions(); d.permList = await svc.permissionList(); }
      if (tab === 'invites') d.invites = await svc.invitations();
      if (tab === 'classes' && can('classes.manage')) { d.classes = await svc.classes(); d.students = {}; for (const c of d.classes) d.students[c.id] = (await svc.students(c.id)).filter(s => !s.archived_at).length; }
      if (tab === 'courses') { d.courses = await svc.listCourseContent().catch(() => []); }
      if (tab === 'log' && can('security.manage')) d.log = await svc.auditLog(300);
      if (tab === 'system' && !V.sys) await systemCheck();
    } catch (e) { V.err = errText(e); }
    render();
  }
  async function systemCheck() {
    const probes = [['m1', 'is_family_member', { p_family: '00000000-0000-0000-0000-000000000000' }], ['m2', 'point_balance', { p_profile: '00000000-0000-0000-0000-000000000000' }],
      ['m3', 'my_account', {}], ['m4', 'can_create_classes', {}], ['m5', 'teaching_access', {}], ['m6', 'can_edit_course', { p_id: 't-check' }],
      ['m7', 'tts_take_quota', { p_who: 'check', p_chars: 1, p_limit: 0, p_total: 0 }]];
    const out = [];
    for (const [k, fn, args] of probes) out.push({ key: k, label: (k.slice(1).padStart(4, '0')) + ' · ' + t('mig.' + k), ok: (await svc.probe(fn, args)).ok });
    for (const b of ['submissions', 'course-media']) out.push({ key: b, label: t('bucket', { b }), ok: (await svc.bucketExists(b)).ok });
    if (FGH.cloudVoice) {
      const c = await FGH.cloudVoice.check();
      out.push({ key: 'tts', label: t('ttsCheck') + (c.voice ? ' – ' + c.voice : c.status ? ' (' + c.status + (c.error ? ' ' + c.error : '') + ')' : c.error ? ' (' + c.error + ')' : ''), ok: c.ok });
    }
    let book = false; try { book = ((await svc.listCourseContent()) || []).some(c => c.id === 'book42'); } catch (e) { book = false; }
    out.push({ key: 'book', label: t('bookContent'), ok: book });
    out.unshift({ key: 'cfg', label: t('config'), ok: FGH.supabaseClient.configured() });
    V.sys = out;
  }

  /* ---------- screens ---------- */
  function render() {
    document.documentElement.lang = K.ui(); document.body.dataset.area = 'parent';
    const out = (V.err ? '<div class="warn" role="alert">⚠️ ' + esc(V.err) + '</div>' : '') + (V.msg ? '<div class="notebox" role="status">✓ ' + esc(V.msg) + '</div>' : '');
    let body = '';
    if (V.screen === 'loading') body = '<p class="muted">' + esc(t('checking')) + '</p>';
    else if (V.screen === 'gate') body = '<section class="card stack"><h2>🔒 ' + esc(t('title')) + '</h2><p>' + esc(t('notAdmin')) + '</p><div class="row"><a class="btn primary" href="teacher.html">' + esc(t('signIn')) + '</a></div></section>';
    else body = navHTML() + ({ requests: requestsHTML, users: usersHTML, invites: invitesHTML, classes: classesHTML, courses: coursesHTML, log: logHTML, system: systemHTML }[V.tab])();
    const who = V.acc && V.acc.approved ? '<span class="pill">🛡️ ' + esc(V.acc.display_name || '') + ' · ' + esc(t('role.' + (V.acc.system_owner ? 'super_admin' : V.acc.role))) + '</span>' : '';
    $('app').innerHTML = K.header('🛡️ ' + t('title'), { extra: who }) + out + body + confirmHTML();
  }
  function navHTML() { return '<nav class="acnav" aria-label="' + esc(t('title')) + '">' + TABS.map(([k, i]) => '<button data-act="tab" data-v="' + k + '" class="' + (V.tab === k ? 'on' : '') + '"' + (V.tab === k ? ' aria-current="page"' : '') + '>' + i + ' ' + esc(t('tabs.' + k)) + '</button>').join('') + '</nav>'; }
  const noRight = p => '<section class="card"><p class="muted" style="margin:0">' + esc(t('noRight', { p })) + '</p></section>';
  const roleSel = (id, cur, list) => '<select id="' + id + '">' + list.map(r => '<option value="' + r + '"' + (r === cur ? ' selected' : '') + '>' + esc(t('role.' + r)) + '</option>').join('') + '</select>';
  function confirmHTML() {
    if (!V.confirm) return '';
    return '<div class="overlay" role="dialog" aria-modal="true"><div class="card stack" style="max-width:440px"><p>' + esc(V.confirm.text) + '</p><div class="row"><button class="btn primary" data-act="confirmYes">' + esc(K.t('yes')) + '</button><button class="btn" data-act="confirmNo">' + esc(K.t('no')) + '</button></div></div></div>';
  }
  function requestsHTML() {
    if (!can('users.approve') || !can('users.view')) return noRight('users.approve');
    const list = (V.data.accounts || []).filter(a => a.status === 'pending');
    if (!list.length) return '<section class="card"><p class="muted" style="margin:0">' + esc(t('none')) + '</p></section>';
    return list.map(a => '<section class="card stack"><div class="row" style="margin:0"><b>' + esc(a.display_name) + '</b><span class="muted">#' + a.account_no + ' · ' + esc(t('created')) + ' ' + esc(fmt(a.created_at)) + '</span></div>' +
      (a.requested_role ? '<p style="margin:0">' + esc(t('requested', { r: t('role.' + a.requested_role) })) + '</p>' : '') + (a.request_note ? '<p class="muted" style="margin:0">💬 ' + esc(a.request_note) + '</p>' : '') +
      '<div class="row" style="margin:0"><label>' + esc(t('approveAs')) + ' ' + roleSel('ar-' + a.user_id, a.requested_role || 'user', ['teacher', 'parent', 'student', 'user']) + '</label>' +
      '<button class="btn primary" data-act="approve" data-v="' + esc(a.user_id) + '">✓ ' + esc(t('approve')) + '</button><button class="btn" data-act="ask" data-v="reject:' + esc(a.user_id) + '">✗ ' + esc(t('reject')) + '</button></div></section>').join('');
  }
  function usersHTML() {
    if (!can('users.view')) return noRight('users.view');
    const q = V.q.toLowerCase();
    const list = (V.data.accounts || []).filter(a => (!q || a.display_name.toLowerCase().includes(q) || String(a.account_no) === q.replace('#', '')) && (!V.fRole || a.role === V.fRole) && (!V.fStatus || a.status === V.fStatus));
    const permsOf = id => (V.data.perms || []).filter(p => p.user_id === id).map(p => p.permission);
    let h = '<section class="card row" style="margin-top:0"><input type="search" data-input="q" value="' + esc(V.q) + '" placeholder="' + esc(t('search')) + '" style="flex:1;min-height:44px">' +
      '<select data-change="fRole"><option value="">' + esc(t('all')) + '</option>' + ['super_admin'].concat(ROLES).map(r => '<option value="' + r + '"' + (V.fRole === r ? ' selected' : '') + '>' + esc(t('role.' + r)) + '</option>').join('') + '</select>' +
      '<select data-change="fStatus"><option value="">' + esc(t('all')) + '</option>' + ['pending', 'approved', 'rejected', 'suspended', 'deactivated'].map(s => '<option value="' + s + '"' + (V.fStatus === s ? ' selected' : '') + '>' + esc(t('status.' + s)) + '</option>').join('') + '</select></section>';
    h += '<div class="card tablewrap"><table><tbody>' + list.map(a => {
      const me = V.acc && a.user_id === V.acc.user_id, top = a.role === 'super_admin', adminRow = a.role === 'admin';
      const actions = me || top ? '<span class="muted">' + esc(me ? t('you') : '') + '</span>' :
        (adminRow && !V.acc.system_owner ? '<span class="muted">' + esc(t('ownerOnly')) + '</span>' :
        '<span class="row" style="margin:0">' + roleSel('rr-' + a.user_id, a.role, V.acc.system_owner ? ROLES : ROLES.filter(r => r !== 'admin')) + '<button class="btn small" data-act="setRole" data-v="' + esc(a.user_id) + '">' + esc(t('changeRole')) + '</button>' +
          (a.status === 'approved' ? '<button class="btn small" data-act="ask" data-v="suspended:' + esc(a.user_id) + '">' + esc(t('suspend')) + '</button>' : (a.status === 'suspended' || a.status === 'deactivated') ? '<button class="btn small" data-act="ask" data-v="approved:' + esc(a.user_id) + '">' + esc(t('reactivate')) + '</button>' : '') +
          (a.status !== 'deactivated' && a.status !== 'pending' ? '<button class="btn small" data-act="ask" data-v="deactivated:' + esc(a.user_id) + '">' + esc(t('deactivate')) + '</button>' : '') + '</span>');
      const perms = adminRow && V.acc.system_owner ? '<details><summary>' + esc(t('perms')) + '</summary><div class="permgrid">' + (V.data.permList || []).filter(p => p.key !== 'admins.manage').map(p => '<label><input type="checkbox" data-perm="' + esc(a.user_id) + '" value="' + esc(p.key) + '"' + (permsOf(a.user_id).includes(p.key) ? ' checked' : '') + '> <b>' + esc(p.key) + '</b> <span class="muted">' + esc(p.description) + '</span></label>').join('') +
        '</div><button class="btn small primary" data-act="savePerms" data-v="' + esc(a.user_id) + '">' + esc(t('savePerms')) + '</button></details>' : '';
      return '<tr><td><b>#' + a.account_no + '</b></td><td>' + esc(a.display_name) + perms + '</td><td>' + esc(t('role.' + a.role)) + '</td><td><span class="pill">' + esc(t('status.' + a.status)) + '</span></td><td class="muted">' + esc(fmt(a.last_seen_at)) + '</td><td>' + actions + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return h;
  }
  function invitesHTML() {
    const roles = (V.acc.system_owner ? ROLES : ['teacher', 'parent', 'student', 'user']).filter(r => V.acc.system_owner || can({ teacher: 'teachers.manage', parent: 'families.manage', student: 'students.manage', user: 'users.create' }[r]));
    let h = '';
    if (V.invite) h += '<section class="card stack" style="border:2px solid var(--tla-teal, #0E8C80)"><p style="margin:0"><b>' + esc(t('inviteLink')) + '</b></p><input id="invLink" type="text" readonly value="' + esc(V.invite) + '" style="width:100%;min-height:44px"><div class="row" style="margin:0"><button class="btn primary" data-act="copyInvite">📋 ' + esc(t('copy')) + '</button></div></section>';
    if (roles.length) h += '<form class="card stack" data-form="invite"><h2 style="margin:0">✉️ ' + esc(t('newInvite')) + '</h2><div class="row" style="margin:0"><label class="field">' + esc(t('inviteRole')) + roleSel('ivr', roles[0], roles) + '</label>' +
      '<label class="field">' + esc(t('days')) + '<input id="ivd" type="number" min="1" max="30" value="7" inputmode="numeric"></label><label class="field" style="flex:1">' + esc(t('inviteNote')) + '<input id="ivn" type="text" maxlength="200"></label></div>' +
      '<div class="row" style="margin:0"><button class="btn primary" type="submit">' + esc(t('createInvite')) + '</button></div></form>';
    else h += noRight('users.create');
    const list = V.data.invites || [];
    h += '<div class="card tablewrap"><table><tbody>' + (list.length ? list.map(i => {
      const st = i.used_at ? t('used') : i.revoked_at ? t('revoked') : Date.parse(i.expires_at) < Date.now() ? t('expired') : t('active');
      return '<tr><td>' + esc(t('role.' + i.role)) + '</td><td>' + esc(i.note || '') + '</td><td class="muted">' + esc(fmt(i.created_at)) + '</td><td><span class="pill">' + esc(st) + '</span>' + (st === t('active') ? ' <span class="muted">' + esc(t('expires', { d: fmt(i.expires_at) })) + '</span>' : '') + '</td><td>' +
        (st === t('active') ? '<button class="btn small" data-act="ask" data-v="revoke:' + esc(i.id) + '">' + esc(t('revoke')) + '</button>' : '') + '</td></tr>';
    }).join('') : '<tr><td class="muted">' + esc(t('none')) + '</td></tr>') + '</tbody></table></div>';
    return h;
  }
  function classesHTML() {
    if (!can('classes.manage')) return noRight('classes.manage');
    const list = V.data.classes || [];
    return '<div class="card tablewrap"><h2>' + esc(t('classes')) + '</h2><table><thead><tr><th>' + esc(t('className')) + '</th><th>' + esc(t('code')) + '</th><th>' + esc(t('teacher')) + '</th><th>' + esc(t('students')) + '</th></tr></thead><tbody>' +
      (list.length ? list.map(c => '<tr><td>' + esc(c.name) + (c.archived_at ? ' <span class="muted">(' + esc(t('archived')) + ')</span>' : '') + '</td><td class="code">' + esc(c.code) + '</td><td>' + esc(nameOf(c.teacher_id)) + '</td><td>' + ((V.data.students || {})[c.id] || 0) + '</td></tr>').join('') : '<tr><td class="muted" colspan="4">' + esc(t('none')) + '</td></tr>') +
      '</tbody></table><div class="row"><a class="btn" href="teacher.html">' + esc(t('openTeacher')) + ' →</a></div></div>';
  }
  function coursesHTML() {
    const list = V.data.courses || [], built = (window.FGH_CONTENT && window.FGH_CONTENT.academy && window.FGH_CONTENT.academy.courses) || {};
    return '<div class="card tablewrap"><h2>' + esc(t('courses')) + '</h2><table><tbody>' + (list.length ? list.map(c => '<tr><td><b>' + esc(c.title) + '</b></td><td class="code">' + esc(c.id) + '</td><td>' + esc(t('version')) + ' ' + c.version + '</td><td class="muted">' + esc(fmt(c.updated_at)) + '</td></tr>').join('') : '<tr><td class="muted">' + esc(t('none')) + '</td></tr>') +
      '</tbody></table><div class="row"><a class="btn primary" href="content.html">📚 ' + esc(t('openContent')) + ' →</a></div></div>' +
      '<div class="card"><h2>' + esc(t('builtIn')) + '</h2><ul class="plain">' + Object.keys(built).filter(k => built[k].target === 'th').map(k => '<li>📘 ' + esc(K.L(built[k].name)) + ' · ' + built[k].lessons.length + '</li>').join('') + '</ul></div>';
  }
  function logHTML() {
    if (!can('security.manage')) return noRight('security.manage');
    const list = V.data.log || [];
    return '<div class="card tablewrap"><table><thead><tr><th>' + esc(t('when')) + '</th><th>' + esc(t('who')) + '</th><th>' + esc(t('what')) + '</th><th>' + esc(t('target')) + '</th></tr></thead><tbody>' +
      (list.length ? list.map(l => '<tr><td class="muted">' + esc(fmt(l.at)) + '</td><td>' + esc(nameOf(l.actor)) + '</td><td><b>' + esc(l.action) + '</b>' + (l.details && Object.keys(l.details).length ? '<br><span class="muted" style="font-size:.85rem">' + esc(JSON.stringify(l.details).slice(0, 160)) + '</span>' : '') + '</td><td>' + esc(nameOf(l.target)) + '</td></tr>').join('') : '<tr><td class="muted" colspan="4">' + esc(t('none')) + '</td></tr>') + '</tbody></table></div>';
  }
  function systemHTML() {
    return '<section class="card stack"><h2 style="margin:0">🩺 ' + esc(t('sysTitle')) + '</h2><p class="muted" style="margin:0">' + esc(t('sysHelp')) + '</p>' +
      (V.sys ? '<ul class="plain syslist">' + V.sys.map(x => '<li><span class="pill ' + (x.ok ? 'okp' : 'badp') + '">' + (x.ok ? '✓ ' + esc(t('ok')) : '✗ ' + esc(t('missing'))) + '</span> ' + esc(x.label) + '</li>').join('') + '</ul>' : '<p class="muted">…</p>') +
      '<div class="row" style="margin:0"><button class="btn" data-act="recheck">↻ ' + esc(t('runCheck')) + '</button></div><p class="muted" style="margin:0;font-size:.9rem">ℹ️ ' + esc(t('settings')) + '</p></section>';
  }

  /* ---------- actions ---------- */
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    tab(v) { V.tab = v; V.invite = null; V.err = null; V.msg = null; render(); loadTab(); },
    approve(v) { run(async () => { await svc.decideAccount(v, true, $('ar-' + v).value); V.msg = t('saved'); V.data.accounts = await svc.accounts(); }); },
    setRole(v) { run(async () => { await svc.setAccountRole(v, $('rr-' + v).value); V.msg = t('saved'); V.data.accounts = await svc.accounts(); }); },
    savePerms(v) { const perms = Array.from(document.querySelectorAll('input[data-perm="' + v + '"]:checked')).map(x => x.value); run(async () => { await svc.setAdminPermissions(v, perms); V.msg = t('saved'); V.data.perms = await svc.adminPermissions(); }); },
    copyInvite() { const i = $('invLink'); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { document.execCommand('copy'); } K.toast(t('copied')); },
    recheck() { V.sys = null; render(); run(systemCheck); },
    ask(v) { V.confirm = { v, text: t('askSure') }; render(); },
    confirmNo() { V.confirm = null; render(); },
    confirmYes() {
      const [what, id] = V.confirm.v.split(':'); V.confirm = null;
      run(async () => {
        if (what === 'reject') await svc.decideAccount(id, false);
        if (what === 'suspended' || what === 'approved' || what === 'deactivated') await svc.setAccountStatus(id, what);
        if (what === 'revoke') { await svc.revokeInvitation(id); V.data.invites = await svc.invitations(); }
        if (what !== 'revoke') V.data.accounts = await svc.accounts();
        V.msg = t('saved');
      });
    }
  };
  K.bindActs(ACT);
  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.dataset.form === 'invite') run(async () => {
      const r = await svc.createInvitation($('ivr').value, parseInt($('ivd').value, 10) || 7, [], $('ivn').value);
      V.invite = location.href.replace(/admin\.html.*$/, 'teacher.html') + '?invite=' + encodeURIComponent(r.token);
      V.data.invites = await svc.invitations();
    });
  });
  document.addEventListener('input', e => { if (e.target.dataset.input === 'q') { V.q = e.target.value; const pos = e.target.selectionStart; render(); const i = document.querySelector('[data-input="q"]'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } } });
  document.addEventListener('change', e => { const c = e.target.dataset.change; if (c === 'fRole') { V.fRole = e.target.value; render(); } if (c === 'fStatus') { V.fStatus = e.target.value; render(); } });
  render();
  boot().catch(e => { V.err = errText(e); V.screen = 'gate'; render(); });
  window.__admin = { state: () => V };
})();
