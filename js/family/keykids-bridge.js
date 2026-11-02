/* Connects KeyKids to the family: finished typing lessons, spelling games and flag games become activities in the
   family history and earn points in the shared ledger. KeyKids keeps its own data ("keykids.v1") unchanged;
   its "points" number is only a mirror of the ledger balance so the old screens keep showing the right value. */
(function (G) {
  'use strict';
  const FGH = G.FGH, F = FGH.family, store = FGH.familyStore, LG = FGH.ledger;
  const TXT = {
    th: { earned: '+{n} คะแนน', games: 'เกมความรู้', langs: 'เรียนภาษา', shop: 'แลกรางวัล', bannerT: 'เกมความรู้และภาษา', bannerD: 'ทายคำศัพท์ ความรู้รอบตัว คณิตศาสตร์ และเรียนภาษาสเปน สวีเดน อังกฤษ ไทย', open: 'ไปเลย' },
    sv: { earned: '+{n} poäng', games: 'Kunskapsspel', langs: 'Språk', shop: 'Belöningar', bannerT: 'Kunskap och språk', bannerD: 'Gissa ordet, allmänbildning, matte och lär dig spanska, svenska, engelska eller thai', open: 'Öppna' },
    en: { earned: '+{n} points', games: 'Knowledge games', langs: 'Languages', shop: 'Reward shop', bannerT: 'Knowledge & languages', bannerD: 'Word guessing, general knowledge, maths and learning Spanish, Swedish, English or Thai', open: 'Open' }
  };
  const MAX_MS = 60 * 60000;

  G.FGH_BOOT = function (app) {
    const X = app.EXT;
    const tx = (k, v) => { const s = (TXT[app.uiLang()] || TXT.en)[k]; return v ? s.replace('{n}', v.n) : s; };
    const fam = () => store.get();
    const famId = kk => { const f = fam(); const p = F.byLink(f, 'keykids', kk.id); return p ? p.id : ''; };

    X.onActivity = function (a) {
      const kk = app.S(); if (!kk) return;
      const key = 'kk:' + a.kind + ':' + (a.sid || app.uid());
      const unit = a.kind === 'typing' ? 'kk-typing:' + a.lang + ':' + a.lesson
        : a.kind === 'spell' ? (a.review ? null : 'kk-spell:' + a.lang + ':' + a.cat + ':' + a.d) : 'kk-flags:' + a.lang + ':' + a.d;
      const title = a.kind === 'typing' ? 'KeyKids ⌨️ ' + a.lesson : a.kind === 'spell' ? 'KeyKids 🔤 ' + (a.review ? 'review' : a.cat) : 'KeyKids 🚩 flags ' + a.d;
      const res = store.mutate(f => {
        const p = F.profileForLegacy(f, 'keykids', kk);
        const r = F.finishActivity(f, p.id, { key, unit, area: 'keykids', kind: a.kind, title, ms: Math.min(MAX_MS, a.ms || 0),
          score: a.kind === 'typing' ? a.acc : a.score, max: a.kind === 'typing' ? 100 : a.max, pct: a.kind === 'typing' ? a.acc : (a.max ? 100 * a.score / a.max : null),
          stars: a.stars, d: a.d });
        r.balance = LG.balance(f.ledger, p.id);
        return r;
      });
      if (res && res.ok) {
        kk.points = res.balance;   // mirror for the KeyKids screens
        const n = (res.award.amount || 0) + (res.award.bonus || 0);
        if (n > 0) setTimeout(() => app.toast('⭐ ' + tx('earned', { n })), 400);
      }
    };
    X.onPick = function (kk) {
      /* keep the mirror right when a child opens KeyKids after earning or spending elsewhere */
      const f = fam(); const p = F.byLink(f, 'keykids', kk.id);
      if (p) kk.points = LG.balance(f.ledger, p.id);
      return false;
    };
    const link = (hash, icon, label) => { const kk = app.S(); const id = kk ? famId(kk) : ''; return '<a class="cap small" href="kids.html' + (id ? '?p=' + encodeURIComponent(id) : '') + hash + '">' + icon + ' ' + app.esc(label) + '</a>'; };
    X.navButtons = () => link('#games', '🧠', tx('games')) + link('#lang', '🌍', tx('langs')) + link('#shop', '🎁', tx('shop'));
    X.homeBanners = () => {
      const kk = app.S(); const id = kk ? famId(kk) : '';
      return '<section class="banner"><div class="bi" aria-hidden="true">🧠</div><div><h2>' + app.esc(tx('bannerT')) + '</h2><p>' + app.esc(tx('bannerD')) + '</p></div>' +
        '<a class="cap primary go" href="kids.html' + (id ? '?p=' + encodeURIComponent(id) : '') + '">▶ ' + app.esc(tx('open')) + '</a></section>';
    };
    fam();   // links existing KeyKids learners on first use
  };
})(window);
