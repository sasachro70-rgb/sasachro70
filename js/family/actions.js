/* Everything that changes points, rewards or progress goes through here.
   Without a family account the change is made on this device (js/family/ledger.js).
   With a family account (js/family/cloud-sync.js) the server decides: rewards and parent decisions wait for its answer,
   finished activities are sent with their idempotency key and re-sent until the server has them. */
(function (G) {
  'use strict';
  const FGH = G.FGH, LG = FGH.ledger, F = FGH.family, store = FGH.familyStore;
  const cloud = () => (FGH.cloud && FGH.cloud.active()) ? FGH.cloud : null;
  const done = r => Promise.resolve(r);

  FGH.actions = {
    /* a finished game or lesson: the result is shown at once; the server may later correct the points (its caps win) */
    finish(pid, act) {
      const r = store.mutate(f => F.finishActivity(f, pid, act));
      const c = cloud(); if (c && r && r.ok) c.queueFinish(pid, act, r.entry);
      return r;
    },
    recordLesson(pid, courseKey, lessonId, pct, ms, passPct) {
      const r = store.mutate(f => F.recordLesson(f, pid, courseKey, lessonId, pct, ms, passPct));
      const c = cloud(); if (c) c.queueLearning(pid);
      return r;
    },
    updateLearning(pid, fn) {
      const r = store.mutate(f => fn(f));
      const c = cloud(); if (c) c.queueLearning(pid);
      return r;
    },
    request(pid, rewardId) {
      const c = cloud(); const id = LG.newId();
      if (c) return c.request(pid, rewardId, id);
      return done(store.mutate(f => LG.request(f.ledger, pid, rewardId, Date.now(), id)));
    },
    cancel(pid, redemptionId) {
      const c = cloud(); if (c) return c.cancel(redemptionId);
      return done(store.mutate(f => LG.cancel(f.ledger, redemptionId, pid, Date.now())));
    },
    approve(redemptionId) {
      const c = cloud(); if (c) return c.approve(redemptionId);
      return done(store.mutate(f => LG.approve(f.ledger, redemptionId, Date.now(), 'parent')));
    },
    reject(redemptionId, note) {
      const c = cloud(); if (c) return c.reject(redemptionId, note);
      return done(store.mutate(f => LG.reject(f.ledger, redemptionId, Date.now(), note)));
    },
    adjust(pid, amount, note) {
      const c = cloud(); const key = 'adj:' + LG.newId();
      if (c) return c.adjust(pid, amount, note, key);
      return done(store.mutate(f => LG.adjust(f.ledger, pid, amount, note, Date.now(), key)));
    },
    saveReward(r) {
      const c = cloud(); if (c) return c.saveReward(r);
      return done(store.mutate(f => LG.saveReward(f.ledger, r)));
    },
    deleteReward(id) {
      const c = cloud(); if (c) return c.deleteReward(id);
      return done(store.mutate(f => LG.deleteReward(f.ledger, id)));
    },
    saveRules(rules) {
      const clean = {};
      for (const k in LG.DEFAULT_RULES) { const v = +rules[k]; if (isFinite(v) && v >= 0) clean[k] = k === 'repeatFactor' ? Math.min(1, v) : Math.round(Math.min(10000, v)); }
      const c = cloud(); if (c) return c.saveRules(clean);
      return done(store.mutate(f => { f.ledger.rules = Object.assign({}, LG.DEFAULT_RULES, clean); return { ok: true }; }));
    },
    saveProfile(id, data) {
      const r = store.mutate(f => id ? F.updateProfile(f, id, data) : F.addProfile(f, data));
      const c = cloud(); if (c && r.ok) c.queueProfile(r.profile.id);
      return done(r);
    },
    removeProfile(id) {
      const r = store.mutate(f => F.removeProfile(f, id));
      const c = cloud(); if (c && r.ok) c.queueProfile(id);
      return done(r);
    }
  };
})(window);
