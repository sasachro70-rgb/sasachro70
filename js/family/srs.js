/* Spaced repetition for vocabulary (a simplified SM-2). No DOM; tested in Node.
   A card: { key, ease, interval (days), reps, due (ms), lapses, last, added }.
   "Knew it" pushes the next review further out (1 → 3 → interval × ease days); "didn't know" brings the word back the same day
   and makes it a little harder; "not sure" keeps it close. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const DAY = 86400000;
  const newCard = (key, now) => { now = now == null ? Date.now() : now; return { key, ease: 2.5, interval: 0, reps: 0, due: now, lapses: 0, last: 0, added: now }; };
  function grade(card, answer, now) {
    now = now == null ? Date.now() : now;
    const c = Object.assign({}, card);
    if (answer === 'good') {
      c.reps++;
      c.interval = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.round(Math.max(1, c.interval) * c.ease);
      c.ease = Math.min(3, c.ease + 0.1);
      c.due = now + c.interval * DAY;
    } else if (answer === 'hard') {
      c.interval = Math.max(1, Math.round(Math.max(1, c.interval) * 1.2));
      c.ease = Math.max(1.3, c.ease - 0.15);
      c.due = now + c.interval * DAY;
    } else {
      c.reps = 0; c.lapses++; c.interval = 0;
      c.ease = Math.max(1.3, c.ease - 0.2);
      c.due = now + 10 * 60000;
    }
    c.last = now;
    return c;
  }
  /* adds the words of a lesson once; existing cards keep their history */
  function addCards(deck, keys, now) { let n = 0; keys.forEach(k => { if (!deck[k]) { deck[k] = newCard(k, now); n++; } }); return n; }
  /* due today, the hardest first (lowest ease, then most overdue) */
  function due(deck, now, prefix) {
    now = now == null ? Date.now() : now;
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return Object.values(deck).filter(c => (!prefix || c.key.startsWith(prefix)) && c.due <= end.getTime()).sort((a, b) => a.ease - b.ease || a.due - b.due);
  }
  const status = c => !c ? 'new' : c.reps >= 2 ? 'known' : c.lapses > 0 ? 'weak' : 'learning';
  const known = (deck, prefix) => Object.values(deck).filter(c => (!prefix || c.key.startsWith(prefix)) && c.reps >= 1).length;
  FGH.srs = { newCard, grade, addCards, due, status, known, DAY };
})(typeof window !== 'undefined' ? window : globalThis);
