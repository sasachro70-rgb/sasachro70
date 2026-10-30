/* Family account sync (optional). Off until js/online/config.js has a Supabase project, and only active on a device
   signed in (on online.html) with a permanent account of a family. Then:
     * the server is the source of truth for points, rewards, requests and rules (supabase/migrations/0002_…);
     * finished activities wait in an outbox and are re-sent with the same key until the server has them;
     * learning progress is merged with the server copy, never overwritten (revision numbers);
     * parent actions need the parent PIN on the server too (unlock_parent).
   Without configuration everything stays on the device and this file does nothing. */
(function (G) {
  'use strict';
  const FGH = G.FGH, F = FGH.family, LG = FGH.ledger, store = FGH.familyStore;
  const SC = FGH.supabaseClient;
  let client = null, family = null, user = null, active = false, started = null, lastSync = 0, lastError = null, timer = null, flushing = null;
  const st = { configured: !!(SC && SC.configured()), signedIn: false };

  function toError(err) {
    const msg = String((err && (err.message || err.error_description)) || err || 'error');
    const code = /failed to fetch|network|load failed|offline/i.test(msg) ? 'offline' : (/^[a-z_]+$/.test(msg.trim()) ? msg.trim() : /permission denied/i.test(msg) ? 'not_allowed' : 'error');
    return Object.assign(new Error(msg), { code });
  }
  async function rpc(name, args) {
    let res; try { res = await client.rpc(name, args || {}); } catch (e) { throw toError(e); }
    if (res.error) throw toError(res.error);
    return res.data;
  }
  /* uuid[] arrives as an array from Supabase; accept the '{a,b}' text form too */
  const pgArray = v => Array.isArray(v) ? v : typeof v === 'string' ? v.replace(/^\{|\}$/g, '').split(',').filter(Boolean).map(x => x.replace(/"/g, '')) : [];
  async function rows(q) { let res; try { res = await q; } catch (e) { throw toError(e); } if (res.error) throw toError(res.error); return res.data || []; }

  /* ---------- id mapping: local family profile ↔ player_profiles.id ---------- */
  const cloudIdOf = (f, pid) => { const p = f.profiles.find(x => x.id === pid); return p ? (p.cloudId || null) : null; };
  const localIdOf = (f, cid) => { const p = f.profiles.find(x => x.cloudId === cid || x.id === cid); return p ? p.id : cid; };

  async function start() {
    if (started) return started;
    started = (async () => {
      if (!st.configured) return false;
      try {
        client = await SC.createClient();
        const { data } = await client.auth.getSession();
        const s = data && data.session; user = s && s.user;
        st.signedIn = !!(user && !user.is_anonymous);
        if (!st.signedIn) return false;
        const fams = await rows(client.from('families').select('id,name,created_at').order('created_at'));
        const mem = fams.length ? await rows(client.from('family_members').select('family_id,role').eq('user_id', user.id)) : [];
        const want = store.get().sync.familyId;
        family = fams.find(x => x.id === want) || fams.find(x => mem.some(m => m.family_id === x.id && m.role !== 'member')) || fams[0] || null;
        if (!family) return false;
        family.role = (mem.find(m => m.family_id === family.id) || {}).role;
        /* a device with nothing of its own takes the server's data as it is; a device with local history keeps it until a parent uploads it */
        store.mutate(f => { f.sync.familyId = family.id; if (!f.ledger.tx.length && !f.ledger.rewards.length && !f.ledger.redemptions.length) f.sync.uploaded = family.id; });
        active = true;
        await sync().catch(e => { lastError = e.code; });
        timer = setInterval(() => { sync().catch(() => {}); }, 60000);
        G.addEventListener('online', () => sync().catch(() => {}));
        return true;
      } catch (e) { lastError = e.code || e.message; return false; }
    })();
    return started;
  }

  /* ---------- pull: the server's view replaces the local one (the outbox is kept and re-sent) ---------- */
  async function pull() {
    const fid = family.id;
    const [profs, sets, tx, rws, reds, fs, logs, learn] = await Promise.all([
      rows(client.from('player_profiles').select('id,display_name,avatar').eq('family_id', fid)),
      rows(client.from('profile_settings').select('*').eq('family_id', fid)),
      rows(client.from('point_transactions').select('id,profile_id,kind,amount,source,key,note,created_by,created_at').eq('family_id', fid).order('created_at').limit(20000)),
      rows(client.from('rewards').select('*').eq('family_id', fid)),
      rows(client.from('reward_redemptions').select('*').eq('family_id', fid).order('created_at')),
      rows(client.from('family_settings').select('rules').eq('family_id', fid)),
      rows(client.from('activity_log').select('id,profile_id,key,area,kind,title,ms,score,max,pct,created_at').eq('family_id', fid).order('created_at', { ascending: false }).limit(1500)),
      rows(client.from('learning_state').select('profile_id,data,rev').eq('family_id', fid))
    ]);
    store.mutate(f => {
      profs.forEach(cp => {
        const s = sets.find(x => x.profile_id === cp.id) || {};
        let p = f.profiles.find(x => x.cloudId === cp.id || x.id === cp.id);
        if (!p) { p = F.fixProfile({ id: cp.id, cloudId: cp.id, created: Date.now() }); f.profiles.push(p); }
        Object.assign(p, { cloudId: cp.id, name: cp.display_name, avatar: cp.avatar, kind: s.kind || p.kind, age: s.age || p.age, diff: s.difficulty != null ? s.difficulty : p.diff,
          goalMin: s.goal_min != null ? s.goal_min : p.goalMin, ttsRate: s.tts_rate != null ? +s.tts_rate : p.ttsRate, removed: !!s.archived || p.removed });
      });
      const pending = new Set(f.sync.outbox.filter(o => o.op === 'finish').map(o => o.act.key));
      const server = tx.map(x => ({ id: x.id, profileId: localIdOf(f, x.profile_id), ts: Date.parse(x.created_at), kind: x.kind, amount: x.amount, source: x.source,
        key: x.key.startsWith('act:') ? x.key.slice(4) : x.key, note: x.note, by: x.created_by === (user && user.id) ? 'parent' : 'family' }));
      const keep = f.sync.uploaded === fid;   // false: local history not uploaded yet, so it stays next to the server's
      const local = f.ledger.tx.filter(x => !keep || pending.has(x.key));
      f.ledger.tx = []; LG.mergeTx(f.ledger, server.concat(local));
      const localRewards = keep ? [] : f.ledger.rewards, localReds = keep ? [] : f.ledger.redemptions;
      f.ledger.rewards = rws.map(r => ({ id: r.id, name: r.name, icon: r.icon, image: r.image, description: r.description, cost: r.cost, perChildLimit: r.per_child_limit, totalLimit: r.total_limit,
        startsOn: r.starts_on || '', endsOn: r.ends_on || '', active: r.active, autoApprove: r.auto_approve, profileIds: pgArray(r.profile_ids).map(id => localIdOf(f, id)), deleted: r.archived, created: Date.parse(r.created_at), updated: Date.parse(r.updated_at) }));
      f.ledger.rewards = f.ledger.rewards.concat(localRewards.filter(r => !f.ledger.rewards.some(x => x.id === r.id)));
      f.ledger.redemptions = reds.map(r => ({ id: r.id, profileId: localIdOf(f, r.profile_id), rewardId: r.reward_id, rewardName: r.reward_name, rewardIcon: r.reward_icon, cost: r.cost, status: r.status,
        createdAt: Date.parse(r.created_at), decidedAt: r.decided_at ? Date.parse(r.decided_at) : null, decidedBy: r.decided_by ? 'parent' : null, note: r.note }));
      f.ledger.redemptions = f.ledger.redemptions.concat(localReds.filter(r => !f.ledger.redemptions.some(x => x.id === r.id)));
      f.ledger.rules = Object.assign({}, LG.DEFAULT_RULES, fs[0] && fs[0].rules);
      const have = new Set(f.log.map(x => x.key));
      logs.reverse().forEach(x => { if (!have.has(x.key)) f.log.push({ id: x.id, pid: localIdOf(f, x.profile_id), ts: Date.parse(x.created_at), area: x.area, kind: x.kind, title: x.title, ms: x.ms, score: x.score, max: x.max, pct: x.pct, key: x.key }); });
      f.log.sort((a, b) => a.ts - b.ts);
      f.sync.revs = f.sync.revs || {};
      learn.forEach(l => { const pid = localIdOf(f, l.profile_id); if ((f.sync.revs[pid] || 0) < l.rev) { applyLearning(f, pid, l.data); f.sync.revs[pid] = l.rev; } });
    });
  }
  /* learning documents are merged, so progress made on two devices is kept from both */
  function learningDoc(f, pid) {
    const done = {}; Object.keys(f.done).filter(k => k.startsWith(pid + '|')).forEach(k => { done[k.slice(pid.length + 1)] = f.done[k]; });
    return { learning: f.learning[pid] || {}, srs: f.srs[pid] || {}, favorites: f.favorites[pid] || [], adult: f.adult[pid] || null, done };
  }
  function applyLearning(f, pid, d) {
    if (!d) return;
    f.learning[pid] = F.mergeLearning(f.learning[pid] || {}, d.learning || {});
    const srs = f.srs[pid] || (f.srs[pid] = {}); for (const k in (d.srs || {})) if (!srs[k] || (d.srs[k].last || 0) > (srs[k].last || 0)) srs[k] = d.srs[k];
    f.favorites[pid] = Array.from(new Set((f.favorites[pid] || []).concat(d.favorites || [])));
    if (d.adult && !f.adult[pid]) f.adult[pid] = d.adult;
    for (const u in (d.done || {})) if (!f.done[pid + '|' + u]) f.done[pid + '|' + u] = d.done[u];
  }

  /* ---------- push: outbox, profiles, learning ---------- */
  async function flush() {
    if (flushing) return flushing;
    flushing = (async () => {
      const f0 = store.get();
      for (const o of f0.sync.outbox.slice()) {
        try {
          const f = store.get();
          if (o.op === 'profile') await pushProfile(o.pid);
          else {
            const cid = cloudIdOf(f, o.pid); if (!cid) { if (o.op === 'finish') await pushProfile(o.pid); }
            const cid2 = cloudIdOf(store.get(), o.pid); if (!cid2) continue;
            if (o.op === 'finish') {
              const a = o.act;
              await rpc('finish_activity', { p_profile: cid2, p_key: a.key, p_unit: a.unit || null, p_area: a.area || 'kids', p_kind: a.kind, p_title: a.title || '', p_ms: Math.round(a.ms || 0),
                p_meta: { score: a.score, max: a.max, pct: a.pct, correct: a.correct, d: a.d, stars: a.stars, completed: a.completed !== false, points: a.points !== false } });
            } else if (o.op === 'learning') await pushLearning(o.pid, cid2);
          }
          store.mutate(f => { f.sync.outbox = f.sync.outbox.filter(x => x.id !== o.id); });
        } catch (e) {
          if (e.code === 'offline') break;
          lastError = e.code; if (G.FGH_DEBUG) console.log('sync refused', o.op, e.message);
          store.mutate(f => { f.sync.outbox = f.sync.outbox.filter(x => x.id !== o.id); });   // refused by the server: do not retry forever
        }
      }
    })().finally(() => { flushing = null; });
    return flushing;
  }
  async function pushProfile(pid) {
    const p = store.get().profiles.find(x => x.id === pid); if (!p) return;
    let cid = p.cloudId;
    if (!cid) {
      if (p.removed) return;
      cid = await rpc('create_child_profile', { p_family: family.id, p_name: p.name, p_avatar: p.avatar });
      store.mutate(f => { const q = f.profiles.find(x => x.id === pid); if (q) q.cloudId = cid; });
    } else await rows(client.from('player_profiles').update({ display_name: p.name, avatar: p.avatar }).eq('id', cid));
    await rpc('save_profile_settings', { p_profile: cid, p_kind: p.kind, p_age: p.age, p_difficulty: p.diff, p_goal: p.goalMin, p_tts: p.ttsRate });
    if (p.removed) await rpc('archive_profile', { p_profile: cid });
  }
  async function pushLearning(pid, cid) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const f = store.get(), rev = (f.sync.revs && f.sync.revs[pid]) || 0;
      const r = await rpc('save_learning_state', { p_profile: cid, p_data: learningDoc(f, pid), p_rev: rev });
      if (r.ok) { store.mutate(g => { g.sync.revs = g.sync.revs || {}; g.sync.revs[pid] = r.rev; }); return; }
      store.mutate(g => { applyLearning(g, pid, r.data); g.sync.revs = g.sync.revs || {}; g.sync.revs[pid] = r.rev; });
    }
  }
  function enqueue(item) {
    store.mutate(f => {
      if (item.op !== 'finish' && f.sync.outbox.some(o => o.op === item.op && o.pid === item.pid)) return;
      f.sync.outbox.push(Object.assign({ id: LG.newId(), at: Date.now() }, item));
    });
    setTimeout(() => flush().then(() => item.op === 'finish' ? pull() : null).catch(() => {}), 50);
  }

  async function sync() {
    if (!active) return;
    lastError = null;
    await flush();
    await pull();
    lastSync = Date.now();
  }
  /* a parent decision: ask the server, then show the server's state */
  async function decide(fn) { const r = await fn(); await pull(); return r && typeof r === 'object' && 'ok' in r ? r : { ok: true, result: r }; }
  const need = (f, pid) => { const c = cloudIdOf(f, pid); if (!c) throw Object.assign(new Error('offline'), { code: 'offline' }); return c; };

  FGH.cloud = {
    active: () => active,
    start,
    sync,
    status: () => ({ uploaded: store.get().sync.uploaded === (family && family.id), configured: st.configured, signedIn: st.signedIn, familyName: family && family.name, role: family && family.role, lastSync, error: lastError }),
    queueFinish: (pid, act) => enqueue({ op: 'finish', pid, act }),
    queueLearning: pid => enqueue({ op: 'learning', pid }),
    queueProfile: pid => enqueue({ op: 'profile', pid }),
    request: (pid, rewardId, id) => decide(async () => {
      const r = await rpc('request_reward', { p_profile: need(store.get(), pid), p_reward: rewardId, p_request: id });
      return r.ok ? { ok: true, redemption: { id, status: r.status } } : r;
    }),
    cancel: id => decide(() => rpc('cancel_redemption', { p_request: id })),
    approve: id => decide(() => rpc('decide_redemption', { p_request: id, p_approve: true, p_note: null })),
    reject: (id, note) => decide(() => rpc('decide_redemption', { p_request: id, p_approve: false, p_note: note || '' })),
    adjust: (pid, amount, note, key) => decide(() => rpc('adjust_points', { p_profile: need(store.get(), pid), p_amount: Math.round(+amount) || 0, p_note: note, p_key: key })),
    saveReward: r => decide(async () => {
      const f = store.get();
      const id = await rpc('save_reward', { p_family: family.id, p: { id: r.id && /^[0-9a-f-]{36}$/.test(r.id) ? r.id : undefined, name: r.name, icon: r.icon, image: r.image || '', description: r.description || '', cost: +r.cost,
        perChildLimit: r.perChildLimit === '' || r.perChildLimit == null ? '' : String(r.perChildLimit), totalLimit: r.totalLimit === '' || r.totalLimit == null ? '' : String(r.totalLimit),
        startsOn: r.startsOn || '', endsOn: r.endsOn || '', active: r.active !== false, autoApprove: !!r.autoApprove, profileIds: (r.profileIds || []).map(pid => cloudIdOf(f, pid)).filter(Boolean) } });
      return { ok: true, reward: { id } };
    }),
    deleteReward: id => decide(() => rpc('delete_reward', { p_reward: id })),
    saveRules: rules => decide(async () => { await rpc('save_point_rules', { p_family: family.id, p_rules: rules }); return { ok: true }; }),
    async unlock(pin) { const r = await rpc('unlock_parent', { p_family: family.id, p_pin: pin }); if (!r.ok) throw Object.assign(new Error(r.error), { code: r.error }); return r; },
    async setPin(pin) { await rpc('set_parent_pin', { p_family: family.id, p_pin: pin }); },
    /* one-time: profiles, points history, rewards and progress from this device go to the family account */
    async uploadLocal() {
      const f = store.get();
      for (const p of f.profiles.filter(x => !x.removed)) await pushProfile(p.id);
      const g = store.get();
      for (const p of g.profiles.filter(x => !x.removed && x.cloudId)) {
        const entries = LG.txOf(g.ledger, p.id).map(x => ({ key: x.key, kind: x.kind === 'refund' ? 'adjust' : x.kind, amount: x.amount, note: x.note, source: x.source, at: new Date(x.ts).toISOString() }));
        if (entries.length) await rpc('import_points', { p_profile: p.cloudId, p_entries: entries });
        await pushLearning(p.id, p.cloudId);
      }
      for (const r of g.ledger.rewards.filter(x => !x.deleted && !x.uploaded)) { await FGH.cloud.saveReward(r); }
      store.mutate(f => { f.sync.uploaded = family.id; });
      await sync();
    }
  };
})(window);
