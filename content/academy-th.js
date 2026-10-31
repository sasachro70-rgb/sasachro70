/* Adult Language Academy – "Lär dig thailändska": Thai for Swedish speakers (explanations in Swedish).
   SAMPLE CONTENT: 14 lessons over Level 1–5 to show the course; not a complete curriculum.
   Extra fields compared with content/academy-sv.js:
     course.levels  – the course's own levels (Level 1–5) instead of CEFR
     rom            – romanization on every Thai word and line. The course uses RTGS (the Royal Thai General System),
                      Thailand's official system; it does not show tones or vowel length. The tone lesson shows tones
                      with accents (a mid, à low, â falling, á high, ǎ rising).
     lesson.tones   – the tone lesson's data: name, tone shape for the pitch graph (Chao tone numbers 1 = low … 5 = high),
                      an example word. The graph is a schematic of the standard descriptions, not a measurement.
     order answers  – Thai is written without spaces between words, so tiles are marked with "|".
   Thai is written with spaces only where Thai puts them (between phrases and sentences). */
(function (G) {
  'use strict';
  const C = G.FGH_CONTENT = G.FGH_CONTENT || {};
  const A = C.academy = C.academy || { courses: {} };
  const d = (who, t, rom, sv) => ({ who, t, rom, tr: { sv } });
  const w = (t, rom, sv, note) => ({ t, rom, tr: { sv }, note: note ? { sv: note } : null });
  const S = sv => ({ sv });

  A.courses.th = {
    target: 'th', explain: ['sv'], sample: true, passPct: 70, romanization: 'RTGS',
    name: { sv: 'Lär dig thailändska', en: 'Lär dig thailändska', th: 'Lär dig thailändska' },   // the course's menu name, the same in every menu language
    desc: { sv: 'Lär dig thailändska från grunden med svenska som förklaringsspråk.', en: 'Thai for Swedish speakers: learn Thai from the beginning, with Swedish as the explanation language.', th: 'ภาษาไทยสำหรับผู้พูดภาษาสวีเดน: เรียนตั้งแต่พื้นฐาน มีคำอธิบายเป็นภาษาสวีเดน' },
    levels: [
      { id: 'L1', n: 1, name: { sv: 'Nybörjare', en: 'Beginner', th: 'เริ่มต้น' } },
      { id: 'L2', n: 2, name: { sv: 'Grundläggande thailändska', en: 'Basic Thai', th: 'ภาษาไทยพื้นฐาน' } },
      { id: 'L3', n: 3, name: { sv: 'Vardagliga samtal', en: 'Everyday conversation', th: 'บทสนทนาในชีวิตประจำวัน' } },
      { id: 'L4', n: 4, name: { sv: 'Praktisk thailändska', en: 'Practical Thai', th: 'ภาษาไทยใช้งานจริง' } },
      { id: 'L5', n: 5, name: { sv: 'Avancerad kommunikation', en: 'Advanced communication', th: 'การสื่อสารขั้นสูง' } }
    ],
    lessons: [
      /* ================= Level 1 – Nybörjare ================= */
      { id: 'th-1-intro', level: 'L1', icon: '🇹🇭', skills: ['pronunciation', 'reading', 'vocabulary'],
        title: S('Introduktion till thailändska'), goal: S('Förstå hur thailändskan fungerar: toner, skrift och artighetsord'),
        dialogue: [
          d('A', 'สวัสดีครับ', 'sawatdi khrap', 'Hej! (sagt av en man)'),
          d('B', 'สวัสดีค่ะ', 'sawatdi kha', 'Hej! (sagt av en kvinna)'),
          d('A', 'คุณพูดภาษาไทยได้ไหมครับ', 'khun phut phasa thai dai mai khrap', 'Kan du tala thailändska?'),
          d('B', 'ได้นิดหน่อยค่ะ', 'dai nit noi kha', 'Lite grann.')
        ],
        vocab: [w('สวัสดี', 'sawatdi', 'Hej', 'En vanlig hälsning på thailändska. Den används också när man säger hej då.'),
          w('ภาษาไทย', 'phasa thai', 'thailändska (språket)'), w('ประเทศไทย', 'prathet thai', 'Thailand'), w('คนไทย', 'khon thai', 'thailändare'),
          w('สวีเดน', 'sawiden', 'Sverige', 'ประเทศสวีเดน (prathet sawiden) = landet Sverige, คนสวีเดน (khon sawiden) = svensk.'),
          w('พูด', 'phut', 'tala, prata'), w('ได้', 'dai', 'kan, kunna', 'Står efter verbet: พูดได้ (phut dai) = kan tala.'), w('นิดหน่อย', 'nit noi', 'lite grann')],
        grammar: { title: S('Så fungerar thailändskan'),
          body: S('Thailändska är ett tonspråk med fem toner. Samma stavelse med olika ton kan betyda helt olika saker, därför finns en egen lektion om tonerna.\n\nSkriften har 44 konsonanter och många vokaltecken. Vokaler kan skrivas före, efter, över eller under konsonanten. Mellan orden skrivs inga mellanslag – ett mellanslag markerar i stället slutet på en fras eller mening.\n\nVerb böjs inte: ไป (pai) betyder både går, åker och gick. Tid visas med ord som พรุ่งนี้ (phrung ni, i morgon) eller แล้ว (laeo, redan). Det finns inga artiklar och ingen plural.\n\nArtighetsord: män avslutar meningar med ครับ (khrap), kvinnor med ค่ะ (kha) i påståenden och คะ (kha) i frågor.\n\nRomanisering: kursen använder RTGS, Thailands officiella system. Den visar inte toner eller vokallängd, så lyssna alltid på rösten.') },
        exercises: [
          { type: 'mc', prompt: 'สวัสดี', rom: 'sawatdi', q: S('Vad betyder ordet?'), opts: ['Hej', 'Tack', 'Förlåt'], a: 0 },
          { type: 'mc', prompt: 'ครับ', rom: 'khrap', q: S('Vem använder ordet i slutet av en mening?'), opts: ['Män', 'Kvinnor, i frågor', 'Bara barn'], a: 0 },
          { type: 'listen', say: 'ภาษาไทย', opts: ['thailändska (språket)', 'Thailand', 'thailändare'], a: 0 },
          { type: 'mc', prompt: 'Toner', noSay: true, q: S('Hur många toner har thailändskan?'), opts: ['5', '3', '9'], a: 0 },
          { type: 'order', answer: 'คุณ|พูด|ภาษาไทย|ได้|ไหม', rom: 'khun phut phasa thai dai mai', tr: S('Kan du tala thailändska?') }
        ] },

      { id: 'th-1-consonants', level: 'L1', icon: 'ก', skills: ['reading', 'pronunciation'],
        title: S('Konsonanter'), goal: S('Känna igen vanliga konsonanter, deras namn och de tre konsonantklasserna'),
        dialogue: [
          d('', 'ก ไก่', 'ko kai', 'k – som i ”höna”'), d('', 'ข ไข่', 'kho khai', 'kh – som i ”ägg”'), d('', 'ค ควาย', 'kho khwai', 'kh – som i ”vattenbuffel”'),
          d('', 'ง งู', 'ngo ngu', 'ng – som i ”orm”'), d('', 'จ จาน', 'cho chan', 'ch – som i ”tallrik”'), d('', 'ด เด็ก', 'do dek', 'd – som i ”barn”'),
          d('', 'ต เต่า', 'to tao', 't – som i ”sköldpadda”'), d('', 'บ ใบไม้', 'bo baimai', 'b – som i ”löv”'), d('', 'ป ปลา', 'po pla', 'p – som i ”fisk”'),
          d('', 'ม ม้า', 'mo ma', 'm – som i ”häst”'), d('', 'ส เสือ', 'so suea', 's – som i ”tiger”'), d('', 'อ อ่าง', 'o ang', 'bär en vokal (hörs inte själv) – som i ”balja”')
        ],
        vocab: [w('ไก่', 'kai', 'höna, kyckling', 'k utan luftpust. Jämför ไข่ (khai, ägg) med luftpust.'), w('ไข่', 'khai', 'ägg'), w('ควาย', 'khwai', 'vattenbuffel'),
          w('ปลา', 'pla', 'fisk'), w('ม้า', 'ma', 'häst'), w('เสือ', 'suea', 'tiger'), w('เด็ก', 'dek', 'barn'), w('งู', 'ngu', 'orm', 'ng i början av ett ord – samma ljud som i svenska ”sång”.')],
        grammar: { title: S('Tre konsonantklasser och luftpusten'),
          body: S('Thailändskans 44 konsonanter delas in i tre klasser: mellanklass (9 st: ก จ ฎ ฏ ด ต บ ป อ), högklass (11 st: ข ฃ ฉ ฐ ถ ผ ฝ ศ ษ ส ห) och lågklass (de övriga 24). Klassen avgör, tillsammans med tonmärket, vilken ton stavelsen får.\n\nVarje konsonant har ett namn med ett exempelord: ก ไก่ (ko kai) betyder ”k som i höna”.\n\nLuftpust: ก ต ป (k, t, p) uttalas utan luftpust, ungefär som i svenska ”sko”, ”sten” och ”spel”. ข/ค, ถ/ท och ผ/พ (kh, th, ph) uttalas med luftpust, som svenskans k, t och p i början av ett ord (”kul”, ”tak”, ”par”). th uttalas inte som engelska ”th”, och ph inte som f.\n\nI slutet av en stavelse ändras uttalet ofta: ด, ต, ท, ถ och ส blir ett kort t (รถ rot = bil, บาท bat = baht), och บ, ป, พ blir ett kort p.'),
          table: [['Klass', 'Konsonanter (urval)', 'Uttal i början'], ['Mellanklass', 'ก จ ด ต บ ป อ', 'k, ch, d, t, b, p, –'], ['Högklass', 'ข ฉ ถ ผ ฝ ส ห', 'kh, ch, th, ph, f, s, h'], ['Lågklass', 'ค ช ท พ ฟ ซ ง น ม ย ร ล ว', 'kh, ch, th, ph, f, s, ng, n, m, y, r, l, w']] },
        exercises: [
          { type: 'mc', prompt: 'ไก่', rom: 'kai', q: S('Vad betyder ordet?'), opts: ['höna', 'ägg', 'fisk'], a: 0 },
          { type: 'mc', prompt: 'ป', say: 'ป ปลา', q: S('Hur uttalas konsonanten i början av ett ord?'), opts: ['p utan luftpust', 'ph med luftpust', 'b'], a: 0 },
          { type: 'mc', prompt: 'ส', say: 'ส เสือ', q: S('Vilken klass tillhör ส?'), opts: ['Högklass', 'Mellanklass', 'Lågklass'], a: 0 },
          { type: 'listen', say: 'ไข่', opts: ['ägg', 'höna', 'häst'], a: 0 },
          { type: 'listen', say: 'ปลา', opts: ['fisk', 'orm', 'tiger'], a: 0 }
        ] },

      { id: 'th-1-vowels', level: 'L1', icon: 'อา', skills: ['reading', 'pronunciation'],
        title: S('Vokaler och vokallängd'), goal: S('Känna igen vanliga vokaltecken och höra skillnad på korta och långa vokaler'),
        dialogue: [
          d('', 'อะ อา', 'a – aa', 'kort a – långt a'), d('', 'อิ อี', 'i – ii', 'kort i – långt i'),
          d('', 'อึ อื', 'ue – uee', 'kort och långt ue – som ett u-ljud utan rundade läppar'), d('', 'อุ อู', 'u – uu', 'kort och långt u – som svenskt o i ”bok”'),
          d('', 'เอะ เอ', 'e – ee', 'kort och långt e – som i ”vet” och ”ek”'), d('', 'แอะ แอ', 'ae – aae', 'öppet ä – som i ”ära”'),
          d('', 'โอะ โอ', 'o – oo', 'slutet o – som svenskt å i ”båt”'), d('', 'เอาะ ออ', 'o – oo', 'öppet o – som o i ”kopp”'),
          d('', 'ไป ใจ', 'pai – chai', 'ai – två tecken (ไ och ใ) med samma ljud'), d('', 'น้ำ', 'nam', 'am – tecknet ำ')
        ],
        vocab: [w('ตา', 'ta', 'öga', 'Betyder också morfar.'), w('ดี', 'di', 'bra'), w('ปู', 'pu', 'krabba'), w('มือ', 'mue', 'hand'), w('ไป', 'pai', 'gå, åka'),
          w('ใจ', 'chai', 'hjärta, sinne'), w('น้ำ', 'nam', 'vatten'), w('ข้าว', 'khao', 'ris, mat', 'Långt a och fallande ton.'), w('เข่า', 'khao', 'knä', 'Kort a och låg ton. ข้าว och เข่า skrivs båda khao med RTGS – lyssna på skillnaden.')],
        grammar: { title: S('Korta och långa vokaler'),
          body: S('Vokallängd skiljer betydelse, ungefär som i svenska ”vit” och ”vitt”. ข้าว (khao, ris) har långt a, เข่า (khao, knä) har kort a – och dessutom olika ton.\n\nVokaltecknet skrivs runt konsonanten: före (เ แ โ ไ ใ), efter (า), över (ิ ี ึ ื) eller under (ุ ู). I tabellen står อ som plats för konsonanten.\n\nKonsonanten uttalas alltid först, även när vokaltecknet står före: เด็ก = d + e + k = dek.\n\nI raderna ovan är vokallängden utskriven (aa, ii …) för att visa skillnaden. Vanlig RTGS skriver inte vokallängd.'),
          table: [['Kort', 'Lång', 'Ljud'], ['อะ', 'อา', 'a'], ['อิ', 'อี', 'i'], ['อึ', 'อื', 'ue'], ['อุ', 'อู', 'u'], ['เอะ', 'เอ', 'e'], ['แอะ', 'แอ', 'ae'], ['โอะ', 'โอ', 'o (slutet)'], ['เอาะ', 'ออ', 'o (öppet)']] },
        exercises: [
          { type: 'listen', say: 'ข้าว', opts: ['ris', 'knä', 'vatten'], a: 0 },
          { type: 'listen', say: 'มือ', opts: ['hand', 'öga', 'krabba'], a: 0 },
          { type: 'mc', prompt: 'น้ำ', rom: 'nam', q: S('Vad betyder ordet?'), opts: ['vatten', 'ris', 'bra'], a: 0 },
          { type: 'mc', prompt: 'เด็ก', rom: 'dek', q: S('Vokalen เ står först. Vad uttalas först?'), opts: ['Konsonanten ด', 'Vokalen เ', 'Slutljudet ก'], a: 0 }
        ] },

      { id: 'th-1-tones', level: 'L1', icon: '🎵', skills: ['pronunciation', 'listening'],
        title: S('De fem tonerna'), goal: S('Höra och säga thailändskans fem toner'),
        tones: [
          { name: 'สามัญ', rom: 'saman', sv: 'Mellanton', curve: [[0, 3], [1, 3]], word: 'คา', wrom: 'khaa', wsv: 'fastna, sitta fast',
            desc: 'Jämn ton mitt i ditt röstläge, som när man säger ett ord lugnt och neutralt.' },
          { name: 'เอก', rom: 'ek', sv: 'Låg ton', curve: [[0, 2.2], [1, 1.2]], word: 'ข่า', wrom: 'khàa', wsv: 'galangal (en ingefärsliknande rot)',
            desc: 'Låg och jämn, sjunker lite. Lägre än ditt vanliga talläge.' },
          { name: 'โท', rom: 'tho', sv: 'Fallande ton', curve: [[0, 4.2], [0.3, 4.7], [1, 1.4]], word: 'ค่า', wrom: 'khâa', wsv: 'värde, avgift',
            desc: 'Börjar högt, stiger lite och faller sedan tydligt – som ett bestämt ”nej!”.' },
          { name: 'ตรี', rom: 'tri', sv: 'Hög ton', curve: [[0, 3.6], [1, 4.8]], word: 'ค้า', wrom: 'kháa', wsv: 'handla, driva handel',
            desc: 'Hög och lite stigande, nära toppen av röstläget.' },
          { name: 'จัตวา', rom: 'chattawa', sv: 'Stigande ton', curve: [[0, 2.3], [0.35, 1.4], [1, 4.3]], word: 'ขา', wrom: 'khǎa', wsv: 'ben',
            desc: 'Börjar lågt, dyker lite och stiger sedan – som en förvånad fråga: ”ja?”.' }
        ],
        dialogue: [
          d('', 'คา', 'khaa – mellanton', 'fastna'), d('', 'ข่า', 'khàa – låg ton', 'galangal'), d('', 'ค่า', 'khâa – fallande ton', 'värde'),
          d('', 'ค้า', 'kháa – hög ton', 'handla'), d('', 'ขา', 'khǎa – stigande ton', 'ben'),
          d('', 'ไม้ใหม่ไม่ไหม้ไหม', 'mái mài mâi mâi mǎi', 'Brinner inte nytt trä? (en klassisk tonövning)')
        ],
        vocab: [w('คา', 'khaa', 'fastna', 'Mellanton.'), w('ข่า', 'khàa', 'galangal', 'Låg ton.'), w('ค่า', 'khâa', 'värde, avgift', 'Fallande ton.'), w('ค้า', 'kháa', 'handla, driva handel', 'Hög ton.'),
          w('ขา', 'khǎa', 'ben', 'Stigande ton.'), w('ไม่', 'mâi', 'inte', 'Fallande ton.'), w('ไม้', 'mái', 'trä', 'Hög ton.'), w('ใหม่', 'mài', 'ny', 'Låg ton.'), w('ไหม', 'mǎi', 'frågeord för ja/nej-frågor', 'Stigande ton.')],
        grammar: { title: S('Hur tonen bestäms'),
          body: S('Tonen i en stavelse bestäms av tre saker: konsonantklassen, tonmärket och om stavelsen är ”levande” (slutar på lång vokal eller m, n, ng, y, w) eller ”död” (slutar på kort vokal eller k, p, t).\n\nDe fyra tonmärkena heter ◌่ (mai ek), ◌้ (mai tho), ◌๊ (mai tri) och ◌๋ (mai chattawa). Märket mai ek ger inte alltid låg ton: med en lågklasskonsonant ger det fallande ton, som i ค่า. Mai tri och mai chattawa används nästan bara med mellanklasskonsonanter.\n\nสามัญ, เอก, โท, ตรี och จัตวา är de thailändska namnen på tonerna. I den här lektionen visar romaniseringen tonen med accenter: a (mellan), à (låg), â (fallande), á (hög), ǎ (stigande).\n\nOm ljudet: rösten är enhetens thailändska röst som läser det skrivna ordet. Kurvan visar tonernas typiska form och är inte en mätning av rösten eller av ditt uttal.'),
          table: [['Konsonant', 'Inget märke (levande stavelse)', '◌่ mai ek', '◌้ mai tho'], ['Mellanklass (ก)', 'mellanton', 'låg', 'fallande'], ['Högklass (ข)', 'stigande', 'låg', 'fallande'], ['Lågklass (ค)', 'mellanton', 'fallande', 'hög']] },
        exercises: [
          { type: 'listen', say: 'ขา', opts: ['ขา – ben (stigande ton)', 'คา – fastna (mellanton)', 'ค่า – värde (fallande ton)'], a: 0 },
          { type: 'listen', say: 'ค้า', opts: ['ค้า – handla (hög ton)', 'ข่า – galangal (låg ton)', 'ขา – ben (stigande ton)'], a: 0 },
          { type: 'listen', say: 'ไม่', opts: ['ไม่ – inte (fallande ton)', 'ไม้ – trä (hög ton)', 'ใหม่ – ny (låg ton)'], a: 0 },
          { type: 'mc', prompt: 'ใหม่', rom: 'mài', q: S('Vilken ton har ordet?'), opts: ['Låg', 'Hög', 'Stigande'], a: 0 },
          { type: 'mc', prompt: 'ขา', rom: 'khǎa', q: S('Varför får ขา stigande ton?'), opts: ['Högklasskonsonant utan tonmärke', 'Ordet har mai ek', 'Det är en död stavelse'], a: 0 }
        ] },

      { id: 'th-1-greet', level: 'L1', icon: '🙏', skills: ['conversation', 'speaking', 'vocabulary'],
        title: S('Hälsningar och artighet'), goal: S('Hälsa, presentera dig och fråga hur någon mår'),
        dialogue: [
          d('A', 'สวัสดีครับ', 'sawatdi khrap', 'Hej! (sagt av en man)'),
          d('B', 'สวัสดีค่ะ', 'sawatdi kha', 'Hej! (sagt av en kvinna)'),
          d('A', 'สบายดีไหมครับ', 'sabai di mai khrap', 'Hur mår du?'),
          d('B', 'สบายดีค่ะ ขอบคุณค่ะ แล้วคุณล่ะคะ', 'sabai di kha khop khun kha laeo khun la kha', 'Bra, tack. Och du?'),
          d('A', 'สบายดีครับ ผมชื่อเคนครับ คุณชื่ออะไรครับ', 'sabai di khrap phom chue Ken khrap khun chue arai khrap', 'Bra. Jag heter Ken. Vad heter du?'),
          d('B', 'ฉันชื่อนกค่ะ ยินดีที่ได้รู้จักค่ะ', 'chan chue Nok kha yindi thi dai ru chak kha', 'Jag heter Nok. Trevligt att träffas.')
        ],
        vocab: [w('สวัสดี', 'sawatdi', 'Hej', 'En vanlig hälsning på thailändska. Den används också när man säger hej då.'),
          w('ครับ', 'khrap', 'artighetsord (man)', 'Sägs sist i meningen. I vardagligt tal låter det ofta som khap.'),
          w('ค่ะ', 'kha', 'artighetsord (kvinna, påstående)', 'Fallande ton.'), w('คะ', 'kha', 'artighetsord (kvinna, fråga)', 'Hög ton.'),
          w('สบายดี', 'sabai di', 'må bra'), w('ขอบคุณ', 'khop khun', 'tack'), w('ขอโทษ', 'kho thot', 'förlåt, ursäkta'), w('ชื่อ', 'chue', 'heta; namn'),
          w('ผม', 'phom', 'jag (man)'), w('ฉัน', 'chan', 'jag (kvinna, vardagligt)'), w('คุณ', 'khun', 'du, ni (artigt)'), w('ยินดีที่ได้รู้จัก', 'yindi thi dai ru chak', 'trevligt att träffas')],
        grammar: { title: S('Artighetsord och ja/nej-frågor'),
          body: S('Thailändskan har inget ”vara” framför adjektiv: สบายดี (sabai di) betyder ”(jag) mår bra”. Subjektet utelämnas ofta när det är tydligt.\n\nEn ja/nej-fråga bildas med ไหม (mai, stigande ton) sist: สบายดีไหม = Mår du bra?\n\nSvara genom att upprepa verbet: สบายดี (bra) eller ไม่สบาย (mai sabai, jag mår inte bra / jag är sjuk).\n\nLägg till ครับ eller ค่ะ/คะ sist för att vara artig. Det används hela tiden, även mellan vänner.'),
          table: [['', 'Man', 'Kvinna'], ['jag', 'ผม (phom)', 'ฉัน (chan), formellt ดิฉัน (dichan)'], ['artighetsord', 'ครับ (khrap)', 'ค่ะ (kha) påstående, คะ (kha) fråga']] },
        exercises: [
          { type: 'mc', prompt: 'ขอบคุณ', rom: 'khop khun', q: S('Vad betyder ordet?'), opts: ['tack', 'förlåt', 'hej'], a: 0 },
          { type: 'gap', text: 'สบายดี___ครับ', tr: S('Mår du bra?'), opts: ['ไหม', 'ค่ะ', 'ชื่อ'], a: 'ไหม' },
          { type: 'gap', text: 'ฉัน___นกค่ะ', tr: S('Jag heter Nok.'), opts: ['ชื่อ', 'สบาย', 'ไหม'], a: 'ชื่อ' },
          { type: 'order', answer: 'คุณ|ชื่อ|อะไร|ครับ', rom: 'khun chue arai khrap', tr: S('Vad heter du?') },
          { type: 'listen', say: 'ยินดีที่ได้รู้จักค่ะ', opts: ['Trevligt att träffas.', 'Hur mår du?', 'Förlåt.'], a: 0 },
          { type: 'write', task: S('Hälsa och säg vad du heter. Du får skriva med thailändska bokstäver eller romanisering.'), model: 'สวัสดีครับ ผมชื่อเคนครับ (sawatdi khrap, phom chue Ken khrap)' }
        ] },

      { id: 'th-1-numbers', level: 'L1', icon: '🔢', skills: ['vocabulary', 'real', 'listening'],
        title: S('Siffror och priser'), goal: S('Räkna 0–1000 och fråga vad något kostar'),
        dialogue: [
          d('A', 'อันนี้เท่าไหร่ครับ', 'an ni thao rai khrap', 'Hur mycket kostar den här?'),
          d('B', 'ห้าสิบบาทค่ะ', 'ha sip bat kha', 'Femtio baht.'),
          d('A', 'เอาสองอันครับ', 'ao song an khrap', 'Jag tar två.'),
          d('B', 'ทั้งหมดหนึ่งร้อยบาทค่ะ', 'thang mot nueng roi bat kha', 'Det blir hundra baht totalt.'),
          d('A', 'ขอบคุณครับ', 'khop khun khrap', 'Tack.')
        ],
        vocab: [w('หนึ่ง', 'nueng', 'ett'), w('สอง', 'song', 'två'), w('สาม', 'sam', 'tre'), w('สี่', 'si', 'fyra'), w('ห้า', 'ha', 'fem'), w('หก', 'hok', 'sex'),
          w('เจ็ด', 'chet', 'sju'), w('แปด', 'paet', 'åtta'), w('เก้า', 'kao', 'nio'), w('สิบ', 'sip', 'tio'), w('ยี่สิบ', 'yi sip', 'tjugo', 'Undantag: 20 heter ยี่สิบ, inte สองสิบ.'),
          w('ร้อย', 'roi', 'hundra'), w('พัน', 'phan', 'tusen'), w('เท่าไหร่', 'thao rai', 'hur mycket'), w('บาท', 'bat', 'baht (valuta)', 'RTGS skriver bat; på svenska och engelska skrivs ofta baht.')],
        grammar: { title: S('Så bildas talen'),
          body: S('Talen byggs som i svenska: สิบ (10) + ห้า (5) = สิบห้า (15), och ห้า (5) + สิบ (10) = ห้าสิบ (50).\n\nTvå undantag: entalet 1 efter ett tiotal heter เอ็ด (et): สิบเอ็ด (11), ยี่สิบเอ็ด (21). Och 20 heter ยี่สิบ (yi sip).\n\nThailand har egna siffror (๑ ๒ ๓ …), men vanliga siffror används nästan överallt, även på prislappar.\n\nFråga om pris: … เท่าไหร่ (… thao rai)? อัน (an) är ett räkneord för många små saker: สองอัน = två stycken.'),
          table: [['0', 'ศูนย์', 'sun'], ['1', 'หนึ่ง', 'nueng'], ['2', 'สอง', 'song'], ['3', 'สาม', 'sam'], ['4', 'สี่', 'si'], ['5', 'ห้า', 'ha'], ['6', 'หก', 'hok'], ['7', 'เจ็ด', 'chet'],
            ['8', 'แปด', 'paet'], ['9', 'เก้า', 'kao'], ['10', 'สิบ', 'sip'], ['11', 'สิบเอ็ด', 'sip et'], ['20', 'ยี่สิบ', 'yi sip'], ['100', 'หนึ่งร้อย', 'nueng roi'], ['1000', 'หนึ่งพัน', 'nueng phan']] },
        exercises: [
          { type: 'listen', say: 'สามสิบ', opts: ['30', '13', '300'], a: 0 },
          { type: 'listen', say: 'สิบเอ็ด', opts: ['11', '10', '21'], a: 0 },
          { type: 'mc', prompt: 'ยี่สิบ', rom: 'yi sip', q: S('Vilket tal är det?'), opts: ['20', '2', '12'], a: 0 },
          { type: 'gap', text: 'อันนี้___ครับ', tr: S('Hur mycket kostar den här?'), opts: ['เท่าไหร่', 'สบายดี', 'ขอบคุณ'], a: 'เท่าไหร่' },
          { type: 'order', answer: 'ห้า|สิบ|บาท|ค่ะ', rom: 'ha sip bat kha', tr: S('Femtio baht.') }
        ] },

      /* ================= Level 2 – Grundläggande thailändska ================= */
      { id: 'th-2-family', level: 'L2', icon: '👨‍👩‍👧', skills: ['vocabulary', 'conversation'],
        title: S('Familjen'), goal: S('Berätta om din familj och fråga om andras'),
        dialogue: [
          d('A', 'คุณมีพี่น้องไหมคะ', 'khun mi phi nong mai kha', 'Har du syskon?'),
          d('B', 'มีครับ ผมมีพี่ชายหนึ่งคนและน้องสาวหนึ่งคน', 'mi khrap phom mi phi chai nueng khon lae nong sao nueng khon', 'Ja. Jag har en storebror och en lillasyster.'),
          d('A', 'คุณแต่งงานแล้วหรือยังคะ', 'khun taeng ngan laeo rue yang kha', 'Är du gift?'),
          d('B', 'แต่งงานแล้วครับ มีลูกสองคน', 'taeng ngan laeo khrap mi luk song khon', 'Ja, jag är gift och har två barn.'),
          d('A', 'ลูกอายุเท่าไหร่คะ', 'luk ayu thao rai kha', 'Hur gamla är barnen?'),
          d('B', 'ห้าขวบกับแปดขวบครับ', 'ha khuap kap paet khuap khrap', 'Fem och åtta år.')
        ],
        vocab: [w('ครอบครัว', 'khropkhrua', 'familj'), w('พ่อ', 'pho', 'pappa'), w('แม่', 'mae', 'mamma'), w('พี่ชาย', 'phi chai', 'storebror'), w('น้องสาว', 'nong sao', 'lillasyster'),
          w('พี่น้อง', 'phi nong', 'syskon'), w('ลูก', 'luk', 'barn (ens egna)'), w('แต่งงาน', 'taeng ngan', 'gifta sig'), w('มี', 'mi', 'ha; det finns'),
          w('คน', 'khon', 'människa; räkneord för personer', 'ลูกสองคน (luk song khon) = två barn.'), w('ขวบ', 'khuap', 'år (om små barns ålder)')],
        grammar: { title: S('Äldre och yngre – พี่ och น้อง'),
          body: S('Thailändska skiljer på äldre och yngre syskon i stället för bror och syster: พี่ (phi) = äldre, น้อง (nong) = yngre. Lägg till ชาย (chai, man) eller สาว (sao, ung kvinna) för att visa kön: พี่ชาย = storebror, น้องสาว = lillasyster.\n\nพี่ och น้อง används också som tilltal till personer som är äldre eller yngre än du, till exempel kollegor eller personal på restaurang.\n\nAntal: substantiv + tal + räkneord. ลูกสองคน (luk song khon), ordagrant ”barn två person”, betyder två barn. Det finns ingen plural.\n\n… แล้วหรือยัง (laeo rue yang) frågar om något redan har hänt: ”… redan, eller inte än?”') },
        exercises: [
          { type: 'mc', prompt: 'น้องสาว', rom: 'nong sao', q: S('Vad betyder ordet?'), opts: ['lillasyster', 'storebror', 'mamma'], a: 0 },
          { type: 'gap', text: 'ผมมีลูกสอง___ครับ', tr: S('Jag har två barn.'), opts: ['คน', 'ตัว', 'อัน'], a: 'คน' },
          { type: 'listen', say: 'พ่อกับแม่', opts: ['pappa och mamma', 'bror och syster', 'barn och föräldrar'], a: 0 },
          { type: 'order', answer: 'คุณ|มี|พี่น้อง|ไหม|คะ', rom: 'khun mi phi nong mai kha', tr: S('Har du syskon?') },
          { type: 'write', task: S('Skriv två meningar om din familj.'), model: 'ผมมีน้องสาวหนึ่งคนครับ ผมมีลูกสองคน (phom mi nong sao nueng khon khrap, phom mi luk song khon)' }
        ] },

      { id: 'th-2-food', level: 'L2', icon: '🍜', skills: ['real', 'conversation', 'vocabulary'],
        title: S('Beställa mat'), goal: S('Beställa mat och dryck och be om notan'),
        dialogue: [
          d('A', 'รับอะไรดีคะ', 'rap arai di kha', 'Vad vill du ha?'),
          d('B', 'ขอข้าวผัดไก่หนึ่งจานครับ ไม่เผ็ดนะครับ', 'kho khao phat kai nueng chan khrap mai phet na khrap', 'Ett stekt ris med kyckling, tack. Inte starkt.'),
          d('A', 'ดื่มอะไรคะ', 'duem arai kha', 'Något att dricka?'),
          d('B', 'ขอน้ำเปล่าหนึ่งขวดครับ', 'kho nam plao nueng khuat khrap', 'En flaska vatten, tack.'),
          d('B', 'อร่อยมากครับ เช็กบิลด้วยครับ', 'aroi mak khrap chek bin duai khrap', 'Det var jättegott. Kan jag få notan?'),
          d('A', 'หนึ่งร้อยยี่สิบบาทค่ะ', 'nueng roi yi sip bat kha', 'Det blir 120 baht.')
        ],
        vocab: [w('ขอ', 'kho', 'be om; kan jag få'), w('ข้าวผัด', 'khao phat', 'stekt ris'), w('เผ็ด', 'phet', 'stark (kryddig)'), w('อร่อย', 'aroi', 'god, gott'), w('ดื่ม', 'duem', 'dricka'),
          w('น้ำเปล่า', 'nam plao', 'vanligt vatten'), w('จาน', 'chan', 'tallrik; räkneord för maträtter'), w('ขวด', 'khuat', 'flaska'), w('เช็กบิล', 'chek bin', 'notan, tack'), w('หิว', 'hio', 'hungrig')],
        grammar: { title: S('Beställa med ขอ'),
          body: S('ขอ (kho) + sak + antal + räkneord är det vanligaste sättet att beställa: ขอข้าวผัดหนึ่งจาน = Kan jag få en tallrik stekt ris.\n\nRäkneordet beror på saken: จาน (chan) för maträtter, แก้ว (kaeo) för glas, ขวด (khuat) för flaskor.\n\nนะ (na) sist mjukar upp en önskan: ไม่เผ็ดนะครับ = inte starkt, är du snäll.\n\nไม่ (mai, fallande ton) gör ett ord negativt: ไม่เผ็ด = inte starkt. Blanda inte ihop det med frågeordet ไหม (mai, stigande ton).') },
        exercises: [
          { type: 'mc', prompt: 'อร่อย', rom: 'aroi', q: S('Vad betyder ordet?'), opts: ['gott', 'starkt', 'hungrig'], a: 0 },
          { type: 'gap', text: 'ขอน้ำเปล่าหนึ่ง___ครับ', tr: S('En flaska vatten, tack.'), opts: ['ขวด', 'คน', 'จาน'], a: 'ขวด' },
          { type: 'gap', text: '___เผ็ดนะครับ', tr: S('Inte starkt, tack.'), opts: ['ไม่', 'ไหม', 'มี'], a: 'ไม่' },
          { type: 'listen', say: 'เช็กบิลด้วยครับ', opts: ['Kan jag få notan?', 'Det var gott.', 'Inte starkt, tack.'], a: 0 },
          { type: 'order', answer: 'ขอ|ข้าวผัด|หนึ่ง|จาน|ครับ', rom: 'kho khao phat nueng chan khrap', tr: S('Ett stekt ris, tack.') }
        ] },

      /* ================= Level 3 – Vardagliga samtal ================= */
      { id: 'th-3-shopping', level: 'L3', icon: '🛍️', skills: ['real', 'conversation', 'listening'],
        title: S('Handla och pruta'), goal: S('Fråga om pris och storlek och pruta artigt'),
        dialogue: [
          d('A', 'เสื้อตัวนี้ราคาเท่าไหร่ครับ', 'suea tua ni rakha thao rai khrap', 'Vad kostar den här tröjan?'),
          d('B', 'สามร้อยบาทค่ะ', 'sam roi bat kha', 'Trehundra baht.'),
          d('A', 'แพงไปหน่อยครับ ลดได้ไหมครับ', 'phaeng pai noi khrap lot dai mai khrap', 'Lite för dyrt. Kan du sänka priset?'),
          d('B', 'ได้ค่ะ สองร้อยห้าสิบบาทค่ะ', 'dai kha song roi ha sip bat kha', 'Okej, tvåhundrafemtio baht.'),
          d('A', 'มีตัวใหญ่กว่านี้ไหมครับ', 'mi tua yai kwa ni mai khrap', 'Finns det en större?'),
          d('B', 'มีค่ะ ลองได้เลยค่ะ', 'mi kha long dai loei kha', 'Ja, du kan prova den.')
        ],
        vocab: [w('ราคา', 'rakha', 'pris'), w('แพง', 'phaeng', 'dyr'), w('ถูก', 'thuk', 'billig', 'Betyder också ”rätt, korrekt”.'), w('ลด', 'lot', 'sänka, minska'), w('ใหญ่', 'yai', 'stor'),
          w('เล็ก', 'lek', 'liten'), w('กว่า', 'kwa', 'mer än (jämförelse)'), w('ลอง', 'long', 'prova'), w('เสื้อ', 'suea', 'tröja, skjorta'), w('ตัว', 'tua', 'räkneord för kläder och djur')],
        grammar: { title: S('Jämförelse med กว่า'),
          body: S('Jämför med adjektiv + กว่า (kwa): ใหญ่กว่า = större, ถูกกว่า = billigare. ใหญ่กว่านี้ = större än den här.\n\nSuperlativ: adjektiv + ที่สุด (thi sut): ถูกที่สุด = billigast.\n\nได้ไหม (dai mai) efter ett verb frågar om något går: ลดได้ไหม = kan du sänka? ลองได้ไหม = får jag prova? Svaret ได้ (dai) betyder ”ja, det går” och ไม่ได้ (mai dai) ”nej, det går inte”.\n\nPruta vänligt och med ett leende. På marknader är det vanligt; i varuhus är priset oftast fast.') },
        exercises: [
          { type: 'mc', prompt: 'แพง', rom: 'phaeng', q: S('Vad betyder ordet?'), opts: ['dyr', 'billig', 'stor'], a: 0 },
          { type: 'gap', text: 'มีตัวใหญ่___นี้ไหมครับ', tr: S('Finns det en större än den här?'), opts: ['กว่า', 'ที่สุด', 'ลอง'], a: 'กว่า' },
          { type: 'listen', say: 'ลดได้ไหมคะ', opts: ['Kan du sänka priset?', 'Får jag prova?', 'Vad kostar det?'], a: 0 },
          { type: 'order', answer: 'ราคา|เท่าไหร่|ครับ', rom: 'rakha thao rai khrap', tr: S('Vad kostar det?') },
          { type: 'mc', prompt: 'ถูกที่สุด', rom: 'thuk thi sut', q: S('Vad betyder det?'), opts: ['billigast', 'billigare', 'för dyrt'], a: 0 }
        ] },

      { id: 'th-3-directions', level: 'L3', icon: '🧭', skills: ['real', 'listening', 'conversation'],
        title: S('Hitta vägen och åka taxi'), goal: S('Fråga om vägen och förstå enkla vägbeskrivningar'),
        dialogue: [
          d('A', 'ขอโทษครับ สถานีรถไฟฟ้าอยู่ที่ไหนครับ', 'kho thot khrap sathani rot fai fa yu thi nai khrap', 'Ursäkta, var ligger skytrain-stationen?'),
          d('B', 'ตรงไปแล้วเลี้ยวซ้ายค่ะ', 'trong pai laeo liao sai kha', 'Gå rakt fram och sväng sedan vänster.'),
          d('A', 'ไกลไหมครับ', 'klai mai khrap', 'Är det långt?'),
          d('B', 'ไม่ไกลค่ะ เดินห้านาที', 'mai klai kha doen ha nathi', 'Nej, fem minuter att gå.'),
          d('A', 'ขอบคุณมากครับ', 'khop khun mak khrap', 'Tack så mycket.')
        ],
        vocab: [w('อยู่ที่ไหน', 'yu thi nai', 'var ligger, var finns'), w('ห้องน้ำ', 'hong nam', 'toalett, badrum'), w('ตรงไป', 'trong pai', 'rakt fram'), w('เลี้ยวซ้าย', 'liao sai', 'sväng vänster'),
          w('เลี้ยวขวา', 'liao khwa', 'sväng höger'), w('ใกล้', 'klai', 'nära', 'Fallande ton. ไกล (klai, mellanton) betyder tvärtom ”långt bort” – tonen gör skillnaden.'),
          w('ไกล', 'klai', 'långt bort'), w('เดิน', 'doen', 'gå (till fots)'), w('นาที', 'nathi', 'minut'), w('สนามบิน', 'sanam bin', 'flygplats'), w('จอดตรงนี้', 'chot trong ni', 'stanna här')],
        grammar: { title: S('Plats med อยู่'),
          body: S('อยู่ (yu) betyder ”befinna sig, ligga, bo”. … อยู่ที่ไหน = var är …?\n\nแล้ว (laeo) mellan två verb betyder ”och sedan”: ตรงไปแล้วเลี้ยวซ้าย = gå rakt fram och sväng sedan vänster.\n\nใกล้ (klai, fallande ton) = nära och ไกล (klai, mellanton) = långt. Samma romanisering – lyssna på tonen.\n\nI taxi: ไป + plats + ครับ/ค่ะ. ไปสนามบินครับ = till flygplatsen, tack. Be att få stanna: จอดตรงนี้ครับ.') },
        exercises: [
          { type: 'listen', say: 'เลี้ยวขวาค่ะ', opts: ['Sväng höger.', 'Sväng vänster.', 'Rakt fram.'], a: 0 },
          { type: 'mc', prompt: 'ใกล้', rom: 'klai', q: S('Vad betyder ordet (fallande ton)?'), opts: ['nära', 'långt bort', 'rakt fram'], a: 0 },
          { type: 'gap', text: 'ห้องน้ำ___ที่ไหนครับ', tr: S('Var är toaletten?'), opts: ['อยู่', 'ไป', 'มี'], a: 'อยู่' },
          { type: 'order', answer: 'ตรงไป|แล้ว|เลี้ยวซ้าย', rom: 'trong pai laeo liao sai', tr: S('Rakt fram och sedan vänster.') },
          { type: 'listen', say: 'ไปสนามบินครับ', opts: ['Till flygplatsen, tack.', 'Stanna här.', 'Är det långt?'], a: 0 }
        ] },

      /* ================= Level 4 – Praktisk thailändska ================= */
      { id: 'th-4-health', level: 'L4', icon: '💊', skills: ['real', 'vocabulary', 'listening'],
        title: S('På apoteket'), goal: S('Beskriva enkla symtom och förstå hur man tar medicinen'),
        dialogue: [
          d('A', 'เป็นอะไรคะ', 'pen arai kha', 'Vad är det för besvär?'),
          d('B', 'ผมปวดหัวและเจ็บคอครับ', 'phom puat hua lae chep kho khrap', 'Jag har huvudvärk och ont i halsen.'),
          d('A', 'มีไข้ไหมคะ', 'mi khai mai kha', 'Har du feber?'),
          d('B', 'มีนิดหน่อยครับ', 'mi nit noi khrap', 'Lite grann.'),
          d('A', 'ทานยานี้วันละสามครั้ง หลังอาหารนะคะ', 'than ya ni wan la sam khrang lang ahan na kha', 'Ta den här medicinen tre gånger om dagen, efter maten.'),
          d('A', 'ถ้าไม่ดีขึ้น ควรไปหาหมอนะคะ', 'tha mai di khuen khuan pai ha mo na kha', 'Om det inte blir bättre bör du gå till en läkare.')
        ],
        vocab: [w('ปวดหัว', 'puat hua', 'huvudvärk, ha ont i huvudet'), w('เจ็บคอ', 'chep kho', 'ont i halsen'),
          w('ไข้', 'khai', 'feber', 'Fallande ton. ไข่ (khai, låg ton) = ägg och ขาย (khai, stigande ton) = sälja.'),
          w('ยา', 'ya', 'medicin'), w('ร้านขายยา', 'ran khai ya', 'apotek'), w('วันละสามครั้ง', 'wan la sam khrang', 'tre gånger om dagen'), w('หลังอาหาร', 'lang ahan', 'efter maten'),
          w('หมอ', 'mo', 'läkare'), w('ดีขึ้น', 'di khuen', 'bli bättre'), w('ทาน', 'than', 'äta, ta (artigt)')],
        grammar: { title: S('ปวด eller เจ็บ?'),
          body: S('ปวด (puat) är molande, inre värk: ปวดหัว (huvudvärk), ปวดท้อง (puat thong, ont i magen). เจ็บ (chep) är skarp smärta eller ömhet: เจ็บคอ (ont i halsen), เจ็บตรงนี้ (det gör ont här).\n\nเป็น (pen) används om sjukdomar: เป็นหวัด (pen wat) = vara förkyld. มี (mi) används om symtom man ”har”: มีไข้ = ha feber.\n\nวันละสามครั้ง, ordagrant ”dag-per-tre-gånger”, betyder tre gånger om dagen. ก่อนอาหาร (kon ahan) = före maten, หลังอาหาร = efter maten.\n\nVid akut sjukdom i Thailand: ring 1669 (ambulans).') },
        exercises: [
          { type: 'listen', say: 'ปวดหัว', opts: ['huvudvärk', 'ont i halsen', 'feber'], a: 0 },
          { type: 'mc', prompt: 'ไข้', rom: 'khai', q: S('Vad betyder ordet (fallande ton)?'), opts: ['feber', 'ägg', 'sälja'], a: 0 },
          { type: 'gap', text: 'ผม___หวัดครับ', tr: S('Jag är förkyld.'), opts: ['เป็น', 'ปวด', 'ทาน'], a: 'เป็น' },
          { type: 'listen', say: 'วันละสองครั้ง', opts: ['två gånger om dagen', 'om två dagar', 'efter maten'], a: 0 },
          { type: 'order', answer: 'ทาน|ยา|หลัง|อาหาร', rom: 'than ya lang ahan', tr: S('Ta medicinen efter maten.') }
        ] },

      { id: 'th-4-work', level: 'L4', icon: '📞', skills: ['work', 'conversation', 'listening'],
        title: S('Telefon och möten'), goal: S('Ringa, lämna ett meddelande och boka en tid'),
        dialogue: [
          d('A', 'ฮัลโหล สวัสดีครับ คุณสมชายอยู่ไหมครับ', 'hanlo sawatdi khrap khun Somchai yu mai khrap', 'Hallå, hej. Är Somchai där?'),
          d('B', 'ตอนนี้ไม่อยู่ค่ะ ไปประชุมค่ะ', 'ton ni mai yu kha pai prachum kha', 'Han är inte här just nu, han är på ett möte.'),
          d('A', 'ช่วยบอกให้เขาโทรกลับหาผมได้ไหมครับ', 'chuai bok hai khao tho klap ha phom dai mai khrap', 'Kan du be honom ringa tillbaka till mig?'),
          d('B', 'ได้ค่ะ ขอชื่อและเบอร์โทรด้วยค่ะ', 'dai kha kho chue lae boe tho duai kha', 'Visst. Kan jag få ditt namn och telefonnummer?'),
          d('A', 'ผมชื่อเคนครับ พรุ่งนี้ผมว่างตอนบ่ายสองโมงครับ', 'phom chue Ken khrap phrung ni phom wang ton bai song mong khrap', 'Jag heter Ken. I morgon är jag ledig klockan två på eftermiddagen.')
        ],
        vocab: [w('โทรกลับ', 'tho klap', 'ringa tillbaka'), w('ประชุม', 'prachum', 'möte; ha möte'), w('ว่าง', 'wang', 'ledig, har tid'), w('ยุ่ง', 'yung', 'upptagen'),
          w('พรุ่งนี้', 'phrung ni', 'i morgon'), w('วันนี้', 'wan ni', 'i dag'), w('ตอนนี้', 'ton ni', 'nu, just nu'), w('นัด', 'nat', 'avtala tid; en avtalad tid'),
          w('เบอร์โทร', 'boe tho', 'telefonnummer'), w('ช่วย', 'chuai', 'hjälpa; kan du (artig begäran)'), w('บ่ายสองโมง', 'bai song mong', 'klockan 14')],
        grammar: { title: S('Klockan på thailändska'),
          body: S('I vardagligt tal delas dygnet in i delar med egna ord. På eftermiddagen säger man บ่าย (bai) + timme + โมง (mong): บ่ายโมง = 13, บ่ายสองโมง = 14, บ่ายสามโมง = 15. På morgonen: เจ็ดโมงเช้า (chet mong chao) = 7. Klockan 12 på dagen heter เที่ยง (thiang).\n\nI tidtabeller och på jobbet används ofta 24-timmarsklockan: สิบสี่นาฬิกา (sip si nalika) = 14.00.\n\nช่วย … หน่อย eller ช่วย … ได้ไหม (chuai … noi, chuai … dai mai) är ett artigt sätt att be någon om något.\n\nเขา (khao) betyder han, hon eller de – samma ord för alla.') },
        exercises: [
          { type: 'mc', prompt: 'ว่าง', rom: 'wang', q: S('Vad betyder ordet?'), opts: ['ledig', 'upptagen', 'möte'], a: 0 },
          { type: 'listen', say: 'บ่ายสามโมง', opts: ['klockan 15', 'klockan 13', 'klockan 3 på natten'], a: 0 },
          { type: 'gap', text: 'ตอนนี้เขาไม่___ค่ะ', tr: S('Han/hon är inte här just nu.'), opts: ['อยู่', 'ชื่อ', 'กลับ'], a: 'อยู่' },
          { type: 'order', answer: 'ช่วย|โทร|กลับ|ได้|ไหม|ครับ', rom: 'chuai tho klap dai mai khrap', tr: S('Kan du ringa tillbaka?') },
          { type: 'write', task: S('Skriv ett kort meddelande: vem du är och när du är ledig.'), model: 'ผมชื่อเคนครับ พรุ่งนี้ผมว่างตอนบ่ายสองโมงครับ (phom chue Ken khrap, phrung ni phom wang ton bai song mong khrap)' }
        ] },

      /* ================= Level 5 – Avancerad kommunikation ================= */
      { id: 'th-5-opinion', level: 'L5', icon: '💬', skills: ['conversation', 'speaking', 'work'],
        title: S('Säga vad du tycker'), goal: S('Ge din åsikt, hålla med eller inte och motivera'),
        dialogue: [
          d('A', 'คุณคิดว่าการทำงานที่บ้านดีไหมคะ', 'khun khit wa kan tham ngan thi ban di mai kha', 'Tycker du att det är bra att jobba hemifrån?'),
          d('B', 'ผมคิดว่าดีครับ เพราะว่าไม่ต้องเดินทาง', 'phom khit wa di khrap phro wa mai tong doen thang', 'Jag tycker att det är bra, eftersom man inte behöver pendla.'),
          d('A', 'ฉันเห็นด้วยค่ะ แต่บางคนรู้สึกเหงา', 'chan hen duai kha tae bang khon ru suek ngao', 'Jag håller med, men en del känner sig ensamma.'),
          d('B', 'จริงครับ อย่างไรก็ตาม ผมว่าข้อดีมีมากกว่าข้อเสีย', 'ching khrap yang rai ko tam phom wa kho di mi mak kwa kho sia', 'Det stämmer. Ändå tycker jag att fördelarna är fler än nackdelarna.'),
          d('A', 'ถ้าอย่างนั้น บริษัทควรให้ทำงานที่บ้านได้สัปดาห์ละสองวัน', 'tha yang nan borisat khuan hai tham ngan thi ban dai sapda la song wan', 'I så fall borde företaget låta folk jobba hemma två dagar i veckan.')
        ],
        vocab: [w('คิดว่า', 'khit wa', 'tycka att, tro att'), w('เห็นด้วย', 'hen duai', 'hålla med'), w('ไม่เห็นด้วย', 'mai hen duai', 'inte hålla med'), w('เพราะว่า', 'phro wa', 'eftersom'),
          w('แต่', 'tae', 'men'), w('อย่างไรก็ตาม', 'yang rai ko tam', 'ändå, dock'), w('ข้อดี', 'kho di', 'fördel'), w('ข้อเสีย', 'kho sia', 'nackdel'), w('ควร', 'khuan', 'borde'), w('รู้สึก', 'ru suek', 'känna (sig)')],
        grammar: { title: S('Åsikter och sambandsord'),
          body: S('คิดว่า (khit wa) + sats = tycka/tro att …: ผมคิดว่าดี = jag tycker att det är bra. I tal förkortas det ofta: ผมว่า … (phom wa).\n\nMotivera med เพราะว่า (phro wa, eftersom). Invänd med แต่ (tae, men) eller det mer formella อย่างไรก็ตาม (yang rai ko tam, dock).\n\nควร (khuan) + verb = borde: ควรพักผ่อน (khuan phak phon) = borde vila.\n\nการ (kan) framför ett verb gör det till ett substantiv: ทำงาน (arbeta) → การทำงาน (arbetet, att arbeta).\n\nI Thailand säger man ofta emot på ett mjukt sätt, till exempel ก็จริงครับ แต่ … (ko ching khrap tae …, det är sant, men …).') },
        exercises: [
          { type: 'mc', prompt: 'เห็นด้วย', rom: 'hen duai', q: S('Vad betyder det?'), opts: ['hålla med', 'tycka', 'eftersom'], a: 0 },
          { type: 'gap', text: 'ผมชอบทำงานที่บ้าน___ไม่ต้องเดินทาง', tr: S('Jag gillar att jobba hemma eftersom jag inte behöver pendla.'), opts: ['เพราะว่า', 'แต่', 'ควร'], a: 'เพราะว่า' },
          { type: 'listen', say: 'ฉันไม่เห็นด้วยค่ะ', opts: ['Jag håller inte med.', 'Jag håller med.', 'Jag vet inte.'], a: 0 },
          { type: 'order', answer: 'ผม|คิด|ว่า|ดี|ครับ', rom: 'phom khit wa di khrap', tr: S('Jag tycker att det är bra.') },
          { type: 'write', task: S('Skriv din åsikt om att jobba hemifrån och ge ett skäl med เพราะว่า.'), model: 'ฉันคิดว่าดีค่ะ เพราะว่ามีเวลากับครอบครัวมากขึ้น (chan khit wa di kha phro wa mi wela kap khropkhrua mak khuen)' }
        ] },

      { id: 'th-5-register', level: 'L5', icon: '🎩', skills: ['conversation', 'grammar', 'work'],
        title: S('Formellt och vardagligt språk'), goal: S('Välja rätt ord beroende på vem du talar med'),
        dialogue: [
          d('A', 'ท่านต้องการรับประทานอะไรครับ', 'than tongkan rapprathan arai khrap', 'Vad önskar ni äta? (mycket formellt)'),
          d('B', 'คุณอยากทานอะไรคะ', 'khun yak than arai kha', 'Vad vill du äta? (artigt)'),
          d('A', 'กินอะไรดี', 'kin arai di', 'Vad ska vi äta? (vardagligt, bland vänner)'),
          d('B', 'ไปกินข้าวกันไหม', 'pai kin khao kan mai', 'Ska vi gå och äta?'),
          d('A', 'ได้เลย ไปกัน', 'dai loei pai kan', 'Absolut, vi går!')
        ],
        vocab: [w('กิน', 'kin', 'äta (vardagligt)'), w('ทาน', 'than', 'äta (artigt)'), w('รับประทาน', 'rapprathan', 'äta (formellt)'), w('อยาก', 'yak', 'vilja'),
          w('ต้องการ', 'tongkan', 'önska, behöva (formellt)'), w('ท่าน', 'than', 'ni (mycket artigt)', 'Används om och till personer med hög ställning.'),
          w('กัน', 'kan', 'tillsammans; varandra'), w('ได้เลย', 'dai loei', 'absolut, självklart'), w('ขอบพระคุณ', 'khop phra khun', 'tack (mycket formellt)')],
        grammar: { title: S('Tre stilnivåer'),
          body: S('Thailändska har olika ord för samma sak beroende på situationen. Vardagligt: กิน (kin) – med vänner och familj. Artigt: ทาน (than) – med kunder, äldre och personer du inte känner. Formellt: รับประทาน (rapprathan) – i tal, skrift och vid officiella tillfällen.\n\nSamma sak gäller tack: ขอบใจ (khop chai) till yngre och nära vänner, ขอบคุณ (khop khun) till de flesta, ขอบพระคุณ (khop phra khun) mycket formellt.\n\nกัน (kan) efter verbet betyder ”tillsammans”: ไปกัน = vi går. ไปกินข้าวกันไหม = ska vi gå och äta?\n\nFör kungafamiljen finns ett eget ordförråd (ราชาศัพท์, rachasap), som du inte behöver i vardagen.'),
          table: [['Vardagligt', 'Artigt', 'Formellt', 'Betydelse'], ['กิน kin', 'ทาน than', 'รับประทาน rapprathan', 'äta'], ['ขอบใจ khop chai', 'ขอบคุณ khop khun', 'ขอบพระคุณ khop phra khun', 'tack'], ['อยาก yak', 'อยาก yak', 'ต้องการ tongkan', 'vilja, önska']] },
        exercises: [
          { type: 'mc', prompt: 'รับประทาน', rom: 'rapprathan', q: S('Vilken stilnivå?'), opts: ['formellt', 'vardagligt', 'barnspråk'], a: 0 },
          { type: 'gap', text: 'ไปกินข้าว___ไหม', tr: S('Ska vi gå och äta (tillsammans)?'), opts: ['กัน', 'ครับ', 'แล้ว'], a: 'กัน' },
          { type: 'listen', say: 'ขอบพระคุณครับ', opts: ['Tack (mycket formellt).', 'Tack (till en vän).', 'Förlåt.'], a: 0 },
          { type: 'mc', prompt: '🎩', noSay: true, q: S('Du talar på ett officiellt möte. Vilket ord för ”äta” passar bäst?'), opts: ['รับประทาน', 'กิน', 'ขอบใจ'], a: 0 },
          { type: 'order', answer: 'คุณ|อยาก|ทาน|อะไร|คะ', rom: 'khun yak than arai kha', tr: S('Vad vill du äta?') }
        ] }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
