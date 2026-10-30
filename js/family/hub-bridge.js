/* Connects the hub's turn-based family games to the family points ledger and adds the learning areas to the hub home. */
(function (G) {
  'use strict';
  const FGH = G.FGH, F = FGH.family, store = FGH.familyStore;
  const TXT = {
    th: { sec: 'เรียนรู้และรางวัล', kids: 'โซนเด็ก', kidsD: 'เกมความรู้ ทายคำศัพท์ เรียนภาษา และแลกรางวัล', adult: 'Adult Language Academy', adultD: 'เรียนภาษาจริงจังตามระดับ CEFR A1–C1 พร้อมทบทวนคำศัพท์', parent: 'ผู้ปกครอง', parentD: 'คะแนน รางวัล ประวัติ และความก้าวหน้าของทุกคน', open: 'เปิด', earned: '{name} +{n} คะแนน' },
    sv: { sec: 'Lärande och belöningar', kids: 'Barnens sida', kidsD: 'Kunskapsspel, gissa ordet, språk och belöningar', adult: 'Adult Language Academy', adultD: 'Lär dig ett språk på riktigt, CEFR A1–C1, med repetition av ord', parent: 'Föräldrar', parentD: 'Poäng, belöningar, historik och allas framsteg', open: 'Öppna', earned: '{name} +{n} poäng' },
    en: { sec: 'Learning & rewards', kids: 'Kids area', kidsD: 'Knowledge games, word guessing, languages and the reward shop', adult: 'Adult Language Academy', adultD: 'Serious language courses, CEFR A1–C1, with word review', parent: 'Parents', parentD: 'Points, rewards, history and everyone\'s progress', open: 'Open', earned: '{name} +{n} points' }
  };
  const tx = (ui, k) => (TXT[ui] || TXT.en)[k];

  function matchFinished(entry, players, toast) {
    if (!entry || !Array.isArray(entry.players)) return;
    const out = store.mutate(f => entry.players.map(row => {
      const hp = (players || []).find(p => p.id === row.id) || row;
      const p = F.profileForLegacy(f, 'hub', { id: row.id, name: hp.name, avatar: hp.avatar, age: 4 + 2 * (row.level || 1) });
      const r = F.finishActivity(f, p.id, { key: 'hub:' + entry.id + ':' + row.id, area: 'hub', kind: 'quiz', title: '🎲 ' + entry.gameId,
        correct: row.correct, d: row.level, score: row.score, max: row.answered * 15, pct: row.answered ? 100 * row.correct / row.answered : 0,
        ms: (row.avgMs || 0) * (row.answered || 0) });
      return { name: p.name, n: r.ok ? (r.award.amount || 0) + (r.award.bonus || 0) : 0 };
    }));
    const ui = (store.get().ui) || (document.documentElement.lang || 'en');
    out.filter(x => x.n > 0).forEach((x, i) => setTimeout(() => toast && toast('⭐ ' + tx(ui, 'earned').replace('{name}', x.name).replace('{n}', x.n)), 600 + i * 700));
  }
  function homeHTML(ui, esc) {
    const card = (href, icon, name, desc) => '<a class="card game" href="' + href + '"><span class="gicon" aria-hidden="true">' + icon + '</span><span class="gname">' + esc(name) + '</span><span class="gdesc">' + esc(desc) + '</span><span class="btn">' + esc(tx(ui, 'open')) + ' →</span></a>';
    return '<h2 class="sec">' + esc(tx(ui, 'sec')) + '</h2><div class="games">' +
      card('kids.html', '🧠', tx(ui, 'kids'), tx(ui, 'kidsD')) + card('academy.html', '🎓', tx(ui, 'adult'), tx(ui, 'adultD')) + card('parent.html', '🔒', tx(ui, 'parent'), tx(ui, 'parentD')) + '</div>';
  }
  FGH.hubBridge = { matchFinished, homeHTML };
})(window);
