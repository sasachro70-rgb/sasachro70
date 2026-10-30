/* Parent Dashboard (parent.html): PIN gate, overview with charts, reward requests, rewards, points ledger,
   activity history, learning progress, profiles and settings. Children never see this page without the PIN. */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit, F = FGH.family, LG = FGH.ledger, store = FGH.familyStore, A = FGH.actions;
  const KL = FGH.kidsLanguage, AC = FGH.academy;
  const { $, esc, t, L } = K;
  const UNLOCK = 'fgh.parentUnlock', MINUTES = 15;
  let V = { tab: 'overview', pid: null, edit: null, editProfile: null, confirm: null, msg: null, err: null, pinErr: null, histP: '', histA: '' };

  const fam = () => store.get();
  const unlocked = () => { try { return +sessionStorage.getItem(UNLOCK) > Date.now(); } catch (e) { return false; } };
  const touch = () => { try { sessionStorage.setItem(UNLOCK, String(Date.now() + MINUTES * 60000)); } catch (e) { /* private mode */ } };
  const lock = () => { try { sessionStorage.removeItem(UNLOCK); } catch (e) { /* ignore */ } };
  const kids = () => F.activeProfiles(fam(), 'child');
  const adults = () => F.activeProfiles(fam(), 'adult');
  const nameOf = id => { const p = fam().profiles.find(x => x.id === id); return p ? p.avatar + ' ' + p.name : '?'; };
  const errText = e => t('err_' + e) !== 'err_' + e ? t('err_' + e) : (t('why_' + e) !== 'why_' + e ? t('why_' + e) : t('err_error'));
  const AVATARS = ['🦊', '🐼', '🐯', '🦄', '🐵', '🐧', '🐨', '🦖', '🐙', '🦁', '🐸', '🐳', '👧', '👦', '👩', '👨', '👵', '👴'];

  function render() {
    document.documentElement.lang = K.ui(); document.body.dataset.area = 'parent';
    const f = fam();
    let h;
    if (!f.parent.pin) h = pinSetHTML(false);
    else if (!unlocked()) h = pinGateHTML();
    else { touch(); h = dashHTML(); }
    $('app').innerHTML = h;
    const fc = document.querySelector('[data-focus]'); if (fc) fc.focus();
  }

  /* ---------- PIN ---------- */
  function pinSetHTML(change) {
    return K.header(t('pdTitle'), { back: change ? 'tab:settings' : null }) + '<form class="card stack" data-form="setPin" style="max-width:520px"><h2>🔒 ' + esc(change ? t('pdChangePin') : t('pdTitle')) + '</h2><p>' + esc(t('pdPinSet')) + '</p>' +
      '<div class="fields"><div><label for="p1">' + esc(t('pdPin')) + '</label><input id="p1" class="pin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8" data-focus></div><div><label for="p2">' + esc(t('pdPin2')) + '</label><input id="p2" class="pin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8"></div></div>' +
      (V.pinErr ? '<p class="err">' + esc(V.pinErr) + '</p>' : '') + '<div class="row"><button class="btn primary" type="submit">✓ ' + esc(t('save')) + '</button></div></form>';
  }
  function pinGateHTML() {
    const f = fam(), locked = f.parent.lockUntil > Date.now();
    return K.header(t('pdTitle')) + '<form class="card stack" data-form="pin" style="max-width:520px"><h2>🔒 ' + esc(t('pdEnterPin')) + '</h2>' +
      '<input id="pin" class="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8" data-focus' + (locked ? ' disabled' : '') + '>' +
      (locked ? '<p class="err">' + esc(t('pdLocked', { t: new Date(f.parent.lockUntil).toLocaleTimeString() })) + '</p>' : V.pinErr ? '<p class="err">' + esc(V.pinErr) + '</p>' : '') +
      '<div class="row"><button class="btn primary" type="submit"' + (locked ? ' disabled' : '') + '>' + esc(t('open')) + '</button></div><p class="muted" style="font-size:.9rem">' + esc(t('pdForgot')) + '</p></form>';
  }

  /* ---------- dashboard ---------- */
  const TABS = ['overview', 'requests', 'rewards', 'points', 'history', 'learning', 'profiles', 'settings'];
  function dashHTML() {
    const f = fam(), pend = f.ledger.redemptions.filter(r => r.status === 'pending').length;
    let h = K.header(t('pdTitle'), { extra: '<button class="btn small" data-act="lock">🔒 ' + esc(t('pdLock')) + '</button>' }) +
      '<nav class="tabs" role="tablist">' + TABS.map(k => '<button role="tab" aria-selected="' + (V.tab === k) + '" class="' + (V.tab === k ? 'on' : '') + '" data-act="tab" data-v="' + k + '">' + esc(t('tab' + k[0].toUpperCase() + k.slice(1))) + (k === 'requests' && pend ? '<span class="cnt">' + pend + '</span>' : '') + '</button>').join('') + '</nav>';
    if (V.msg) h += '<div class="note" role="status">✓ ' + esc(V.msg) + '</div>';
    if (V.err) h += '<div class="warn" role="alert">⚠️ ' + esc(V.err) + '</div>';
    V.msg = null; V.err = null;
    return h + ({ overview: overviewHTML, requests: requestsHTML, rewards: rewardsHTML, points: pointsHTML, history: historyHTML, learning: learningHTML, profiles: profilesHTML, settings: settingsHTML }[V.tab])();
  }
  const kpi = (v, l) => '<div class="kpi"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div></div>';
  function childPicker(act) {
    const ks = kids(); if (!V.pid || !ks.some(k => k.id === V.pid)) V.pid = ks[0] ? ks[0].id : null;
    return '<div class="row" style="margin:0 0 12px">' + ks.map(k => '<button class="btn small' + (k.id === V.pid ? ' on' : '') + '" data-act="' + (act || 'child') + '" data-v="' + esc(k.id) + '">' + esc(k.avatar + ' ' + k.name) + '</button>').join('') + '</div>';
  }

  function overviewHTML() {
    const f = fam(), st = f.ledger, ks = kids();
    if (!ks.length && !adults().length) return '<div class="card"><p>' + esc(t('noChildren')) + '</p><button class="btn primary" data-act="tab" data-v="profiles">＋ ' + esc(t('pdAddProfile')) + '</button></div>';
    let h = '<h2 class="sec">' + esc(t('pdChildren')) + '</h2><div class="grid">' + ks.map(k => {
      const wk = F.weekly(f, k.id), last = f.log.filter(x => x.pid === k.id).slice(-1)[0];
      return '<section class="card" style="margin:0"><h3 style="margin-top:0">' + esc(k.avatar + ' ' + k.name) + ' <span class="muted" style="font-size:.85rem">' + esc(t('levelFor', { n: F.level(k), a: { 1: '3–4', 2: '5–6', 3: '7–8', 4: '9–10' }[F.level(k)] })) + '</span></h3><div class="kpis">' +
        kpi(LG.balance(st, k.id), t('pdBalance')) + kpi(LG.earned(st, k.id), t('pdEarned')) + kpi(LG.spent(st, k.id), t('pdSpent')) + kpi(LG.held(st, k.id), t('pdPending')) +
        kpi(wk.reduce((a, d) => a + d.minutes, 0), t('pdWeekMin')) + kpi(wk.reduce((a, d) => a + d.points, 0), t('pdWeekPts')) + '</div>' +
        '<p class="muted" style="margin:.6rem 0 0;font-size:.9rem">' + esc(t('pdLast')) + ': ' + (last ? esc(K.fmtDate(last.ts, true) + ' · ' + last.title) : esc(t('none'))) + '</p></section>';
    }).join('') + '</div>';
    if (ks.length) {
      const wk = F.weekly(f, (childPicker(), V.pid));
      h += '<h2 class="sec">' + esc(t('acProgress')) + '</h2>' + childPicker() + '<div class="split"><div class="card">' + K.barChart(wk.map(d => ({ label: d.day, short: K.fmtDay(d.day), value: d.minutes })), { title: t('pdChartMin'), unit: t('minutes') }) + '</div>' +
        '<div class="card">' + K.barChart(wk.map(d => ({ label: d.day, short: K.fmtDay(d.day), value: d.points })), { title: t('pdChartPts'), unit: t('points') }) + '</div></div>';
    }
    if (adults().length) h += '<h2 class="sec">' + esc(t('pdAdults')) + '</h2><div class="card tablewrap"><table><thead><tr><th></th><th>' + esc(t('pdCourse')) + '</th><th>' + esc(t('pdLessonsDone')) + '</th><th>' + esc(t('pdWeekMin')) + '</th><th>' + esc(t('pdLast')) + '</th></tr></thead><tbody>' +
      adults().map(a => { const s = f.adult[a.id], c = s && AC && AC.course ? AC.course(s.target) : null, pr = s ? (f.learning[a.id] || {})[AC.courseKey(s.target, s.explain)] : null;
        return '<tr><td>' + esc(a.avatar + ' ' + a.name) + '</td><td>' + (s ? esc(t('lang.' + s.target) + ' ' + s.level) : '–') + '</td><td>' + (c && pr ? Object.values(pr.lessons).filter(r => r.done).length + ' / ' + c.lessons.length : '–') + '</td><td>' + F.weekly(f, a.id).reduce((x, d) => x + d.minutes, 0) + '</td><td>' + esc(pr && pr.lastAt ? K.fmtDate(pr.lastAt) : '–') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    return h;
  }

  function requestsHTML() {
    const st = fam().ledger, pend = st.redemptions.filter(r => r.status === 'pending'), done = st.redemptions.filter(r => r.status !== 'pending').slice(-20).reverse();
    let h = '<div class="card">' + (pend.length ? '<ul class="plain">' + pend.map(r => '<li style="padding:.4rem 0;border-bottom:1px solid var(--line)"><span style="font-size:1.6rem">' + esc(r.rewardIcon) + '</span><b>' + esc(r.rewardName) + '</b> · ' + esc(nameOf(r.profileId)) + ' · ⭐ ' + r.cost +
      ' <span class="muted">(' + esc(t('pdBalance')) + ' ' + LG.balance(st, r.profileId) + ')</span> <span class="muted">' + esc(K.fmtDate(r.createdAt, true)) + '</span><span class="grow"></span>' +
      '<input type="text" id="note-' + esc(r.id) + '" placeholder="' + esc(t('pdRejectNote')) + '" maxlength="200" style="min-height:44px;border-radius:10px;border:2px solid var(--line);padding:.2rem .6rem;font:inherit">' +
      '<button class="btn primary" data-act="approve" data-v="' + esc(r.id) + '">✓ ' + esc(t('pdApprove')) + '</button><button class="btn danger" data-act="reject" data-v="' + esc(r.id) + '">✗ ' + esc(t('pdReject')) + '</button></li>').join('') + '</ul>' : '<p class="muted">' + esc(t('pdNoRequests')) + '</p>') + '</div>';
    if (done.length) h += '<div class="card tablewrap"><table><thead><tr><th>' + esc(t('pdDate')) + '</th><th>' + esc(t('pdWhat')) + '</th><th></th><th class="num">' + esc(t('pdAmountCol')) + '</th><th></th></tr></thead><tbody>' +
      done.map(r => '<tr><td>' + esc(K.fmtDate(r.decidedAt || r.createdAt, true)) + '</td><td>' + esc(r.rewardIcon + ' ' + r.rewardName) + '</td><td>' + esc(nameOf(r.profileId)) + '</td><td class="num">' + r.cost + '</td><td><span class="status ' + r.status + '">' + esc(t('st_' + r.status)) + '</span>' + (r.note ? ' ' + esc(r.note) : '') + '</td></tr>').join('') + '</tbody></table></div>';
    return h;
  }

  function rewardsHTML() {
    const st = fam().ledger, list = st.rewards.filter(r => !r.deleted);
    let h = '<div class="row" style="margin:0 0 12px"><button class="btn primary" data-act="newReward">＋ ' + esc(t('pdNewReward')) + '</button></div>';
    if (V.edit) h += rewardForm(V.edit);
    h += '<div class="shop">' + list.map(r => '<div class="card reward" style="margin:0">' + (r.image ? '<img class="rimg" src="' + esc(r.image) + '" alt="">' : '<span class="ric">' + esc(r.icon) + '</span>') + '<span class="rn">' + esc(r.name) + '</span><span class="rc">⭐ ' + r.cost + '</span>' +
      '<span class="why">' + [r.active ? t('pdActive') : '⏸ ' + t('why_inactive'), r.autoApprove ? t('pdAuto') : '', r.perChildLimit != null ? '≤ ' + r.perChildLimit + '× / ' + t('kindChild') : '', r.totalLimit != null ? t('left', { n: Math.max(0, r.totalLimit - LG.usedBy(st, r.id)) }) : '',
        r.startsOn ? t('fromDate', { d: r.startsOn }) : '', r.endsOn ? t('untilDate', { d: r.endsOn }) : '', t('pdRedeemed', { n: st.redemptions.filter(x => x.rewardId === r.id && x.status === 'approved').length })].filter(Boolean).map(esc).join(' · ') + '</span>' +
      (r.profileIds && r.profileIds.length ? '<span class="why">' + esc(t('pdForWho')) + ': ' + r.profileIds.map(id => esc(nameOf(id))).join(', ') + '</span>' : '') +
      '<div class="row"><button class="btn small" data-act="editReward" data-v="' + esc(r.id) + '">✏️ ' + esc(t('edit')) + '</button>' +
      (V.confirm === 'del:' + r.id ? '<button class="btn small danger" data-act="delRewardYes" data-v="' + esc(r.id) + '">' + esc(t('pdRewardDeleteAsk', { r: r.name })) + ' ' + esc(t('yes')) + '</button>' : '<button class="btn small danger" data-act="delReward" data-v="' + esc(r.id) + '">🗑 ' + esc(t('delete')) + '</button>') + '</div></div>').join('') + '</div>';
    if (!list.length && !V.edit) h += '<p class="muted">' + esc(t('shopEmpty')) + '</p>';
    return h;
  }
  function rewardForm(r) {
    const inp = (id, lbl, val, type, extra) => '<div><label for="rf-' + id + '">' + esc(lbl) + '</label><input id="rf-' + id + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '"' + (extra || '') + '></div>';
    return '<form class="card stack" data-form="reward"><h2>' + esc(r.id ? t('edit') : t('pdNewReward')) + '</h2><div class="fields">' +
      inp('name', t('pdRewardName'), r.name, 'text', ' maxlength="60" required data-focus') + inp('icon', t('pdRewardIcon'), r.icon || '🎁', 'text', ' maxlength="8"') + inp('cost', t('pdRewardCost'), r.cost, 'number', ' min="1" step="1" required') +
      inp('per', t('pdPerChild'), r.perChildLimit, 'number', ' min="0" step="1"') + inp('total', t('pdTotal'), r.totalLimit, 'number', ' min="0" step="1"') +
      inp('start', t('pdStarts'), r.startsOn, 'date') + inp('end', t('pdEnds'), r.endsOn, 'date') +
      '<div><label for="rf-img">' + esc(t('pdRewardImage')) + '</label><input id="rf-img" type="file" accept="image/*">' + (r.image ? '<img src="' + esc(r.image) + '" alt="" style="width:80px;border-radius:8px;margin-top:6px"> <button class="btn small" type="button" data-act="rmImage">✗</button>' : '') + '</div></div>' +
      '<div class="field"><label for="rf-desc">' + esc(t('pdRewardDesc')) + '</label><textarea id="rf-desc" maxlength="300">' + esc(r.description || '') + '</textarea></div>' +
      '<label class="check"><input id="rf-active" type="checkbox"' + (r.active !== false ? ' checked' : '') + '> ' + esc(t('pdActive')) + '</label>' +
      '<label class="check"><input id="rf-auto" type="checkbox"' + (r.autoApprove ? ' checked' : '') + '> ' + esc(t('pdAuto')) + '</label>' +
      '<fieldset style="border:1px solid var(--line);border-radius:12px"><legend>' + esc(t('pdForWho')) + ' (' + esc(t('pdEveryone')) + ' = ' + esc(t('none')) + ' ✓)</legend>' + kids().map(k => '<label class="check"><input type="checkbox" data-for="' + esc(k.id) + '"' + ((r.profileIds || []).includes(k.id) ? ' checked' : '') + '> ' + esc(k.avatar + ' ' + k.name) + '</label>').join('') + '</fieldset>' +
      '<div class="row"><button class="btn primary" type="submit">✓ ' + esc(t('save')) + '</button><button class="btn" type="button" data-act="cancelEdit">' + esc(t('cancel')) + '</button></div></form>';
  }

  function pointsHTML() {
    const st = fam().ledger; if (!kids().length) return '<p class="muted">' + esc(t('noChildren')) + '</p>';
    let h = childPicker();
    const p = F.getProfile(fam(), V.pid);
    h += '<div class="card"><div class="kpis">' + kpi(LG.balance(st, p.id), t('pdBalance')) + kpi(LG.earned(st, p.id), t('pdEarned')) + kpi(LG.spent(st, p.id), t('pdSpent')) + kpi(LG.held(st, p.id), t('pdPending')) + '</div>' +
      '<form class="row" data-form="adjust"><b>' + esc(t('pdAdjust')) + '</b><input id="adj-n" type="number" step="1" placeholder="' + esc(t('pdAmount')) + '" style="width:9rem;min-height:46px;border-radius:10px;border:2px solid var(--line);padding:.2rem .6rem;font:inherit"><input id="adj-r" type="text" maxlength="120" placeholder="' + esc(t('pdReason')) + '" style="flex:1;min-width:12rem;min-height:46px;border-radius:10px;border:2px solid var(--line);padding:.2rem .6rem;font:inherit"><button class="btn primary" type="submit">✓ ' + esc(t('save')) + '</button></form></div>';
    const tx = LG.txOf(st, p.id).slice().reverse();
    h += '<div class="card tablewrap"><table><thead><tr><th>' + esc(t('pdDate')) + '</th><th>' + esc(t('pdWhat')) + '</th><th class="num">' + esc(t('pdAmountCol')) + '</th><th class="num">' + esc(t('pdBalanceAfter')) + '</th><th>' + esc(t('pdBy')) + '</th></tr></thead><tbody>' +
      (tx.length ? tx.map(x => '<tr><td>' + esc(K.fmtDate(x.ts, true)) + '</td><td>' + esc(t('pdTx.' + x.kind)) + (x.note ? ' · ' + esc(x.note) : '') + (x.source && x.kind === 'earn' ? ' <span class="muted">(' + esc(x.source) + ')</span>' : '') + '</td><td class="num ' + (x.amount >= 0 ? 'pos' : 'neg') + '">' + (x.amount > 0 ? '+' : '') + x.amount + '</td><td class="num">' + x.balanceAfter + '</td><td>' + esc(x.by) + '</td></tr>').join('') : '<tr><td colspan="5" class="muted">' + esc(t('none')) + '</td></tr>') + '</tbody></table></div>';
    return h;
  }

  function historyHTML() {
    const f = fam();
    const rows = f.log.filter(x => (!V.histP || x.pid === V.histP) && (!V.histA || x.area === V.histA)).slice(-300).reverse();
    return '<div class="row" style="margin:0 0 12px"><select data-change="histP" style="min-height:44px;border-radius:10px;font:inherit"><option value="">' + esc(t('allTopics')) + '</option>' + f.profiles.filter(p => !p.removed).map(p => '<option value="' + esc(p.id) + '"' + (V.histP === p.id ? ' selected' : '') + '>' + esc(p.avatar + ' ' + p.name) + '</option>').join('') + '</select>' +
      '<select data-change="histA" style="min-height:44px;border-radius:10px;font:inherit"><option value="">' + esc(t('pdArea')) + '</option>' + ['keykids', 'hub', 'kids', 'kidslang', 'academy'].map(a => '<option value="' + a + '"' + (V.histA === a ? ' selected' : '') + '>' + esc(t('area.' + a)) + '</option>').join('') + '</select></div>' +
      '<div class="card tablewrap"><table><thead><tr><th>' + esc(t('pdDate')) + '</th><th></th><th>' + esc(t('pdArea')) + '</th><th>' + esc(t('pdWhat')) + '</th><th class="num">' + esc(t('pdResult')) + '</th><th class="num">' + esc(t('pdDuration')) + '</th></tr></thead><tbody>' +
      (rows.length ? rows.map(x => '<tr><td>' + esc(K.fmtDate(x.ts, true)) + '</td><td>' + esc(nameOf(x.pid)) + '</td><td>' + esc(t('area.' + x.area)) + '</td><td>' + esc(x.title) + '</td><td class="num">' + (x.score != null && x.max ? x.score + '/' + x.max : x.pct != null ? x.pct + ' %' : '–') + '</td><td class="num">' + esc(K.fmtMin(x.ms)) + '</td></tr>').join('') : '<tr><td colspan="6" class="muted">' + esc(t('none')) + '</td></tr>') + '</tbody></table></div>';
  }

  function learningHTML() {
    const f = fam(); let h = '';
    if (kids().length) {
      h += childPicker('childL');
      const p = F.getProfile(f, V.pid), lr = f.learning[p.id] || {};
      KL.content().pairs.forEach(pair => {
        const c = lr[KL.courseKey(pair.id)]; const all = KL.lessons(f.custom).filter(l => KL.usable(l, pair).length);
        if (!c) return;
        const done = all.filter(l => c.lessons[l.id] && c.lessons[l.id].done), open = all.filter(l => c.lessons[l.id] && !c.lessons[l.id].done), not = all.filter(l => !c.lessons[l.id]);
        const words = c.words || {}, weak = Object.keys(words).filter(id => words[id].wrong > words[id].right * 0.5).length;
        h += '<section class="card"><h3 style="margin-top:0">🌍 ' + esc(t('pairs.' + pair.id)) + '</h3><div class="kpis">' + kpi(done.length + '/' + all.length, t('pdLessonsDone')) + kpi(K.fmtMin(c.timeMs), t('acStats.time')) + kpi(c.lastAt ? K.fmtDate(c.lastAt) : '–', t('acStats.last')) +
          kpi(Object.keys(words).length, t('acWords')) + kpi(weak, t('acWeak')) + '</div>' +
          '<p><b>✅ ' + esc(t('pdLessonsDone')) + ':</b> ' + (done.map(l => esc(L(l.name)) + ' (' + c.lessons[l.id].best + ' %)').join(', ') || esc(t('none'))) + '</p>' +
          '<p><b>⏳ ' + esc(t('pdLessonsOpen')) + ':</b> ' + (open.map(l => esc(L(l.name)) + ' (' + c.lessons[l.id].best + ' %)').join(', ') || esc(t('none'))) + '</p>' +
          '<p class="muted"><b>' + esc(t('pdNotStarted')) + ':</b> ' + (not.map(l => esc(L(l.name))).join(', ') || esc(t('none'))) + '</p></section>';
      });
      const p2 = F.getProfile(f, V.pid);
      if (!KL.content().pairs.some(pair => lr[KL.courseKey(pair.id)])) h += '<p class="muted">🌍 ' + esc(t('none')) + '</p>';
      if (p2.links.keykids.length) h += '<p><a class="btn small" href="keykids.html">⌨️ KeyKids</a> <span class="muted">' + esc(t('pdLinks')) + ': KeyKids</span></p>';
    }
    if (adults().length) h += '<h2 class="sec">' + esc(t('pdAdults')) + '</h2>' + adults().map(a => {
      const s = f.adult[a.id]; if (!s) return '<p>' + esc(a.avatar + ' ' + a.name) + ': –</p>';
      const c = AC.course(s.target), pr = (f.learning[a.id] || {})[AC.courseKey(s.target, s.explain)], st = AC.stats(c, pr, f.srs[a.id], f.log, a.id);
      return '<section class="card"><h3 style="margin-top:0">' + esc(a.avatar + ' ' + a.name) + ' · ' + esc(t('lang.' + s.target)) + ' ' + esc(s.level) + '</h3><div class="kpis">' + kpi(st.pct + ' %', t('acProgress')) + kpi(st.done + '/' + st.total, t('acStats.done')) + kpi(st.words, t('acStats.words')) + kpi(st.avg == null ? '–' : st.avg + ' %', t('acStats.avg')) + kpi(K.fmtMin(st.timeMs), t('acStats.time')) + '</div>' +
        (pr && pr.tests && pr.tests.length ? '<p>' + pr.tests.slice(-5).map(x => esc(t('acLevelTest', { l: x.level }) + ': ' + x.pct + ' %' + (x.passed ? ' ✓' : ''))).join(' · ') + '</p>' : '') + '</section>';
    }).join('');
    return h || '<p class="muted">' + esc(t('none')) + '</p>';
  }

  function profilesHTML() {
    const f = fam();
    let h = '<div class="row" style="margin:0 0 12px"><button class="btn primary" data-act="newProfile">＋ ' + esc(t('pdAddProfile')) + '</button></div>';
    if (V.editProfile) h += profileForm(V.editProfile);
    h += '<div class="card tablewrap"><table><thead><tr><th></th><th>' + esc(t('pdKind')) + '</th><th>' + esc(t('pdAge')) + '</th><th>' + esc(t('pdDiff')) + '</th><th>' + esc(t('pdGoal')) + '</th><th>' + esc(t('pdLinks')) + '</th><th></th></tr></thead><tbody>' +
      f.profiles.filter(p => !p.removed).map(p => '<tr><td><b>' + esc(p.avatar + ' ' + p.name) + '</b></td><td>' + esc(p.kind === 'adult' ? t('kindAdult') : t('kindChild')) + '</td><td>' + (p.kind === 'adult' ? '–' : p.age) + '</td><td>' + (p.kind === 'adult' ? '–' : p.diff ? p.diff : esc(t('diffAuto'))) + '</td><td>' + p.goalMin + '</td>' +
        '<td>' + [p.links.keykids.length ? 'KeyKids' : '', p.links.hub.length ? t('area.hub') : '', p.cloudId ? '☁️' : ''].filter(Boolean).map(esc).join(', ') + '</td><td><button class="btn small" data-act="editProfile" data-v="' + esc(p.id) + '">✏️ ' + esc(t('edit')) + '</button></td></tr>').join('') + '</tbody></table></div>';
    return h;
  }
  function profileForm(p) {
    const isNew = !p.id;
    return '<form class="card stack" data-form="profile"><h2>' + esc(isNew ? t('pdAddProfile') : t('edit') + ': ' + p.name) + '</h2><p class="muted" style="margin:0">' + esc(KK_HINT()) + '</p><div class="fields">' +
      '<div><label for="pf-name">' + esc(t('acName')) + '</label><input id="pf-name" type="text" maxlength="20" value="' + esc(p.name || '') + '" data-focus required></div>' +
      '<div><label for="pf-kind">' + esc(t('pdKind')) + '</label><select id="pf-kind"><option value="child"' + (p.kind !== 'adult' ? ' selected' : '') + '>' + esc(t('kindChild')) + '</option><option value="adult"' + (p.kind === 'adult' ? ' selected' : '') + '>' + esc(t('kindAdult')) + '</option></select></div>' +
      '<div><label for="pf-age">' + esc(t('pdAge')) + '</label><input id="pf-age" type="number" min="2" max="99" value="' + esc(p.age || 6) + '"></div>' +
      '<div><label for="pf-diff">' + esc(t('pdDiff')) + '</label><select id="pf-diff">' + [0, 1, 2, 3, 4].map(n => '<option value="' + n + '"' + ((p.diff || 0) === n ? ' selected' : '') + '>' + (n ? esc(t('levelFor', { n, a: { 1: '3–4', 2: '5–6', 3: '7–8', 4: '9–10' }[n] })) : esc(t('diffAuto'))) + '</option>').join('') + '</select></div>' +
      '<div><label for="pf-goal">' + esc(t('pdGoal')) + '</label><input id="pf-goal" type="number" min="0" max="180" value="' + esc(p.goalMin == null ? 15 : p.goalMin) + '"></div></div>' +
      '<div class="field"><label>' + esc(t('pdAvatar')) + '</label><div class="choices">' + AVATARS.map(a => '<button type="button" class="btn av' + ((p.avatar || '🦊') === a ? ' on' : '') + '" data-act="pfAvatar" data-v="' + a + '">' + a + '</button>').join('') + '</div></div>' +
      '<div class="row"><button class="btn primary" type="submit">✓ ' + esc(t('save')) + '</button><button class="btn" type="button" data-act="cancelEdit">' + esc(t('cancel')) + '</button>' +
      (!isNew ? (V.confirm === 'rm:' + p.id ? '<span class="err">' + esc(t('pdRemoveAsk', { name: p.name })) + '</span><button class="btn danger" type="button" data-act="rmProfileYes" data-v="' + esc(p.id) + '">' + esc(t('yes')) + '</button>' : '<button class="btn danger" type="button" data-act="rmProfile" data-v="' + esc(p.id) + '">🗑 ' + esc(t('pdRemove')) + '</button>') : '') + '</div></form>';
  }
  const KK_HINT = () => ({ th: 'ใช้แค่ชื่อเล่น อายุ และรูปก็พอ ไม่ต้องใส่วันเกิด ที่อยู่ หรือข้อมูลติดต่อ', sv: 'Smeknamn, ålder och bild räcker. Ingen födelsedag, adress eller kontaktuppgift behövs.', en: 'A nickname, age and picture are enough. No birthday, address or contact details are needed.' })[K.ui()];

  function settingsHTML() {
    const f = fam(), R = f.ledger.rules;
    let h = '<form class="card stack" data-form="rules"><h2>' + esc(t('pdRules')) + '</h2><p class="muted" style="margin:0">' + esc(t('pdRulesHelp')) + '</p><div class="fields">' +
      Object.keys(LG.DEFAULT_RULES).map(k => '<div><label for="rule-' + k + '">' + esc(t('rule.' + k)) + '</label><input id="rule-' + k + '" data-rule="' + k + '" type="number" min="0" step="' + (k === 'repeatFactor' ? '0.1' : '1') + '" value="' + R[k] + '"></div>').join('') + '</div><div class="row"><button class="btn primary" type="submit">✓ ' + esc(t('save')) + '</button></div></form>';
    h += '<section class="card stack"><h2>' + esc(t('pdCustom')) + '</h2><p class="muted" style="margin:0">' + esc(t('pdCustomHelp')) + '</p>' +
      '<form class="fields" data-form="word"><div><label for="cw-pic">' + esc(t('pdWordPic')) + '</label><input id="cw-pic" maxlength="8" value="🏡"></div>' + ['th', 'sv', 'en', 'es'].map(l => '<div><label for="cw-' + l + '">' + esc(t('lang.' + l)) + '</label><input id="cw-' + l + '" lang="' + l + '" maxlength="40"></div>').join('') +
      '<div style="align-self:end"><button class="btn primary" type="submit">＋ ' + esc(t('pdAddWord')) + '</button></div></form>' +
      (f.custom.kidsWords.length ? '<div class="tablewrap"><table><tbody>' + f.custom.kidsWords.map(w => '<tr><td>' + esc(w.pic) + '</td>' + ['th', 'sv', 'en', 'es'].map(l => '<td lang="' + l + '">' + esc(w[l] || '–') + '</td>').join('') + '<td><button class="btn small danger" data-act="rmWord" data-v="' + esc(w.id) + '">🗑</button></td></tr>').join('') + '</tbody></table></div>' : '') + '</section>';
    const allL = [].concat(...KL.content().levels.map(lv => lv.lessons.map(l => Object.assign({ level: lv.n }, l))));
    h += '<section class="card"><h2>' + esc(t('pdLessonsOnOff')) + ' <span class="badge-sample">' + esc(t('sample')) + '</span></h2><div class="grid small">' + allL.map(l => '<label class="check"><input type="checkbox" data-lesson="' + esc(l.id) + '"' + (f.custom.disabledLessons.includes(l.id) ? '' : ' checked') + '> ' + l.icon + ' ' + esc(t('lvl', { n: l.level })) + ': ' + esc(L(l.name)) + '</label>').join('') + '</div></section>';
    h += cloudHTML();
    h += '<section class="card stack"><h2>' + esc(t('pdLegacy')) + '</h2><p>' + esc(t('pdLegacyInfo', { h: f.imported.hub.length, k: f.imported.keykids.length })) + '</p><p class="muted">🛡️ ' + esc(t('pdSecurityNote')) + '</p>' +
      '<div class="row"><button class="btn" data-act="changePin">🔑 ' + esc(t('pdChangePin')) + '</button><button class="btn" data-act="export">⬇️ ' + esc(t('pdExport')) + '</button></div></section>';
    return h;
  }
  function cloudHTML() {
    const C = FGH.cloud, st = C && C.status ? C.status() : { configured: false };
    let h = '<section class="card stack"><h2>☁️ ' + esc(t('pdCloud')) + '</h2>';
    if (!st.configured) return h + '<p class="muted">' + esc(t('pdCloudOff')) + '</p><p class="muted">' + esc(t('pdLocalOnly')) + '</p></section>';
    if (!st.signedIn) return h + '<p>' + esc(t('pdCloudSignedOut')) + '</p><a class="btn" href="online.html">🌐 Family Online</a></section>';
    h += '<p>' + esc(t('pdCloudFamily')) + ': <b>' + esc(st.familyName || '–') + '</b> · ' + esc(st.lastSync ? t('pdSynced', { t: K.fmtDate(st.lastSync, true) }) : '') + (st.error ? ' <span class="err">' + esc(t('pdSyncFailed', { e: st.error })) + '</span>' : '') + '</p>';
    return h + '<div class="row"><button class="btn primary" data-act="syncNow">🔄 ' + esc(t('pdSyncNow')) + '</button><button class="btn" data-act="upload">⬆️ ' + esc(t('pdUpload')) + '</button></div></section>';
  }

  /* ---------- images: shrink to max 480 px so a reward picture stays small ---------- */
  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return resolve('');
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, 480 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); resolve(cv.toDataURL('image/jpeg', 0.8)); }; img.onerror = () => reject(new Error('image')); img.src = fr.result; };
      fr.onerror = () => reject(new Error('image')); fr.readAsDataURL(file);
    });
  }
  const done = (r, okMsg) => { if (r && r.ok) V.msg = okMsg; else V.err = errText(r && r.error || 'error'); render(); };

  /* ---------- actions ---------- */
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    lock() { lock(); V = Object.assign(V, { tab: 'overview', edit: null, editProfile: null }); render(); },
    tab(v) { V.tab = v; V.edit = null; V.editProfile = null; V.confirm = null; render(); },
    'tab:settings'() { V.changing = false; render(); },
    child(v) { V.pid = v; render(); }, childL(v) { V.pid = v; render(); },
    async approve(v) { const r = await A.approve(v).catch(e => ({ ok: false, error: e.code || 'error' })); const red = fam().ledger.redemptions.find(x => x.id === v); done(r, t('pdApproved', { n: red ? red.cost : '' })); },
    async reject(v) { const note = ($('note-' + v) || {}).value || ''; const r = await A.reject(v, note).catch(e => ({ ok: false, error: e.code || 'error' })); done(r, t('pdRejected')); },
    newReward() { V.edit = { icon: '🎁', active: true }; render(); },
    editReward(v) { V.edit = Object.assign({}, fam().ledger.rewards.find(r => r.id === v)); render(); },
    cancelEdit() { V.edit = null; V.editProfile = null; V.confirm = null; render(); },
    rmImage() { V.edit.image = ''; render(); },
    delReward(v) { V.confirm = 'del:' + v; render(); },
    async delRewardYes(v) { const r = await A.deleteReward(v).catch(e => ({ ok: false, error: e.code || 'error' })); V.confirm = null; done(r, r && r.archived ? t('pdRewardArchived') : t('pdRewardDeleted')); },
    newProfile() { V.editProfile = { kind: 'child', age: 6, avatar: '🦊', goalMin: 15, diff: 0 }; render(); },
    editProfile(v) { V.editProfile = Object.assign({}, F.getProfile(fam(), v)); render(); },
    pfAvatar(v) { keepProfileDraft(); V.editProfile.avatar = v; render(); },
    rmProfile(v) { keepProfileDraft(); V.confirm = 'rm:' + v; render(); },
    async rmProfileYes(v) { const r = await A.removeProfile(v); V.editProfile = null; V.confirm = null; done(r, t('pdRemoved')); },
    rmWord(v) { store.mutate(f => { f.custom.kidsWords = f.custom.kidsWords.filter(w => w.id !== v); }); render(); },
    changePin() { V.changing = true; $('app').innerHTML = pinSetHTML(true); const fc = document.querySelector('[data-focus]'); if (fc) fc.focus(); },
    export() {
      const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), family: Object.assign({}, fam(), { parent: { pin: null } }), keykids: store.legacy('keykids.v1'), hub: store.legacy('fgh.v1') }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'family-game-hub-backup-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    async syncNow() { try { await FGH.cloud.sync(); V.msg = t('pdSynced', { t: K.fmtDate(Date.now(), true) }); } catch (e) { V.err = t('pdSyncFailed', { e: e.code || e.message }); } render(); },
    async upload() { try { await FGH.cloud.uploadLocal(); V.msg = t('pdUploaded'); } catch (e) { V.err = t('pdSyncFailed', { e: e.code || e.message }); } render(); }
  };
  function keepProfileDraft() {
    const e = V.editProfile; if (!e || !$('pf-name')) return;
    Object.assign(e, { name: $('pf-name').value, kind: $('pf-kind').value, age: +$('pf-age').value, diff: +$('pf-diff').value, goalMin: +$('pf-goal').value });
  }
  K.bindActs(ACT);

  document.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target.dataset.form;
    if (form === 'setPin') {
      const a = $('p1').value, b = $('p2').value;
      if (!F.validPin(a)) { V.pinErr = t('pdPinFormat'); return V.changing ? ACT.changePin() : render(); }
      if (a !== b) { V.pinErr = t('pdPinMismatch'); return V.changing ? ACT.changePin() : render(); }
      await store.mutate(f => F.setPin(f, a));
      if (FGH.cloud && FGH.cloud.active()) await FGH.cloud.setPin(a).catch(err => { V.err = errText(err.code || 'error'); });
      V.pinErr = null; V.changing = false; touch(); V.msg = t('saved'); render();
    }
    if (form === 'pin') {
      const pin = $('pin').value;
      const r = await store.mutate(f => F.checkPin(f, pin, Date.now()));
      if (r.ok) { V.pinErr = null; touch(); if (FGH.cloud && FGH.cloud.active()) FGH.cloud.unlock(pin).catch(err => err.code === 'no_pin' ? FGH.cloud.setPin(pin).then(() => FGH.cloud.unlock(pin)) : Promise.reject(err)).catch(err => { V.err = errText(err.code || 'error'); render(); }); }
      else V.pinErr = r.error === 'wrong_pin' ? t('pdWrongPin', { n: r.left }) : r.error === 'locked' ? t('pdLocked', { t: new Date(r.until).toLocaleTimeString() }) : t('err_error');
      render();
    }
    if (form === 'reward') {
      const ed = V.edit; let image = ed.image || '';
      try { const fl = $('rf-img').files[0]; if (fl) image = await readImage(fl); } catch (err) { image = ed.image || ''; }
      const data = { id: ed.id, created: ed.created, name: $('rf-name').value, icon: $('rf-icon').value || '🎁', cost: $('rf-cost').value, perChildLimit: $('rf-per').value, totalLimit: $('rf-total').value,
        startsOn: $('rf-start').value, endsOn: $('rf-end').value, description: $('rf-desc').value, active: $('rf-active').checked, autoApprove: $('rf-auto').checked, image,
        profileIds: Array.from(document.querySelectorAll('[data-for]')).filter(x => x.checked).map(x => x.dataset.for) };
      const r = await A.saveReward(data).catch(err => ({ ok: false, error: err.code || 'error' }));
      if (r.ok) V.edit = null;
      done(r, t('pdRewardSaved'));
    }
    if (form === 'adjust') {
      const r = await A.adjust(V.pid, $('adj-n').value, $('adj-r').value).catch(err => ({ ok: false, error: err.code || 'error' }));
      done(r, t('pdAdjusted'));
    }
    if (form === 'profile') {
      keepProfileDraft(); const d = V.editProfile;
      const data = { name: d.name, kind: d.kind, age: d.age, diff: d.diff, goalMin: d.goalMin, avatar: d.avatar };
      const r = await A.saveProfile(d.id || null, data);
      if (r.ok) V.editProfile = null;
      done(r, t('saved'));
    }
    if (form === 'rules') {
      const rules = {}; document.querySelectorAll('[data-rule]').forEach(i => { rules[i.dataset.rule] = i.value; });
      const r = await A.saveRules(rules).catch(err => ({ ok: false, error: err.code || 'error' }));
      done(r, t('saved'));
    }
    if (form === 'word') {
      const w = { id: 'fw-' + LG.newId().slice(0, 8), pic: $('cw-pic').value || '🏡' };
      ['th', 'sv', 'en', 'es'].forEach(l => { const v = $('cw-' + l).value.trim(); if (v) w[l] = v.slice(0, 40); });
      if (['th', 'sv', 'en', 'es'].filter(l => w[l]).length < 2) { V.err = t('err_name_required'); return render(); }
      store.mutate(f => { f.custom.kidsWords.push(w); });
      V.msg = t('saved'); render();
    }
  });
  document.addEventListener('change', e => {
    const d = e.target.dataset;
    if (d.change === 'histP') { V.histP = e.target.value; render(); }
    if (d.change === 'histA') { V.histA = e.target.value; render(); }
    if (d.lesson) store.mutate(f => { const s = new Set(f.custom.disabledLessons); e.target.checked ? s.delete(d.lesson) : s.add(d.lesson); f.custom.disabledLessons = Array.from(s); });
  });
  /* the dashboard locks itself after 15 minutes without use */
  setInterval(() => { if (fam().parent.pin && !unlocked() && document.querySelector('.tabs')) render(); }, 30000);
  store.onChange(() => { if (unlocked() && !document.activeElement.matches('input,textarea,select')) render(); });
  if (FGH.cloud) FGH.cloud.start().then(() => render()).catch(() => {});
  render();
})();
