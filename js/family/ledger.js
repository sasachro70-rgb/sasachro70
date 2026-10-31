/* Family Game Hub: points ledger, rewards and redemptions.
   Pure functions over a plain state object, so they run the same in the browser and in Node tests.
   The balance is never stored on its own: it is always the sum of the transaction history.
   When a Supabase family account is connected, the same rules run on the server (supabase/migrations)
   and the server's answer wins; these functions then only mirror it for offline display. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};

  const DEFAULT_RULES = {
    typing: 10,          // points for a typing lesson with at least 1 star
    spellMax: 100,       // spelling / flag games: the game score, capped here
    quizPerCorrect: 2,   // knowledge games: per correct answer, times the difficulty (1–4)
    kidsLesson: 20,      // finishing a kids language lesson
    kidsPassBonus: 10,   // extra when the lesson score is 80 % or more
    reviewPerWord: 1,    // reviewing words, per word answered correctly
    reviewMax: 20,
    dailyGoalBonus: 15,  // once a day, when the child's daily minutes goal is reached
    repeatFactor: 0.5,   // replaying something already completed earns this share
    maxPerActivity: 150, // hard cap for one activity
    dailyCap: 400        // hard cap for one child per day (0 = no cap)
  };

  const dayOf = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const newId = () => (G.crypto && G.crypto.randomUUID) ? G.crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  function emptyState() {
    return { tx: [], rewards: [], redemptions: [], rules: Object.assign({}, DEFAULT_RULES) };
  }

  /* ---------- balances ---------- */
  const txOf = (st, pid) => st.tx.filter(x => x.profileId === pid);
  const balance = (st, pid) => txOf(st, pid).reduce((a, x) => a + x.amount, 0);
  const earned = (st, pid) => txOf(st, pid).filter(x => x.amount > 0 && x.kind !== 'refund').reduce((a, x) => a + x.amount, 0);
  const spent = (st, pid) => -txOf(st, pid).filter(x => x.kind === 'spend').reduce((a, x) => a + x.amount, 0);
  /* points reserved by requests that wait for a parent */
  const held = (st, pid) => st.redemptions.filter(r => r.profileId === pid && r.status === 'pending').reduce((a, r) => a + r.cost, 0);
  const available = (st, pid) => balance(st, pid) - held(st, pid);
  const earnedOnDay = (st, pid, day) => txOf(st, pid).filter(x => x.kind === 'earn' && dayOf(x.ts) === day).reduce((a, x) => a + x.amount, 0);
  const hasKey = (st, key) => st.tx.some(x => x.key === key);

  function addTx(st, t) {
    const bal = balance(st, t.profileId);
    const tx = { id: t.id || newId(), profileId: t.profileId, ts: t.ts || Date.now(), kind: t.kind, amount: Math.round(t.amount),
      source: t.source || '', key: t.key, note: t.note || '', by: t.by || 'system', balanceAfter: bal + Math.round(t.amount) };
    st.tx.push(tx);
    return tx;
  }

  /* ---------- earning ---------- */
  /* How many points an activity is worth before caps. act.repeat = this exact unit was completed before. */
  function activityValue(rules, act) {
    const R = Object.assign({}, DEFAULT_RULES, rules);
    let v = 0;
    switch (act.kind) {
      case 'typing': v = act.stars >= 1 ? R.typing : 0; break;
      case 'spell': case 'flags': v = Math.min(R.spellMax, Math.max(0, act.score || 0)); break;
      case 'quiz': v = (act.correct || 0) * R.quizPerCorrect * Math.max(1, Math.min(4, act.d || 1)); break;
      case 'kidslesson': v = R.kidsLesson + ((act.pct || 0) >= 80 ? R.kidsPassBonus : 0); break;
      case 'review': v = Math.min(R.reviewMax, (act.correct || 0) * R.reviewPerWord); break;
      case 'dailygoal': v = R.dailyGoalBonus; break;
      default: v = 0;
    }
    if (act.repeat && act.kind !== 'dailygoal') v = v * R.repeatFactor;
    return Math.max(0, Math.round(Math.min(v, R.maxPerActivity)));
  }

  /* Award points for one finished activity. The key makes it idempotent: the same game can never pay twice. */
  function award(st, pid, act, now) {
    now = now || Date.now();
    if (!pid || !act || !act.key) return { ok: false, error: 'bad_request' };
    if (hasKey(st, act.key)) return { ok: false, error: 'duplicate' };
    const R = Object.assign({}, DEFAULT_RULES, st.rules);
    let amount = activityValue(R, act);
    let capped = false;
    if (R.dailyCap > 0) {
      const room = Math.max(0, R.dailyCap - earnedOnDay(st, pid, dayOf(now)));
      if (amount > room) { amount = room; capped = true; }
    }
    if (amount <= 0) return { ok: true, amount: 0, capped };
    const tx = addTx(st, { profileId: pid, ts: now, kind: 'earn', amount, source: act.kind, key: act.key, note: act.note || '' });
    return { ok: true, amount, capped, tx };
  }

  /* Parent correction. Never lets the balance go below what is reserved, so it can't go negative. */
  function adjust(st, pid, amount, note, now, key) {
    amount = Math.round(+amount);
    if (!pid || !amount || !isFinite(amount)) return { ok: false, error: 'bad_amount' };
    if (!note || !String(note).trim()) return { ok: false, error: 'note_required' };
    if (key && hasKey(st, key)) return { ok: false, error: 'duplicate' };
    if (balance(st, pid) + amount < held(st, pid)) return { ok: false, error: 'would_go_negative' };
    return { ok: true, tx: addTx(st, { profileId: pid, ts: now, kind: 'adjust', amount, source: 'parent', key: key || 'adj:' + newId(), note: String(note).trim(), by: 'parent' }) };
  }

  /* Points that existed before the ledger (KeyKids "points") become one opening transaction. */
  function openingBalance(st, pid, points, now) {
    const key = 'opening:' + pid;
    if (hasKey(st, key) || !(points > 0)) return null;
    return addTx(st, { profileId: pid, ts: now, kind: 'opening', amount: points, source: 'migration', key, note: 'KeyKids points before the ledger' });
  }

  /* ---------- rewards ---------- */
  function cleanReward(r) {
    const n = v => (v === '' || v == null || isNaN(+v)) ? null : Math.max(0, Math.round(+v));
    return {
      id: r.id || newId(), name: String(r.name || '').trim().slice(0, 60), icon: String(r.icon || '🎁').slice(0, 8),
      image: typeof r.image === 'string' && /^(data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/)/.test(r.image) ? r.image : '',
      description: String(r.description || '').trim().slice(0, 300), cost: n(r.cost) || 0,
      perChildLimit: n(r.perChildLimit), totalLimit: n(r.totalLimit),
      startsOn: /^\d{4}-\d{2}-\d{2}$/.test(r.startsOn || '') ? r.startsOn : '', endsOn: /^\d{4}-\d{2}-\d{2}$/.test(r.endsOn || '') ? r.endsOn : '',
      active: r.active !== false, autoApprove: !!r.autoApprove, profileIds: Array.isArray(r.profileIds) ? r.profileIds.slice() : [],
      created: r.created || Date.now(), updated: Date.now()
    };
  }
  function validateReward(r) {
    if (!r.name) return 'name_required';
    if (!(r.cost >= 1)) return 'cost_required';
    if (r.startsOn && r.endsOn && r.endsOn < r.startsOn) return 'dates_order';
    return null;
  }
  function saveReward(st, input) {
    const r = cleanReward(input);
    const err = validateReward(r); if (err) return { ok: false, error: err };
    const i = st.rewards.findIndex(x => x.id === r.id);
    if (i >= 0) { r.created = st.rewards[i].created; st.rewards[i] = r; } else st.rewards.push(r);
    return { ok: true, reward: r };
  }
  /* A reward with history is archived instead of erased, so the history stays readable. */
  function deleteReward(st, id) {
    const i = st.rewards.findIndex(x => x.id === id); if (i < 0) return { ok: false, error: 'not_found' };
    if (st.redemptions.some(r => r.rewardId === id && r.status === 'pending')) return { ok: false, error: 'has_pending' };
    if (st.redemptions.some(r => r.rewardId === id)) { st.rewards[i].deleted = true; st.rewards[i].active = false; return { ok: true, archived: true }; }
    st.rewards.splice(i, 1); return { ok: true };
  }
  const usedBy = (st, rid, pid) => st.redemptions.filter(r => r.rewardId === rid && (pid == null || r.profileId === pid) && (r.status === 'pending' || r.status === 'approved')).length;

  /* Why a child can or can't redeem a reward right now (null = can). */
  function blockReason(st, reward, pid, now) {
    now = now || Date.now();
    const day = dayOf(now);
    if (!reward || reward.deleted) return 'not_found';
    if (!reward.active) return 'inactive';
    if (reward.profileIds && reward.profileIds.length && !reward.profileIds.includes(pid)) return 'not_for_you';
    if (reward.startsOn && day < reward.startsOn) return 'not_started';
    if (reward.endsOn && day > reward.endsOn) return 'expired';
    if (reward.totalLimit != null && usedBy(st, reward.id) >= reward.totalLimit) return 'sold_out';
    if (reward.perChildLimit != null && usedBy(st, reward.id, pid) >= reward.perChildLimit) return 'limit_reached';
    if (st.redemptions.some(r => r.rewardId === reward.id && r.profileId === pid && r.status === 'pending')) return 'pending_exists';
    if (available(st, pid) < reward.cost) return 'not_enough';
    return null;
  }
  function visibleRewards(st, pid) { return st.rewards.filter(r => !r.deleted && r.active && (!r.profileIds || !r.profileIds.length || r.profileIds.includes(pid))); }

  function request(st, pid, rewardId, now, reqId) {
    now = now || Date.now();
    if (reqId && st.redemptions.some(r => r.id === reqId)) return { ok: false, error: 'duplicate' };
    const reward = st.rewards.find(r => r.id === rewardId);
    const why = blockReason(st, reward, pid, now); if (why) return { ok: false, error: why };
    const red = { id: reqId || newId(), profileId: pid, rewardId, rewardName: reward.name, rewardIcon: reward.icon, cost: reward.cost,
      status: 'pending', createdAt: now, decidedAt: null, decidedBy: null, note: '' };
    st.redemptions.push(red);
    if (reward.autoApprove) { const r = approve(st, red.id, now, 'auto'); if (!r.ok) { st.redemptions.pop(); return r; } }
    return { ok: true, redemption: red };
  }
  function approve(st, id, now, by) {
    const red = st.redemptions.find(r => r.id === id); if (!red) return { ok: false, error: 'not_found' };
    if (red.status !== 'pending') return { ok: false, error: 'not_pending' };
    if (balance(st, red.profileId) - (held(st, red.profileId) - red.cost) < red.cost) return { ok: false, error: 'not_enough' };
    const key = 'redeem:' + red.id;
    if (!hasKey(st, key)) addTx(st, { profileId: red.profileId, ts: now, kind: 'spend', amount: -red.cost, source: 'reward', key, note: red.rewardName, by: by || 'parent' });
    red.status = 'approved'; red.decidedAt = now || Date.now(); red.decidedBy = by || 'parent';
    return { ok: true, redemption: red };
  }
  function reject(st, id, now, note) {
    const red = st.redemptions.find(r => r.id === id); if (!red) return { ok: false, error: 'not_found' };
    if (red.status !== 'pending') return { ok: false, error: 'not_pending' };
    red.status = 'rejected'; red.decidedAt = now || Date.now(); red.decidedBy = 'parent'; red.note = String(note || '').slice(0, 200);
    return { ok: true, redemption: red };
  }
  function cancel(st, id, pid, now) {
    const red = st.redemptions.find(r => r.id === id); if (!red || red.profileId !== pid) return { ok: false, error: 'not_found' };
    if (red.status !== 'pending') return { ok: false, error: 'not_pending' };
    red.status = 'cancelled'; red.decidedAt = now || Date.now(); red.decidedBy = 'child';
    return { ok: true };
  }

  /* Merge transactions from another device or the server: unique by key, oldest first, balances recomputed. */
  function mergeTx(st, incoming) {
    const byKey = new Map(st.tx.map(x => [x.key, x]));
    for (const x of incoming || []) if (x && x.key && !byKey.has(x.key)) byKey.set(x.key, x);
    const all = Array.from(byKey.values()).sort((a, b) => a.ts - b.ts);
    const run = {};
    all.forEach(x => { run[x.profileId] = (run[x.profileId] || 0) + x.amount; x.balanceAfter = run[x.profileId]; });
    st.tx = all;
  }

  FGH.ledger = { DEFAULT_RULES, emptyState, dayOf, newId, balance, earned, spent, held, available, earnedOnDay, hasKey, activityValue, award, adjust, openingBalance,
    cleanReward, validateReward, saveReward, deleteReward, blockReason, visibleRewards, usedBy, request, approve, reject, cancel, mergeTx, txOf };
})(typeof window !== 'undefined' ? window : globalThis);
