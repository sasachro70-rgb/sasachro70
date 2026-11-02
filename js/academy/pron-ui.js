/* Pronunciation module in the Thai Academy (Practice → Pronunciation), Phase D.
   Sections from content/pronunciation-th.js: consonants, vowels, tones, final consonants, live and dead syllables, clusters,
   leading consonants, words, sentence rhythm. Every Thai item: Thai text, romanization, explanation (Swedish or Thai), audio
   with ▶ 🐢 1× 🔁 🧩. Listening practice: hear a consonant, hear a tone, short or long vowel.
   academy-ui.js creates it with its helpers: FGH.pronUI.create({ top, explain, pid, render }). */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const TX = {
    sv: { pron: { title: 'Uttal', desc: 'Konsonanter, vokaler, toner, slutljud och rytm – med thailändskt ljud', practice: 'Lyssningsövningar', all: 'Alla',
      start: 'Början', end: 'Slut', none: 'används inte i slutet', old: 'används inte längre', short: 'kort', long: 'lång', special: 'särskild vokal', example: 'Exempel',
      compare: 'Lyssna på alla fem, långsamt', marks: 'Tonmärken', rules: 'Tonregler', cls: 'Klass', liveCol: 'levande, utan tonmärke', deadS: 'död, kort vokal', deadL: 'död, lång vokal',
      letters: 'Bokstäver', sound: 'Ljud', live: 'levande (คำเป็น)', dead: 'död (คำตาย)', trueCl: 'Äkta kluster', falseCl: 'Falska kluster', lead: 'leder',
      qCons: 'Vilken konsonant hör du?', qTone: 'Vilken ton hör du?', qLen: 'Kort eller lång vokal?', playAgain: 'Lyssna igen', next: 'Nästa', right: 'Rätt!', wrong: 'Inte riktigt – rätt svar: {a}',
      score: '{r} av {n} rätt', again: 'Öva igen', back: 'Tillbaka', qn: 'Fråga {i} av {n}', hint: 'Tryck på ▶ för att höra ljudet.',
      qz: { cons: 'Hör konsonanten', tone: 'Hör tonen', len: 'Kort eller lång?' } } },
    en: { pron: { title: 'Pronunciation', desc: 'Consonants, vowels, tones, final sounds and rhythm – with Thai audio', practice: 'Listening practice', all: 'All',
      start: 'Start', end: 'End', none: 'not used at the end', old: 'no longer used', short: 'short', long: 'long', special: 'special vowel', example: 'Example',
      compare: 'Hear all five, slowly', marks: 'Tone marks', rules: 'Tone rules', cls: 'Class', liveCol: 'live, no tone mark', deadS: 'dead, short vowel', deadL: 'dead, long vowel',
      letters: 'Letters', sound: 'Sound', live: 'live (คำเป็น)', dead: 'dead (คำตาย)', trueCl: 'True clusters', falseCl: 'False clusters', lead: 'leads',
      qCons: 'Which consonant do you hear?', qTone: 'Which tone do you hear?', qLen: 'Short or long vowel?', playAgain: 'Listen again', next: 'Next', right: 'Right!', wrong: 'Not quite – right answer: {a}',
      score: '{r} of {n} right', again: 'Practise again', back: 'Back', qn: 'Question {i} of {n}', hint: 'Press ▶ to hear the sound.',
      qz: { cons: 'Hear the consonant', tone: 'Hear the tone', len: 'Short or long?' } } },
    th: { pron: { title: 'การออกเสียง', desc: 'พยัญชนะ สระ วรรณยุกต์ ตัวสะกด และจังหวะ พร้อมเสียงภาษาไทย', practice: 'ฝึกฟัง', all: 'ทั้งหมด',
      start: 'ต้นคำ', end: 'ตัวสะกด', none: 'ไม่ใช้เป็นตัวสะกด', old: 'เลิกใช้แล้ว', short: 'เสียงสั้น', long: 'เสียงยาว', special: 'สระเกิน', example: 'ตัวอย่าง',
      compare: 'ฟังทั้ง ๕ เสียงแบบช้า', marks: 'รูปวรรณยุกต์', rules: 'การผันวรรณยุกต์', cls: 'หมู่', liveCol: 'คำเป็น ไม่มีรูปวรรณยุกต์', deadS: 'คำตาย สระสั้น', deadL: 'คำตาย สระยาว',
      letters: 'พยัญชนะ', sound: 'เสียง', live: 'คำเป็น', dead: 'คำตาย', trueCl: 'คำควบกล้ำแท้', falseCl: 'คำควบกล้ำไม่แท้', lead: 'นำ',
      qCons: 'ได้ยินพยัญชนะตัวไหน', qTone: 'ได้ยินเสียงวรรณยุกต์อะไร', qLen: 'สระเสียงสั้นหรือยาว', playAgain: 'ฟังอีกครั้ง', next: 'ข้อต่อไป', right: 'ถูกต้อง!', wrong: 'ยังไม่ถูก – คำตอบคือ {a}',
      score: 'ถูก {r} จาก {n} ข้อ', again: 'ฝึกอีกครั้ง', back: 'กลับ', qn: 'ข้อ {i} จาก {n}', hint: 'กด ▶ เพื่อฟังเสียง',
      qz: { cons: 'ฟังพยัญชนะ', tone: 'ฟังวรรณยุกต์', len: 'สั้นหรือยาว' } } }
  };
  FGH.FT = FGH.FT || {};
  for (const l in TX) FGH.FT[l] = Object.assign(FGH.FT[l] || {}, TX[l]);

  function shuffle(a, rnd) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((rnd || Math.random)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  /* a listening question (pure, tested): { kind, say, opts: [{ v, label }], answer } */
  function question(kind, D, ex, rnd) {
    rnd = rnd || Math.random;
    if (kind === 'cons') {
      const pool = D.CONS.filter(c => !c.old), a = pool[Math.floor(rnd() * pool.length)];
      const others = shuffle(pool.filter(c => c.t !== a.t), rnd).slice(0, 3);
      return { kind, say: a.say, answer: a.t, opts: shuffle([a].concat(others), rnd).map(c => ({ v: c.t, label: c.t, thai: true })) };
    }
    if (kind === 'tone') {
      const a = D.TONES[Math.floor(rnd() * D.TONES.length)];
      return { kind, say: a.t, answer: a.tone, show: a.t, opts: D.TONES.map(x => ({ v: x.tone, label: D.TONE_NAMES[x.tone][ex] || D.TONE_NAMES[x.tone].sv })) };
    }
    const pairs = D.VOW.filter(v => v.len === 's' || v.len === 'l'), a = pairs[Math.floor(rnd() * pairs.length)];
    return { kind: 'len', say: a.say, answer: a.len, show: a.t, opts: [{ v: 's', label: null }, { v: 'l', label: null }] };
  }

  function create(h) {
    const K = FGH.kit, VUI = FGH.voiceUI, VO = FGH.voice, esc = K.esc, t = (k, v) => K.t('pron.' + k, v);
    const P = { sec: null, quiz: null, cls: 'all' };
    const D = () => (G.FGH_CONTENT && G.FGH_CONTENT.pronunciation) || null;
    const ex = () => (h.explain() === 'th' ? 'th' : 'sv');
    const X = o => (o == null ? '' : typeof o === 'string' ? o : (o[ex()] || o.sv || ''));
    const ctl = (text, o) => VUI.controlsHTML(text, 'th', o);
    const item = (thai, rom, sv, extra, say, o) => '<div class="pr-item"><div class="pr-t" lang="th">' + esc(thai) + '</div>' + (rom ? '<div class="lv-rom">' + esc(rom) + '</div>' : '') +
      (sv ? '<div class="pr-sv">' + esc(sv) + '</div>' : '') + (extra || '') + '<div>' + ctl(say || thai, o) + '</div></div>';
    const svOr = (o, sv) => ex() === 'th' && o && o.th ? o.th : sv;

    function indexHTML() {
      const d = D();
      let s = h.top(t('title'), 'pronBack') + '<div class="games">' + d.SECTIONS.map(x => '<button class="card game" data-act="pronSec" data-v="' + x.id + '"><span class="gicon" aria-hidden="true" lang="th">' + esc(x.icon) + '</span><span class="gt">' + esc(X(x.title)) + '</span></button>').join('') + '</div>';
      s += '<h2 class="sec">🎧 ' + esc(t('practice')) + '</h2><div class="games">' + ['cons', 'tone', 'len'].map(k => '<button class="card game" data-act="pronQuiz" data-v="' + k + '"><span class="gicon" aria-hidden="true">' + ({ cons: 'ก?', tone: '♪?', len: '⇄' })[k] + '</span><span class="gt">' + esc(t('qz.' + k)) + '</span></button>').join('') + '</div>';
      return s;
    }
    function sectionHTML() {
      const d = D(), sec = d.SECTIONS.find(x => x.id === P.sec); if (!sec) return indexHTML();
      let s = h.top(X(sec.title), 'pronBack') + '<section class="card"><p style="margin:0">' + esc(X(sec.intro)) + '</p></section>';
      const CL = c => X(d.CLASS[c]);
      if (sec.id === 'consonants') {
        s += '<div class="row" role="group">' + ['all', 'm', 'h', 'l'].map(c => '<button class="btn small' + (P.cls === c ? ' on' : '') + '" aria-pressed="' + (P.cls === c) + '" data-act="pronCls" data-v="' + c + '">' + esc(c === 'all' ? t('all') : CL(c)) + '</button>').join('') + '</div>';
        s += '<div class="pr-grid">' + d.CONS.filter(c => P.cls === 'all' || c.cls === P.cls).map(c => '<div class="pr-item pr-cons cls-' + c.cls + (c.old ? ' old' : '') + '"><div class="pr-big" lang="th">' + esc(c.t) + '</div><div lang="th">' + esc(c.t + ' ' + c.name) + '</div><div class="lv-rom">' + esc(c.rom) + '</div>' +
          (ex() === 'th' ? '' : '<div class="pr-sv">' + esc(c.sv) + '</div>') + '<div class="pr-meta"><span class="pill">' + esc(CL(c.cls)) + '</span> ' + esc(t('start')) + ': <b>' + esc(c.ini) + '</b> · ' + esc(t('end')) + ': <b>' + esc(c.fin || '–') + '</b>' +
          (c.fin ? '' : ' <small class="muted">(' + esc(t('none')) + ')</small>') + (c.old ? '<br><small class="muted">⚠ ' + esc(t('old')) + '</small>' : '') + '</div><div>' + ctl(c.say, { compact: true, words: false }) + '</div></div>').join('') + '</div>';
      } else if (sec.id === 'vowels') {
        s += '<div class="card tablewrap"><table class="pr-table"><tbody>' + d.VOW.map(v => '<tr><td class="pr-t" lang="th">' + esc(v.t) + '</td><td>' + ctl(v.say, { compact: true, words: false }) + '</td><td><span class="lv-rom">' + esc(v.rom) + '</span><br><span class="pill">' + esc(v.len === 's' ? t('short') : v.len === 'l' ? t('long') : t('special')) + '</span></td>' +
          '<td><b lang="th">' + esc(v.ex) + '</b> <span class="lv-rom">' + esc(v.exRom) + '</span>' + (ex() === 'th' ? '' : '<br>' + esc(v.sv)) + '</td><td>' + ctl(v.ex, { compact: true, words: false }) + '</td></tr>').join('') + '</tbody></table></div>';
      } else if (sec.id === 'tones') {
        s += '<section class="card"><div class="row" style="margin:0 0 .5rem"><button class="btn" data-act="vSay" data-v="' + esc('s\nth\n' + d.TONES.map(x => x.t).join('\n')) + '">🐢 ' + esc(t('compare')) + '</button></div><div class="pr-grid">' +
          d.TONES.map(x => '<div class="pr-item tone-' + x.tone + '"><div class="pr-big" lang="th">' + esc(x.t) + '</div><div><b>' + esc(X(d.TONE_NAMES[x.tone])) + '</b></div><div class="lv-rom">' + esc(x.rom) + '</div>' + (ex() === 'th' ? '' : '<div class="pr-sv">' + esc(x.sv) + '</div>') + '<div>' + ctl(x.t, { compact: true, words: false }) + '</div></div>').join('') + '</div></section>';
        s += '<section class="card"><h3>' + esc(t('marks')) + '</h3><div class="row">' + d.MARKS.map(m => '<span class="pill" lang="th" style="font-size:1.1rem">ก' + esc(m.t) + ' ' + esc(m.name) + ' <small>(' + esc(m.rom) + ')</small></span>').join('') + '</div></section>';
        const tn = k => k ? X(d.TONE_NAMES[k]) : '–';
        s += '<section class="card tablewrap"><h3>' + esc(t('rules')) + '</h3><table class="pr-table"><thead><tr><th>' + esc(t('cls')) + '</th><th>' + esc(t('liveCol')) + '</th><th>' + esc(t('deadS')) + '</th><th>' + esc(t('deadL')) + '</th><th lang="th">่</th><th lang="th">้</th><th lang="th">๊</th><th lang="th">๋</th></tr></thead><tbody>' +
          d.RULES.map(r => '<tr><th>' + esc(CL(r.cls)) + '</th>' + [r.live, r.deadS, r.deadL, r.ek, r.tho, r.tri, r.chat].map(k => '<td>' + esc(tn(k)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></section>';
      } else if (sec.id === 'finals') {
        s += '<div class="pr-grid">' + d.FINALS.map(f => '<div class="pr-item"><div class="pr-t" lang="th">' + esc(f.t) + '</div><div class="lv-rom">' + esc(f.rom) + (f.sound ? ' · -' + esc(f.sound) : '') + '</div>' +
          (f.letters ? '<div lang="th" class="pr-letters">' + esc(f.letters) + '</div>' : '') + '<div>' + esc(t('example')) + ': <b lang="th">' + esc(f.ex) + '</b> <span class="lv-rom">' + esc(f.exRom) + '</span>' + (ex() === 'th' ? '' : ' – ' + esc(f.sv)) + '</div>' +
          (f.note ? '<div class="muted">💡 ' + esc(X(f.note)) + '</div>' : '') + '<div>' + ctl(f.ex, { compact: true, words: false }) + '</div></div>').join('') + '</div>';
      } else if (sec.id === 'livedead') {
        s += '<div class="pr-grid">' + d.LIVEDEAD.map(x => item(x.t, x.rom, ex() === 'th' ? '' : x.sv, '<div><span class="pill ' + (x.live ? 'pr-live' : 'pr-dead') + '">' + esc(x.live ? t('live') : t('dead')) + '</span> <small class="muted">' + esc(X(x.why)) + '</small></div>', x.t, { compact: true, words: false })).join('') + '</div>';
      } else if (sec.id === 'clusters') {
        s += '<h2 class="sec">' + esc(t('trueCl')) + '</h2><div class="pr-grid">' + d.CLUSTERS.map(x => item(x.t, x.rom, ex() === 'th' ? '' : x.sv, '<div><span class="pill" lang="th">' + esc(x.pair) + '</span></div>', x.t, { compact: true, words: false })).join('') + '</div>';
        s += '<h2 class="sec">' + esc(t('falseCl')) + '</h2><div class="pr-grid">' + d.FALSE_CLUSTERS.map(x => item(x.t, x.rom, ex() === 'th' ? '' : x.sv, '<div class="muted">💡 ' + esc(X(x.note)) + '</div>', x.t, { compact: true, words: false })).join('') + '</div>';
      } else if (sec.id === 'leading') {
        s += '<div class="pr-grid">' + d.LEADING.map(x => item(x.t, x.rom, ex() === 'th' ? '' : x.sv, '<div><span class="pill" lang="th">' + esc(x.lead) + ' ' + esc(t('lead')) + '</span></div>', x.t, { compact: true, words: false })).join('') + '</div>';
      } else if (sec.id === 'words') {
        s += '<div class="pr-grid">' + d.WORDS.map(x => item(x.t, x.rom, ex() === 'th' ? '' : x.sv, '', x.t)).join('') + '</div>';
      } else if (sec.id === 'rhythm') {
        s += d.RHYTHM.map(x => '<section class="card pr-rhythm"><div class="pr-t" lang="th">' + x.t.split('|').map(w => '<span class="pr-w">' + esc(w) + '</span>').join('') + '</div><div class="lv-rom">' + esc(x.rom) + '</div>' +
          (ex() === 'th' ? '' : '<div class="pr-sv">' + esc(x.sv) + '</div>') + '<div>' + ctl(x.t) + '</div></section>').join('');
      }
      return s;
    }
    function quizHTML() {
      const Q = P.quiz, d = D();
      let s = h.top(t('qz.' + Q.kind), 'pronBack');
      if (Q.i >= Q.n) return s + '<section class="card stack center"><h2>🎉 ' + esc(t('score', { r: Q.right, n: Q.n })) + '</h2><div class="row" style="justify-content:center"><button class="btn primary" data-act="pronQuiz" data-v="' + Q.kind + '">↻ ' + esc(t('again')) + '</button><button class="btn" data-act="pronBack">' + esc(t('back')) + '</button></div></section>';
      const q = Q.q, label = o => o.label || (o.v === 's' ? t('short') : t('long'));
      s += '<section class="card stack"><p class="muted" style="margin:0">' + esc(t('qn', { i: Q.i + 1, n: Q.n })) + ' · ✓ ' + Q.right + '</p><h2 style="margin:0">' + esc(t(Q.kind === 'cons' ? 'qCons' : Q.kind === 'tone' ? 'qTone' : 'qLen')) + '</h2>' +
        (q.show && Q.kind === 'len' ? '' : '') + '<div class="row" style="margin:0"><button class="btn primary big" data-act="pronPlay">▶ ' + esc(t('playAgain')) + '</button><button class="btn" data-act="pronPlaySlow">🐢</button></div>' +
        '<div class="lv-opts">' + q.opts.map(o => {
          const done = Q.picked != null, isA = o.v === q.answer, mine = Q.picked === o.v;
          return '<button class="lv-opt' + (done && isA ? ' key' : '') + (done && mine && !isA ? ' wrongpick' : '') + '" data-act="pronPick" data-v="' + esc(o.v) + '"' + (done ? ' disabled' : '') + '><span class="lv-ot"' + (o.thai ? ' lang="th" style="font-size:1.8rem"' : '') + '>' + esc(label(o)) + '</span></button>';
        }).join('') + '</div>';
      if (Q.picked != null) {
        const a = q.opts.find(o => o.v === q.answer);
        s += '<p class="lv-result">' + esc(Q.picked === q.answer ? t('right') : t('wrong', { a: label(a) })) + (q.show ? ' <span lang="th">' + esc(q.show) + '</span>' : '') + '</p><div class="row" style="margin:0"><button class="btn primary" data-act="pronNext">' + esc(t('next')) + ' →</button></div>';
      } else s += '<p class="muted" style="margin:0">' + esc(t('hint')) + '</p>';
      return s + '</section>';
    }
    function html() {
      if (!D()) return h.top(t('title'), 'pronBack');
      if (P.quiz) return quizHTML();
      return P.sec ? sectionHTML() : indexHTML();
    }
    const say = (text, rate) => { if (!VO.say(text, 'th', Object.assign({ pid: h.pid() }, rate ? { rate } : {}))) K.toast('🔇 ' + K.t('voice.none', { lang: K.t('lang.th') })); };
    function newQ() { const Q = P.quiz; Q.q = question(Q.kind, D(), ex()); Q.picked = null; setTimeout(() => say(Q.q.say), 150); }
    const acts = {
      pronSec(v) { P.sec = v; P.quiz = null; h.render(); G.scrollTo(0, 0); },
      pronCls(v) { P.cls = v; h.render(); },
      pronBack() { if (P.quiz) P.quiz = null; else if (P.sec) P.sec = null; else return h.leave(); h.render(); G.scrollTo(0, 0); },
      pronQuiz(v) { P.sec = null; P.quiz = { kind: v, i: 0, n: 10, right: 0 }; newQ(); h.render(); },
      pronPlay() { if (P.quiz && P.quiz.q) say(P.quiz.q.say); },
      pronPlaySlow() { if (P.quiz && P.quiz.q) say(P.quiz.q.say, VO.SLOW); },
      pronPick(v) { const Q = P.quiz; if (!Q || Q.picked != null) return; Q.picked = v; if (v === Q.q.answer) Q.right++; h.render(); },
      pronNext() { const Q = P.quiz; if (!Q) return; Q.i++; if (Q.i < Q.n) newQ(); h.render(); }
    };
    return { html, acts, reset() { P.sec = null; P.quiz = null; }, state: () => P };
  }
  FGH.pronUI = { create, question, shuffle };
})(typeof window !== 'undefined' ? window : globalThis);
