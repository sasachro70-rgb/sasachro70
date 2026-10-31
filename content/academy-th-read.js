/* Thai Learning Academy – "Läsa och skriva thailändska" / อ่านเขียนภาษาไทย (course key "thr", target language Thai).
   A reading and spelling course for Thai children growing up in Sweden (Skolverket, modersmål, centralt innehåll åk 1–3).
   The ORDER of the chapters follows the teacher's book "BOOK 42" by Kru Aom (ครูอ้อม): vowel groups chapter by chapter,
   final consonants, vowels that change or hide their form, consonant classes and tones, clusters and leading consonants,
   live and dead syllables, punctuation, ฤ ฦ and the silent-letter mark. The sentences, words, explanations and exercises
   here are written for the app (the book's stories and pages are not copied); the book stays the teacher's material in class.
   Facts used: 44 consonants (21 initial sounds), 3 consonant classes, 21 vowel signs / 32 vowel sounds, 4 tone marks / 5 tones,
   9 final-consonant groups (มาตราตัวสะกด). Romanization: RTGS (no tones, no vowel length – listen to the voice).
   Explanations: Swedish for everything; titles, goals and grammar also in Thai (shown when the learner picks ภาษาไทย).
   Format: the same as content/academy-th.js; checked by tests/thai-read.test.js. */
