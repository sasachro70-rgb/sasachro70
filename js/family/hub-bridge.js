/* Connects the hub's turn-based family games to the family points ledger, and builds the home page sections:
   hero, Kids Zone, Adult Language Academy (languages that really have lessons, "I want to learn" / "My explanation
   language", Continue Learning) and the Parent Zone (its summary only after the parent PIN was entered in this browser tab).
   Reads the family record (fgh.family.v1); it never changes learning data. */
(function (G) {
  'use strict';
  const FGH = G.FGH, F = FGH.family, store = FGH.familyStore, LG = FGH.ledger;
  const AC = () => FGH.academy, SRS = () => FGH.srs, KL = () => FGH.kidsLanguage;
  const TXT = {
    en: {
      playTitle: 'Play Zone', playSub: 'Play, explore and learn through fun activities.', playDesc: 'Family games, KeyKids, quizzes and the reward shop – the Thai Learning Academy is a separate area.', toAcademy: 'Thai Learning Academy', toHome: 'Pasathai home',
      heroTitle: 'Pasathai', heroSub: 'Learn, Play & Grow Together', heroDesc: 'A fun place for children and adults to learn languages, play games and discover new things.',
      startLearning: 'Start Learning', playGames: 'Play Games', exploreLangs: 'Explore Languages',
      kidsZone: 'Kids Zone', kidsZoneSub: 'Kids Learning & Games', kidsArea: 'Kids learning area', kidsAreaD: 'Knowledge games, word guessing, language lessons and the reward shop',
      academy: 'Adult Language Academy', academySub: 'Learn a New Language', lessons: '{n} lessons', levels: 'Levels: {l}', skillsTitle: 'What you practise',
      wantLearn: 'I want to learn', myExplain: 'My explanation language', startCourse: 'Start this course', onlyReal: 'Only languages that have lessons are shown. All lessons are sample content.',
      cont: 'Continue Learning', contNone: 'No lessons started yet on this device.', firstLesson: 'Start Your First Lesson', review: '{n} words to review', noReview: 'No words to review today', last: 'Last: {l}', open: 'Continue', go: 'Open',
      school: 'School', schoolSub: 'Student Mode and classes', studentLogin: 'Student login', studentLoginD: 'Sign in with class code, student ID and PIN – continue where you left off', teacherPage: 'Teacher', teacherPageD: 'Create classes, print login cards, follow every student', parentZone: 'Parent Zone', parentLocked: 'For parents: points, rewards, requests and progress. Needs the parent PIN.', parentOpen: 'Open Parent Dashboard', parentLogin: 'Parent login',
      pending: '{n} reward requests waiting', noPending: 'No reward requests waiting', learners: '{n} learners', totalPts: '{n} points in the family',
      sec: 'Learning & rewards', earned: '{name} +{n} points', kidsCourse: 'Kids language', lang: { sv: 'Swedish', th: 'Thai', en: 'English', es: 'Spanish' },
      skills: { conversation: 'Conversation', vocabulary: 'Vocabulary', grammar: 'Grammar', listening: 'Listening', speaking: 'Speaking', reading: 'Reading', writing: 'Writing', pronunciation: 'Pronunciation', work: 'Work', real: 'Real life' }
    },
    sv: {
      playTitle: 'Play Zone', playSub: 'Spela, upptäck och lär genom roliga aktiviteter.', playDesc: 'Familjespel, KeyKids, frågesporter och belöningsbutiken – Thai Learning Academy är en egen del.', toAcademy: 'Thai Learning Academy', toHome: 'Pasathai start',
      heroTitle: 'Pasathai', heroSub: 'Lär, lek och väx tillsammans', heroDesc: 'En rolig plats där barn och vuxna lär sig språk, spelar spel och upptäcker nya saker.',
      startLearning: 'Börja lära dig', playGames: 'Spela spel', exploreLangs: 'Utforska språk',
      kidsZone: 'Barnens zon', kidsZoneSub: 'Lärande och spel för barn', kidsArea: 'Barnens lärsida', kidsAreaD: 'Kunskapsspel, gissa ordet, språklektioner och belöningar',
      academy: 'Adult Language Academy', academySub: 'Lär dig ett nytt språk', lessons: '{n} lektioner', levels: 'Nivåer: {l}', skillsTitle: 'Det här tränar du',
      wantLearn: 'Jag vill lära mig', myExplain: 'Mitt förklaringsspråk', startCourse: 'Starta kursen', onlyReal: 'Bara språk som har lektioner visas. Alla lektioner är exempelinnehåll.',
      cont: 'Fortsätt lära dig', contNone: 'Inga lektioner påbörjade på den här enheten än.', firstLesson: 'Börja din första lektion', review: '{n} ord att repetera', noReview: 'Inga ord att repetera i dag', last: 'Senast: {l}', open: 'Fortsätt', go: 'Öppna',
      school: 'Skola', schoolSub: 'Elevläge och klasser', studentLogin: 'Elevinloggning', studentLoginD: 'Logga in med klasskod, elev-ID och PIN – fortsätt där du slutade', teacherPage: 'Lärare', teacherPageD: 'Skapa klasser, skriv ut inloggningskort, följ varje elev', parentZone: 'Föräldrazon', parentLocked: 'För föräldrar: poäng, belöningar, önskemål och framsteg. Kräver föräldra-PIN.', parentOpen: 'Öppna föräldrapanelen', parentLogin: 'Föräldrainloggning',
      pending: '{n} önskemål om belöningar väntar', noPending: 'Inga önskemål väntar', learners: '{n} elever', totalPts: '{n} poäng i familjen',
      sec: 'Lärande och belöningar', earned: '{name} +{n} poäng', kidsCourse: 'Barnspråk', lang: { sv: 'svenska', th: 'thailändska', en: 'engelska', es: 'spanska' },
      skills: { conversation: 'Samtal', vocabulary: 'Ordförråd', grammar: 'Grammatik', listening: 'Hörförståelse', speaking: 'Tala', reading: 'Läsa', writing: 'Skriva', pronunciation: 'Uttal', work: 'Jobb', real: 'Vardag' }
    },
    th: {
      playTitle: 'Play Zone', playSub: 'เล่น สำรวจ และเรียนรู้ผ่านกิจกรรมสนุก ๆ', playDesc: 'เกมครอบครัว KeyKids เกมตอบคำถาม และร้านแลกรางวัล – Thai Learning Academy แยกเป็นอีกส่วนหนึ่ง', toAcademy: 'Thai Learning Academy', toHome: 'หน้าแรก Pasathai',
      heroTitle: 'Pasathai', heroSub: 'เรียนรู้ เล่น และเติบโตไปด้วยกัน', heroDesc: 'พื้นที่สนุก ๆ ให้เด็กและผู้ใหญ่ได้เรียนภาษา เล่นเกม และค้นพบสิ่งใหม่',
      startLearning: 'เริ่มเรียน', playGames: 'เล่นเกม', exploreLangs: 'สำรวจภาษา',
      kidsZone: 'โซนเด็ก', kidsZoneSub: 'การเรียนรู้และเกมสำหรับเด็ก', kidsArea: 'พื้นที่เรียนรู้ของเด็ก', kidsAreaD: 'เกมความรู้ ทายคำศัพท์ บทเรียนภาษา และแลกรางวัล',
      academy: 'Adult Language Academy', academySub: 'เรียนภาษาใหม่', lessons: '{n} บทเรียน', levels: 'ระดับ: {l}', skillsTitle: 'ทักษะที่ได้ฝึก',
      wantLearn: 'ฉันอยากเรียน', myExplain: 'ภาษาที่ใช้อธิบาย', startCourse: 'เริ่มคอร์สนี้', onlyReal: 'แสดงเฉพาะภาษาที่มีบทเรียนจริง บทเรียนทั้งหมดเป็นเนื้อหาตัวอย่าง',
      cont: 'เรียนต่อ', contNone: 'ยังไม่ได้เริ่มบทเรียนในเครื่องนี้', firstLesson: 'เริ่มบทเรียนแรก', review: 'คำศัพท์ที่ต้องทบทวน {n} คำ', noReview: 'วันนี้ไม่มีคำต้องทบทวน', last: 'ล่าสุด: {l}', open: 'เรียนต่อ', go: 'เปิด',
      school: 'โรงเรียน', schoolSub: 'โหมดนักเรียนและห้องเรียน', studentLogin: 'นักเรียนเข้าสู่ระบบ', studentLoginD: 'เข้าด้วยรหัสห้อง Student ID และ PIN แล้วเรียนต่อจากครั้งก่อน', teacherPage: 'ครู', teacherPageD: 'สร้างห้องเรียน พิมพ์บัตรเข้าระบบ ติดตามนักเรียนทุกคน', parentZone: 'โซนผู้ปกครอง', parentLocked: 'สำหรับผู้ปกครอง: คะแนน รางวัล คำขอ และความก้าวหน้า ต้องใช้ PIN ผู้ปกครอง', parentOpen: 'เปิดหน้าผู้ปกครอง', parentLogin: 'เข้าสู่ระบบผู้ปกครอง',
      pending: 'มีคำขอแลกรางวัลรออยู่ {n} รายการ', noPending: 'ไม่มีคำขอรออยู่', learners: 'ผู้เรียน {n} คน', totalPts: 'คะแนนรวมของครอบครัว {n}',
      sec: 'เรียนรู้และรางวัล', earned: '{name} +{n} คะแนน', kidsCourse: 'ภาษาสำหรับเด็ก', lang: { sv: 'สวีเดน', th: 'ไทย', en: 'อังกฤษ', es: 'สเปน' },
      skills: { conversation: 'สนทนา', vocabulary: 'คำศัพท์', grammar: 'ไวยากรณ์', listening: 'การฟัง', speaking: 'การพูด', reading: 'การอ่าน', writing: 'การเขียน', pronunciation: 'การออกเสียง', work: 'การทำงาน', real: 'สถานการณ์จริง' }
    }
  };
  const tx = (ui, k, vars) => { let s = k.split('.').reduce((o, p) => (o == null ? o : o[p]), TXT[ui] || TXT.en); if (s == null) s = k.split('.').reduce((o, p) => (o == null ? o : o[p]), TXT.en); s = s == null ? k : s; for (const v in (vars || {})) s = String(s).split('{' + v + '}').join(vars[v]); return s; };
  const FLAG = { sv: '🇸🇪', th: '🇹🇭', en: '🇬🇧', es: '🇪🇸' };
  const pick = { learn: null, explain: null };   // the language choice on the home page (not saved: the academy saves it when the course starts)

  /* ---------- games → points ---------- */
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

  /* ---------- hero ---------- */
  const HERO_SVG = '<svg class="hero-art" viewBox="0 0 320 220" role="img" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="250" cy="52" r="26" class="h-sun"/>' +
    '<rect x="26" y="96" width="120" height="86" rx="16" class="h-card1"/><text x="86" y="150" text-anchor="middle" class="h-txt">Aa</text>' +
    '<rect x="166" y="112" width="118" height="78" rx="16" class="h-card2"/><text x="225" y="161" text-anchor="middle" class="h-txt">กข</text>' +
    '<path d="M60 70 q26 -36 58 -6" class="h-line"/><path d="M196 96 q20 -26 44 -2" class="h-line"/>' +
    '<circle cx="62" cy="48" r="14" class="h-dot1"/><circle cx="140" cy="40" r="10" class="h-dot2"/><circle cx="182" cy="66" r="8" class="h-dot3"/>' +
    '<path d="M110 196 h100" class="h-line"/></g></svg>';
  function heroHTML(ui, esc) {
    return '<section class="hero"><div class="hero-text"><h1>' + esc(tx(ui, 'heroTitle')) + '</h1><p class="hero-sub">' + esc(tx(ui, 'heroSub')) + '</p><p class="hero-desc">' + esc(tx(ui, 'heroDesc')) + '</p>' +
      '<div class="row hero-btns"><a class="btn primary big" href="#zone-learn">📚 ' + esc(tx(ui, 'startLearning')) + '</a><a class="btn big" href="#zone-kids">🎲 ' + esc(tx(ui, 'playGames')) + '</a><a class="btn big" href="#zone-langs">🌍 ' + esc(tx(ui, 'exploreLangs')) + '</a></div></div>' + HERO_SVG + '</section>';
  }

  /* ---------- Play Zone hero (play.html): what this area is, and the way to the other area ---------- */
  function playHeroHTML(ui, esc) {
    return '<section class="hero play-hero"><div class="hero-text"><h1>🎮 ' + esc(tx(ui, 'playTitle')) + '</h1><p class="hero-sub" lang="sv">' + esc(TXT.sv.playSub) + '</p>' +
      (ui === 'sv' ? '' : '<p class="hero-sub">' + esc(tx(ui, 'playSub')) + '</p>') + '<p class="hero-desc">' + esc(tx(ui, 'playDesc')) + '</p>' +
      '<div class="row hero-btns"><a class="btn big" href="index.html">🏠 ' + esc(tx(ui, 'toHome')) + '</a><a class="btn big" href="academy.html?course=th">📚 ' + esc(tx(ui, 'toAcademy')) + ' →</a></div></div></section>';
  }

  /* ---------- Kids Zone: the hub's own game cards plus the kids learning area ---------- */
  function kidsZoneHTML(ui, esc, gameCards) {
    return '<section id="zone-kids" class="zone kids"><h2 class="sec">🧒 ' + esc(tx(ui, 'kidsZone')) + ' <span class="zsub">' + esc(tx(ui, 'kidsZoneSub')) + '</span></h2><div class="games">' +
      '<a class="card game feature" href="kids.html"><span class="gicon" aria-hidden="true">🧠</span><span class="gname">' + esc(tx(ui, 'kidsArea')) + '</span><span class="gdesc">' + esc(tx(ui, 'kidsAreaD')) + '</span><span class="btn primary">▶ ' + esc(tx(ui, 'go')) + '</span></a>' +
      gameCards + '</div></section>';
  }

  /* ---------- languages with real content ---------- */
  function courseList() {
    const a = AC(); if (!a) return [];
    const order = ['sv', 'th', 'en', 'es'];
    return Object.keys(a.courses()).filter(k => a.course(k).lessons && a.course(k).lessons.length && !a.course(k).track).sort((x, y) => order.indexOf(x) - order.indexOf(y)).map(k => a.course(k));
  }
  const cName = (ui, c) => c.name ? (c.name[ui] || c.name.en) : tx(ui, 'lang.' + c.target);
  const lvList = (ui, c) => { const a = AC(); return a.levelIds(c).map(id => { const i = a.levelInfo(c, id); return i ? String(i.n) : id; }).join(' · '); };
  function academyHTML(ui, esc) {
    const list = courseList(); if (!list.length) return '';
    const cur = list.find(c => c.target === pick.learn) || list[0];
    if (!cur.explain.includes(pick.explain)) pick.explain = cur.explain.includes(ui) ? ui : cur.explain[0];
    let h = '<section id="zone-langs" class="zone academy"><h2 class="sec">🎓 ' + esc(tx(ui, 'academy')) + ' <span class="zsub">' + esc(tx(ui, 'academySub')) + '</span></h2><div class="langs">' +
      list.map(c => '<a class="card lang" href="academy.html?course=' + c.target + '&amp;explain=' + (c.explain.includes(ui) ? ui : c.explain[0]) + '"><span class="lflag" aria-hidden="true">' + (FLAG[c.target] || '🌐') + '</span><span class="gname">' + esc(cName(ui, c)) + '</span>' +
        '<span class="gdesc">' + esc(c.desc ? (c.desc[ui] || c.desc.en) : tx(ui, 'lang.' + c.target)) + '</span><span class="muted lmeta">' + esc(tx(ui, 'lessons', { n: c.lessons.length })) + ' · ' + esc(tx(ui, 'levels', { l: lvList(ui, c) })) + ' · ' + c.explain.map(e => esc(tx(ui, 'lang.' + e))).join('/') + '</span></a>').join('') + '</div>';
    const skills = Array.from(new Set([].concat(...list.map(c => [].concat(...c.lessons.map(l => l.skills || []))))));
    h += '<p class="muted" style="margin:.8rem 0 .3rem">' + esc(tx(ui, 'skillsTitle')) + '</p><div class="chips skills">' + skills.map(s => '<span class="chip">' + esc(tx(ui, 'skills.' + s)) + '</span>').join('') + '</div>';
    h += '<div id="zone-learn" class="card picker"><div class="field"><b>' + esc(tx(ui, 'wantLearn')) + '</b><div class="choices">' + list.map(c => '<button class="btn small' + (c === cur ? ' on' : '') + '" data-act="hbLearn" data-v="' + c.target + '" aria-pressed="' + (c === cur) + '">' + (FLAG[c.target] || '') + ' ' + esc(tx(ui, 'lang.' + c.target)) + '</button>').join('') + '</div></div>' +
      '<div class="field"><b>' + esc(tx(ui, 'myExplain')) + '</b><div class="choices">' + cur.explain.map(e => '<button class="btn small' + (e === pick.explain ? ' on' : '') + '" data-act="hbExplain" data-v="' + e + '" aria-pressed="' + (e === pick.explain) + '">' + esc(tx(ui, 'lang.' + e)) + '</button>').join('') + '</div></div>' +
      '<div class="row"><a class="btn primary big" href="academy.html?course=' + cur.target + '&amp;explain=' + pick.explain + '">▶ ' + esc(tx(ui, 'startCourse')) + ': ' + esc(cName(ui, cur)) + '</a></div><p class="muted" style="font-size:.88rem;margin:.4rem 0 0">' + esc(tx(ui, 'onlyReal')) + '</p></div>';
    return h + continueHTML(ui, esc) + '</section>';
  }

  /* ---------- Continue Learning: the latest course of each learner on this device ---------- */
  function progressRows(f, ui) {
    const a = AC(), k = KL(), srs = SRS(), rows = [];
    F.activeProfiles(f).forEach(p => {
      const L = f.learning[p.id] || {};
      for (const key in L) {
        const pr = L[key]; if (!pr || !pr.lessons || !pr.lastAt) continue;
        if (key.startsWith('ac:') && a) {
          const parts = key.split(':'), c = a.course(parts[1]); if (!c) continue;
          const st = a.stats(c, pr, f.srs[p.id] || {}, f.log, p.id), cur = pr.current && a.lessonById(c, pr.current);
          const due = srs ? srs.due(f.srs[p.id] || {}, Date.now(), c.target + ':').length : 0;
          rows.push({ p, at: pr.lastAt, course: cName(ui, c), lesson: cur ? (cur.icon + ' ' + (cur.title[parts[2]] || Object.values(cur.title)[0])) : '', pct: st.pct, due, href: 'academy.html?p=' + encodeURIComponent(p.id) + '&course=' + c.target + '&explain=' + parts[2] });
        } else if (key.startsWith('kl:') && k) {
          const pair = k.pairById(key.slice(3)); if (!pair) continue;
          const all = k.lessons(f.custom).filter(l => k.usable(l, pair).length);
          const done = all.filter(l => pr.lessons[l.id] && pr.lessons[l.id].done).length, cur = pr.current && all.find(l => l.id === pr.current);
          const rv = k.reviewLesson(all, pr.words, pair);
          rows.push({ p, at: pr.lastAt, course: 'kids:' + pair.to, lesson: cur ? cur.icon + ' ' + (cur.name.en || '') : '', curName: cur && cur.name, pct: Math.round(100 * done / Math.max(1, all.length)), due: rv ? rv.items.length : 0, href: 'kids.html?p=' + encodeURIComponent(p.id) + '#lang' });
        }
      }
    });
    return rows.sort((x, y) => y.at - x.at);
  }
  function continueHTML(ui, esc) {
    const f = store.get(), rows = progressRows(f, ui);
    const seen = new Set(), top = rows.filter(r => !seen.has(r.p.id) && seen.add(r.p.id)).slice(0, 4);
    let h = '<div class="card cont"><h3>▶ ' + esc(tx(ui, 'cont')) + '</h3>';
    if (!top.length) return h + '<p class="muted">' + esc(tx(ui, 'contNone')) + '</p><a class="btn primary" href="#zone-learn">🚀 ' + esc(tx(ui, 'firstLesson')) + '</a></div>';
    h += '<div class="contlist">' + top.map(r => {
      const course = r.course.startsWith('kids:') ? tx(ui, 'kidsCourse') + ' · ' + tx(ui, 'lang.' + r.course.slice(5)) : r.course;
      const lesson = r.curName ? (r.curName[ui] || r.curName.en) : r.lesson;
      return '<a class="controw" href="' + esc(r.href) + '"><span class="av" aria-hidden="true">' + esc(r.p.avatar) + '</span><span class="ct"><b>' + esc(r.p.name) + ' · ' + esc(course) + '</b>' +
        (lesson ? '<span class="muted">' + esc(tx(ui, 'last', { l: lesson })) + '</span>' : '') + '<span class="meter" aria-label="' + r.pct + ' %"><span style="width:' + r.pct + '%"></span></span>' +
        '<span class="muted">' + r.pct + ' % · ' + esc(r.due ? tx(ui, 'review', { n: r.due }) : tx(ui, 'noReview')) + '</span></span><span class="btn small primary">' + esc(tx(ui, 'open')) + ' →</span></a>';
    }).join('') + '</div></div>';
    return h;
  }

  /* ---------- School: Student Mode and the teacher page ---------- */
  function schoolHTML(ui, esc) {
    const card = (href, icon, name, desc) => '<a class="card game" href="' + href + '"><span class="gicon" aria-hidden="true">' + icon + '</span><span class="gname">' + esc(name) + '</span><span class="gdesc">' + esc(desc) + '</span><span class="btn">' + esc(tx(ui, 'go')) + ' →</span></a>';
    return '<section id="zone-school" class="zone school"><h2 class="sec">🏫 ' + esc(tx(ui, 'school')) + ' <span class="zsub">' + esc(tx(ui, 'schoolSub')) + '</span></h2><div class="games">' +
      card('student.html', '🎒', tx(ui, 'studentLogin'), tx(ui, 'studentLoginD')) + card('teacher.html', '🧑‍🏫', tx(ui, 'teacherPage'), tx(ui, 'teacherPageD')) + '</div></section>';
  }

  /* ---------- Parent Zone: a locked entrance for everyone; the summary only after the PIN was entered in this tab ---------- */
  const unlocked = () => { try { return +sessionStorage.getItem('fgh.parentUnlock') > Date.now(); } catch (e) { return false; } };
  function parentHTML(ui, esc) {
    let h = '<section id="zone-parent" class="zone parent"><h2 class="sec">🔒 ' + esc(tx(ui, 'parentZone')) + '</h2><div class="card">';
    if (!unlocked()) return h + '<p class="muted" style="margin-top:0">' + esc(tx(ui, 'parentLocked')) + '</p><a class="btn" href="parent.html">🔑 ' + esc(tx(ui, 'parentLogin')) + '</a></div></section>';
    const f = store.get(), pend = (f.ledger.redemptions || []).filter(r => r.status === 'pending').length, ps = F.activeProfiles(f);
    const total = ps.reduce((a, p) => a + LG.balance(f.ledger, p.id), 0);
    return h + '<div class="kpis">' + [[pend ? tx(ui, 'pending', { n: pend }) : tx(ui, 'noPending')], [tx(ui, 'learners', { n: ps.length })], [tx(ui, 'totalPts', { n: total })]].map(([v]) => '<div class="kpi"><div class="l">' + esc(v) + '</div></div>').join('') + '</div>' +
      '<div class="row"><a class="btn primary" href="parent.html">' + esc(tx(ui, 'parentOpen')) + ' →</a></div></div></section>';
  }

  const acts = {
    hbLearn(v, rerender) { pick.learn = v; pick.explain = null; rerender(); },
    hbExplain(v, rerender) { pick.explain = v; rerender(); }
  };
  /* kept for older callers: the learning cards as one section */
  function homeHTML(ui, esc) { return academyHTML(ui, esc) + parentHTML(ui, esc); }
  FGH.hubBridge = { matchFinished, heroHTML, playHeroHTML, kidsZoneHTML, academyHTML, continueHTML, schoolHTML, parentHTML, homeHTML, progressRows, acts, TXT };
})(window);
