/* Student Mode (student.html): sign in with class code + student ID + PIN (no e-mail), see "Continue where you left off",
   go to the games and lessons, log out. Progress is saved on the server by js/school/student-sync.js. */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit, F = FGH.family, store = FGH.familyStore, SS = FGH.studentSync;
  const { $, esc } = K;
  const t = (k, v) => K.t('school.' + k, v);
  const V = { screen: 'loading', err: null, me: null, recent: [] };
  let client = null, auth = null, svc = null, busy = false;

  const errText = e => { const c = e && e.code; const s = K.t('school.err_' + c); return s && s !== 'school.err_' + c ? s : t('err_generic', { m: c || (e && e.message) || '?' }); };
  async function run(fn) {
    if (busy) return; busy = true; V.err = null;
    try { await fn(); } catch (e) { V.err = errText(e); }
    busy = false; render();
  }

  async function boot() {
    const factory = window.FGH_CLIENT_FACTORY || (FGH.supabaseClient.configured() ? FGH.supabaseClient.createClient : null);
    if (!factory) { V.screen = 'setup'; return render(); }
    client = await factory(); auth = FGH.authService.create(client); svc = FGH.schoolService.create(client);
    await auth.init();
    if (SS.current()) {
      try { const me = await svc.studentMe(); SS.begin(svc, me); V.me = me; V.recent = me.recent || []; V.screen = 'home'; }
      catch (e) { if (e.code === 'not_a_student') { await SS.end(svc); V.screen = 'login'; } else { V.screen = 'home'; V.me = offlineMe(); V.err = errText(e); } }
    } else V.screen = 'login';
    render();
  }
  /* without internet a signed-in student still sees their name and can keep learning; saving waits */
  const offlineMe = () => { const s = SS.current(); return s ? { name: s.name, student_no: s.no, class_name: s.className } : null; };

  function render() {
    document.documentElement.lang = K.ui(); document.body.dataset.area = 'kids';
    const S = { loading: () => '<p class="muted">…</p>', setup: () => '<div class="card"><p>' + esc(t('notSetUp')) + '</p></div>', login: loginHTML, home: homeHTML };
    $('app').innerHTML = K.header(t('studentTitle'), { extra: V.screen === 'home' ? '<span class="pill" id="sstat">' + esc(t('st_' + SS.status())) + '</span>' : '' }) +
      (V.err ? '<div class="warn" role="alert">⚠️ ' + esc(V.err) + '</div>' : '') + (S[V.screen] || S.loading)();
    const f = document.querySelector('[data-focus]'); if (f) f.focus();
  }
  function loginHTML() {
    return '<form class="card stack studentlogin" data-form="login" autocomplete="off"><h2>🎒 ' + esc(t('loginTitle')) + '</h2><p class="muted">' + esc(t('loginInfo')) + '</p>' +
      '<label class="field">' + esc(t('code')) + '<input id="sc" type="text" maxlength="8" autocapitalize="characters" spellcheck="false" placeholder="' + esc(t('codeHint')) + '" required data-focus class="code big-input"></label>' +
      '<label class="field">' + esc(t('studentNo')) + '<input id="sn" type="number" min="1" max="999" inputmode="numeric" required class="big-input"></label>' +
      '<label class="field">' + esc(t('pin')) + '<input id="sp" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required class="big-input"></label>' +
      '<button class="btn primary huge" type="submit">' + esc(t('go')) + ' →</button></form>';
  }
  /* the newest course with progress on this device (the server copy was merged in at sign-in) */
  function continueRow(pid) {
    const rows = FGH.hubBridge && FGH.hubBridge.progressRows ? FGH.hubBridge.progressRows(store.get(), K.ui()).filter(r => r.p.id === pid) : [];
    return rows[0] || null;
  }
  function homeHTML() {
    const me = V.me || {}, s = SS.current(), pid = s && s.pid;
    const row = pid && continueRow(pid);
    let h = '<section class="card"><h2 style="margin-top:0">' + esc(t('hi', { name: me.name || '' })) + '</h2><p class="muted" style="margin:0">' + esc(t('classLbl')) + ': ' + esc(me.class_name || '') + ' · ' + esc(t('studentNo')) + ' ' + esc(me.student_no || '') + '</p></section>';
    h += '<section class="card stack"><h2 style="margin:0">▶ ' + esc(t('continue')) + '</h2>' + (row
      ? '<p style="margin:0"><b>' + esc(row.course.startsWith('kids:') ? K.t('lang.' + row.course.slice(5)) : row.course) + '</b>' + (row.curName || row.lesson ? ' · ' + esc(row.curName ? K.L(row.curName) : row.lesson) : '') + '</p>' +
        '<div class="meter"><span style="width:' + row.pct + '%"></span></div><p class="muted" style="margin:0">' + row.pct + ' %</p><a class="btn primary huge" href="' + esc(row.href) + '">▶ ' + esc(t('continue')) + '</a>'
      : '<p class="muted" style="margin:0">' + esc(t('noProgress')) + '</p><a class="btn primary huge" href="kids.html?p=' + encodeURIComponent(pid || '') + '#lang">🚀 ' + esc(t('start')) + '</a>') + '</section>';
    h += '<div class="grid"><a class="tile" href="academy.html"><span class="ic" aria-hidden="true">📚</span><span class="nm">Thai Learning Academy</span></a><a class="tile" href="kids.html?p=' + encodeURIComponent(pid || '') + '"><span class="ic" aria-hidden="true">🧠</span><span class="nm">' + esc(t('kidsArea')) + '</span></a></div>';
    if (V.recent.length) h += '<section class="card"><h2>' + esc(t('recentMine')) + '</h2><ul class="plain">' + V.recent.slice(0, 8).map(a => '<li>' + esc(K.fmtDate(a.at, true)) + ' · ' + esc(a.title) + (a.max ? ' · ' + a.pct + ' %' : '') + '</li>').join('') + '</ul></section>';
    h += '<section class="card"><p class="muted" style="margin-top:0">' + esc(t('logoutInfo')) + '</p><button class="btn" data-act="logout">🚪 ' + esc(t('logout')) + '</button></section>';
    return h;
  }

  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    logout() { run(async () => { await SS.end(svc); try { await client.auth.signOut(); } catch (e) { /* offline */ } V.me = null; V.recent = []; V.screen = 'login'; }); }
  };
  K.bindActs(ACT);
  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.dataset.form !== 'login') return;
    run(async () => {
      if (!auth.state().signedIn) await auth.signInAsGuest();
      else if (!auth.state().user.guest) { await client.auth.signOut(); await auth.signInAsGuest(); }   // a teacher's session is never used as a student
      const r = await svc.studentLogin($('sc').value, $('sn').value, $('sp').value);
      if (!r.ok) { V.err = r.error === 'too_many_attempts' ? t('tooMany') : t('wrong'); return; }
      SS.begin(svc, r); V.me = r; V.recent = r.recent || []; V.screen = 'home';
    });
  });
  SS.onStatus(st => { const el = $('sstat'); if (el) el.textContent = t('st_' + st); });
  render();
  boot().catch(e => { V.err = errText(e); V.screen = 'login'; render(); });
  window.__student = { state: () => V };
})();