(function (G) {
  'use strict';
  const C = G.FGH_CONTENT = G.FGH_CONTENT || {};
  const A = C.academy = C.academy || { courses: {} };
  const d = (t, rom, sv) => ({ who: '', t, rom, tr: { sv } });
  const w = (t, rom, sv, note) => ({ t, rom, tr: { sv }, note: note ? { sv: note } : null });
  const S = (sv, th) => th ? { sv, th } : { sv };
  const LIVE = ['คำเป็น (levande stavelse)', 'คำตาย (död stavelse)'];

  A.courses.thr = {
    target: 'th', explain: ['sv'], sample: false, passPct: 70, romanization: 'RTGS', track: 'thai',
    source: 'BOOK 42 – Kru Aom (ครูอ้อม)',
    name: { sv: 'Läsa och skriva thailändska', en: 'Read and write Thai', th: 'อ่านเขียนภาษาไทย' },
    desc: { sv: 'Läs- och stavningskurs för thailändska barn i Sverige. Kapitlens ordning följer boken BOOK 42 av Kru Aom; texter och övningar är skrivna för appen.',
      en: 'Reading and spelling for Thai children in Sweden. The chapters follow the order of BOOK 42 by Kru Aom; texts and exercises are written for the app.',
      th: 'หลักสูตรอ่านและสะกดคำสำหรับเด็กไทยในสวีเดน ลำดับบทเรียนตามหนังสือ BOOK 42 ของครูอ้อม เนื้อหาและแบบฝึกหัดเขียนขึ้นใหม่สำหรับแอป' },
    levels: [
      { id: 'R1', n: 1, name: { sv: 'Vokaler och slutkonsonanter', en: 'Vowels and final consonants', th: 'สระและตัวสะกด' } },
      { id: 'R2', n: 2, name: { sv: 'Vokaler som ändrar form', en: 'Vowels that change form', th: 'สระเปลี่ยนรูปและสระลดรูป' } },
      { id: 'R3', n: 3, name: { sv: 'Toner, kluster och ledande konsonanter', en: 'Tones, clusters and leading consonants', th: 'การผันวรรณยุกต์ คำควบกล้ำ อักษรนำ' } },
      { id: 'R4', n: 4, name: { sv: 'Fler vokalljud', en: 'More vowel sounds', th: 'สระประสมและสระเกิน' } },
      { id: 'R5', n: 5, name: { sv: 'Meningar och specialtecken', en: 'Sentences and special signs', th: 'ประโยค เครื่องหมาย และตัวการันต์' } }
    ],
    lessons: [
      /* ---------- Kapitel 1: อะ อา อิ อี ---------- */
      { id: 'thr-1', level: 'R1', icon: '🌼', skills: ['reading', 'pronunciation', 'vocabulary'], practice: true,
        title: S('Kapitel 1 · Vokalerna อะ อา อิ อี', 'บทที่ ๑ สระอะ สระอา สระอิ สระอี'),
        goal: S('Läsa korta och långa a och i och sätta ihop konsonant + vokal', 'อ่านสระเสียงสั้นและเสียงยาว และประสมพยัญชนะกับสระ'),
        dialogue: [d('ตามาหายาย', 'ta ma ha yai', 'Morfar kommer för att hälsa på mormor.'), d('ยายมีกะทิ', 'yai mi kathi', 'Mormor har kokosmjölk.'), d('มะลิสีขาว', 'mali si khao', 'Jasminen är vit.')],
        vocab: [w('ตา', 'ta', 'morfar; öga', 'Samma ord betyder både morfar och öga.'), w('มา', 'ma', 'komma'), w('มี', 'mi', 'ha, finnas'), w('ดี', 'di', 'bra, snäll'),
          w('มะลิ', 'mali', 'jasmin', 'Två korta vokaler: มะ (ma) + ลิ (li).'), w('กะทิ', 'kathi', 'kokosmjölk'), w('ปี', 'pi', 'år'), w('สี', 'si', 'färg')],
        grammar: { title: S('Korta och långa vokaler', 'สระเสียงสั้นและสระเสียงยาว'),
          body: S('Thailändska vokaler kommer i par: en kort och en lång. -ะ (a) är kort och -า (aa) är lång. -ิ (i) är kort och -ี (ii) är lång. Längden kan ändra betydelsen, så lyssna noga.\n\nVokaltecknet skrivs alltid tillsammans med en konsonant. Strecket i -า visar var konsonanten står: ม + -า = มา. Börjar ordet med ett vokalljud används อ som "hållare": อา, อี.\n\nSätt ihop konsonant och vokal (แจกลูก) – läs raderna i tabellen och tryck på 🔊.',
            'สระไทยมาเป็นคู่ เสียงสั้นกับเสียงยาว -ะ เป็นเสียงสั้น -า เป็นเสียงยาว -ิ สั้น -ี ยาว ความยาวของเสียงทำให้ความหมายเปลี่ยนได้ จึงต้องฟังให้ดี\n\nสระต้องเขียนคู่กับพยัญชนะเสมอ ขีด (–) บอกตำแหน่งของพยัญชนะ เช่น ม + -า = มา ถ้าคำขึ้นต้นด้วยเสียงสระ ใช้ อ เป็นตัวยืน เช่น อา อี\n\nฝึกแจกลูกพยัญชนะกับสระ อ่านตามตารางแล้วกด 🔊'),
          table: [['', 'อะ', 'อา', 'อิ', 'อี'], ['ม', 'มะ', 'มา', 'มิ', 'มี'], ['ก', 'กะ', 'กา', 'กิ', 'กี'], ['ด', 'ดะ', 'ดา', 'ดิ', 'ดี'], ['ต', 'ตะ', 'ตา', 'ติ', 'ตี'], ['ป', 'ปะ', 'ปา', 'ปิ', 'ปี']] },
        exercises: [
          { type: 'listen', say: 'มี', opts: ['มี', 'มิ', 'มา'], a: 0 },
          { type: 'listen', say: 'มะลิ', opts: ['มะลิ', 'มาลี', 'มะลี'], a: 0 },
          { type: 'mc', prompt: 'ม + -า', noSay: true, q: S('Vilken stavelse blir det?'), opts: ['มา', 'มะ', 'มี'], a: 0 },
          { type: 'mc', prompt: 'ด + -ี', noSay: true, q: S('Vilken stavelse blir det?'), opts: ['ดี', 'ดิ', 'ดา'], a: 0 },
          { type: 'mc', prompt: 'ตา', q: S('Levande eller död stavelse? (lång vokal, ingen slutkonsonant)'), opts: LIVE, a: 0 },
          { type: 'mc', prompt: 'กะ', q: S('Levande eller död stavelse? (kort vokal, ingen slutkonsonant)'), opts: LIVE, a: 1 },
          { type: 'order', answer: 'ยาย|มี|กะทิ', rom: 'yai mi kathi', tr: S('Mormor har kokosmjölk.') },
          { type: 'gap', text: 'มะลิ___ขาว', opts: ['สี', 'ปี', 'ดี'], a: 'สี', tr: S('Jasminen har vit färg.') }
        ] },

      /* ---------- Kapitel 2: ไอ ใอ โอะ โอ + slutkonsonanter ---------- */
      { id: 'thr-2', level: 'R1', icon: '🏫', skills: ['reading', 'writing', 'vocabulary'], practice: true,
        title: S('Kapitel 2 · ไอ ใอ โอะ โอ och slutkonsonanterna', 'บทที่ ๒ สระไอ ใอ โอะ โอ และมาตราตัวสะกด'),
        goal: S('Skilja ไ- och ใ-, läsa o-ljuden och känna igen de nio slutkonsonantgrupperna', 'แยกไม้มลายกับไม้ม้วน อ่านสระโอะ โอ และรู้จักมาตราตัวสะกดทั้ง ๙ แม่'),
        dialogue: [d('ยายใจดี', 'yai chai di', 'Mormor är snäll.'), d('ตาไปตลาด', 'ta pai talat', 'Morfar går till marknaden.'), d('ใครมาโรงเรียน', 'khrai ma rongrian', 'Vem kommer till skolan?')],
        vocab: [w('ไป', 'pai', 'gå, åka'), w('ใจ', 'chai', 'hjärta', 'Skrivs med ใ (mai muan) – ett av de 20 orden med ใ.'), w('ใจดี', 'chai di', 'snäll'), w('ใคร', 'khrai', 'vem'),
          w('โต', 'to', 'stor, växa'), w('โรงเรียน', 'rongrian', 'skola'), w('กิน', 'kin', 'äta', 'Slutar på น: gruppen แม่ กน.'), w('นก', 'nok', 'fågel', 'Slutar på ก: gruppen แม่ กก.')],
        grammar: { title: S('ไ- eller ใ-? Och de nio slutkonsonantgrupperna', 'ไม้มลายหรือไม้ม้วน และมาตราตัวสะกด ๙ แม่'),
          body: S('ไ- (mai malai) och ใ- (mai muan) låter likadant: ai. ใ används bara i 20 vanliga ord, till exempel ใจ, ใคร, ใบ, ใส่, ใหม่, ให้ och ใช้. Alla andra ord skrivs med ไ.\n\nโ-ะ är kort o och โ- är långt o: โต (to).\n\nEn slutkonsonant (ตัวสะกด) låter ofta annorlunda än i början av ordet. Därför delas slutljuden in i grupper som heter แม่ (mae). Ord utan slutkonsonant hör till แม่ ก กา. Tabellen visar alla nio grupper.',
            'ไม้มลาย (ไ-) และไม้ม้วน (ใ-) ออกเสียงเหมือนกัน ใ ใช้เพียง ๒๐ คำ เช่น ใจ ใคร ใบ ใส่ ใหม่ ให้ ใช้ คำอื่นใช้ ไ ทั้งหมด\n\nโ-ะ เป็นสระเสียงสั้น โ- เป็นสระเสียงยาว เช่น โต\n\nตัวสะกดหลายตัวออกเสียงต่างจากตอนเป็นพยัญชนะต้น จึงแบ่งเป็นมาตราที่เรียกว่า "แม่" คำที่ไม่มีตัวสะกดอยู่ในแม่ ก กา ดูมาตราทั้ง ๙ ในตาราง'),
          table: [['มาตรา', 'ตัวสะกด', 'ตัวอย่าง'], ['แม่ ก กา', '–', 'ตา'], ['แม่ กก', 'ก ข ค ฆ', 'นก'], ['แม่ กด', 'ด จ ช ซ ต ถ ท ศ ษ ส …', 'มด'], ['แม่ กบ', 'บ ป พ ฟ ภ', 'กบ'],
            ['แม่ กง', 'ง', 'ลิง'], ['แม่ กน', 'น ญ ณ ร ล ฬ', 'กิน'], ['แม่ กม', 'ม', 'ลม'], ['แม่ เกย', 'ย', 'ยาย'], ['แม่ เกอว', 'ว', 'ขาว']] },
        exercises: [
          { type: 'listen', say: 'ใบ', opts: ['ใบ', 'ไป', 'ใจ'], a: 0 },
          { type: 'mc', prompt: 'ใจ', q: S('Vilket vokaltecken har ordet?'), opts: ['ใ- (ไม้ม้วน)', 'ไ- (ไม้มลาย)'], a: 0 },
          { type: 'mc', prompt: 'กิน', q: S('Vilken slutkonsonantgrupp?'), opts: ['แม่ กน', 'แม่ กม', 'แม่ กง'], a: 0 },
          { type: 'mc', prompt: 'มด', q: S('Vilken slutkonsonantgrupp?'), opts: ['แม่ กด', 'แม่ กบ', 'แม่ กก'], a: 0 },
          { type: 'mc', prompt: 'ลิง', q: S('Vilken slutkonsonantgrupp?'), opts: ['แม่ กง', 'แม่ กน', 'แม่ เกย'], a: 0 },
          { type: 'order', answer: 'ยาย|ใจ|ดี', rom: 'yai chai di', tr: S('Mormor är snäll.') },
          { type: 'gap', text: 'ใคร___โรงเรียน', opts: ['มา', 'ดี', 'ใบ'], a: 'มา', tr: S('Vem kommer till skolan?') }
        ] },

      /* ---------- Kapitel 3: เอะ เอ แอะ แอ ---------- */
      { id: 'thr-3', level: 'R2', icon: '🐈', skills: ['reading', 'pronunciation', 'vocabulary'], practice: true,
        title: S('Kapitel 3 · Vokalerna เอะ เอ แอะ แอ', 'บทที่ ๓ สระเอะ สระเอ สระแอะ สระแอ'),
        goal: S('Läsa e- och ä-ljuden och se hur เ-ะ och แ-ะ ändrar form med slutkonsonant', 'อ่านสระเอะ เอ แอะ แอ และรู้ว่าสระเอะ แอะ เปลี่ยนรูปเมื่อมีตัวสะกด'),
        dialogue: [d('เด็กเล่นที่ทะเล', 'dek len thi thale', 'Barnen leker vid havet.'), d('แมวเห็นแพะ', 'maeo hen phae', 'Katten ser geten.'), d('เด็กเก่ง', 'dek keng', 'Barnet är duktigt.')],
        vocab: [w('เด็ก', 'dek', 'barn', 'เ-ะ + slutkonsonant skrivs เ-็: เด็ก.'), w('เล่น', 'len', 'leka'), w('ทะเล', 'thale', 'hav'), w('แมว', 'maeo', 'katt'),
          w('แพะ', 'phae', 'get'), w('เก่ง', 'keng', 'duktig'), w('เห็น', 'hen', 'se'), w('แม่', 'mae', 'mamma')],
        grammar: { title: S('Vokaler som ändrar form (สระเปลี่ยนรูป)', 'สระเปลี่ยนรูป'),
          body: S('เ-ะ (e) och แ-ะ (ä) är korta, เ- och แ- är långa. Vokaltecknet står FÖRE konsonanten men läses efter den: เ + ด = เด.\n\nNär en kort vokal får en slutkonsonant försvinner -ะ och ersätts av ไม้ไต่คู้ (-็): เ-ะ + ก → เด็ก, แ-ะ + ง → แข็ง. Det kallas att vokalen byter form.',
            'เ-ะ และ แ-ะ เป็นเสียงสั้น เ- และ แ- เป็นเสียงยาว สระเขียนอยู่หน้าพยัญชนะแต่อ่านออกเสียงหลังพยัญชนะ เช่น เ + ด = เด\n\nเมื่อสระเสียงสั้นมีตัวสะกด -ะ จะหายไปและใช้ไม้ไต่คู้ (-็) แทน เช่น เด็ก แข็ง เรียกว่าสระเปลี่ยนรูป'),
          table: [['สระ', 'ไม่มีตัวสะกด', 'มีตัวสะกด'], ['เ-ะ', 'เตะ', 'เด็ก'], ['เ-', 'เท', 'เล่น'], ['แ-ะ', 'แพะ', 'แข็ง'], ['แ-', 'แม่', 'แมว']] },
        exercises: [
          { type: 'listen', say: 'แมว', opts: ['แมว', 'เมา', 'แม่'], a: 0 },
          { type: 'mc', prompt: 'เด็ก', q: S('Vilken vokal finns i ordet?'), opts: ['เ-ะ (kort e)', 'เ- (långt e)', 'แ- (ä)'], a: 0 },
          { type: 'mc', prompt: 'ทะเล', q: S('Vad betyder ordet?'), opts: ['hav', 'katt', 'get'], a: 0 },
          { type: 'mc', prompt: 'แพะ', q: S('Levande eller död stavelse?'), opts: LIVE, a: 1 },
          { type: 'order', answer: 'แมว|เห็น|แพะ', rom: 'maeo hen phae', tr: S('Katten ser geten.') },
          { type: 'gap', text: 'เด็ก___ที่ทะเล', opts: ['เล่น', 'แมว', 'แพะ'], a: 'เล่น', tr: S('Barnen leker vid havet.') }
        ] },

      /* ---------- Kapitel 4: อะ och โอะ med slutkonsonant ---------- */
      { id: 'thr-4', level: 'R2', icon: '🐸', skills: ['reading', 'writing', 'vocabulary'], practice: true,
        title: S('Kapitel 4 · Gömda vokaler: อะ och โอะ med slutkonsonant', 'บทที่ ๔ สระอะ สระโอะ เมื่อมีตัวสะกด'),
        goal: S('Läsa ord där vokalen blir ั eller inte syns alls', 'อ่านคำที่สระเปลี่ยนเป็นไม้หันอากาศ หรือสระลดรูปจนมองไม่เห็น'),
        dialogue: [d('กบกับมด', 'kop kap mot', 'Grodan och myran.'), d('นกบินบนฟ้า', 'nok bin bon fa', 'Fågeln flyger på himlen.'), d('คนนั้นตัดผม', 'khon nan tat phom', 'Den personen klipper håret.')],
        vocab: [w('กบ', 'kop', 'groda', 'Vokalen โ-ะ syns inte: ก + (o) + บ.'), w('มด', 'mot', 'myra'), w('คน', 'khon', 'människa'), w('ผม', 'phom', 'hår; jag (sagt av en pojke/man)'),
          w('ฟัน', 'fan', 'tand', '-ะ + slutkonsonant skrivs ั: ฟัน.'), w('กับ', 'kap', 'och, med'), w('บิน', 'bin', 'flyga'), w('ตัด', 'tat', 'klippa, skära')],
        grammar: { title: S('Vokaler som gömmer sig (สระลดรูป)', 'สระลดรูป'),
          body: S('När -ะ (a) får en slutkonsonant byts -ะ mot ไม้หันอากาศ (ั) ovanför konsonanten: ฟ + ั + น = ฟัน (fan).\n\nNär โ-ะ (o) får en slutkonsonant försvinner vokaltecknet helt. Du ser bara två konsonanter, men läser ett o mellan dem: ก-บ = กบ (kop), ค-น = คน (khon).',
            'เมื่อสระอะมีตัวสะกด ให้เปลี่ยน -ะ เป็นไม้หันอากาศ (ั) เช่น ฟัน\n\nเมื่อสระโอะมีตัวสะกด รูปสระจะหายไปทั้งหมด เห็นแต่พยัญชนะสองตัว แต่อ่านออกเสียงโอะ เช่น กบ คน'),
          table: [['สระ', 'ไม่มีตัวสะกด', 'มีตัวสะกด'], ['-ะ', 'กะ', 'กัน'], ['โ-ะ', 'โปะ', 'กบ']] },
        exercises: [
          { type: 'listen', say: 'กบ', opts: ['กบ', 'กับ', 'คบ'], a: 0 },
          { type: 'mc', prompt: 'คน', q: S('Vilken vokal är gömd i ordet?'), opts: ['โ-ะ (o)', '-ะ (a)', 'เ-ะ (e)'], a: 0 },
          { type: 'mc', prompt: 'ฟัน', q: S('Vad står tecknet ั för?'), opts: ['vokalen -ะ när ordet har slutkonsonant', 'en tonmarkering', 'vokalen -า'], a: 0 },
          { type: 'mc', prompt: 'มด', q: S('Vad betyder ordet?'), opts: ['myra', 'groda', 'fågel'], a: 0 },
          { type: 'order', answer: 'กบ|กับ|มด', rom: 'kop kap mot', tr: S('Grodan och myran.') },
          { type: 'gap', text: '___บินบนฟ้า', opts: ['นก', 'กบ', 'มด'], a: 'นก', tr: S('Fågeln flyger på himlen.') }
        ] },

      /* ---------- Kapitel 5: เอียะ เอีย เอือะ เอือ + konsonantklasser och toner ---------- */
      { id: 'thr-5', level: 'R3', icon: '🎵', skills: ['reading', 'pronunciation', 'listening'], practice: true,
        title: S('Kapitel 5 · เอีย och เอือ – konsonantklasser och toner', 'บทที่ ๕ สระเอีย เอือ ไตรยางศ์และการผันวรรณยุกต์'),
        goal: S('Läsa ia- och uea-ljuden och räkna ut tonen med konsonantklass och tontecken', 'อ่านสระเอีย เอือ และหาเสียงวรรณยุกต์จากอักษรสามหมู่และรูปวรรณยุกต์'),
        dialogue: [d('เพื่อนเรียนภาษาไทย', 'phuean rian phasa thai', 'Min vän läser thailändska.'), d('เสือเดินในป่า', 'suea doen nai pa', 'Tigern går i skogen.'), d('เดือนหน้าไปเมืองไทย', 'duean na pai mueang thai', 'Nästa månad åker vi till Thailand.')],
        vocab: [w('เรียน', 'rian', 'studera, gå i skolan'), w('เขียน', 'khian', 'skriva'), w('เพื่อน', 'phuean', 'vän'), w('เสือ', 'suea', 'tiger'),
          w('เรือ', 'ruea', 'båt'), w('เดือน', 'duean', 'månad'), w('ป่า', 'pa', 'skog', 'ป är en mellankonsonant + ่ = låg ton (เอก).'), w('ป้า', 'pa', 'faster/moster (äldre än mamma eller pappa)', 'ป + ้ = fallande ton (โท).')],
        grammar: { title: S('Tre konsonantklasser och fyra tontecken', 'อักษรสามหมู่และรูปวรรณยุกต์'),
          body: S('De 44 konsonanterna delas i tre klasser (ไตรยางศ์): mellanklass (อักษรกลาง: ก จ ด ต ฎ ฏ บ ป อ), högklass (อักษรสูง: ข ฃ ฉ ฐ ถ ผ ฝ ศ ษ ส ห) och lågklass (อักษรต่ำ: alla andra).\n\nDet finns fem toner men bara fyra tontecken: ่ (ไม้เอก), ้ (ไม้โท), ๊ (ไม้ตรี) och ๋ (ไม้จัตวา). Vilken ton du hör beror på konsonantklassen + tecknet. Bara mellanklassen kan ta alla fem tonerna: ปา ป่า ป้า ป๊า ป๋า.\n\nUtan tecken: mellan- och lågklass får mellanton (สามัญ), högklass får stigande ton (จัตวา): ขา.',
            'พยัญชนะ ๔๔ ตัวแบ่งเป็นอักษรสามหมู่ (ไตรยางศ์) อักษรกลาง: ก จ ด ต ฎ ฏ บ ป อ อักษรสูง: ข ฃ ฉ ฐ ถ ผ ฝ ศ ษ ส ห อักษรต่ำ: ตัวที่เหลือทั้งหมด\n\nเสียงวรรณยุกต์มี ๕ เสียง แต่รูปวรรณยุกต์มี ๔ รูป คือ ไม้เอก ไม้โท ไม้ตรี ไม้จัตวา เสียงที่ได้ขึ้นอยู่กับหมู่ของอักษรและรูปวรรณยุกต์ อักษรกลางผันได้ครบ ๕ เสียง เช่น ปา ป่า ป้า ป๊า ป๋า\n\nคำเป็นที่ไม่มีรูปวรรณยุกต์: อักษรกลางและอักษรต่ำเป็นเสียงสามัญ อักษรสูงเป็นเสียงจัตวา เช่น ขา'),
          table: [['หมู่', 'สามัญ', 'เอก', 'โท', 'ตรี', 'จัตวา'], ['กลาง ป', 'ปา', 'ป่า', 'ป้า', 'ป๊า', 'ป๋า'], ['สูง ข', '–', 'ข่า', 'ข้า', '–', 'ขา'], ['ต่ำ ค', 'คา', '–', 'ค่า', 'ค้า', '–']] },
        exercises: [
          { type: 'listen', say: 'เสือ', opts: ['เสือ', 'เสีย', 'เรือ'], a: 0 },
          { type: 'mc', prompt: 'ข', q: S('Vilken konsonantklass?'), opts: ['อักษรสูง (högklass)', 'อักษรกลาง (mellanklass)', 'อักษรต่ำ (lågklass)'], a: 0 },
          { type: 'mc', prompt: 'ก', q: S('Vilken konsonantklass?'), opts: ['อักษรกลาง (mellanklass)', 'อักษรสูง (högklass)', 'อักษรต่ำ (lågklass)'], a: 0 },
          { type: 'mc', prompt: 'ป้า', q: S('Vilken ton? (mellanklass + ้)'), opts: ['โท (fallande)', 'เอก (låg)', 'ตรี (hög)'], a: 0 },
          { type: 'mc', prompt: 'ค่า', q: S('Vilken ton? (lågklass + ่)'), opts: ['โท (fallande)', 'เอก (låg)', 'จัตวา (stigande)'], a: 0 },
          { type: 'order', answer: 'เพื่อน|เรียน|ภาษาไทย', rom: 'phuean rian phasa thai', tr: S('Min vän läser thailändska.') },
          { type: 'gap', text: '___หน้าไปเมืองไทย', opts: ['เดือน', 'เสือ', 'เรือ'], a: 'เดือน', tr: S('Nästa månad åker vi till Thailand.') }
        ] },

      /* ---------- Kapitel 6: อุ อู อึ อือ + kluster och ledande konsonanter ---------- */
      { id: 'thr-6', level: 'R3', icon: '🐟', skills: ['reading', 'pronunciation', 'vocabulary'], practice: true,
        title: S('Kapitel 6 · อุ อู อึ อือ, kluster och ledande konsonanter', 'บทที่ ๖ สระอุ อู อึ อือ คำควบกล้ำ และอักษรนำ'),
        goal: S('Läsa u- och ue-ljuden, ord med två konsonanter i början och ord där ห eller อ leder', 'อ่านสระอุ อู อึ อือ คำควบกล้ำ และคำที่มี ห หรือ อ นำ'),
        dialogue: [d('ครูอยู่ที่โรงเรียน', 'khru yu thi rongrian', 'Läraren är i skolan.'), d('หมากินปลา', 'ma kin pla', 'Hunden äter fisk.'), d('วันสงกรานต์เล่นน้ำ', 'wan songkran len nam', 'På Songkran leker vi med vatten.')],
        vocab: [w('ครู', 'khru', 'lärare', 'Kluster: ค + ร läses tillsammans.'), w('ปลา', 'pla', 'fisk', 'Kluster: ป + ล.'), w('หมา', 'ma', 'hund', 'ห leder ม: ordet får högklassens ton (stigande).'), w('หนู', 'nu', 'mus; jag (sagt av ett barn)'),
          w('อยู่', 'yu', 'vara, bo, finnas', 'อ leder ย och hörs inte.'), w('มือ', 'mue', 'hand'), w('ปู', 'pu', 'krabba'), w('สงกรานต์', 'songkran', 'Songkran, thailändskt nyår i april')],
        grammar: { title: S('Kluster (คำควบกล้ำ) och ledande konsonanter (อักษรนำ)', 'คำควบกล้ำและอักษรนำ'),
          body: S('อุ/อู (u) och อึ/อือ (ue) skrivs under eller över konsonanten: ปู, มือ. อือ utan slutkonsonant skrivs -ือ (มือ), med slutkonsonant bara -ื (คืน).\n\nKluster: ร, ล eller ว efter ก ข ค ต ป พ läses ihop med första konsonanten: ครู, ปลา, กว้าง.\n\nLedande konsonant: ห före en låg konsonant utan par (ง ญ น ม ย ร ล ว) hörs inte men ger ordet högklassens ton: หมา, หนู. อ leder ย i fyra ord: อย่า, อยู่, อย่าง, อยาก.',
            'สระอุ อู อึ อือ เขียนใต้หรือบนพยัญชนะ เช่น ปู มือ สระอือไม่มีตัวสะกดเขียน -ือ มีตัวสะกดเขียน -ื เช่น คืน\n\nคำควบกล้ำ: ร ล ว ตามหลัง ก ข ค ต ป พ อ่านออกเสียงพร้อมกัน เช่น ครู ปลา กว้าง\n\nอักษรนำ: ห นำอักษรต่ำเดี่ยว (ง ญ น ม ย ร ล ว) ไม่ออกเสียง ห แต่ผันเสียงตามอักษรสูง เช่น หมา หนู อ นำ ย มี ๔ คำ คือ อย่า อยู่ อย่าง อยาก'),
          table: [['ควบกล้ำ', 'ตัวอย่าง'], ['กร กล กว', 'กลอง'], ['คร คล คว', 'ครู'], ['ปร ปล', 'ปลา'], ['พร พล', 'พระ'], ['ห นำ', 'หมา หนู'], ['อ นำ ย', 'อยู่ อยาก']] },
        exercises: [
          { type: 'listen', say: 'ครู', opts: ['ครู', 'คู่', 'ปู'], a: 0 },
          { type: 'mc', prompt: 'ปลา', q: S('Vilket kluster börjar ordet med?'), opts: ['ปล', 'พล', 'กล'], a: 0 },
          { type: 'mc', prompt: 'หมา', q: S('Varför får ordet stigande ton?'), opts: ['ห leder ม, så ordet följer högklassen', 'ม är en högklasskonsonant', 'ordet har tontecknet ๋'], a: 0 },
          { type: 'mc', prompt: 'อยู่', q: S('Vilken bokstav hörs inte?'), opts: ['อ', 'ย', 'ู'], a: 0 },
          { type: 'mc', prompt: 'มือ', q: S('Vad betyder ordet?'), opts: ['hand', 'mus', 'krabba'], a: 0 },
          { type: 'order', answer: 'หมา|กิน|ปลา', rom: 'ma kin pla', tr: S('Hunden äter fisk.') },
          { type: 'gap', text: 'ครู___ที่โรงเรียน', opts: ['อยู่', 'หนู', 'ปู'], a: 'อยู่', tr: S('Läraren är i skolan.') }
        ] },

      /* ---------- Kapitel 7: เอาะ ออ อัวะ อัว ---------- */
      { id: 'thr-7', level: 'R4', icon: '✈️', skills: ['reading', 'vocabulary', 'real'], practice: true,
        title: S('Kapitel 7 · Vokalerna เอาะ ออ อัวะ อัว', 'บทที่ ๗ สระเอาะ สระออ สระอัวะ สระอัว'),
        goal: S('Läsa å- och ua-ljuden och se hur อัว skrivs med slutkonsonant', 'อ่านสระเอาะ ออ อัวะ อัว และรู้ว่าสระอัวเปลี่ยนรูปเมื่อมีตัวสะกด'),
        dialogue: [d('พ่อนั่งเครื่องบิน', 'pho nang khrueang bin', 'Pappa åker flygplan.'), d('เราจะไปสวีเดน', 'rao cha pai sawiden', 'Vi ska åka till Sverige.'), d('ฉันไม่กลัว', 'chan mai klua', 'Jag är inte rädd.')],
        vocab: [w('พ่อ', 'pho', 'pappa'), w('หมอ', 'mo', 'läkare'), w('เกาะ', 'ko', 'ö'), w('นอน', 'non', 'sova, ligga'),
          w('กลัว', 'klua', 'rädd'), w('วัว', 'wua', 'ko'), w('สวน', 'suan', 'trädgård', 'อัว + slutkonsonant: bara ว syns – ส-ว-น.'), w('เครื่องบิน', 'khrueang bin', 'flygplan')],
        grammar: { title: S('เอาะ/ออ och อัวะ/อัว', 'สระเอาะ ออ อัวะ อัว'),
          body: S('เ-าะ är kort å (เกาะ) och -อ är långt å (พ่อ, นอน). Här är อ en vokal, inte en konsonant.\n\n-ัวะ är kort ua och -ัว är långt ua (ตัว, กลัว). När อัว får en slutkonsonant försvinner ั och bara ว står kvar: ส + ว + น = สวน (suan).',
            'เ-าะ เป็นเสียงสั้น -อ เป็นเสียงยาว เช่น เกาะ พ่อ นอน ในที่นี้ อ ทำหน้าที่เป็นสระ\n\n-ัวะ เป็นเสียงสั้น -ัว เป็นเสียงยาว เช่น ตัว กลัว เมื่อสระอัวมีตัวสะกด ไม้หันอากาศจะหายไป เหลือแต่ ว เช่น สวน'),
          table: [['สระ', 'ไม่มีตัวสะกด', 'มีตัวสะกด'], ['เ-าะ', 'เกาะ', 'ล็อก'], ['-อ', 'พ่อ', 'นอน'], ['-ัว', 'วัว', 'สวน']] },
        exercises: [
          { type: 'listen', say: 'วัว', opts: ['วัว', 'ตัว', 'กลัว'], a: 0 },
          { type: 'mc', prompt: 'สวน', q: S('Vilken vokal finns i ordet?'), opts: ['อัว (ua)', 'ออ (å)', 'อุ (u)'], a: 0 },
          { type: 'mc', prompt: 'เกาะ', q: S('Vad betyder ordet?'), opts: ['ö', 'ko', 'läkare'], a: 0 },
          { type: 'mc', prompt: 'นอน', q: S('Levande eller död stavelse? (lång vokal + น)'), opts: LIVE, a: 0 },
          { type: 'mc', prompt: 'เกาะ', q: S('Levande eller död stavelse? (kort vokal, ingen slutkonsonant)'), opts: LIVE, a: 1 },
          { type: 'order', answer: 'พ่อ|นั่ง|เครื่องบิน', rom: 'pho nang khrueang bin', tr: S('Pappa åker flygplan.') },
          { type: 'gap', text: 'ฉันไม่___', opts: ['กลัว', 'วัว', 'ตัว'], a: 'กลัว', tr: S('Jag är inte rädd.') }
        ] },

      /* ---------- Kapitel 8: เออะ เออ อำ เอา ---------- */
      { id: 'thr-8', level: 'R4', icon: '🪷', skills: ['reading', 'vocabulary', 'real'], practice: true,
        title: S('Kapitel 8 · เออะ เออ อำ เอา', 'บทที่ ๘ สระเออะ สระเออ สระอำ สระเอา'),
        goal: S('Läsa ö-ljuden, am och ao och känna igen เออ:s tre former', 'อ่านสระเออะ เออ อำ เอา และรู้จักรูปของสระเออทั้งสามแบบ'),
        dialogue: [d('เราไปลอยกระทง', 'rao pai loi krathong', 'Vi går och flyter krathong.'), d('ยายทำขนม', 'yai tham khanom', 'Mormor gör thailändskt godis.'), d('เขารำไทยสวย', 'khao ram thai suai', 'Hon dansar thailändsk dans vackert.')],
        vocab: [w('เรา', 'rao', 'vi'), w('เขา', 'khao', 'han, hon'), w('ทำ', 'tham', 'göra'), w('น้ำ', 'nam', 'vatten'),
          w('รำ', 'ram', 'dansa (thailändsk dans)'), w('เดิน', 'doen', 'gå', 'เออ + slutkonsonant skrivs เ-ิ-: เดิน.'), w('เลย', 'loei', 'alls; verkligen', 'เออ + ย skrivs เ-ย: เลย.'), w('ลอยกระทง', 'loi krathong', 'Loy Krathong, ljusfesten på vattnet')],
        grammar: { title: S('Vokalen เออ har tre former', 'สระเออมีสามรูป'),
          body: S('เ-อะ är kort ö och เ-อ är långt ö (เธอ). Med slutkonsonant byter เออ form: med ย skrivs den เ-ย (เลย), med andra slutkonsonanter เ-ิ- (เดิน).\n\nอำ (am), ใอ, ไอ (ai) och เอา (ao) har ett slutljud inbyggt. Därför räknas de som levande stavelser (คำเป็น): ทำ, เรา.',
            'เ-อะ เป็นเสียงสั้น เ-อ เป็นเสียงยาว เช่น เธอ เมื่อมีตัวสะกดสระเออเปลี่ยนรูป ถ้าสะกดด้วย ย เขียนเป็น เ-ย เช่น เลย ถ้าสะกดด้วยตัวอื่นเขียนเป็น เ-ิ- เช่น เดิน\n\nสระอำ ใอ ไอ เอา มีเสียงตัวสะกดอยู่ในตัว จึงนับเป็นคำเป็น เช่น ทำ เรา'),
          table: [['เออ', 'ตัวอย่าง'], ['ไม่มีตัวสะกด', 'เธอ'], ['ตัวสะกด ย', 'เลย'], ['ตัวสะกดอื่น', 'เดิน']] },
        exercises: [
          { type: 'listen', say: 'น้ำ', opts: ['น้ำ', 'ดำ', 'ทำ'], a: 0 },
          { type: 'mc', prompt: 'เดิน', q: S('Vilken vokal finns i ordet?'), opts: ['เออ (ö)', 'อิ (i)', 'เอ (e)'], a: 0 },
          { type: 'mc', prompt: 'เลย', q: S('Vilken vokal finns i ordet?'), opts: ['เออ (ö)', 'เอ (e)', 'อา (a)'], a: 0 },
          { type: 'mc', prompt: 'ทำ', q: S('Levande eller död stavelse?'), opts: LIVE, a: 0 },
          { type: 'mc', prompt: 'เรา', q: S('Vad betyder ordet?'), opts: ['vi', 'han, hon', 'svart'], a: 0 },
          { type: 'order', answer: 'เรา|ไป|ลอยกระทง', rom: 'rao pai loi krathong', tr: S('Vi går och flyter krathong.') },
          { type: 'gap', text: 'ยาย___ขนม', opts: ['ทำ', 'ดำ', 'เรา'], a: 'ทำ', tr: S('Mormor gör thailändskt godis.') }
        ] },

      /* ---------- Kapitel 9: meningar, tontecken, skiljetecken, levande och döda stavelser ---------- */
      { id: 'thr-9', level: 'R5', icon: '✏️', skills: ['reading', 'writing', 'grammar'], practice: true,
        title: S('Kapitel 9 · Meningar, skiljetecken och levande/döda stavelser', 'บทที่ ๙ รูปประโยค เครื่องหมายวรรคตอน คำเป็นคำตาย'),
        goal: S('Bygga thailändska meningar, använda ๆ och ฯ och skilja คำเป็น från คำตาย', 'เรียงประโยคภาษาไทย ใช้ ๆ และ ฯ และแยกคำเป็นคำตาย'),
        dialogue: [d('แมวดำนอนบนโต๊ะ', 'maeo dam non bon to', 'Den svarta katten sover på bordet.'), d('เด็กๆ เล่นกันทุกวัน', 'dek dek len kan thuk wan', 'Barnen leker med varandra varje dag.'), d('พรุ่งนี้เราจะกลับบ้าน', 'phrung ni rao cha klap ban', 'I morgon åker vi hem.')],
        vocab: [w('ดำ', 'dam', 'svart'), w('โต๊ะ', 'to', 'bord'), w('บน', 'bon', 'på'), w('ทุกวัน', 'thuk wan', 'varje dag'),
          w('กลับ', 'klap', 'åka tillbaka'), w('บ้าน', 'ban', 'hus, hem'), w('พรุ่งนี้', 'phrung ni', 'i morgon'), w('เด็กๆ', 'dek dek', 'barnen', 'ๆ betyder: säg ordet en gång till.')],
        grammar: { title: S('Thailändsk ordföljd jämfört med svenska', 'รูปประโยคภาษาไทยเทียบกับภาษาสวีเดน'),
          body: S('Grundordföljden är som på svenska: subjekt + verb + objekt (แมวกินปลา = katten äter fisk). Men adjektivet står EFTER substantivet: แมวดำ = svart katt. Tid står ofta först: พรุ่งนี้เราจะกลับบ้าน.\n\nThailändska har inga mellanslag mellan ord. Mellanslag visar slut på en fras eller mening. ๆ (ไม้ยมก) upprepar ordet före, ฯ (ไปยาลน้อย) visar att ett ord är förkortat (กรุงเทพฯ) och ฯลฯ betyder "och så vidare".\n\nLevande stavelse (คำเป็น): lång vokal, eller slutkonsonant ง น ม ย ว, eller อำ ใอ ไอ เอา. Död stavelse (คำตาย): kort vokal utan slutkonsonant, eller slutljud k, t, p (แม่ กก กด กบ).',
            'ประโยคภาษาไทยเรียงแบบ ประธาน + กริยา + กรรม เหมือนภาษาสวีเดน เช่น แมวกินปลา แต่คำขยายอยู่หลังคำนาม เช่น แมวดำ คำบอกเวลามักอยู่ต้นประโยค\n\nภาษาไทยไม่เว้นวรรคระหว่างคำ เว้นวรรคเมื่อจบวลีหรือประโยค ไม้ยมก (ๆ) ให้อ่านคำหน้าซ้ำ ไปยาลน้อย (ฯ) แสดงว่าคำนั้นย่อ เช่น กรุงเทพฯ ฯลฯ แปลว่า และอื่น ๆ\n\nคำเป็น: สระเสียงยาว หรือสะกดด้วยแม่ กง กน กม เกย เกอว หรือมีสระ อำ ใอ ไอ เอา คำตาย: สระเสียงสั้นไม่มีตัวสะกด หรือสะกดด้วยแม่ กก กด กบ'),
          table: [['เครื่องหมาย', 'ชื่อ', 'ตัวอย่าง'], ['ๆ', 'ไม้ยมก', 'เด็กๆ'], ['ฯ', 'ไปยาลน้อย', 'กรุงเทพฯ'], ['ฯลฯ', 'ไปยาลใหญ่', 'ผลไม้ เช่น มะม่วง ฯลฯ']] },
        exercises: [
          { type: 'mc', prompt: 'en svart katt', noSay: true, q: S('Hur skriver man det på thailändska?'), opts: ['แมวดำ', 'ดำแมว'], a: 0 },
          { type: 'mc', prompt: 'เด็กๆ', q: S('Vad gör tecknet ๆ?'), opts: ['upprepar ordet före', 'avslutar meningen', 'visar en fråga'], a: 0 },
          { type: 'mc', prompt: 'กรุงเทพฯ', q: S('Vad betyder ฯ?'), opts: ['ordet är förkortat', 'ordet upprepas', 'meningen slutar'], a: 0 },
          { type: 'mc', prompt: 'นก', q: S('Levande eller död stavelse? (slutljud k)'), opts: LIVE, a: 1 },
          { type: 'mc', prompt: 'ลม', q: S('Levande eller död stavelse? (slutkonsonant ม)'), opts: LIVE, a: 0 },
          { type: 'order', answer: 'แมว|ดำ|นอน|บน|โต๊ะ', rom: 'maeo dam non bon to', tr: S('Den svarta katten sover på bordet.') },
          { type: 'gap', text: 'พรุ่งนี้เราจะ___บ้าน', opts: ['กลับ', 'แมว', 'ดำ'], a: 'กลับ', tr: S('I morgon åker vi hem.') }
        ] },

      /* ---------- Kapitel 10: ฤ ฤๅ ฦ ฦๅ, การันต์ och alla 32 vokalljud ---------- */
      { id: 'thr-10', level: 'R5', icon: '🥭', skills: ['reading', 'pronunciation', 'vocabulary'], practice: true,
        title: S('Kapitel 10 · ฤ ฦ, tystnadstecknet ์ och alla 32 vokalljud', 'บทที่ ๑๐ ฤ ฤๅ ฦ ฦๅ ตัวการันต์ และสระทั้ง ๓๒ เสียง'),
        goal: S('Läsa ord med ฤ och ์ och repetera alla vokalljud', 'อ่านคำที่มี ฤ และตัวการันต์ และทบทวนสระทั้ง ๓๒ เสียง'),
        dialogue: [d('ฤดูร้อนที่สวีเดนสวย', 'rue du ron thi sawiden suai', 'Sommaren i Sverige är vacker.'), d('วันอาทิตย์ยายทำข้าวเหนียวมะม่วง', 'wan athit yai tham khao niao mamuang', 'På söndag gör mormor klibbigt ris med mango.'), d('พ่อขับรถยนต์', 'pho khap rot yon', 'Pappa kör bil.')],
        vocab: [w('ฤดู', 'rue du', 'årstid', 'ฤ läses rue här.'), w('อังกฤษ', 'angkrit', 'England, engelska', 'ฤ läses ri här.'), w('รถยนต์', 'rot yon', 'bil', '์ gör att ต inte hörs.'), w('จันทร์', 'chan', 'måndag; månen', 'ทร์ hörs inte.'),
          w('อาทิตย์', 'athit', 'söndag; solen'), w('ข้าวเหนียว', 'khao niao', 'klibbigt ris'), w('มะม่วง', 'mamuang', 'mango'), w('ร้อน', 'ron', 'varm')],
        grammar: { title: S('ฤ ฤๅ ฦ ฦๅ, การันต์ och de 32 vokalljuden', 'ฤ ฤๅ ฦ ฦๅ ตัวการันต์ และสระ ๓๒ เสียง'),
          body: S('ฤ läses rue (ฤดู), ri (อังกฤษ) eller roe (ฤกษ์). ฤๅ är ett långt rue. ฦ och ฦๅ (lue) används nästan aldrig i dag.\n\nการันต์ (์) står över en konsonant som INTE ska uttalas: รถยนต์ (rot yon), สงกรานต์ (songkran). Ibland är det två bokstäver som tystas: จันทร์ (chan).\n\nAlla vokalljud: 12 par korta och långa (24) + อำ ใอ ไอ เอา (4) + ฤ ฤๅ ฦ ฦๅ (4) = 32.',
            'ฤ อ่านว่า รึ (ฤดู) ริ (อังกฤษ) หรือ เรอ (ฤกษ์) ฤๅ อ่านเสียงยาว ฦ และ ฦๅ แทบไม่ใช้ในปัจจุบัน\n\nตัวการันต์ (์) เขียนบนพยัญชนะที่ไม่ออกเสียง เช่น รถยนต์ สงกรานต์ บางคำไม่ออกเสียงสองตัว เช่น จันทร์\n\nสระทั้งหมด: สระเสียงสั้นยาว ๑๒ คู่ (๒๔ เสียง) + อำ ใอ ไอ เอา (๔) + ฤ ฤๅ ฦ ฦๅ (๔) = ๓๒ เสียง'),
          table: [['สั้น', 'ยาว'], ['อะ', 'อา'], ['อิ', 'อี'], ['อึ', 'อือ'], ['อุ', 'อู'], ['เอะ', 'เอ'], ['แอะ', 'แอ'], ['โอะ', 'โอ'], ['เอาะ', 'ออ'], ['เอียะ', 'เอีย'], ['เอือะ', 'เอือ'], ['อัวะ', 'อัว'], ['เออะ', 'เออ']] },
        exercises: [
          { type: 'listen', say: 'ฤดู', opts: ['ฤดู', 'รู', 'ดู'], a: 0 },
          { type: 'mc', prompt: 'รถยนต์', q: S('Vilken bokstav hörs inte?'), opts: ['ต์', 'ร', 'ย'], a: 0 },
          { type: 'mc', prompt: 'อังกฤษ', q: S('Hur låter ฤ i det här ordet?'), opts: ['ri', 'rue', 'lue'], a: 0 },
          { type: 'mc', prompt: 'จันทร์', q: S('Vad betyder ordet?'), opts: ['måndag', 'söndag', 'årstid'], a: 0 },
          { type: 'mc', prompt: '32', noSay: true, q: S('Hur många vokalljud har thailändskan?'), opts: ['32', '21', '44'], a: 0 },
          { type: 'order', answer: 'พ่อ|ขับ|รถยนต์', rom: 'pho khap rot yon', tr: S('Pappa kör bil.') },
          { type: 'gap', text: 'วัน___ยายทำขนม', opts: ['อาทิตย์', 'ฤดู', 'อังกฤษ'], a: 'อาทิตย์', tr: S('På söndag gör mormor thailändskt godis.') }
        ] }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
