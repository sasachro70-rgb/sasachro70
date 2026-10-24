/* Family Online page: sign-in, families and children, game rooms with codes, and playing a game across
   devices. All rights are checked by the database; this page only shows what the services return. */
(function () {
  'use strict';
  const FGH = window.FGH, core = FGH.core;
  const LANGS = ['th', 'sv', 'en'];
  const NATIVE = { th: 'ไทย', sv: 'Svenska', en: 'English' };
  const LOCALE = { th: 'th-TH', sv: 'sv-SE', en: 'en-GB' };
  const AVATARS = ['🦊', '🐼', '🐯', '🦄', '🐵', '🐧', '🐨', '🦖', '🐸', '🦁'];
  const POLL_MS = 2000;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function startLang() {
    try { const o = JSON.parse(localStorage.getItem('fgh.v1') || 'null'); if (o && LANGS.includes(o.ui)) return o.ui; } catch (e) { /* storage blocked */ }
    const l = (navigator.language || 'en').slice(0, 2); return LANGS.includes(l) ? l : 'en';
  }
  const V = { ui: startLang(), screen: 'loading', tab: 'adult', msg: null, err: null, families: [], famId: null, fam: null,
    guestProfiles: [], myRooms: [], roomId: null, room: null, invites: [], session: null, turns: [], results: null, newCode: null,
    showing: null, feedback: null, rounds: 3, timer: 15, level: 2, joinProfile: null, sig: '' };
  let client = null, auth = null, svc = null, pollTimer = 0, unsubscribe = null;

  function t(key, vars) {
    let s = (FGH.T[V.ui] && FGH.T[V.ui][key]) ?? FGH.T.en[key] ?? key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  const errText = e => (FGH.T.en['err_' + (e && e.code)] ? t('err_' + e.code) : t('err_generic', { m: (e && (e.code || e.message)) || '?' }));
  const fmtTime = iso => { try { return new Date(iso).toLocaleString(LOCALE[V.ui], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } };
  const uid = () => (auth && auth.state().user ? auth.state().user.id : null);
  const say = (msg, isErr) => { V.msg = isErr ? null : msg; V.err = isErr ? msg : null; };

  /* every action: clear old messages, run, show the error in the page if it fails */
  async function run(fn) {
    V.err = null; V.msg = null;
    try { await fn(); } catch (e) { V.err = errText(e); }
    render();
  }

  /* ---------- start ---------- */
  async function boot() {
    const factory = window.FGH_CLIENT_FACTORY || (FGH.supabaseClient.configured() ? FGH.supabaseClient.createClient : null);
    if (!factory) { V.screen = 'setup'; render(); return; }
    try { client = await factory(); } catch (e) { V.err = errText(e); V.screen = 'setup'; render(); return; }
    auth = FGH.authService.create(client);
    svc = FGH.onlineService.create(client);
    auth.onChange(() => { onAuth().catch(e => { V.err = errText(e); render(); }); });
    await auth.init();
    window.addEventListener('online', flush);
  }
  let lastUser = undefined;
  async function onAuth() {
    const st = auth.state();
    const id = st.user ? st.user.id + (st.user.guest ? 'g' : 'p') : null;
    if (id === lastUser && V.screen !== 'loading') return;
    const wasPermanent = typeof lastUser === 'string' && lastUser.endsWith('p');
    lastUser = id;
    leaveRoomScreen();
    if (!st.signedIn) { if (wasPermanent) V.tab = 'adult'; V.screen = 'signin'; render(); return; }
    V.screen = st.user.guest ? 'guest' : 'home';
    await refreshHome(); render(); flush();
  }
  async function flush() {
    if (!svc) return;
    const sent = await svc.flushQueue().catch(() => []);
    if (sent.length) { say(t('on_sentLater', { n: sent.length })); if (V.screen === 'room') await refreshRoom(true); render(); }
  }
  async function refreshHome() {
    const me = uid();
    V.myRooms = await svc.visibleRooms();
    if (V.screen === 'guest') { V.guestProfiles = await svc.myGuestProfiles(me); if (!V.joinProfile && V.guestProfiles[0]) V.joinProfile = V.guestProfiles[0].id; return; }
    V.families = await svc.myFamilies(me);
    if (!V.families.some(f => f.id === V.famId)) V.famId = V.families[0] ? V.families[0].id : null;
    V.fam = null;
    if (V.famId) {
      const requests = (await svc.pendingLinkRequests()).filter(r => r.family_id === V.famId);
      const reqProfiles = await svc.profilesById(requests.map(r => r.profile_id));
      V.fam = { profiles: await svc.familyProfiles(V.famId), rooms: await svc.familyRooms(V.famId), requests, reqProfiles };
    }
  }

  /* ---------- rooms ---------- */
  async function openRoom(id) {
    leaveRoomScreen();
    V.roomId = id; V.screen = 'room'; V.newCode = null;
    await refreshRoom(true);
    pollTimer = setInterval(() => refreshRoom(false).catch(() => {}), POLL_MS);
    unsubscribe = svc.subscribeRoom(id, () => refreshRoom(false).catch(() => {}));
  }
  function leaveRoomScreen() {
    clearInterval(pollTimer); pollTimer = 0;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    V.roomId = null; V.room = null; V.session = null; V.turns = []; V.results = null; V.showing = null; V.feedback = null; V.newCode = null;
  }
  async function refreshRoom(force) {
    if (!V.roomId) return;
    const room = await svc.room(V.roomId);
    if (!room) { leaveRoomScreen(); V.screen = auth.state().user.guest ? 'guest' : 'home'; await refreshHome(); render(); return; }
    const isHost = room.host_user_id === uid();
    const invites = isHost ? await svc.invites(V.roomId) : [];
    const session = await svc.latestSession(V.roomId);
    const turns = session ? await svc.turns(session.id) : [];
    const results = session && session.status === 'finished' ? await svc.sessionResults(session.id) : null;
    const sig = JSON.stringify([room.participants, room.locals, room.status, invites, session && session.status, turns.map(x => [x.turn_no, x.answer, x.started_at])]);
    V.room = room; V.invites = invites; V.session = session; V.turns = turns; V.results = results;
    /* a poll never redraws while a question is on screen, so a tap is not lost */
    if (force || (sig !== V.sig && V.showing == null)) { V.sig = sig; render(); }
  }
  const isHost = () => V.room && V.room.host_user_id === uid();
  const profileName = id => { const p = V.room && V.room.profiles.find(x => x.id === id); return p ? p.avatar + ' ' + p.display_name : '?'; };
  function mayPlay(turn) {
    const me = uid();
    return V.room.participants.some(p => p.user_id === me && p.role === 'participant' && !p.left_at && p.profile_id === turn.profile_id)
      || (isHost() && V.room.locals.some(l => l.profile_id === turn.profile_id));
  }
  function roomPlayers() {
    const ids = V.room.participants.filter(p => p.role === 'participant' && !p.left_at).map(p => p.profile_id).concat(V.room.locals.map(l => l.profile_id));
    return Array.from(new Set(ids));
  }

  /* ---------- screens ---------- */
  function langSeg() {
    return '<div class="seg" role="group" aria-label="language">' + LANGS.map(l => '<button data-act="ui" data-v="' + l + '" class="' + (V.ui === l ? 'on' : '') + '" aria-pressed="' + (V.ui === l) + '">' + NATIVE[l] + '</button>').join('') + '</div>';
  }
  function topHTML() {
    const st = auth && auth.state();
    return '<header class="top"><a class="btn small" href="index.html">🏠 ' + esc(t('on_hub')) + '</a><span class="brand">🌐 ' + esc(t('on_title')) + '</span><span class="grow"></span>' + langSeg() +
      (st && st.signedIn ? '<span class="pchip">' + (st.user.guest ? '🎈 ' + esc(t('on_guestBadge')) : esc(t('on_signedInAs', { who: st.user.email || '' }))) + '</span><button class="btn small" data-act="signOut">' + esc(t('on_signOut')) + '</button>' : '') + '</header>' +
      (V.err ? '<div class="warn" role="alert">' + esc(V.err) + '</div>' : '') + (V.msg ? '<div class="note" role="status">' + esc(V.msg) + '</div>' : '');
  }
  function render() {
    document.documentElement.lang = V.ui;
    const app = $('app');
    if (V.screen === 'loading') app.innerHTML = topHTML() + '<p class="muted">' + esc(t('on_loading')) + '</p>';
    else if (V.screen === 'setup') app.innerHTML = topHTML() + '<div class="card"><h2>' + esc(t('on_notSetup')) + '</h2><p>' + esc(t('on_notSetupHelp')) + '</p></div>';
    else if (V.screen === 'signin') app.innerHTML = topHTML() + signinHTML();
    else if (V.screen === 'home') app.innerHTML = topHTML() + homeHTML();
    else if (V.screen === 'guest') app.innerHTML = topHTML() + guestHTML();
    else if (V.screen === 'room') app.innerHTML = topHTML() + roomHTML();
  }

  function signinHTML() {
    const tab = (k, l) => '<button class="btn ' + (V.tab === k ? 'on' : '') + '" data-act="tab" data-v="' + k + '" aria-pressed="' + (V.tab === k) + '">' + esc(t(l)) + '</button>';
    let h = '<div class="choices" style="margin-bottom:12px">' + tab('adult', 'on_adult') + tab('create', 'on_createTab') + tab('guest', 'on_guestTab') + '</div><div class="card form">';
    if (V.tab === 'guest') return h + '<p>' + esc(t('on_guestHelp')) + '</p><div class="row"><button class="btn primary big" data-act="guest">🎈 ' + esc(t('on_startGuest')) + '</button></div></div>';
    const create = V.tab === 'create';
    h += '<form data-form="' + (create ? 'signup' : 'signin') + '" class="form"><label for="em">' + esc(t('on_email')) + '</label><input id="em" type="email" autocomplete="email" required>' +
      '<label for="pw">' + esc(t('on_password')) + '</label><input id="pw" type="password" autocomplete="' + (create ? 'new-password' : 'current-password') + '" minlength="' + (create ? 8 : 1) + '" required>' +
      (create ? '<p class="muted">' + esc(t('on_pwHint')) + '</p>' : '') +
      '<div class="row"><button class="btn primary big" type="submit">' + esc(t(create ? 'on_signUp' : 'on_signIn')) + '</button>' +
      (create ? '' : '<button class="btn" type="button" data-act="magic">✉️ ' + esc(t('on_link')) + '</button><button class="btn" type="button" data-act="forgot">' + esc(t('on_forgot')) + '</button>') + '</div></form></div>';
    return h;
  }

  function homeHTML() {
    const me = uid();
    let h = '<div class="card"><p><b>' + esc(t('on_accountId')) + ':</b> <code class="sel">' + esc(me) + '</code></p><p class="muted">' + esc(t('on_accountIdHelp')) + '</p>' +
      '<div class="row"><button class="btn small" data-act="signOutAll">' + esc(t('on_signOutAll')) + '</button></div></div>';
    h += '<h2 class="sec">' + esc(t('on_families')) + '</h2>';
    if (!V.families.length) h += '<p class="muted">' + esc(t('on_noFamily')) + '</p>';
    else h += '<div class="choices">' + V.families.map(f => '<button class="btn ' + (f.id === V.famId ? 'on' : '') + '" data-act="fam" data-v="' + f.id + '">' + esc(f.name) + ' · ' + esc(t('on_role_' + f.role)) + '</button>').join('') + '</div>';
    h += '<form data-form="family" class="row"><input id="famname" type="text" maxlength="60" placeholder="' + esc(t('on_familyName')) + '" required><button class="btn" type="submit">＋ ' + esc(t('on_newFamily')) + '</button></form>';
    const fam = V.families.find(f => f.id === V.famId);
    if (!fam || !V.fam) return h;
    const admin = fam.role === 'owner' || fam.role === 'manager';
    h += '<div class="card"><h2>' + esc(fam.name) + '</h2><h3>' + esc(t('on_members')) + '</h3><ul class="plain">' +
      fam.members.map(m => '<li>' + esc(t('on_role_' + m.role)) + ' · <code>' + esc(m.user_id.slice(0, 8)) + '</code>' + (m.user_id === me ? ' (' + esc(t('on_you')) + ')' : '') + '</li>').join('') + '</ul>' +
      (fam.role === 'owner' ? '<form data-form="adult" class="row"><input id="adultid" type="text" placeholder="' + esc(t('on_accountId')) + '" required pattern="[0-9a-fA-F-]{36}"><select id="adultrole"><option value="manager">' + esc(t('on_role_manager')) + '</option><option value="member">' + esc(t('on_role_member')) + '</option></select><button class="btn" type="submit">' + esc(t('on_add')) + '</button></form>' : '') +
      '<h3>' + esc(t('on_profiles')) + '</h3><p class="chips">' + V.fam.profiles.map(p => '<span class="pchip">' + esc(p.avatar) + ' ' + esc(p.display_name) + '</span>').join(' ') + '</p>' +
      (admin ? '<form data-form="child" class="row"><input id="childname" type="text" maxlength="20" placeholder="' + esc(t('on_name')) + '" required><select id="childav">' + AVATARS.map(a => '<option>' + a + '</option>').join('') + '</select><button class="btn" type="submit">＋ ' + esc(t('on_addChild')) + '</button></form>' : '');
    if (admin && V.fam.requests.length) {
      h += '<h3>' + esc(t('on_requests')) + '</h3><ul class="plain">' + V.fam.requests.map(r => { const p = V.fam.reqProfiles.find(x => x.id === r.profile_id);
        return '<li>' + (p ? esc(p.avatar + ' ' + p.display_name) : '?') + ' <button class="btn small primary" data-act="approve" data-v="' + r.id + '">' + esc(t('on_approve')) + '</button> <button class="btn small" data-act="reject" data-v="' + r.id + '">' + esc(t('on_reject')) + '</button></li>'; }).join('') + '</ul>';
    }
    h += '<h3>' + esc(t('on_rooms')) + '</h3><ul class="plain">' + V.fam.rooms.map(r => '<li>🚩 ' + esc(fmtTime(r.created_at)) + ' · ' + (r.status === 'open' ? '<button class="btn small" data-act="room" data-v="' + r.id + '">' + esc(t('on_openRoom')) + '</button>' : esc(t('on_closed'))) + '</li>').join('') + '</ul>' +
      (admin ? '<div class="row"><button class="btn primary" data-act="newRoom">＋ ' + esc(t('on_newRoom')) + '</button></div>' : '') + '</div>';
    return h;
  }

  function guestHTML() {
    let h = '<div class="card"><h2>' + esc(t('on_myProfiles')) + '</h2><p class="chips">' + V.guestProfiles.map(p => '<button class="btn ' + (p.id === V.joinProfile ? 'on' : '') + '" data-act="pickProfile" data-v="' + p.id + '">' + esc(p.avatar + ' ' + p.display_name) + '</button>').join(' ') + '</p>' +
      '<form data-form="guestProfile" class="row"><input id="gname" type="text" maxlength="20" placeholder="' + esc(t('on_name')) + '" required><select id="gav">' + AVATARS.map(a => '<option>' + a + '</option>').join('') + '</select><button class="btn" type="submit">＋ ' + esc(t('on_newProfile')) + '</button></form></div>';
    if (V.guestProfiles.length) {
      h += '<div class="card"><h2>' + esc(t('on_join')) + '</h2><form data-form="join" class="row"><label for="code">' + esc(t('on_code')) + '</label><input id="code" class="codein" type="text" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="13" placeholder="' + esc(t('on_codePh')) + '" required>' +
        '<button class="btn primary big" type="submit">' + esc(t('on_join')) + '</button></form></div>';
    }
    if (V.myRooms.length) h += '<div class="card"><h2>' + esc(t('on_rooms')) + '</h2><ul class="plain">' + V.myRooms.map(r => '<li>🚩 ' + esc(fmtTime(r.created_at)) + ' <button class="btn small" data-act="room" data-v="' + r.id + '">' + esc(t('on_openRoom')) + '</button></li>').join('') + '</ul></div>';
    h += '<div class="card form"><h2>' + esc(t('on_keep')) + '</h2><p class="muted">' + esc(t('on_keepHelp')) + '</p><form data-form="keep" class="form"><label for="kem">' + esc(t('on_email')) + '</label><input id="kem" type="email" autocomplete="email" required>' +
      '<label for="kpw">' + esc(t('on_password')) + '</label><input id="kpw" type="password" autocomplete="new-password" minlength="8" required><div class="row"><button class="btn" type="submit">' + esc(t('on_keep')) + '</button></div></form></div>';
    return h;
  }

  function roomHTML() {
    if (!V.room) return '<p class="muted">' + esc(t('on_loading')) + '</p>';
    const host = isHost();
    let h = '<div class="row" style="margin-top:0"><button class="btn small" data-act="home">← ' + esc(t('on_back')) + '</button><h2 style="margin:0">🚩 ' + esc(t('on_room')) + '</h2></div>';
    if (host) {
      h += '<div class="card">' + (V.newCode ? '<p class="bigcode" aria-live="polite">' + esc(V.newCode.code) + '</p><p class="muted">' + esc(t('on_codeOnce', { t: fmtTime(V.newCode.expires_at) })) + '</p>' : '') +
        '<div class="row"><button class="btn primary" data-act="newCode">🔑 ' + esc(t('on_newCode')) + '</button><button class="btn" data-act="closeRoom">' + esc(t('on_closeRoom')) + '</button></div>' +
        (V.invites.length ? '<h3>' + esc(t('on_codes')) + '</h3><ul class="plain">' + V.invites.map(i => {
          const state = i.revoked_at ? t('on_revoked') : (new Date(i.expires_at) < new Date() ? t('on_expired') : '');
          return '<li>' + esc(fmtTime(i.created_at)) + ' · ' + esc(t('on_uses', { u: i.uses, m: i.max_uses })) + ' · ' + (state ? esc(state) : '<button class="btn small" data-act="revoke" data-v="' + i.id + '">' + esc(t('on_revoke')) + '</button>') + '</li>';
        }).join('') + '</ul>' : '') + '</div>';
    }
    const active = V.room.participants.filter(p => p.role === 'participant' && !p.left_at);
    h += '<div class="card"><h3>' + esc(t('on_inRoom')) + '</h3><p class="chips">' + active.map(p => '<span class="pchip">' + esc(profileName(p.profile_id)) + '</span>').join(' ') +
      V.room.locals.map(l => '<span class="pchip">📱 ' + esc(profileName(l.profile_id)) + '</span>').join(' ') + '</p>';
    if (host && V.fam) {
      const free = V.fam.profiles.filter(p => !V.room.locals.some(l => l.profile_id === p.id) && !active.some(a => a.profile_id === p.id));
      if (free.length) h += '<p class="muted">' + esc(t('on_onThisIpad')) + '</p><p class="chips">' + free.map(p => '<button class="btn small" data-act="addLocal" data-v="' + p.id + '">＋ ' + esc(p.avatar + ' ' + p.display_name) + '</button>').join(' ') + '</p>';
    }
    if (!host) h += '<div class="row"><button class="btn small" data-act="leave">' + esc(t('on_leave')) + '</button></div>';
    h += '</div>' + gameHTML();
    return h;
  }

  function gameHTML() {
    const host = isHost(), s = V.session;
    if (!s || s.status === 'finished') {
      let h = '';
      if (V.results) {
        h += '<div class="card results"><h2>🏆 ' + esc(t('on_results')) + '</h2><div class="tablewrap"><table><thead><tr><th>' + esc(t('on_place')) + '</th><th></th><th>' + esc(t('on_score')) + '</th><th>' + esc(t('on_correct')) + '</th></tr></thead><tbody>' +
          V.results.map(r => '<tr><td>' + r.rank + '</td><td>' + esc(profileName(r.profile_id)) + '</td><td><b>' + r.score + '</b></td><td>' + r.correct + '/' + r.answered + '</td></tr>').join('') + '</tbody></table></div>';
        const me = V.room.participants.find(p => p.user_id === uid() && p.role === 'participant');
        if (!host && auth.state().user.guest && me) h += '<div class="row"><button class="btn" data-act="askFamily" data-v="' + me.profile_id + '">' + esc(t('on_askFamily')) + '</button></div>';
        h += '</div>';
      }
      if (host) {
        const opt = (act, list, cur, label) => '<div class="choices">' + list.map(([v, l]) => '<button class="btn ' + (cur === v ? 'on' : '') + '" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + esc(l) + '</button>').join('') + '</div>';
        const g = core.getGame('flags');
        h += '<div class="card form"><h2>' + esc(t('on_startGame')) + '</h2><label>' + esc(t('on_rounds')) + '</label>' + opt('rounds', [[2, '2'], [3, '3'], [5, '5']], V.rounds) +
          '<label>' + esc(t('on_timer')) + '</label>' + opt('timer', [[0, t('on_noTimer')], [15, '15'], [30, '30']], V.timer) +
          '<label>' + esc(t('on_level')) + '</label>' + opt('level', [1, 2, 3].map(l => [l, (g.levelNames[V.ui] || g.levelNames.en)[l - 1]]), V.level) +
          '<div class="row"><button class="btn primary big" data-act="startGame">▶ ' + esc(t('on_start')) + '</button></div></div>';
      }
      return h;
    }
    /* a game is running */
    const cur = svc.currentTurn(V.turns);
    let h = '<div class="card stage">';
    if (V.feedback) h += '<div class="feedback ' + (V.feedback.correct ? 'ok' : 'no') + '"><p class="fbmain">' + esc(V.feedback.correct ? t('on_right', { n: V.feedback.points }) : t('on_wrong', { c: V.feedback.name })) + '</p></div>';
    if (!cur) {
      h += '<p class="fbmain">' + esc(t('on_allDone')) + '</p>' + (host ? '<div class="row"><button class="btn primary big" data-act="finish">' + esc(t('on_finish')) + '</button></div>' : '');
    } else if (mayPlay(cur)) {
      if (V.showing === cur.turn_no) {
        h += '<p class="passname" style="font-size:1.6rem">' + esc(profileName(cur.profile_id)) + '</p>' +
          core.getGame('flags').questionHTML(cur.question, { lang: V.ui, esc, t: k => (FGH.T[V.ui][k] ?? FGH.T.en[k]), answer: null, locked: false });
      } else {
        h += '<p class="fbmain">' + esc(t('on_yourTurn', { name: profileName(cur.profile_id) })) + '</p><div class="row" style="justify-content:center"><button class="btn primary huge" data-act="show" data-v="' + cur.turn_no + '">' + esc(t('on_showQ')) + ' ▶</button></div>';
      }
    } else {
      h += '<p class="fbmain muted">' + esc(t('on_waiting', { name: profileName(cur.profile_id) })) + '</p>';
    }
    if (host && cur) h += '<div class="row"><button class="btn small" data-act="finish">' + esc(t('on_finish')) + '</button></div>';
    return h + '</div>';
  }

  /* ---------- actions ---------- */
  const val = id => ($(id) ? $(id).value : '');
  const ACT = {
    ui(v) { V.ui = v; render(); },
    tab(v) { V.tab = v; V.err = null; V.msg = null; render(); },
    guest: () => run(() => auth.signInAsGuest()),
    magic: () => run(async () => { await auth.sendSignInLink(val('em')); say(t('on_linkSent')); }),
    forgot: () => run(async () => { await auth.sendPasswordReset(val('em')); say(t('on_resetSent')); }),
    signOut: () => run(() => auth.signOut(false)),
    signOutAll: () => run(() => auth.signOut(true)),
    fam: v => run(async () => { V.famId = v; await refreshHome(); }),
    approve: v => run(async () => { await svc.approveLink(v); await refreshHome(); say(t('on_saved')); }),
    reject: v => run(async () => { await svc.rejectLink(v); await refreshHome(); }),
    newRoom: () => run(async () => { const id = await svc.createRoom(V.famId, 'flags', 8); await openRoom(id); }),
    room: v => run(async () => { if (V.screen === 'home' && !V.fam) await refreshHome(); await openRoom(v); }),
    home: () => run(async () => { leaveRoomScreen(); V.screen = auth.state().user.guest ? 'guest' : 'home'; await refreshHome(); }),
    pickProfile(v) { V.joinProfile = v; render(); },
    newCode: () => run(async () => { V.newCode = await svc.createInvite(V.roomId, 120, 10); V.newCode.code = svc.formatCode(V.newCode.code); await refreshRoom(true); }),
    revoke: v => run(async () => { await svc.revokeInvite(v); await refreshRoom(true); say(t('on_revoked')); }),
    closeRoom: () => run(async () => { await svc.closeRoom(V.roomId); await ACT.home(); }),
    addLocal: v => run(async () => { await svc.addLocalPlayer(V.roomId, v); await refreshRoom(true); }),
    leave: () => run(async () => { await svc.leaveRoom(V.roomId); leaveRoomScreen(); V.screen = 'guest'; await refreshHome(); }),
    rounds(v) { V.rounds = +v; render(); }, timer(v) { V.timer = +v; render(); }, level(v) { V.level = +v; render(); },
    startGame: () => run(async () => {
      const players = roomPlayers();
      if (!players.length) { V.err = t('on_needPlayers'); return; }
      const g = core.getGame('flags'), used = new Set(), turns = [];
      for (let r = 0; r < V.rounds; r++) players.forEach(pid => { const q = g.makeQuestion({ level: V.level, used }); turns.push({ profile_id: pid, question: q, answer: q.code }); });
      await svc.startSession(V.roomId, 'flags', V.timer, turns);
      V.feedback = null; svc.ping(V.roomId); await refreshRoom(true);
    }),
    show: v => run(async () => { await svc.beginTurn(V.session.id, +v); V.showing = +v; V.feedback = null; }),
    finish: () => run(async () => { await svc.finishSession(V.session.id); svc.ping(V.roomId); V.feedback = null; await refreshRoom(true); }),
    askFamily: v => run(async () => { await svc.requestLink(v, V.room.family_id); say(t('on_asked')); })
  };
  async function answer(value) {
    const turn = svc.currentTurn(V.turns); if (!turn || V.showing !== turn.turn_no) return;
    V.showing = null; V.err = null; V.msg = null;
    try {
      const r = await svc.submitAnswer(V.session.id, turn.turn_no, value);
      const code = r.answer || turn.question.code;
      V.feedback = { correct: r.correct, points: r.points, name: FGH.countries.byCode[code] ? FGH.countries.byCode[code].name[V.ui] : code };
      svc.ping(V.roomId);
    } catch (e) { if (e.code === 'offline') say(t('on_queued')); else V.err = errText(e); }
    await refreshRoom(true).catch(() => {});
    render();
  }
  const FORMS = {
    signin: () => run(() => auth.signIn(val('em'), val('pw'))),
    signup: () => run(async () => { const r = await auth.signUp(val('em'), val('pw')); if (r.needsConfirmation) { V.tab = 'adult'; say(t('on_confirm')); } }),
    family: () => run(async () => { V.famId = await svc.createFamily(val('famname')); await refreshHome(); say(t('on_saved')); }),
    adult: () => run(async () => { await svc.setMemberRole(V.famId, val('adultid'), val('adultrole')); await refreshHome(); say(t('on_saved')); }),
    child: () => run(async () => { await svc.createChildProfile(V.famId, val('childname'), val('childav')); await refreshHome(); say(t('on_saved')); }),
    guestProfile: () => run(async () => { V.joinProfile = await svc.createGuestProfile(val('gname'), val('gav')); await refreshHome(); }),
    join: () => run(async () => { const id = await svc.joinRoom(val('code'), V.joinProfile); await openRoom(id); }),
    keep: () => run(async () => { await auth.keepGuestProgress(val('kem'), val('kpw')); say(t('on_keepDone')); })
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-answer]');
    if (a && !a.disabled) { answer(a.dataset.answer); return; }
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset.v);
  });
  document.addEventListener('submit', e => {
    e.preventDefault();
    const fn = FORMS[e.target.dataset.form]; if (fn) fn();
  });

  render();
  boot().catch(e => { V.err = errText(e); V.screen = 'setup'; render(); });
  window.__fgo = { view: () => V, services: () => ({ auth, svc }) };
})();
