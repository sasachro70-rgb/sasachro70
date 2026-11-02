/* KeyKids core: layouts, text handling, curriculum, translations, voice lines. No DOM access, so it can be tested in Node. */
(function (G) {
  'use strict';

  /* ---------- keyboard layouts (physical key code → character) ---------- */
  const FINGER_OF = {};
  [['lp', 'Backquote Digit1 KeyQ KeyA KeyZ IntlBackslash ShiftLeft'], ['lr', 'Digit2 KeyW KeyS KeyX'], ['lm', 'Digit3 KeyE KeyD KeyC'],
   ['li', 'Digit4 Digit5 KeyR KeyT KeyF KeyG KeyV KeyB'], ['ri', 'Digit6 Digit7 KeyY KeyU KeyH KeyJ KeyN KeyM'], ['rm', 'Digit8 KeyI KeyK Comma'],
   ['rr', 'Digit9 KeyO KeyL Period'], ['rp', 'Digit0 Minus Equal KeyP BracketLeft BracketRight Backslash Semicolon Quote Slash ShiftRight'], ['th', 'Space']]
    .forEach(([f, s]) => s.split(' ').forEach(c => { FINGER_OF[c] = f; }));

  const R0 = 'Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal'.split(' ');
  const Q = 'KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP'.split(' ');
  const A = 'KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL'.split(' ');
  const Z = 'KeyZ KeyX KeyC KeyV KeyB KeyN KeyM'.split(' ');
  const LAYOUT_DEFS = {
    en: [
      [R0, '`1234567890-=', '~!@#$%^&*()_+'],
      [Q.concat(['BracketLeft', 'BracketRight', 'Backslash']), 'qwertyuiop[]\\', 'QWERTYUIOP{}|'],
      [A.concat(['Semicolon', 'Quote']), "asdfghjkl;'", 'ASDFGHJKL:"'],
      [Z.concat(['Comma', 'Period', 'Slash']), 'zxcvbnm,./', 'ZXCVBNM<>?']
    ],
    sv: [
      [R0, '§1234567890+´', '½!"#¤%&/()=?`'],
      [Q.concat(['BracketLeft', 'BracketRight']), 'qwertyuiopå¨', 'QWERTYUIOPÅ^'],
      [A.concat(['Semicolon', 'Quote', 'Backslash']), "asdfghjklöä'", 'ASDFGHJKLÖÄ*'],
      [['IntlBackslash'].concat(Z, ['Comma', 'Period', 'Slash']), '<zxcvbnm,.-', '>ZXCVBNM;:_']
    ],
    th: [ /* Thai Kedmanee */
      [R0, '_ๅ/-ภถุึคตจขช', '%+๑๒๓๔ู฿๕๖๗๘๙'],
      [Q.concat(['BracketLeft', 'BracketRight', 'Backslash']), 'ๆไำพะัีรนยบลฃ', '๐"ฎฑธํ๊ณฯญฐ,ฅ'],
      [A.concat(['Semicolon', 'Quote']), 'ฟหกดเ้่าสวง', 'ฤฆฏโฌ็๋ษศซ.'],
      [Z.concat(['Comma', 'Period', 'Slash']), 'ผปแอิืทมใฝ', '()ฉฮฺ์?ฒฬฦ']
    ]
  };
  const LAYOUTS = {};
  for (const lang of Object.keys(LAYOUT_DEFS)) {
    const rows = LAYOUT_DEFS[lang].map(([codes, n, s]) => {
      const N = Array.from(n), S = Array.from(s);
      if (N.length !== codes.length || S.length !== codes.length) throw new Error('Layout row length mismatch: ' + lang + ' ' + n);
      return codes.map((code, i) => ({ code, n: N[i], s: S[i], finger: FINGER_OF[code] }));
    });
    const byCode = {}, byChar = {};
    rows.flat().concat([{ code: 'Space', n: ' ', s: ' ', finger: 'th' }]).forEach(k => {
      byCode[k.code] = k;
      if (!(k.n in byChar)) byChar[k.n] = { code: k.code, shift: false, finger: k.finger };
      if (!(k.s in byChar)) byChar[k.s] = { code: k.code, shift: k.s !== k.n, finger: k.finger };
    });
    LAYOUTS[lang] = { lang, rows, byCode, byChar };
  }

  /* ---------- Unicode text handling ---------- */
  const COMBINING_RE = /[ัิ-ฺ็-๎]/;
  const TONE_RE = /[่-๋]/;
  const ABOVE_BELOW_RE = /[ัิ-ฺ็ํ]/;
  const isCombining = ch => COMBINING_RE.test(ch);

  /* NFC (so Å/Ä/Ö are one key press), Thai tone mark after the vowel it sits on, and ํ+า written as ำ. */
  function normalizeText(s) {
    const cps = Array.from(String(s).normalize('NFC'));
    for (let i = 0; i < cps.length - 1; i++) {
      if (TONE_RE.test(cps[i]) && ABOVE_BELOW_RE.test(cps[i + 1])) { const t = cps[i]; cps[i] = cps[i + 1]; cps[i + 1] = t; i++; }
    }
    return cps.join('').replace(/ํ([่-๋]?)า/g, '$1ำ');
  }

  /* Split into what a child sees as one letter; start/end are code point positions, which is what gets typed. */
  function graphemes(s) {
    let segs;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) segs = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), x => x.segment);
    else segs = s.match(/[^ัิ-ฺ็-๎][ัิ-ฺ็-๎]*|[\s\S]/gu) || [];
    const out = []; let idx = 0;
    for (const g of segs) { const n = Array.from(g).length; out.push({ text: g, start: idx, end: idx + n }); idx += n; }
    return out;
  }

  const displayChar = ch => ch === ' ' ? '␣' : (isCombining(ch) ? '◌' + ch : ch);

  /* What a key press could mean: the character of the practice layout for that physical key, plus what the OS layout produced. */
  function candidates(layout, code, key, shift, caps) {
    const out = [];
    const k = layout.byCode[code];
    if (k) {
      let sh = !!shift;
      if (caps && k.n.toLowerCase() !== k.n.toUpperCase()) sh = !sh;
      out.push(sh ? k.s : k.n);
    }
    if (key && Array.from(key).length === 1) out.push(key.normalize('NFC'));
    return out;
  }

  function matches(expected, cands, lenientCase) {
    for (const c of cands) {
      if (!c) continue;
      if (c === expected) return true;
      if (lenientCase && c.toLowerCase() === expected.toLowerCase()) return true;
    }
    return false;
  }

  const starsFor = acc => acc >= 95 ? 3 : acc >= 80 ? 2 : 1;
  const wpm = (correct, ms) => ms > 0 ? Math.round((correct / 5) / (ms / 60000)) : 0;
  const accuracy = (correct, keys) => keys > 0 ? Math.round(100 * correct / keys) : 100;

  /* ---------- practice content ---------- */
  const CONTENT = {
    en: {
      find: 'asdfjklgh', homeL: 'asdfg', homeR: 'hjkl;', homeAll: 'asdfghjkl;', top: 'qwertyuiop', bottom: 'zxcvbnm,.',
      letters: 'abcdefghijklmnopqrstuvwxyz',
      pictures: [['🍎', 'apple', 'a'], ['🐱', 'cat', 'c'], ['🐶', 'dog', 'd'], ['☀️', 'sun', 's'], ['🐟', 'fish', 'f'], ['🏠', 'house', 'h'],
        ['🐸', 'frog', 'f'], ['🦁', 'lion', 'l'], ['🌙', 'moon', 'm'], ['🦉', 'owl', 'o'], ['🐷', 'pig', 'p'], ['🌈', 'rainbow', 'r'],
        ['🐢', 'turtle', 't'], ['🦓', 'zebra', 'z'], ['🥚', 'egg', 'e'], ['🐝', 'bee', 'b']],
      words1: ['cat', 'dog', 'sun', 'hat', 'red', 'big', 'fun', 'run', 'sit', 'cup', 'bus', 'egg', 'pen', 'box', 'map'],
      words2: ['apple', 'happy', 'green', 'water', 'friend', 'school', 'monkey', 'pizza', 'garden', 'yellow', 'rocket', 'banana'],
      words3: ['Anna', 'Tom', 'London', 'Monday', 'Hello', 'Max', 'Sara', 'Paris', 'Friday', 'Leo', 'Mia', 'Zoo'],
      sent1: ['I like cats.', 'The sun is hot.', 'We can run fast.', 'My dog is big.', 'I love my mom.', 'Look at the moon.', 'Fish can swim.', 'It is fun to play.'],
      sent2: ['I am 7 years old.', 'We have 3 cats!', 'Can you see 10 birds?', 'My room is number 12.', "Wow, it is 5 o'clock!", 'Is it hot? Yes, it is.']
    },
    sv: {
      find: 'asdfjklöä', homeL: 'asdfg', homeR: 'hjklö', homeAll: 'asdfghjklöä', top: 'qwertyuiopå', bottom: 'zxcvbnm,.',
      letters: 'abcdefghijklmnopqrstuvwxyzåäö',
      pictures: [['🍎', 'äpple', 'ä'], ['🐱', 'katt', 'k'], ['🐶', 'hund', 'h'], ['☀️', 'sol', 's'], ['⛵', 'båt', 'b'], ['👁️', 'öga', 'ö'],
        ['🦆', 'anka', 'a'], ['🐟', 'fisk', 'f'], ['🍦', 'glass', 'g'], ['🌙', 'måne', 'm'], ['🐻', 'björn', 'b'], ['🦉', 'uggla', 'u'],
        ['🐍', 'orm', 'o'], ['🐷', 'gris', 'g'], ['🌳', 'träd', 't'], ['🐭', 'mus', 'm']],
      words1: ['katt', 'hund', 'sol', 'båt', 'hus', 'mus', 'öga', 'fisk', 'bil', 'boll', 'glass', 'ko', 'is', 'ost'],
      words2: ['mamma', 'pappa', 'banan', 'skola', 'blomma', 'vatten', 'kompis', 'äpple', 'fjäril', 'jordgubbe', 'snögubbe', 'bröd'],
      words3: ['Anna', 'Sverige', 'Stockholm', 'Måndag', 'Hej', 'Elsa', 'Örebro', 'Åsa', 'Malmö', 'Öland', 'Leo', 'Ella'],
      sent1: ['Jag har en katt.', 'Solen är varm.', 'Vi äter glass.', 'Hunden springer fort.', 'Min båt är röd.', 'Jag gillar äpplen.', 'Fisken simmar.', 'Det är kul att leka.'],
      sent2: ['Jag är 7 år.', 'Vi har 3 katter!', 'Ser du 10 fåglar?', 'Klockan är 5.', 'Är det varmt? Ja!', 'Jag har 2 bröder och 1 syster.']
    },
    th: {
      find: 'ฟหกดเาสว', homeL: 'ฟหกดเ', homeR: '้่าสว', homeAll: 'ฟหกดเ้่าสวง', top: 'ๆไำพะัีรนยบล', bottom: 'ผปแอิืทมใฝ',
      letters: 'ฟหกดเาสวงๆไำพะรนยบลผปแอทมใฝ',
      pictures: [['🐔', 'ไก่', 'ก'], ['🥚', 'ไข่', 'ข'], ['🐃', 'ควาย', 'ค'], ['🐍', 'งู', 'ง'], ['🍽️', 'จาน', 'จ'], ['🐘', 'ช้าง', 'ช'],
        ['🐢', 'เต่า', 'ต'], ['🐟', 'ปลา', 'ป'], ['🐴', 'ม้า', 'ม'], ['🦁', 'สิงโต', 'ส'], ['🏠', 'บ้าน', 'บ'], ['🐭', 'หนู', 'ห'],
        ['🐸', 'กบ', 'ก'], ['🍌', 'กล้วย', 'ก'], ['🐶', 'หมา', 'ห'], ['🌳', 'ต้นไม้', 'ต']],
      words1: ['แม่', 'พ่อ', 'ไก่', 'ปลา', 'แมว', 'หมา', 'น้ำ', 'บ้าน', 'ดี', 'รัก', 'กิน', 'นอน', 'ตา', 'มือ', 'ไป', 'ยิ้ม', 'ช้าง'],
      words2: ['ดอกไม้', 'ผีเสื้อ', 'ทะเล', 'ครอบครัว', 'หนังสือ', 'เพื่อน', 'ขอบคุณ', 'สวัสดี', 'กระต่าย', 'ไอศกรีม', 'ดวงดาว', 'ต้นไม้'],
      words3: ['เด็ก', 'โรงเรียน', 'ภูเขา', 'ฉลาม', 'ธง', 'ฤดู', 'ศาลา', 'ซุป', 'โต๊ะ', 'ญาติ', 'เมฆ', 'ฉัน'],
      sent1: ['แมวกินปลา', 'ฉันรักแม่', 'วันนี้อากาศดี', 'พ่อกับแม่ไปตลาด', 'หมานอนหลับ', 'ไก่กินข้าว', 'น้องยิ้มเก่ง', 'ฝนตกหนัก'],
      sent2: ['เด็กๆ ชอบเล่นฟุตบอล', 'ภูเขาสูงมาก', 'โรงเรียนของฉันใหญ่', 'ฉันชอบกินข้าวผัด', 'ช้างตัวใหญ่มาก', 'ขอบคุณครับ คุณครู']
    }
  };
  for (const lang in CONTENT) {
    const C = CONTENT[lang];
    for (const k in C) {
      if (typeof C[k] === 'string') C[k] = normalizeText(C[k]);
      else C[k] = C[k].map(x => Array.isArray(x) ? x.map(normalizeText) : normalizeText(x));
    }
  }

  /* ---------- curriculum ---------- */
  const LESSONS = [
    { id: 'explore', level: 1, type: 'explore', icon: '✨' },
    { id: 'findkey', level: 1, type: 'findkey', icon: '🔎', set: 'find' },
    { id: 'picture', level: 1, type: 'picture', icon: '🖼️' },
    { id: 'space', level: 1, type: 'space', icon: '🐸' },
    { id: 'balloon1', level: 1, type: 'balloon', icon: '🎈', set: 'find', count: 10, speed: 26, every: 2800 },
    { id: 'homeL', level: 2, type: 'keys', icon: '🤚', set: 'homeL' },
    { id: 'homeR', level: 2, type: 'keys', icon: '✋', set: 'homeR' },
    { id: 'homeAll', level: 2, type: 'keys', icon: '🙌', set: 'homeAll' },
    { id: 'top', level: 2, type: 'keys', icon: '⬆️', set: 'top' },
    { id: 'bottom', level: 2, type: 'keys', icon: '⬇️', set: 'bottom' },
    { id: 'balloon2', level: 2, type: 'balloon', icon: '🎈', set: 'homeAll', count: 14, speed: 38, every: 2100 },
    { id: 'words1', level: 3, type: 'words', icon: '🐱', set: 'words1' },
    { id: 'words2', level: 3, type: 'words', icon: '🌻', set: 'words2' },
    { id: 'words3', level: 3, type: 'words', icon: '🔠', set: 'words3' },
    { id: 'balloon3', level: 3, type: 'balloon', icon: '🚀', set: 'letters', count: 18, speed: 52, every: 1500 },
    { id: 'sent1', level: 4, type: 'sentences', icon: '📖', set: 'sent1' },
    { id: 'sent2', level: 4, type: 'sentences', icon: '🔢', set: 'sent2' },
    { id: 'speed', level: 4, type: 'speed', icon: '⏱️', seconds: 60 }
  ];
  const LESSON_BY_ID = {}; LESSONS.forEach((l, i) => { l.index = i; LESSON_BY_ID[l.id] = l; });

  function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function pickN(pool, n, rnd) { const out = []; for (let i = 0; i < n; i++) { let c; do { c = pool[Math.floor(rnd() * pool.length)]; } while (pool.length > 1 && c === out[out.length - 1]); out.push(c); } return out; }

  function makeItems(lesson, lang, rnd) {
    rnd = rnd || Math.random;
    const C = CONTENT[lang];
    const chars = s => Array.from(s);
    switch (lesson.type) {
      case 'explore': return [];
      case 'findkey': return pickN(chars(C.find), 10, rnd).map(text => ({ text }));
      case 'picture': return shuffle(C.pictures, rnd).slice(0, 8).map(([emoji, word, text]) => ({ text, emoji, word }));
      case 'space': return Array.from({ length: 8 }, () => ({ text: ' ' }));
      case 'keys': {
        const cs = chars(C[lesson.set]); const intro = [];
        cs.forEach(c => intro.push(c, c));
        return intro.concat(pickN(cs, Math.max(10, 26 - intro.length), rnd)).map(text => ({ text }));
      }
      case 'words': return shuffle(C[lesson.set], rnd).slice(0, 10).map(text => ({ text }));
      case 'sentences': return shuffle(C[lesson.set], rnd).slice(0, 6).map(text => ({ text }));
      case 'speed': return shuffle(C.sent1.concat(C.sent2), rnd).map(text => ({ text }));
      case 'balloon': return pickN(chars(C[lesson.set]), lesson.count, rnd).map(text => ({ text }));
    }
    return [];
  }

  /* ---------- adaptive level & plan (prog = { lessonId: { stars, bestAcc, plays } } for one language) ---------- */
  const ageLevel = age => age <= 4 ? 1 : age <= 6 ? 2 : age <= 8 ? 3 : 4;
  function effectiveLevel(prog, age) {
    let lv = ageLevel(age);
    const played = LESSONS.filter(l => l.level === lv && prog[l.id]);
    if (lv > 1 && played.length >= 2 && played.every(l => prog[l.id].bestAcc < 60)) lv--;
    while (lv < 4 && LESSONS.filter(l => l.level === lv).every(l => prog[l.id] && prog[l.id].stars >= 2)) lv++;
    return lv;
  }
  function plan(prog, age) {
    const lv = effectiveLevel(prog, age);
    const order = LESSONS.filter(l => l.level >= lv).concat(LESSONS.filter(l => l.level < lv));
    const open = order.filter(l => !(prog[l.id] && prog[l.id].stars >= 3));
    return (open.length ? open : order).slice(0, 3).map(l => l.id);
  }
  function suggestAfter(lessonId, acc, stars) {
    const i = LESSON_BY_ID[lessonId].index;
    if (acc < 60 && i > 0 && LESSONS[i - 1].type !== 'explore') return { kind: 'down', id: LESSONS[i - 1].id };
    if (stars >= 2 && i < LESSONS.length - 1) return { kind: 'up', id: LESSONS[i + 1].id };
    return { kind: 'again', id: lessonId };
  }

  /* ---------- interface translations ---------- */
  const T = {
    en: {
      tagline: 'Learn to type', uiLang: 'Menu', practiceLang: 'Type in',
      lang_th: 'Thai', lang_sv: 'Swedish', lang_en: 'English',
      whoPlays: 'Who is playing?', yourName: 'Your name', namePh: 'Type your name', age: 'Age', pickAvatar: 'Pick a buddy',
      start: "Let's go!", nameMissing: 'Please type a name first.',
      hello: 'Hi {name}!', nextUp: 'Next up for you:', play: 'Play', streak: '{n}-day streak', ages: 'Ages {a}', level: 'Level',
      recommended: 'Just right for you',
      lv1: 'Keyboard Explorer', lv2: 'Letter Hunter', lv3: 'Word Builder', lv4: 'Sentence Typist',
      l_explore: 'Explore the keys', l_findkey: 'Find the letter', l_picture: 'Picture letters', l_space: 'Hop the frog (Spacebar)',
      l_balloon1: 'Letter balloons', l_homeL: 'Home row: left hand', l_homeR: 'Home row: right hand', l_homeAll: 'Whole home row',
      l_top: 'Top row', l_bottom: 'Bottom row', l_balloon2: 'Home row balloons', l_words1: 'Short words', l_words2: 'Longer words',
      l_words3: 'Capital letters', l_words3_th: 'Words with Shift', l_balloon3: 'Space balloon mission', l_sent1: 'Short sentences',
      l_sent2: 'Numbers & punctuation', l_sent2_th: 'Longer sentences', l_speed: '1-minute speed test',
      pressAny: 'Press any key and see what happens!', pressKey: 'Find this key and press it', whichLetter: 'What letter does “{word}” start with?',
      pressSpace: 'Press the Spacebar to make the frog hop!', popBalloons: 'Press the letter to pop the balloon!',
      typeThis: 'Type this', nextLabel: 'Next:', thenType: 'then type', useFinger: 'Use your {finger}', holdShift: 'Hold Shift with the other hand',
      f_lp: 'left pinky', f_lr: 'left ring finger', f_lm: 'left middle finger', f_li: 'left index finger', f_th: 'thumb',
      f_ri: 'right index finger', f_rm: 'right middle finger', f_rr: 'right ring finger', f_rp: 'right pinky',
      quit: 'Stop', done: 'Done', back: 'Back', timeLeft: 'Time left', capsOn: 'Caps Lock is on',
      noKeyboard: 'No keyboard? Tap the keys on the screen.',
      great: 'Great job!|Awesome!|Super typing!', tryMore: 'Nice try! Practise makes perfect.',
      accuracy: 'Accuracy', speed: 'Speed', wpm: 'WPM', time: 'Time', popped: 'Balloons popped', keysPressed: 'Keys pressed',
      weakKeys: 'Keys to practise:', again: 'Play again', next: 'Next lesson', map: 'All lessons',
      suggestUp: "You're ready for:", suggestDown: "Let's practise:", suggestAgain: 'Try once more:',
      rewards: 'Rewards', badges: 'Badges', stickers: 'Stickers', stickerHint: 'Every 5 stars unlocks a new sticker.', totalStars: 'Stars',
      b_first: 'First lesson', b_ten: '10 lessons', b_perfect: '100% accurate', b_three5: '3 stars five times', b_streak3: '3 days in a row',
      b_poly: 'Three languages', b_speed20: '20 words per minute', b_lv: 'Level {n} complete',
      newBadge: 'New badge: {name}', newSticker: 'New sticker!',
      parents: 'Parents', gateQ: 'Grown-ups only: what is {a} × {b}?', gateWrong: 'Not quite. Try again.', ok: 'OK',
      progress: 'Progress', lessonsDone: 'Lessons done', avgAcc: 'Avg. accuracy', bestWpm: 'Best speed', practiceTime: 'Practice time', min: 'min',
      plan: 'Learning plan', weakAll: 'Keys with the most mistakes', none: 'None yet',
      settings: 'Settings', sfxLbl: 'Sound effects', voiceLbl: 'Buddy voices', musicLbl: 'Background music', volume: 'Volume',
      hintsLbl: 'Show finger hints', breakLbl: 'Break reminder', off: 'Off', everyMin: 'every {n} min',
      profile: 'Profile', save: 'Save', saved: 'Saved',
      reset: 'Reset all progress', resetConfirm: 'Are you sure? Stars, badges and stickers will be erased.', yesReset: 'Yes, reset', cancel: 'Cancel',
      privacy: 'Everything is stored only in this browser. No ads, no accounts, nothing is sent anywhere.',
      voiceMissing: 'No {lang} voice is installed on this device, so the buddies show their words in a speech bubble instead.',
      breakTitle: 'Time for a break!', breakText: 'Stand up, stretch your arms and look far away for a moment.', breakBtn: 'I took a break',
      replay: 'Hear it again', buddyBear: 'Bear', buddyBunny: 'Bunny', buddyCat: 'Kitty', buddyAstro: 'Astronaut',
      spellTitle: 'Spelling Challenge', spellDesc: 'Look at the picture, listen, and spell the word.', chooseCat: 'Choose a topic', chooseLevel: 'Choose a level',
      c_countries: 'Countries & flags', c_objects: 'Everyday things', c_animals: 'Animals', c_food: 'Food & fruit', c_colors: 'Colours & shapes',
      c_nature: 'Nature', c_school: 'School', c_body: 'Body & actions', c_vehicles: 'Vehicles', c_space: 'Space', c_jobs: 'Jobs',
      d1: 'Very easy', d2: 'Easy', d3: 'Medium', d4: 'Hard',
      d1x: 'See the word and copy it', d2x: 'A box for every letter, first letter shown', d3x: 'Spell it yourself from picture and sound', d4x: 'No boxes and only one hint',
      words: '{n} words', listen: 'Listen', hint: 'Hint', check: 'Check', erase: 'Erase', capital: 'Capital: {c}',
      spellWhat: 'What is this? Type the word.', answerWas: 'The right spelling is', typeItNow: 'Now type it once.', capitalTip: 'Remember the capital letter: {w}',
      points: 'Points', continueGame: 'Continue where you stopped', reviewMissed: 'Practise missed words ({n})', reviewTitle: 'Missed words',
      playOther: 'Pick another topic', firstTry: 'Right first time', secondTry: 'Right on 2nd try', shown: 'Practised', spelled: 'Words spelled', missedCount: 'Words to practise',
      noVoiceWord: 'No voice on this device. Use a hint instead.', hintsLeft: '{n} left', switchPlayer: 'Switch player', addChild: 'Add a child',
      b_speller: 'Speller', b_words50: '50 words spelled', b_flags: 'World traveller',
      whoLearns: 'Who is learning today?', addLearner: 'Add a new learner', practisingLevel: 'Practising level {n}', editProfile: 'Edit profile',
      newProfile: 'New learner', nickname: 'Nickname', menuLang: 'Menu language', deleteProfile: 'Delete profile',
      deleteConfirm: 'Delete {name}? All stars, badges and progress for {name} will be erased. This cannot be undone.', yesDelete: 'Yes, delete',
      savedProgress: 'Progress saved', saveFailed: "Progress can't be saved in this browser because storage is blocked. You can keep playing, but progress disappears when the page closes.",
      continueBtn: 'Continue', lastTime: 'Last time: {what}', notFinished: 'not finished', lastSeen: 'Last played {d}', createdOn: 'Created {d}', today: 'today',
      currentLevel: 'Current level', maxLevel: 'Highest level reached', correctLbl: 'Correct', attempts: 'Attempts', topicProgress: 'Spelling topics',
      spellingShort: 'Spelling', profileHint: 'Only a nickname is needed. No birthday, address or contact details.',
      flagTitle: 'Guess the Country by Flag', flagDesc: 'Look at the flag and pick the right country.', flagQ: 'Which country does this flag belong to?',
      fd1x: '2 choices, names read aloud, with a hint', fd2x: '3 choices with clearly different flags', fd3x: '4 choices, some flags look alike, then spell the name', fd4x: '4 look-alike flags, then type the country name',
      timed: 'Challenge: 15 seconds per question', hideChoices: 'Think first: hide the choices until I am ready', showChoices: 'Show the choices', optional: 'optional',
      fiftyHint: 'Hint: remove a wrong answer', flagRight: 'Right! This is the flag of {c}.', flagWrong: 'Nearly! The flag of {c} looks like this. Try again!',
      correctIs: 'The right answer is {c}. Tap it to go on.', timeUp: "Time's up!", afterSpell: 'Practise spelling the name', afterListen: 'Hear how it is said',
      afterLangs: 'See the name in 2 other languages', nextQ: 'Next question', typeCountry: 'Type the country name', questionN: 'Question {i}/{n}',
      b_flagspot: 'Flag spotter', trickyFlags: 'Tricky flags', played: 'Games', spelledOk: 'Spelled ✓', keysHint: 'Tip: you can also press 1–4 on the keyboard.'
    },
    sv: {
      tagline: 'Lär dig skriva på tangentbordet', uiLang: 'Meny', practiceLang: 'Skriv på',
      lang_th: 'Thai', lang_sv: 'Svenska', lang_en: 'Engelska',
      whoPlays: 'Vem spelar?', yourName: 'Ditt namn', namePh: 'Skriv ditt namn', age: 'Ålder', pickAvatar: 'Välj en kompis',
      start: 'Nu kör vi!', nameMissing: 'Skriv ett namn först.',
      hello: 'Hej {name}!', nextUp: 'Nästa för dig:', play: 'Spela', streak: '{n} dagar i rad', ages: '{a} år', level: 'Nivå',
      recommended: 'Lagom för dig',
      lv1: 'Tangentupptäckare', lv2: 'Bokstavsjägare', lv3: 'Ordbyggare', lv4: 'Meningsskrivare',
      l_explore: 'Utforska tangenterna', l_findkey: 'Hitta bokstaven', l_picture: 'Bild och bokstav', l_space: 'Hoppande grodan (mellanslag)',
      l_balloon1: 'Bokstavsballonger', l_homeL: 'Hemraden: vänster hand', l_homeR: 'Hemraden: höger hand', l_homeAll: 'Hela hemraden',
      l_top: 'Översta raden', l_bottom: 'Nedersta raden', l_balloon2: 'Ballonger på hemraden', l_words1: 'Korta ord', l_words2: 'Längre ord',
      l_words3: 'Stora bokstäver', l_words3_th: 'Ord med Shift', l_balloon3: 'Ballonger i rymden', l_sent1: 'Korta meningar',
      l_sent2: 'Siffror och tecken', l_sent2_th: 'Längre meningar', l_speed: 'Fartprov 1 minut',
      pressAny: 'Tryck på en tangent och se vad som händer!', pressKey: 'Hitta tangenten och tryck på den', whichLetter: 'Vilken bokstav börjar ”{word}” med?',
      pressSpace: 'Tryck på mellanslag så hoppar grodan!', popBalloons: 'Tryck på bokstaven så spricker ballongen!',
      typeThis: 'Skriv det här', nextLabel: 'Nästa:', thenType: 'skriv sedan', useFinger: 'Använd {finger}', holdShift: 'Håll in Shift med andra handen',
      f_lp: 'vänster lillfinger', f_lr: 'vänster ringfinger', f_lm: 'vänster långfinger', f_li: 'vänster pekfinger', f_th: 'tummen',
      f_ri: 'höger pekfinger', f_rm: 'höger långfinger', f_rr: 'höger ringfinger', f_rp: 'höger lillfinger',
      quit: 'Sluta', done: 'Klar', back: 'Tillbaka', timeLeft: 'Tid kvar', capsOn: 'Caps Lock är på',
      noKeyboard: 'Inget tangentbord? Tryck på tangenterna på skärmen.',
      great: 'Bra jobbat!|Toppen!|Superbra!', tryMore: 'Bra kämpat! Övning ger färdighet.',
      accuracy: 'Träffsäkerhet', speed: 'Fart', wpm: 'ord/min', time: 'Tid', popped: 'Spräckta ballonger', keysPressed: 'Tangenttryck',
      weakKeys: 'Tangenter att öva på:', again: 'Spela igen', next: 'Nästa lektion', map: 'Alla lektioner',
      suggestUp: 'Du är redo för:', suggestDown: 'Öva lite på:', suggestAgain: 'Försök en gång till:',
      rewards: 'Belöningar', badges: 'Medaljer', stickers: 'Klistermärken', stickerHint: 'Var femte stjärna ger ett nytt klistermärke.', totalStars: 'Stjärnor',
      b_first: 'Första lektionen', b_ten: '10 lektioner', b_perfect: '100 % rätt', b_three5: 'Tre stjärnor fem gånger', b_streak3: '3 dagar i rad',
      b_poly: 'Tre språk', b_speed20: '20 ord per minut', b_lv: 'Nivå {n} klar',
      newBadge: 'Ny medalj: {name}', newSticker: 'Nytt klistermärke!',
      parents: 'Föräldrar', gateQ: 'För vuxna: vad är {a} × {b}?', gateWrong: 'Inte riktigt. Försök igen.', ok: 'OK',
      progress: 'Framsteg', lessonsDone: 'Klara lektioner', avgAcc: 'Snitt träffsäkerhet', bestWpm: 'Bästa fart', practiceTime: 'Övningstid', min: 'min',
      plan: 'Nästa steg', weakAll: 'Tangenter med flest fel', none: 'Inga än',
      settings: 'Inställningar', sfxLbl: 'Ljudeffekter', voiceLbl: 'Kompisarnas röster', musicLbl: 'Bakgrundsmusik', volume: 'Volym',
      hintsLbl: 'Visa vilket finger', breakLbl: 'Pauspåminnelse', off: 'Av', everyMin: 'var {n}:e minut',
      profile: 'Profil', save: 'Spara', saved: 'Sparat',
      reset: 'Nollställ alla framsteg', resetConfirm: 'Är du säker? Stjärnor, medaljer och klistermärken raderas.', yesReset: 'Ja, nollställ', cancel: 'Avbryt',
      privacy: 'Allt sparas bara i den här webbläsaren. Ingen reklam, inga konton, inget skickas någonstans.',
      voiceMissing: 'Det finns ingen röst för {lang} på den här enheten, så kompisarna visar orden i en pratbubbla i stället.',
      breakTitle: 'Dags för en paus!', breakText: 'Res dig, sträck på armarna och titta långt bort en stund.', breakBtn: 'Jag har vilat',
      replay: 'Lyssna igen', buddyBear: 'Björnen', buddyBunny: 'Kaninen', buddyCat: 'Katten', buddyAstro: 'Astronauten',
      spellTitle: 'Stavningsutmaning', spellDesc: 'Titta på bilden, lyssna och stava ordet.', chooseCat: 'Välj ett ämne', chooseLevel: 'Välj nivå',
      c_countries: 'Länder och flaggor', c_objects: 'Saker omkring oss', c_animals: 'Djur', c_food: 'Mat och frukt', c_colors: 'Färger och former',
      c_nature: 'Naturen', c_school: 'Skolan', c_body: 'Kroppen och rörelser', c_vehicles: 'Fordon', c_space: 'Rymden', c_jobs: 'Yrken',
      d1: 'Mycket lätt', d2: 'Lätt', d3: 'Medel', d4: 'Svår',
      d1x: 'Se ordet och skriv av det', d2x: 'En ruta för varje bokstav, första bokstaven visas', d3x: 'Stava själv från bild och ljud', d4x: 'Inga rutor och bara en ledtråd',
      words: '{n} ord', listen: 'Lyssna', hint: 'Ledtråd', check: 'Kolla', erase: 'Sudda', capital: 'Huvudstad: {c}',
      spellWhat: 'Vad är det här? Skriv ordet.', answerWas: 'Rätt stavning är', typeItNow: 'Skriv av det en gång.', capitalTip: 'Kom ihåg stor bokstav: {w}',
      points: 'Poäng', continueGame: 'Fortsätt där du slutade', reviewMissed: 'Öva på missade ord ({n})', reviewTitle: 'Missade ord',
      playOther: 'Välj ett annat ämne', firstTry: 'Rätt direkt', secondTry: 'Rätt andra gången', shown: 'Övat', spelled: 'Stavade ord', missedCount: 'Ord att öva på',
      noVoiceWord: 'Ingen röst på enheten. Använd en ledtråd i stället.', hintsLeft: '{n} kvar', switchPlayer: 'Byt spelare', addChild: 'Lägg till ett barn',
      b_speller: 'Stavare', b_words50: '50 stavade ord', b_flags: 'Världsresenär',
      whoLearns: 'Vem ska lära sig idag?', addLearner: 'Lägg till en ny spelare', practisingLevel: 'Övar på nivå {n}', editProfile: 'Ändra profil',
      newProfile: 'Ny spelare', nickname: 'Smeknamn', menuLang: 'Menyspråk', deleteProfile: 'Ta bort profilen',
      deleteConfirm: 'Ta bort {name}? Alla stjärnor, medaljer och framsteg för {name} raderas. Det går inte att ångra.', yesDelete: 'Ja, ta bort',
      savedProgress: 'Framstegen är sparade', saveFailed: 'Framstegen kan inte sparas i den här webbläsaren eftersom lagring är blockerad. Du kan spela vidare, men framstegen försvinner när sidan stängs.',
      continueBtn: 'Fortsätt', lastTime: 'Senast: {what}', notFinished: 'inte klar', lastSeen: 'Spelade senast {d}', createdOn: 'Skapad {d}', today: 'idag',
      currentLevel: 'Nuvarande nivå', maxLevel: 'Högsta nivå hittills', correctLbl: 'Rätt', attempts: 'Försök', topicProgress: 'Stavningsämnen',
      spellingShort: 'Stavning', profileHint: 'Bara ett smeknamn behövs. Ingen födelsedag, adress eller kontaktuppgift.',
      flagTitle: 'Gissa landet från flaggan', flagDesc: 'Titta på flaggan och välj rätt land.', flagQ: 'Vilket land har den här flaggan?',
      fd1x: '2 val, namnen läses upp, med ledtråd', fd2x: '3 val med tydligt olika flaggor', fd3x: '4 val, några flaggor liknar varandra, sedan stava namnet', fd4x: '4 liknande flaggor, sedan skriva landets namn',
      timed: 'Utmaning: 15 sekunder per fråga', hideChoices: 'Tänk först: göm svaren tills jag är redo', showChoices: 'Visa svaren', optional: 'valfritt',
      fiftyHint: 'Ledtråd: ta bort ett fel svar', flagRight: 'Rätt! Det här är flaggan för {c}.', flagWrong: 'Nästan! Flaggan för {c} ser ut så här. Försök igen!',
      correctIs: 'Rätt svar är {c}. Tryck på det för att gå vidare.', timeUp: 'Tiden är slut!', afterSpell: 'Öva på att stava namnet', afterListen: 'Lyssna på uttalet',
      afterLangs: 'Se namnet på 2 andra språk', nextQ: 'Nästa fråga', typeCountry: 'Skriv landets namn', questionN: 'Fråga {i}/{n}',
      b_flagspot: 'Flaggspanare', trickyFlags: 'Svåra flaggor', played: 'Spel', spelledOk: 'Stavat ✓', keysHint: 'Tips: du kan också trycka 1–4 på tangentbordet.'
    },
    th: {
      tagline: 'ฝึกพิมพ์สนุก ๆ', uiLang: 'เมนู', practiceLang: 'ฝึกพิมพ์',
      lang_th: 'ไทย', lang_sv: 'สวีเดน', lang_en: 'อังกฤษ',
      whoPlays: 'ใครจะเล่นวันนี้?', yourName: 'ชื่อของหนู', namePh: 'พิมพ์ชื่อ', age: 'อายุ', pickAvatar: 'เลือกเพื่อนคู่ใจ',
      start: 'เริ่มเลย!', nameMissing: 'พิมพ์ชื่อก่อนนะ',
      hello: 'สวัสดี {name}!', nextUp: 'บทต่อไปของหนู:', play: 'เล่นเลย', streak: 'ฝึกติดกัน {n} วัน', ages: 'อายุ {a} ปี', level: 'ด่าน',
      recommended: 'เหมาะกับหนู',
      lv1: 'นักสำรวจแป้นพิมพ์', lv2: 'นักล่าตัวอักษร', lv3: 'นักสร้างคำ', lv4: 'นักพิมพ์ประโยค',
      l_explore: 'สำรวจแป้นพิมพ์', l_findkey: 'หาตัวอักษร', l_picture: 'รูปกับตัวอักษร', l_space: 'กบกระโดด (Spacebar)',
      l_balloon1: 'ลูกโป่งตัวอักษร', l_homeL: 'แถวกลาง มือซ้าย', l_homeR: 'แถวกลาง มือขวา', l_homeAll: 'แถวกลางทั้งแถว',
      l_top: 'แถวบน', l_bottom: 'แถวล่าง', l_balloon2: 'ลูกโป่งแถวกลาง', l_words1: 'คำสั้น ๆ', l_words2: 'คำยาวขึ้น',
      l_words3: 'ตัวพิมพ์ใหญ่', l_words3_th: 'คำที่ใช้ Shift', l_balloon3: 'ภารกิจลูกโป่งอวกาศ', l_sent1: 'ประโยคสั้น',
      l_sent2: 'ตัวเลขและเครื่องหมาย', l_sent2_th: 'ประโยคยาวขึ้น', l_speed: 'ทดสอบความเร็ว 1 นาที',
      pressAny: 'กดปุ่มไหนก็ได้ แล้วดูว่าเกิดอะไรขึ้น!', pressKey: 'หาปุ่มนี้แล้วกดเลย', whichLetter: '“{word}” ขึ้นต้นด้วยตัวอะไร?',
      pressSpace: 'กด Spacebar ให้กบกระโดด!', popBalloons: 'กดตัวอักษรบนลูกโป่งให้แตก!',
      typeThis: 'พิมพ์ตามนี้', nextLabel: 'ต่อไป:', thenType: 'แล้วพิมพ์', useFinger: 'ใช้{finger}', holdShift: 'กด Shift ค้างไว้ด้วยมืออีกข้าง',
      f_lp: 'นิ้วก้อยซ้าย', f_lr: 'นิ้วนางซ้าย', f_lm: 'นิ้วกลางซ้าย', f_li: 'นิ้วชี้ซ้าย', f_th: 'นิ้วโป้ง',
      f_ri: 'นิ้วชี้ขวา', f_rm: 'นิ้วกลางขวา', f_rr: 'นิ้วนางขวา', f_rp: 'นิ้วก้อยขวา',
      quit: 'หยุด', done: 'เสร็จแล้ว', back: 'กลับ', timeLeft: 'เวลาที่เหลือ', capsOn: 'Caps Lock เปิดอยู่',
      noKeyboard: 'ไม่มีแป้นพิมพ์? แตะปุ่มบนจอได้เลย',
      great: 'เก่งมาก!|สุดยอด!|เยี่ยมไปเลย!', tryMore: 'พยายามได้ดีมาก! ฝึกอีกนิดจะเก่งขึ้นอีก',
      accuracy: 'ความแม่นยำ', speed: 'ความเร็ว', wpm: 'คำ/นาที', time: 'เวลา', popped: 'ลูกโป่งที่แตก', keysPressed: 'จำนวนครั้งที่กด',
      weakKeys: 'ปุ่มที่ควรฝึกเพิ่ม:', again: 'เล่นอีกครั้ง', next: 'บทต่อไป', map: 'บทเรียนทั้งหมด',
      suggestUp: 'หนูพร้อมแล้วสำหรับ:', suggestDown: 'ลองฝึกบทนี้ก่อนนะ:', suggestAgain: 'ลองอีกสักครั้ง:',
      rewards: 'รางวัล', badges: 'เหรียญรางวัล', stickers: 'สติกเกอร์', stickerHint: 'ทุก 5 ดาว ได้สติกเกอร์ใหม่ 1 แผ่น', totalStars: 'ดาว',
      b_first: 'บทเรียนแรก', b_ten: 'ครบ 10 บทเรียน', b_perfect: 'แม่นยำ 100%', b_three5: 'ได้ 3 ดาว 5 ครั้ง', b_streak3: 'ฝึก 3 วันติด',
      b_poly: 'นักพิมพ์ 3 ภาษา', b_speed20: '20 คำต่อนาที', b_lv: 'ผ่านด่าน {n}',
      newBadge: 'ได้เหรียญใหม่: {name}', newSticker: 'ได้สติกเกอร์ใหม่!',
      parents: 'ผู้ปกครอง', gateQ: 'สำหรับผู้ใหญ่: {a} × {b} เท่ากับเท่าไร?', gateWrong: 'ยังไม่ถูก ลองใหม่อีกครั้ง', ok: 'ตกลง',
      progress: 'ความก้าวหน้า', lessonsDone: 'บทที่ทำแล้ว', avgAcc: 'ความแม่นยำเฉลี่ย', bestWpm: 'ความเร็วสูงสุด', practiceTime: 'เวลาฝึก', min: 'นาที',
      plan: 'แผนการเรียนต่อไป', weakAll: 'ปุ่มที่กดผิดบ่อย', none: 'ยังไม่มี',
      settings: 'ตั้งค่า', sfxLbl: 'เสียงเอฟเฟกต์', voiceLbl: 'เสียงพูดของเพื่อน ๆ', musicLbl: 'เพลงประกอบ', volume: 'ระดับเสียง',
      hintsLbl: 'แสดงนิ้วที่ใช้', breakLbl: 'เตือนให้พัก', off: 'ปิด', everyMin: 'ทุก {n} นาที',
      profile: 'ข้อมูลเด็ก', save: 'บันทึก', saved: 'บันทึกแล้ว',
      reset: 'ล้างความก้าวหน้าทั้งหมด', resetConfirm: 'แน่ใจไหม? ดาว เหรียญ และสติกเกอร์จะถูกลบทั้งหมด', yesReset: 'ใช่ ล้างเลย', cancel: 'ยกเลิก',
      privacy: 'ข้อมูลทั้งหมดเก็บไว้ในเบราว์เซอร์นี้เท่านั้น ไม่มีโฆษณา ไม่มีบัญชี และไม่ส่งข้อมูลออกไปที่ใด',
      voiceMissing: 'เครื่องนี้ไม่มีเสียงพูดภาษา{lang} เพื่อน ๆ จะแสดงคำพูดในกรอบข้อความแทน',
      breakTitle: 'พักสักครู่นะ!', breakText: 'ลุกขึ้นยืดแขนยืดขา แล้วมองไปไกล ๆ สักพัก', breakBtn: 'พักแล้ว!',
      replay: 'ฟังอีกครั้ง', buddyBear: 'หมีน้อย', buddyBunny: 'กระต่ายน้อย', buddyCat: 'แมวน้อย', buddyAstro: 'นักบินอวกาศ',
      spellTitle: 'เกมสะกดคำ', spellDesc: 'ดูภาพ ฟังเสียง แล้วสะกดคำให้ถูก', chooseCat: 'เลือกหมวดคำศัพท์', chooseLevel: 'เลือกระดับ',
      c_countries: 'ประเทศและธงชาติ', c_objects: 'สิ่งของรอบตัว', c_animals: 'สัตว์', c_food: 'อาหารและผลไม้', c_colors: 'สีและรูปร่าง',
      c_nature: 'ธรรมชาติ', c_school: 'โรงเรียน', c_body: 'ร่างกายและการเคลื่อนไหว', c_vehicles: 'ยานพาหนะ', c_space: 'อวกาศ', c_jobs: 'อาชีพ',
      d1: 'ง่ายมาก', d2: 'ง่าย', d3: 'ปานกลาง', d4: 'ยาก',
      d1x: 'ดูคำแล้วพิมพ์ตาม', d2x: 'มีช่องตามจำนวนตัวอักษร บอกตัวแรกให้', d3x: 'สะกดเองจากภาพและเสียง', d4x: 'ไม่มีช่องบอก คำใบ้ได้ครั้งเดียว',
      words: '{n} คำ', listen: 'ฟัง', hint: 'คำใบ้', check: 'ตรวจคำตอบ', erase: 'ลบ', capital: 'เมืองหลวง: {c}',
      spellWhat: 'นี่คืออะไร? พิมพ์ชื่อเลย', answerWas: 'คำที่ถูกคือ', typeItNow: 'พิมพ์ตามอีกครั้งนะ', capitalTip: 'อย่าลืมตัวพิมพ์ใหญ่: {w}',
      points: 'คะแนน', continueGame: 'เล่นต่อจากที่ค้างไว้', reviewMissed: 'ทบทวนคำที่ผิด ({n})', reviewTitle: 'คำที่ต้องทบทวน',
      playOther: 'เลือกหมวดอื่น', firstTry: 'ถูกตั้งแต่ครั้งแรก', secondTry: 'ถูกในครั้งที่ 2', shown: 'ฝึกตามแล้ว', spelled: 'คำที่สะกดแล้ว', missedCount: 'คำที่ต้องทบทวน',
      noVoiceWord: 'เครื่องนี้ไม่มีเสียงพูด ใช้คำใบ้แทนได้', hintsLeft: 'เหลือ {n}', switchPlayer: 'เปลี่ยนผู้เล่น', addChild: 'เพิ่มเด็ก',
      b_speller: 'นักสะกดคำ', b_words50: 'สะกดได้ 50 คำ', b_flags: 'นักเดินทางรอบโลก',
      whoLearns: 'วันนี้ใครจะเรียน?', addLearner: 'เพิ่มผู้เรียนใหม่', practisingLevel: 'กำลังฝึกระดับ {n}', editProfile: 'แก้ไขโปรไฟล์',
      newProfile: 'ผู้เรียนใหม่', nickname: 'ชื่อเล่น', menuLang: 'ภาษาเมนู', deleteProfile: 'ลบโปรไฟล์',
      deleteConfirm: 'ลบ {name} ใช่ไหม? ดาว เหรียญ และความก้าวหน้าทั้งหมดของ {name} จะถูกลบและกู้คืนไม่ได้', yesDelete: 'ใช่ ลบเลย',
      savedProgress: 'บันทึกความก้าวหน้าแล้ว', saveFailed: 'เบราว์เซอร์นี้บันทึกข้อมูลไม่ได้เพราะการจัดเก็บถูกปิดไว้ เล่นต่อได้ แต่ความก้าวหน้าจะหายเมื่อปิดหน้า',
      continueBtn: 'เรียนต่อ', lastTime: 'ครั้งที่แล้ว: {what}', notFinished: 'ยังไม่จบ', lastSeen: 'เข้าเรียนล่าสุด {d}', createdOn: 'สร้างเมื่อ {d}', today: 'วันนี้',
      currentLevel: 'ระดับปัจจุบัน', maxLevel: 'ระดับสูงสุดที่ปลดล็อก', correctLbl: 'ถูก', attempts: 'จำนวนครั้งที่ลอง', topicProgress: 'หมวดคำศัพท์',
      spellingShort: 'สะกดคำ', profileHint: 'ใช้แค่ชื่อเล่นก็พอ ไม่ต้องใส่วันเกิด ที่อยู่ หรือข้อมูลติดต่อ',
      flagTitle: 'ทายประเทศจากธงชาติ', flagDesc: 'ดูธงแล้วเลือกประเทศให้ถูก', flagQ: 'ธงนี้เป็นธงของประเทศอะไร?',
      fd1x: '2 ตัวเลือก มีเสียงอ่านชื่อและคำใบ้', fd2x: '3 ตัวเลือก ธงต่างกันชัดเจน', fd3x: '4 ตัวเลือก มีธงคล้ายกันบ้าง แล้วลองสะกดชื่อ', fd4x: '4 ธงที่คล้ายกัน แล้วพิมพ์ชื่อประเทศ',
      timed: 'โหมดท้าทาย: ข้อละ 15 วินาที', hideChoices: 'คิดก่อน: ซ่อนตัวเลือกจนกว่าจะพร้อม', showChoices: 'แสดงตัวเลือก', optional: 'ไม่บังคับ',
      fiftyHint: 'คำใบ้: ตัดตัวเลือกผิดออก 1 ข้อ', flagRight: 'ถูกต้อง! นี่คือธงชาติ{c}', flagWrong: 'เกือบแล้ว! ธงชาติ{c}หน้าตาแบบนี้ ลองเลือกอีกครั้งนะ',
      correctIs: 'คำตอบที่ถูกคือ {c} แตะเพื่อไปต่อ', timeUp: 'หมดเวลา!', afterSpell: 'ฝึกสะกดชื่อประเทศ', afterListen: 'ฟังการออกเสียง',
      afterLangs: 'ดูชื่อประเทศอีก 2 ภาษา', nextQ: 'เล่นข้อถัดไป', typeCountry: 'พิมพ์ชื่อประเทศ', questionN: 'ข้อ {i}/{n}',
      b_flagspot: 'นักสังเกตธง', trickyFlags: 'ธงที่มักตอบผิด', played: 'จำนวนเกม', spelledOk: 'สะกดแล้ว ✓', keysHint: 'กดเลข 1–4 บนแป้นพิมพ์เพื่อเลือกได้ด้วย'
    }
  };

  /* ---------- voice characters and their lines (one list per language, | separates variants) ---------- */
  const BUDDIES = {
    bear: { face: '🐻', name: 'buddyBear', pitch: 0.8, rate: 0.88 },   /* explains lessons */
    bunny: { face: '🐰', name: 'buddyBunny', pitch: 1.35, rate: 1.0 }, /* invites to play */
    cat: { face: '🐱', name: 'buddyCat', pitch: 1.5, rate: 0.98 },     /* praises */
    astro: { face: '🧑‍🚀', name: 'buddyAstro', pitch: 1.0, rate: 0.92 } /* guides the games */
  };
  const VOICE = {
    th: {
      welcome: ['bunny', 'สวัสดี! วันนี้เรามาเรียนรู้แป้นพิมพ์กันนะ'],
      welcomeName: ['bunny', 'สวัสดี {name}! วันนี้เรามาเรียนรู้แป้นพิมพ์กันนะ'],
      correct: ['cat', 'เยี่ยมมาก! หนูกดปุ่มถูกแล้ว|ถูกต้อง เก่งจัง!|ใช่แล้ว!'],
      wrong: ['bear', 'ลองอีกครั้งนะ หนูทำได้แน่นอน|ไม่เป็นไร ค่อย ๆ หานะ'],
      star: ['cat', 'เก่งมาก! ได้รับดาวเพิ่มอีกหนึ่งดวง'],
      stars: ['cat', 'เก่งมาก! ได้ดาว {n} ดวง'],
      ready: ['bunny', 'พร้อมไปด่านต่อไปหรือยัง?'],
      tryMore: ['bear', 'พยายามได้ดีมาก ฝึกอีกนิดนะ'],
      badge: ['cat', 'ว้าว! ได้เหรียญใหม่แล้ว'],
      breakTime: ['bear', 'พักสายตาสักครู่นะ'],
      intro_explore: ['bear', 'กดปุ่มไหนก็ได้เลย แล้วฟังเสียงนะ'],
      intro_findkey: ['bear', 'ดูตัวอักษรตัวใหญ่ แล้วหาปุ่มนั้นบนแป้นพิมพ์'],
      intro_picture: ['bear', 'ดูรูป แล้วกดตัวอักษรตัวแรกของคำ'],
      intro_space: ['bear', 'ปุ่มยาว ๆ ข้างล่างคือ Spacebar กดเพื่อให้กบกระโดด'],
      intro_keys: ['bear', 'วางนิ้วบนแถวกลาง แล้วพิมพ์ตัวอักษรทีละตัว'],
      intro_words: ['bear', 'พิมพ์คำทีละตัวอักษรนะ'],
      intro_sentences: ['bear', 'พิมพ์ประโยคให้ครบ อย่าลืมเว้นวรรค'],
      intro_speed: ['astro', 'ภารกิจหนึ่งนาที! พิมพ์ให้แม่นที่สุดนะ'],
      intro_balloon: ['astro', 'นักบินอวกาศพร้อม! กดตัวอักษรเพื่อแตกลูกโป่ง'],
      gameCheer: ['astro', 'ยอดเยี่ยม นักบิน!|ไปต่อเลย!'],
      intro_spell: ['bear', 'ดูภาพ ฟังเสียง แล้วพิมพ์ชื่อของมันนะ'],
      almost: ['bear', 'เกือบถูกแล้ว! ลองอีกครั้งนะ'],
      showAnswer: ['bear', 'มาดูคำที่ถูกกัน แล้วพิมพ์ตามนะ'],
      intro_flags: ['astro', 'นักบินอวกาศพาเที่ยวรอบโลก! ดูธงแล้วทายประเทศนะ'],
      flagAsk: ['bunny', 'ธงนี้เป็นธงของประเทศอะไร?'],
      flagNearly: ['bear', 'ไม่เป็นไรนะ ลองดูธงอีกครั้ง'],
      typeCountry: ['bear', 'เก่งมาก! ทีนี้ลองพิมพ์ชื่อประเทศกัน']
    },
    sv: {
      welcome: ['bunny', 'Hej! Nu ska vi lära oss tangentbordet!'],
      welcomeName: ['bunny', 'Hej {name}! Nu ska vi lära oss tangentbordet!'],
      correct: ['cat', 'Jättebra! Du tryckte på rätt tangent!|Rätt! Snyggt!|Precis!'],
      wrong: ['bear', 'Försök igen, du klarar det!|Ingen fara, leta lugnt.'],
      star: ['cat', 'Bra jobbat! Du fick en ny stjärna!'],
      stars: ['cat', 'Bra jobbat! Du fick {n} stjärnor!'],
      ready: ['bunny', 'Är du redo för nästa nivå?'],
      tryMore: ['bear', 'Bra kämpat! Vi övar lite till.'],
      badge: ['cat', 'Wow! Du fick en ny medalj!'],
      breakTime: ['bear', 'Nu vilar vi ögonen en stund.'],
      intro_explore: ['bear', 'Tryck på vilken tangent du vill och lyssna!'],
      intro_findkey: ['bear', 'Titta på den stora bokstaven och hitta tangenten.'],
      intro_picture: ['bear', 'Titta på bilden och tryck på första bokstaven.'],
      intro_space: ['bear', 'Den långa tangenten längst ner är mellanslag. Tryck så hoppar grodan.'],
      intro_keys: ['bear', 'Lägg fingrarna på hemraden och skriv en bokstav i taget.'],
      intro_words: ['bear', 'Skriv ordet en bokstav i taget.'],
      intro_sentences: ['bear', 'Skriv hela meningen. Glöm inte mellanslagen.'],
      intro_speed: ['astro', 'Uppdrag en minut! Skriv så rätt du kan.'],
      intro_balloon: ['astro', 'Astronauten är redo! Tryck på bokstaven för att spräcka ballongen.'],
      gameCheer: ['astro', 'Snyggt, pilot!|Fortsätt så!'],
      intro_spell: ['bear', 'Titta på bilden, lyssna och skriv ordet.'],
      almost: ['bear', 'Nästan rätt! Försök en gång till.'],
      showAnswer: ['bear', 'Här är rätt stavning. Skriv av den.'],
      intro_flags: ['astro', 'Vi flyger jorden runt! Titta på flaggan och gissa landet.'],
      flagAsk: ['bunny', 'Vilket land har den här flaggan?'],
      flagNearly: ['bear', 'Ingen fara, titta på flaggan en gång till.'],
      typeCountry: ['bear', 'Bra! Nu skriver vi landets namn.']
    },
    en: {
      welcome: ['bunny', "Hello! Let's learn the keyboard together!"],
      welcomeName: ['bunny', "Hello {name}! Let's learn the keyboard together!"],
      correct: ['cat', 'Great job! You pressed the right key!|Yes, that is right!|Well done!'],
      wrong: ['bear', 'Try again. You can do it!|No problem, take your time.'],
      star: ['cat', 'Amazing! You earned another star!'],
      stars: ['cat', 'Amazing! You earned {n} stars!'],
      ready: ['bunny', 'Are you ready for the next level?'],
      tryMore: ['bear', "Nice try! Let's practise a little more."],
      badge: ['cat', 'Wow! You got a new badge!'],
      breakTime: ['bear', "Let's rest our eyes for a moment."],
      intro_explore: ['bear', 'Press any key you like and listen!'],
      intro_findkey: ['bear', 'Look at the big letter and find that key.'],
      intro_picture: ['bear', 'Look at the picture and press the first letter.'],
      intro_space: ['bear', 'The long key at the bottom is the Spacebar. Press it to make the frog hop.'],
      intro_keys: ['bear', 'Put your fingers on the home row and type one letter at a time.'],
      intro_words: ['bear', 'Type the word one letter at a time.'],
      intro_sentences: ['bear', "Type the whole sentence. Don't forget the spaces."],
      intro_speed: ['astro', 'One-minute mission! Type as carefully as you can.'],
      intro_balloon: ['astro', 'Astronaut ready! Press the letter to pop the balloon.'],
      gameCheer: ['astro', 'Nice flying, pilot!|Keep going!'],
      intro_spell: ['bear', 'Look at the picture, listen, and type the word.'],
      almost: ['bear', 'Almost! Try one more time.'],
      showAnswer: ['bear', "Here's the right spelling. Type it once."],
      intro_flags: ['astro', "Let's fly around the world! Look at the flag and guess the country."],
      flagAsk: ['bunny', 'Which country does this flag belong to?'],
      flagNearly: ['bear', 'No problem, look at the flag once more.'],
      typeCountry: ['bear', "Well done! Now let's type the country name."]
    }
  };

  /* ---------- Spelling Challenge vocabulary ----------
     Each topic lists [key, picture, Thai, Swedish, English, optional info [th, sv, en]].
     picture is an emoji, or flag:xx / color:#rrggbb / shape:name drawn by the app.
     Add a topic or a word here and it shows up in the game; difficulty comes from word length per language. */
  const VOCAB = {
    countries: { icon: '🌍', items: [
      ['th', 'flag:th', 'ไทย', 'Thailand', 'Thailand', ['กรุงเทพฯ', 'Bangkok', 'Bangkok']],
      ['cn', 'flag:cn', 'จีน', 'Kina', 'China', ['ปักกิ่ง', 'Peking', 'Beijing']],
      ['jp', 'flag:jp', 'ญี่ปุ่น', 'Japan', 'Japan', ['โตเกียว', 'Tokyo', 'Tokyo']],
      ['se', 'flag:se', 'สวีเดน', 'Sverige', 'Sweden', ['สตอกโฮล์ม', 'Stockholm', 'Stockholm']],
      ['no', 'flag:no', 'นอร์เวย์', 'Norge', 'Norway', ['ออสโล', 'Oslo', 'Oslo']],
      ['de', 'flag:de', 'เยอรมนี', 'Tyskland', 'Germany', ['เบอร์ลิน', 'Berlin', 'Berlin']],
      ['fr', 'flag:fr', 'ฝรั่งเศส', 'Frankrike', 'France', ['ปารีส', 'Paris', 'Paris']],
      ['fi', 'flag:fi', 'ฟินแลนด์', 'Finland', 'Finland', ['เฮลซิงกิ', 'Helsingfors', 'Helsinki']],
      ['dk', 'flag:dk', 'เดนมาร์ก', 'Danmark', 'Denmark', ['โคเปนเฮเกน', 'Köpenhamn', 'Copenhagen']],
      ['is', 'flag:is', 'ไอซ์แลนด์', 'Island', 'Iceland', ['เรคยาวิก', 'Reykjavik', 'Reykjavik']],
      ['it', 'flag:it', 'อิตาลี', 'Italien', 'Italy', ['โรม', 'Rom', 'Rome']],
      ['es', 'flag:es', 'สเปน', 'Spanien', 'Spain', ['มาดริด', 'Madrid', 'Madrid']],
      ['nl', 'flag:nl', 'เนเธอร์แลนด์', 'Nederländerna', 'Netherlands', ['อัมสเตอร์ดัม', 'Amsterdam', 'Amsterdam']],
      ['be', 'flag:be', 'เบลเยียม', 'Belgien', 'Belgium', ['บรัสเซลส์', 'Bryssel', 'Brussels']],
      ['at', 'flag:at', 'ออสเตรีย', 'Österrike', 'Austria', ['เวียนนา', 'Wien', 'Vienna']],
      ['ch', 'flag:ch', 'สวิตเซอร์แลนด์', 'Schweiz', 'Switzerland', ['เบิร์น', 'Bern', 'Bern']],
      ['pl', 'flag:pl', 'โปแลนด์', 'Polen', 'Poland', ['วอร์ซอ', 'Warszawa', 'Warsaw']],
      ['ua', 'flag:ua', 'ยูเครน', 'Ukraina', 'Ukraine', ['เคียฟ', 'Kyiv', 'Kyiv']],
      ['ie', 'flag:ie', 'ไอร์แลนด์', 'Irland', 'Ireland', ['ดับลิน', 'Dublin', 'Dublin']],
      ['gr', 'flag:gr', 'กรีซ', 'Grekland', 'Greece', ['เอเธนส์', 'Aten', 'Athens']],
      ['vn', 'flag:vn', 'เวียดนาม', 'Vietnam', 'Vietnam', ['ฮานอย', 'Hanoi', 'Hanoi']],
      ['id', 'flag:id', 'อินโดนีเซีย', 'Indonesien', 'Indonesia', ['จาการ์ตา', 'Jakarta', 'Jakarta']]
    ] },
    objects: { icon: '🏠', items: [
      ['house', '🏠', 'บ้าน', 'hus', 'house'], ['ball', '⚽', 'ลูกบอล', 'boll', 'ball'], ['car', '🚗', 'รถ', 'bil', 'car'],
      ['cup', '☕', 'ถ้วย', 'kopp', 'cup'], ['bed', '🛏️', 'เตียง', 'säng', 'bed'], ['key', '🔑', 'กุญแจ', 'nyckel', 'key'],
      ['chair', '🪑', 'เก้าอี้', 'stol', 'chair'], ['clock', '🕰️', 'นาฬิกา', 'klocka', 'clock'], ['phone', '📱', 'โทรศัพท์', 'telefon', 'phone'],
      ['bag', '🎒', 'กระเป๋า', 'väska', 'bag'], ['shoe', '👟', 'รองเท้า', 'sko', 'shoe'], ['bike', '🚲', 'จักรยาน', 'cykel', 'bicycle'],
      ['computer', '💻', 'คอมพิวเตอร์', 'dator', 'computer'], ['tv', '📺', 'โทรทัศน์', 'tv', 'television'], ['camera', '📷', 'กล้องถ่ายรูป', 'kamera', 'camera'],
      ['teddy', '🧸', 'ตุ๊กตาหมี', 'nalle', 'teddy bear'], ['umbrella', '☂️', 'ร่ม', 'paraply', 'umbrella'], ['toothbrush', '🪥', 'แปรงสีฟัน', 'tandborste', 'toothbrush'],
      ['bulb', '💡', 'หลอดไฟ', 'glödlampa', 'light bulb']
    ] },
    animals: { icon: '🐾', items: [
      ['cat', '🐱', 'แมว', 'katt', 'cat'], ['dog', '🐶', 'หมา', 'hund', 'dog'], ['fish', '🐟', 'ปลา', 'fisk', 'fish'], ['bird', '🐦', 'นก', 'fågel', 'bird'],
      ['cow', '🐄', 'วัว', 'ko', 'cow'], ['pig', '🐷', 'หมู', 'gris', 'pig'], ['rabbit', '🐰', 'กระต่าย', 'kanin', 'rabbit'], ['horse', '🐴', 'ม้า', 'häst', 'horse'],
      ['elephant', '🐘', 'ช้าง', 'elefant', 'elephant'], ['monkey', '🐒', 'ลิง', 'apa', 'monkey'], ['giraffe', '🦒', 'ยีราฟ', 'giraff', 'giraffe'],
      ['turtle', '🐢', 'เต่า', 'sköldpadda', 'turtle'], ['butterfly', '🦋', 'ผีเสื้อ', 'fjäril', 'butterfly'], ['penguin', '🐧', 'เพนกวิน', 'pingvin', 'penguin'],
      ['crocodile', '🐊', 'จระเข้', 'krokodil', 'crocodile'], ['hedgehog', '🦔', 'เม่น', 'igelkott', 'hedgehog'],
      ['hippo', '🦛', 'ฮิปโปโปเตมัส', 'flodhäst', 'hippopotamus'], ['orangutan', '🦧', 'อุรังอุตัง', 'orangutang', 'orangutan']
    ] },
    food: { icon: '🍎', items: [
      ['rice', '🍚', 'ข้าว', 'ris', 'rice'], ['milk', '🥛', 'นม', 'mjölk', 'milk'], ['egg', '🥚', 'ไข่', 'ägg', 'egg'], ['apple', '🍎', 'แอปเปิล', 'äpple', 'apple'],
      ['banana', '🍌', 'กล้วย', 'banan', 'banana'], ['orange', '🍊', 'ส้ม', 'apelsin', 'orange'], ['sandwich', '🥪', 'แซนด์วิช', 'smörgås', 'sandwich'],
      ['watermelon', '🍉', 'แตงโม', 'vattenmelon', 'watermelon'], ['pineapple', '🍍', 'สับปะรด', 'ananas', 'pineapple'],
      ['strawberry', '🍓', 'สตรอว์เบอร์รี', 'jordgubbe', 'strawberry'], ['bread', '🍞', 'ขนมปัง', 'bröd', 'bread'], ['cheese', '🧀', 'ชีส', 'ost', 'cheese'],
      ['grapes', '🍇', 'องุ่น', 'vindruvor', 'grapes'], ['carrot', '🥕', 'แครอท', 'morot', 'carrot'], ['icecream', '🍦', 'ไอศกรีม', 'glass', 'ice cream'],
      ['mango', '🥭', 'มะม่วง', 'mango', 'mango']
    ] },
    colors: { icon: '🎨', items: [
      ['red', 'color:#D8343A', 'สีแดง', 'röd', 'red'], ['blue', 'color:#3E8EDE', 'สีฟ้า', 'blå', 'blue'], ['green', 'color:#2E9B4E', 'สีเขียว', 'grön', 'green'],
      ['yellow', 'color:#F5CF1B', 'สีเหลือง', 'gul', 'yellow'], ['black', 'color:#1E1E1E', 'สีดำ', 'svart', 'black'], ['white', 'color:#FFFFFF', 'สีขาว', 'vit', 'white'],
      ['pink', 'color:#F28DB8', 'สีชมพู', 'rosa', 'pink'], ['orangec', 'color:#F2832B', 'สีส้ม', 'orange', 'orange'], ['purple', 'color:#8A4FC7', 'สีม่วง', 'lila', 'purple'],
      ['brown', 'color:#8B5A2B', 'สีน้ำตาล', 'brun', 'brown'],
      ['circle', 'shape:circle', 'วงกลม', 'cirkel', 'circle'], ['triangle', 'shape:triangle', 'สามเหลี่ยม', 'triangel', 'triangle'],
      ['square', 'shape:square', 'สี่เหลี่ยม', 'kvadrat', 'square'], ['star', 'shape:star', 'ดาว', 'stjärna', 'star'], ['heart', 'shape:heart', 'หัวใจ', 'hjärta', 'heart'],
      ['rectangle', 'shape:rectangle', 'สี่เหลี่ยมผืนผ้า', 'rektangel', 'rectangle'], ['oval', 'shape:oval', 'วงรี', 'oval', 'oval']
    ] },
    nature: { icon: '🌳', items: [
      ['sun', '☀️', 'ดวงอาทิตย์', 'sol', 'sun'], ['moon', '🌙', 'ดวงจันทร์', 'måne', 'moon'], ['tree', '🌳', 'ต้นไม้', 'träd', 'tree'],
      ['flower', '🌸', 'ดอกไม้', 'blomma', 'flower'], ['mountain', '⛰️', 'ภูเขา', 'berg', 'mountain'], ['sea', '🌊', 'ทะเล', 'hav', 'sea'],
      ['rainbow', '🌈', 'สายรุ้ง', 'regnbåge', 'rainbow'], ['cloud', '☁️', 'เมฆ', 'moln', 'cloud'], ['rain', '🌧️', 'ฝน', 'regn', 'rain'],
      ['snow', '❄️', 'หิมะ', 'snö', 'snow'], ['leaf', '🍂', 'ใบไม้', 'löv', 'leaf'], ['island', '🏝️', 'เกาะ', 'ö', 'island'],
      ['volcano', '🌋', 'ภูเขาไฟ', 'vulkan', 'volcano'], ['forest', '🌲', 'ป่า', 'skog', 'forest'], ['summer', '🏖️', 'ฤดูร้อน', 'sommar', 'summer'],
      ['winter', '⛄', 'ฤดูหนาว', 'vinter', 'winter']
    ] },
    school: { icon: '🏫', items: [
      ['book', '📕', 'หนังสือ', 'bok', 'book'], ['pencil', '✏️', 'ดินสอ', 'blyertspenna', 'pencil'], ['pen', '🖊️', 'ปากกา', 'bläckpenna', 'pen'],
      ['scissors', '✂️', 'กรรไกร', 'sax', 'scissors'], ['ruler', '📏', 'ไม้บรรทัด', 'linjal', 'ruler'], ['teacher', '🧑‍🏫', 'ครู', 'lärare', 'teacher'],
      ['student', '🧑‍🎓', 'นักเรียน', 'elev', 'student'], ['school', '🏫', 'โรงเรียน', 'skola', 'school'], ['crayon', '🖍️', 'สีเทียน', 'krita', 'crayon'],
      ['notebook', '📓', 'สมุด', 'skrivbok', 'notebook'], ['map', '🗺️', 'แผนที่', 'karta', 'map'], ['library', '📚', 'ห้องสมุด', 'bibliotek', 'library'],
      ['abacus', '🧮', 'ลูกคิด', 'kulram', 'abacus'], ['backpack', '🎒', 'กระเป๋านักเรียน', 'skolväska', 'school bag']
    ] },
    body: { icon: '✋', items: [
      ['hand', '✋', 'มือ', 'hand', 'hand'], ['eye', '👁️', 'ตา', 'öga', 'eye'], ['ear', '👂', 'หู', 'öra', 'ear'], ['nose', '👃', 'จมูก', 'näsa', 'nose'],
      ['mouth', '👄', 'ปาก', 'mun', 'mouth'], ['foot', '🦶', 'เท้า', 'fot', 'foot'], ['leg', '🦵', 'ขา', 'ben', 'leg'], ['tooth', '🦷', 'ฟัน', 'tand', 'tooth'],
      ['arm', '💪', 'แขน', 'arm', 'arm'], ['walk', '🚶', 'เดิน', 'gå', 'walk'], ['run', '🏃', 'วิ่ง', 'springa', 'run'], ['jump', '🤸', 'กระโดด', 'hoppa', 'jump'],
      ['swim', '🏊', 'ว่ายน้ำ', 'simma', 'swim'], ['dance', '💃', 'เต้น', 'dansa', 'dance'], ['sleep', '😴', 'นอน', 'sova', 'sleep'],
      ['eat', '🍽️', 'กิน', 'äta', 'eat'], ['sing', '🎤', 'ร้องเพลง', 'sjunga', 'sing']
    ] },
    vehicles: { icon: '🚌', items: [
      ['bus', '🚌', 'รถบัส', 'buss', 'bus'], ['train', '🚂', 'รถไฟ', 'tåg', 'train'], ['plane', '✈️', 'เครื่องบิน', 'flygplan', 'airplane'],
      ['boat', '🚢', 'เรือ', 'båt', 'boat'], ['taxi', '🚕', 'แท็กซี่', 'taxi', 'taxi'], ['helicopter', '🚁', 'เฮลิคอปเตอร์', 'helikopter', 'helicopter'],
      ['firetruck', '🚒', 'รถดับเพลิง', 'brandbil', 'fire engine'], ['ambulance', '🚑', 'รถพยาบาล', 'ambulans', 'ambulance'],
      ['motorbike', '🏍️', 'มอเตอร์ไซค์', 'motorcykel', 'motorbike'], ['tractor', '🚜', 'รถแทรกเตอร์', 'traktor', 'tractor'], ['rocket', '🚀', 'จรวด', 'raket', 'rocket']
    ] },
    space: { icon: '🪐', items: [
      ['earth', '🌍', 'โลก', 'jorden', 'Earth'], ['star', '⭐', 'ดาว', 'stjärna', 'star'], ['saturn', '🪐', 'ดาวเสาร์', 'Saturnus', 'Saturn'],
      ['astronaut', '🧑‍🚀', 'นักบินอวกาศ', 'astronaut', 'astronaut'], ['comet', '☄️', 'ดาวหาง', 'komet', 'comet'], ['telescope', '🔭', 'กล้องโทรทรรศน์', 'teleskop', 'telescope'],
      ['satellite', '🛰️', 'ดาวเทียม', 'satellit', 'satellite'], ['galaxy', '🌌', 'กาแล็กซี', 'galax', 'galaxy'], ['moon', '🌕', 'ดวงจันทร์', 'måne', 'moon'],
      ['rocket', '🚀', 'จรวด', 'raket', 'rocket']
    ] },
    jobs: { icon: '🧑‍🚒', items: [
      ['doctor', '🧑‍⚕️', 'หมอ', 'läkare', 'doctor'], ['chef', '🧑‍🍳', 'เชฟ', 'kock', 'chef'], ['firefighter', '🧑‍🚒', 'นักดับเพลิง', 'brandman', 'firefighter'],
      ['police', '👮', 'ตำรวจ', 'polis', 'police officer'], ['farmer', '🧑‍🌾', 'ชาวนา', 'bonde', 'farmer'], ['pilot', '🧑‍✈️', 'นักบิน', 'pilot', 'pilot'],
      ['artist', '🧑‍🎨', 'จิตรกร', 'konstnär', 'artist'], ['mechanic', '🧑‍🔧', 'ช่างซ่อมรถ', 'mekaniker', 'mechanic'], ['scientist', '🧑‍🔬', 'นักวิทยาศาสตร์', 'forskare', 'scientist']
    ] }
  };
  const LANG_COL = { th: 2, sv: 3, en: 4 };
  const VOCAB_INDEX = {};
  for (const cat in VOCAB) {
    VOCAB[cat].items = VOCAB[cat].items.map(r => {
      const it = { id: cat + ':' + r[0], cat, pic: r[1], word: {}, info: null };
      for (const l in LANG_COL) it.word[l] = normalizeText(r[LANG_COL[l]]);
      if (r[5]) it.info = { th: r[5][0], sv: r[5][1], en: r[5][2] };
      VOCAB_INDEX[it.id] = it;
      return it;
    });
  }
  /* difficulty of a word in one language, from how many key presses it takes */
  function wordLevel(word, lang) {
    const n = Array.from(word).length, lim = lang === 'th' ? [4, 7, 9] : [4, 6, 8];
    return n <= lim[0] ? 1 : n <= lim[1] ? 2 : n <= lim[2] ? 3 : 4;
  }
  /* up to n words for a topic and difficulty: exact level first, then the nearest levels */
  function spellPool(cat, lang, d, n, rnd) {
    rnd = rnd || Math.random;
    const items = shuffle(VOCAB[cat].items, rnd);
    items.sort((a, b) => Math.abs(wordLevel(a.word[lang], lang) - d) - Math.abs(wordLevel(b.word[lang], lang) - d));
    return items.slice(0, n || 8).map(it => it.id);
  }
  /* result of a typed answer: exact, right except upper/lower case, or wrong (with per-letter marks) */
  function checkSpelling(typed, target) {
    typed = normalizeText(typed); target = normalizeText(target);
    if (typed === target) return { kind: 'exact' };
    if (typed.toLowerCase() === target.toLowerCase()) return { kind: 'case' };
    const tg = graphemes(target), yg = graphemes(typed);
    return { kind: 'wrong', marks: yg.map((g, i) => !!tg[i] && tg[i].text === g.text) };
  }
  const spellPoints = (d, how, hints) => {
    const base = 10 * d;
    const f = how === 'first' ? 1 : how === 'case' ? 0.8 : how === 'second' ? 0.5 : 0.1;
    return Math.max(1, Math.round(base * f * Math.max(0.3, 1 - 0.2 * hints)));
  };
  const spellStars = (score, max) => { const r = max ? score / max : 0; return r >= 0.85 ? 3 : r >= 0.6 ? 2 : 1; };

  /* ---------- Guess the Country by Flag ----------
     Flags in one group look alike (Nordic crosses, tricolours, red with stars...).
     Easy levels never mix look-alikes; hard levels use them on purpose. */
  const FLAG_GROUPS = [['se', 'no', 'fi', 'dk', 'is'], ['fr', 'it', 'ie', 'be'], ['de', 'be', 'at', 'es'], ['nl', 'th', 'fr', 'at'],
    ['pl', 'id', 'at', 'ua'], ['cn', 'vn'], ['ch', 'dk', 'at'], ['gr', 'fi', 'is', 'se']];
  const FLAG_CODES = VOCAB.countries.items.map(it => it.id.split(':')[1]);
  const FLAG_OPTIONS = { 1: 2, 2: 3, 3: 4, 4: 4 };
  function similarFlags(code) {
    const s = new Set();
    FLAG_GROUPS.forEach(g => { if (g.includes(code)) g.forEach(c => { if (c !== code) s.add(c); }); });
    return Array.from(s);
  }
  function flagQuestion(code, d, rnd) {
    rnd = rnd || Math.random;
    const n = FLAG_OPTIONS[d], sim = shuffle(similarFlags(code), rnd);
    const other = shuffle(FLAG_CODES.filter(c => c !== code && !sim.includes(c)), rnd);
    const opts = [code].concat(sim.slice(0, d <= 2 ? 0 : d === 3 ? 1 : n - 1));
    for (const c of other.concat(sim)) { if (opts.length >= n) break; if (!opts.includes(c)) opts.push(c); }
    return { code, opts: shuffle(opts, rnd) };
  }
  /* a round of n flags; up to half of them are flags the child got wrong before */
  function flagRound(d, missed, n, rnd) {
    rnd = rnd || Math.random; missed = missed || {}; n = n || 8;
    const tricky = shuffle(FLAG_CODES.filter(c => missed[c] > 0), rnd).slice(0, Math.ceil(n / 2));
    const rest = shuffle(FLAG_CODES.filter(c => !tricky.includes(c)), rnd);
    return shuffle(tricky.concat(rest).slice(0, n), rnd).map(c => flagQuestion(c, d, rnd));
  }
  const flagPoints = (d, how) => how === 'first' ? 10 * d : how === 'second' ? 4 * d : 0;

  G.KK = { LAYOUTS, FINGER_OF, CONTENT, LESSONS, LESSON_BY_ID, T, VOICE, BUDDIES, normalizeText, graphemes, displayChar, isCombining,
    candidates, matches, starsFor, wpm, accuracy, makeItems, ageLevel, effectiveLevel, plan, suggestAfter, shuffle,
    VOCAB, VOCAB_INDEX, wordLevel, spellPool, checkSpelling, spellPoints, spellStars,
    FLAG_CODES, FLAG_OPTIONS, similarFlags, flagQuestion, flagRound, flagPoints };
})(typeof window !== 'undefined' ? window : globalThis);
