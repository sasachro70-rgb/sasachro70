/* Phase E: curriculum for "Lär dig thailändska" (course th) – units, level names after the curriculum plan, and eight new lessons
   that cover what the plan asks for at each level (spelling and simple sentences; final consonants and sentence building; clusters,
   leading consonants and reading; a longer cultural text and translation). Written for Pasathai. Explanations in Swedish and Thai.
   The course can grow without code changes: add lessons here (or in the Content Manager) and list them in a unit.
   Load after academy-th.js and academy-th-explain.js. */
(function (G) {
  'use strict';
  const C = G.FGH_CONTENT = G.FGH_CONTENT || {};
  const course = C.academy && C.academy.courses && C.academy.courses.th;
  if (!course) return;
  const O = (sv, th) => ({ sv, th });
  const d = (who, t, rom, sv) => ({ who, t, rom, tr: { sv } });
  const w = (t, rom, sv, note) => ({ t, rom, tr: { sv }, note: note ? { sv: note } : null });
  const VQ = O('Vad betyder ordet?', 'คำนี้แปลว่าอะไร');

  const NEW = [
    /* ---------- Level 2 ---------- */
    { id: 'th-2-spelling', level: 'L2', icon: '✏️', skills: ['reading', 'writing', 'pronunciation'],
      title: O('Stava: korta och långa vokaler', 'สะกดคำ: สระเสียงสั้นและเสียงยาว'),
      goal: O('Läsa och stava enkla stavelser och höra skillnad på kort och lång vokal', 'อ่านและสะกดพยางค์ง่าย ๆ และฟังความต่างของสระสั้นกับสระยาว'),
      objectives: [O('Sätta ihop konsonant + vokal till en stavelse', 'ประสมพยัญชนะกับสระเป็นพยางค์'), O('Höra om vokalen är kort eller lång', 'ฟังว่าสระเป็นเสียงสั้นหรือยาว'), O('Läsa fyra korta meningar', 'อ่านประโยคสั้น ๆ ๔ ประโยค')],
      dialogue: [d('', 'พ่อ|ดู|ทีวี', 'pho du thiwi', 'Pappa tittar på tv.'), d('', 'แม่|ไป|ตลาด', 'mae pai talat', 'Mamma går till marknaden.'),
        d('', 'น้อง|กิน|ข้าว', 'nong kin khao', 'Lillasyster (lillebror) äter.'), d('', 'ยาย|มี|ปลา|ตัว|ใหญ่', 'yai mi pla tua yai', 'Mormor har en stor fisk.')],
      vocab: [w('ดุ', 'du', 'sträng, skälla', 'Kort u.'), w('ดู', 'du', 'titta', 'Långt u – samma romanisering, lyssna!'), w('เตะ', 'te', 'sparka', 'Kort e.'), w('เท', 'the', 'hälla', 'Långt e.'),
        w('แกะ', 'kae', 'får (djuret)', 'Kort ae.'), w('แก', 'kae', 'gammal', 'Långt ae.'), w('กิน', 'kin', 'äta'), w('ทีวี', 'thiwi', 'tv')],
      grammar: { title: O('Så stavar man en stavelse', 'การประสมพยางค์'),
        body: O('En thailändsk stavelse är konsonant + vokal, ibland med en slutkonsonant. Läs alltid konsonanten först, även när vokaltecknet står före: เท = ท + เ– = the.\n\nVokalerna kommer i par. Den korta vokalen klipps av kort; den långa dras ut. Längden ändrar betydelsen: ดุ (sträng) – ดู (titta). Romaniseringen visar inte längden, så lyssna och titta på tecknet.\n\nNär du stavar högt säger thailändska barn konsonanten, vokalen och sedan hela ordet: ดอ – อู – ดู.',
          'พยางค์ไทยประกอบด้วยพยัญชนะ + สระ บางครั้งมีตัวสะกด อ่านพยัญชนะก่อนเสมอ แม้สระจะอยู่ข้างหน้า: เท = ท + เ– \n\nสระมักเป็นคู่ เสียงสั้นออกเสียงสั้น เสียงยาวลากยาว ความยาวทำให้ความหมายเปลี่ยน: ดุ – ดู\n\nเวลาสะกดคำ เด็กไทยจะอ่านพยัญชนะ สระ แล้วอ่านทั้งคำ: ดอ – อู – ดู'),
        table: [['สั้น / kort', 'ยาว / lång', 'Betydelse'], ['ดุ', 'ดู', 'sträng – titta'], ['เตะ', 'เท', 'sparka – hälla'], ['แกะ', 'แก', 'får – gammal']] },
      exercises: [
        { type: 'listen', say: 'ดู', opts: ['ดู', 'ดุ'], a: 0 },
        { type: 'listen', say: 'เท', opts: ['เตะ', 'เท'], a: 1 },
        { type: 'mc', prompt: 'ด + –ู', noSay: true, q: O('Vilken stavelse blir det?', 'ประสมแล้วได้คำว่าอะไร'), opts: ['ดู', 'ดุ', 'ดี'], a: 0 },
        { type: 'mc', prompt: 'แกะ', q: O('Kort eller lång vokal?', 'สระเสียงสั้นหรือยาว'), opts: [O('kort', 'สั้น'), O('lång', 'ยาว')], a: 0 },
        { type: 'gap', text: 'พ่อ___ทีวี', opts: ['ดู', 'ดุ', 'เท'], a: 'ดู', tr: { sv: 'Pappa tittar på tv.' } },
        { type: 'order', answer: 'แม่|ไป|ตลาด', rom: 'mae pai talat', tr: { sv: 'Mamma går till marknaden.' } }
      ] },
    { id: 'th-2-sentences', level: 'L2', icon: '🧱', skills: ['grammar', 'reading', 'writing'],
      title: O('Enkla meningar', 'ประโยคง่าย ๆ'),
      goal: O('Bygga enkla meningar: ordföljd, inte, och vems något är', 'สร้างประโยคง่าย ๆ: ลำดับคำ การปฏิเสธ และความเป็นเจ้าของ'),
      objectives: [O('Använda ordföljden subjekt – verb – objekt', 'เรียงคำ ประธาน – กริยา – กรรม'), O('Säga inte med ไม่', 'ปฏิเสธด้วย ไม่'), O('Säga min/din med ของ', 'บอกความเป็นเจ้าของด้วย ของ')],
      dialogue: [d('A', 'นี่|คือ|อะไร', 'ni khue arai', 'Vad är det här?'), d('B', 'นี่|คือ|แมว|ของ|ฉัน', 'ni khue maeo khong chan', 'Det här är min katt.'),
        d('A', 'แมว|ตัว|นี้|น่ารัก|มาก', 'maeo tua ni narak mak', 'Den här katten är jättesöt.'), d('B', 'แต่|แมว|ไม่|ชอบ|น้ำ', 'tae maeo mai chop nam', 'Men katten tycker inte om vatten.')],
      vocab: [w('นี่', 'ni', 'det här'), w('คือ', 'khue', 'är (= vara lika med)'), w('อะไร', 'arai', 'vad'), w('แมว', 'maeo', 'katt'), w('ของ', 'khong', 'som tillhör; sak'),
        w('ชอบ', 'chop', 'tycka om'), w('น่ารัก', 'narak', 'söt, gullig'), w('น้ำ', 'nam', 'vatten')],
      grammar: { title: O('Ordföljd, ไม่ och ของ', 'ลำดับคำ ไม่ และ ของ'),
        body: O('Ordföljden är som i svenska: subjekt – verb – objekt. ฉัน|ชอบ|แมว = jag tycker om katter.\n\nAdjektivet står efter substantivet: แมวดำ = svart katt. Före ett adjektiv behövs inget ”är”: แมวน่ารัก = katten är söt. Mellan två substantiv används คือ: นี่คือแมว = det här är en katt.\n\nไม่ står före verbet eller adjektivet: ไม่ชอบ = tycker inte om, ไม่ร้อน = inte varmt.\n\nของ visar vems något är: แมวของฉัน = min katt. I tal faller ของ ofta bort: แม่ฉัน = min mamma.',
          'ลำดับคำเหมือนภาษาสวีเดน: ประธาน – กริยา – กรรม เช่น ฉันชอบแมว\n\nคำคุณศัพท์อยู่หลังคำนาม: แมวดำ หน้าคำคุณศัพท์ไม่ต้องมีคำว่า เป็น: แมวน่ารัก ระหว่างคำนามสองคำใช้ คือ: นี่คือแมว\n\nไม่ อยู่หน้าคำกริยาหรือคำคุณศัพท์: ไม่ชอบ ไม่ร้อน\n\nของ บอกความเป็นเจ้าของ: แมวของฉัน ในภาษาพูดมักละ ของ: แม่ฉัน') },
      exercises: [
        { type: 'order', answer: 'ฉัน|ชอบ|แมว', rom: 'chan chop maeo', tr: { sv: 'Jag tycker om katter.' } },
        { type: 'order', answer: 'แมว|ไม่|ชอบ|น้ำ', rom: 'maeo mai chop nam', tr: { sv: 'Katten tycker inte om vatten.' } },
        { type: 'mc', prompt: 'บ้านของฉัน', rom: 'ban khong chan', q: O('Vad betyder det?', 'แปลว่าอะไร'), opts: ['mitt hem', 'ditt hem', 'hennes hem'], a: 0 },
        { type: 'gap', text: 'นี่___อะไร', opts: ['คือ', 'ไม่', 'ของ'], a: 'คือ', tr: { sv: 'Vad är det här?' } },
        { type: 'listen', say: 'น่ารัก', opts: ['söt', 'stor', 'gammal'], a: 0 },
        { type: 'write', task: O('Skriv två meningar: något du tycker om och något du inte tycker om (ชอบ / ไม่ชอบ).', 'เขียน ๒ ประโยค บอกสิ่งที่ชอบและสิ่งที่ไม่ชอบ (ชอบ / ไม่ชอบ)'), model: 'ฉันชอบแมว ฉันไม่ชอบฝน' }
      ] },
    /* ---------- Level 3 ---------- */
    { id: 'th-3-finals', level: 'L3', icon: '🔚', skills: ['reading', 'pronunciation'],
      title: O('Slutkonsonanter och levande/döda stavelser', 'มาตราตัวสะกด คำเป็นคำตาย'),
      goal: O('Läsa ord med slutkonsonant och veta om stavelsen är levande eller död', 'อ่านคำที่มีตัวสะกดและบอกได้ว่าเป็นคำเป็นหรือคำตาย'),
      objectives: [O('Känna igen de åtta slutljuden', 'รู้จักมาตราตัวสะกดทั้ง ๘'), O('Veta att många bokstäver låter t i slutet', 'รู้ว่าพยัญชนะหลายตัวสะกดเป็นเสียง ด'), O('Skilja levande och döda stavelser', 'แยกคำเป็นและคำตาย')],
      dialogue: [d('', 'นก|บิน|ไป|บ้าน', 'nok bin pai ban', 'Fågeln flyger hem.'), d('', 'มด|กิน|ส้ม', 'mot kin som', 'Myran äter apelsinen.'),
        d('', 'กบ|อยู่|ใน|บึง', 'kop yu nai bueng', 'Grodan bor i dammen.'), d('', 'ลิง|ชอบ|กล้วย', 'ling chop kluai', 'Apan tycker om bananer.')],
      vocab: [w('นก', 'nok', 'fågel'), w('มด', 'mot', 'myra'), w('กบ', 'kop', 'groda'), w('ลิง', 'ling', 'apa'), w('บิน', 'bin', 'flyga'), w('ส้ม', 'som', 'apelsin'),
        w('บ้าน', 'ban', 'hus, hem'), w('บึง', 'bueng', 'damm, träsk'), w('กล้วย', 'kluai', 'banan')],
      grammar: { title: O('Åtta slutljud', 'ตัวสะกด ๘ มาตรา'),
        body: O('I slutet av en stavelse finns bara åtta ljud: k, t, p, ng, n, m, y och w. Slutljuden k, t och p släpps inte ut – munnen stängs utan luftpuff.\n\nMånga bokstäver låter t i slutet (ด ต ท ถ ส จ ช ศ ษ …): บาท (bat), รถ (rot). ร och ล i slutet låter n: อาหาร (ahan).\n\nEn levande stavelse (คำเป็น) har lång vokal eller slutar på ng, n, m, y eller w. En död stavelse (คำตาย) har kort vokal utan slutkonsonant eller slutar på k, t eller p. Det spelar roll för tonen.',
          'ตัวสะกดในภาษาไทยมี ๘ มาตรา คือ กก กด กบ กง กน กม เกย เกอว เสียง ก ด บ ท้ายคำไม่ปล่อยลม\n\nพยัญชนะหลายตัวสะกดเป็นเสียง ด เช่น บาท รถ ส่วน ร และ ล สะกดเป็นเสียง น เช่น อาหาร\n\nคำเป็น คือ คำที่มีสระเสียงยาวหรือสะกดด้วยแม่กง กน กม เกย เกอว คำตาย คือ คำที่มีสระเสียงสั้นไม่มีตัวสะกด หรือสะกดด้วยแม่กก กด กบ'),
        table: [['ตัวสะกด / slutljud', 'Bokstäver', 'Exempel'], ['k', 'ก ข ค ฆ', 'นก'], ['t', 'ด ต ท ถ ส จ ช ศ ษ', 'มด'], ['p', 'บ ป พ ฟ ภ', 'กบ'], ['ng', 'ง', 'ลิง'], ['n', 'น ญ ณ ร ล ฬ', 'บิน'], ['m', 'ม', 'ส้ม'], ['y', 'ย', 'ยาย'], ['w', 'ว', 'ขาว']] },
      exercises: [
        { type: 'mc', prompt: 'นก', q: O('Vilket slutljud?', 'สะกดด้วยเสียงอะไร'), opts: ['k', 't', 'p'], a: 0 },
        { type: 'mc', prompt: 'บาท', q: O('Vilket slutljud?', 'สะกดด้วยเสียงอะไร'), opts: ['t', 'k', 'n'], a: 0 },
        { type: 'mc', prompt: 'อาหาร', q: O('Vilket slutljud har ร här?', 'ร ในคำนี้สะกดเป็นเสียงอะไร'), opts: ['n', 'r', 'm'], a: 0 },
        { type: 'mc', prompt: 'กบ', q: O('Levande eller död stavelse?', 'คำเป็นหรือคำตาย'), opts: [O('levande', 'คำเป็น'), O('död', 'คำตาย')], a: 1 },
        { type: 'mc', prompt: 'ลิง', q: O('Levande eller död stavelse?', 'คำเป็นหรือคำตาย'), opts: [O('levande', 'คำเป็น'), O('död', 'คำตาย')], a: 0 },
        { type: 'listen', say: 'มด', opts: ['มด', 'มน', 'มม'], a: 0 },
        { type: 'order', answer: 'นก|บิน|ไป|บ้าน', rom: 'nok bin pai ban', tr: { sv: 'Fågeln flyger hem.' } }
      ] },
    { id: 'th-3-sentences', level: 'L3', icon: '🕰️', skills: ['grammar', 'conversation', 'writing'],
      title: O('Bygga meningar: tid och sambandsord', 'การสร้างประโยค: เวลาและคำเชื่อม'),
      goal: O('Berätta vad du gjorde, gör och ska göra, och binda ihop meningar', 'เล่าสิ่งที่ทำแล้ว กำลังทำ และจะทำ และเชื่อมประโยค'),
      objectives: [O('Använda จะ, กำลัง och แล้ว', 'ใช้ จะ กำลัง และ แล้ว'), O('Säga måste med ต้อง', 'ใช้ ต้อง'), O('Binda ihop med และ, แต่ och เพราะ', 'เชื่อมประโยคด้วย และ แต่ เพราะ')],
      dialogue: [d('A', 'เมื่อวาน|คุณ|ทำ|อะไร', 'mueawan khun tham arai', 'Vad gjorde du i går?'), d('B', 'ฉัน|ไป|ว่ายน้ำ|กับ|เพื่อน', 'chan pai wainam kap phuean', 'Jag var och simmade med en kompis.'),
        d('A', 'พรุ่งนี้|จะ|ไป|อีก|ไหม', 'phrungni cha pai ik mai', 'Ska du gå igen i morgon?'), d('B', 'ไม่|ไป|เพราะ|ต้อง|ทำ|การบ้าน', 'mai pai phro tong tham kanban', 'Nej, för jag måste göra läxan.'),
        d('B', 'ตอนนี้|ฉัน|กำลัง|ทำ|การบ้าน', 'tonni chan kamlang tham kanban', 'Nu håller jag på med läxan.')],
      vocab: [w('เมื่อวาน', 'mueawan', 'i går'), w('พรุ่งนี้', 'phrungni', 'i morgon'), w('ตอนนี้', 'tonni', 'nu'), w('จะ', 'cha', 'ska (framtid)'), w('กำลัง', 'kamlang', 'håller på att'),
        w('ต้อง', 'tong', 'måste'), w('เพราะ', 'phro', 'eftersom'), w('กับ', 'kap', 'med; och'), w('การบ้าน', 'kanban', 'läxa'), w('ว่ายน้ำ', 'wainam', 'simma')],
      grammar: { title: O('Tid utan böjning', 'บอกเวลาโดยไม่เปลี่ยนรูปคำกริยา'),
        body: O('Verbet ändras aldrig. Tiden visas med tidsord (เมื่อวาน, พรุ่งนี้, ตอนนี้) först eller sist i meningen, och med små ord före eller efter verbet:\n\nจะ + verb = ska, kommer att: ฉันจะไป. กำลัง + verb = håller på att: กำลังกิน. Verb + แล้ว = redan, klart: กินแล้ว.\n\nต้อง + verb = måste: ต้องทำการบ้าน.\n\nSambandsord: และ (och), แต่ (men), เพราะ / เพราะว่า (eftersom). กับ betyder ”med” eller ”och” mellan personer: ฉันกับเพื่อน.',
          'คำกริยาไม่เปลี่ยนรูป บอกเวลาด้วยคำบอกเวลา (เมื่อวาน พรุ่งนี้ ตอนนี้) ไว้ต้นหรือท้ายประโยค และใช้คำช่วยหน้าหรือหลังคำกริยา:\n\nจะ + กริยา = อนาคต กำลัง + กริยา = กำลังทำอยู่ กริยา + แล้ว = ทำเสร็จแล้ว\n\nต้อง + กริยา = จำเป็นต้องทำ\n\nคำเชื่อม: และ แต่ เพราะ/เพราะว่า ส่วน กับ ใช้เชื่อมคน เช่น ฉันกับเพื่อน') },
      exercises: [
        { type: 'gap', text: 'พรุ่งนี้ฉัน___ไปโรงเรียน', opts: ['จะ', 'แล้ว', 'กำลัง'], a: 'จะ', tr: { sv: 'I morgon ska jag gå till skolan.' } },
        { type: 'gap', text: 'ตอนนี้แม่___ทำอาหาร', opts: ['กำลัง', 'จะ', 'เมื่อวาน'], a: 'กำลัง', tr: { sv: 'Mamma håller på att laga mat nu.' } },
        { type: 'order', answer: 'ฉัน|ต้อง|ทำ|การบ้าน', rom: 'chan tong tham kanban', tr: { sv: 'Jag måste göra läxan.' } },
        { type: 'mc', prompt: 'เมื่อวาน', q: VQ, opts: ['i går', 'i morgon', 'nu'], a: 0 },
        { type: 'listen', say: 'เพราะ', opts: ['eftersom', 'men', 'och'], a: 0 },
        { type: 'write', task: O('Skriv vad du gjorde i går och vad du ska göra i morgon.', 'เขียนว่าเมื่อวานทำอะไร และพรุ่งนี้จะทำอะไร'), model: 'เมื่อวานฉันไปว่ายน้ำ พรุ่งนี้ฉันจะไปโรงเรียน' }
      ] },
    /* ---------- Level 4 ---------- */
    { id: 'th-4-clusters', level: 'L4', icon: '🔗', skills: ['reading', 'pronunciation'],
      title: O('Kluster och ledande konsonanter', 'คำควบกล้ำและอักษรนำ'),
      goal: O('Läsa ord med två konsonanter i början och ord med ledande ห och อ', 'อ่านคำควบกล้ำและคำที่มี ห นำ อ นำ'),
      objectives: [O('Läsa äkta kluster (ปล, คร, กว …)', 'อ่านคำควบกล้ำแท้'), O('Känna igen falska kluster (ทร = s, tyst ร)', 'รู้จักคำควบกล้ำไม่แท้'), O('Läsa ord med ห นำ och อ นำ', 'อ่านคำที่มี ห นำ และ อ นำ')],
      dialogue: [d('', 'ครู|สอน|ภาษาไทย', 'khru son phasa thai', 'Läraren undervisar i thailändska.'), d('', 'ปลา|ว่าย|ใน|คลอง', 'pla wai nai khlong', 'Fisken simmar i kanalen.'),
        d('', 'หมา|อยู่|ข้าง|บ้าน', 'ma yu khang ban', 'Hunden är bredvid huset.'), d('', 'อย่า|ลืม|การบ้าน', 'ya luem kanban', 'Glöm inte läxan.'), d('', 'ขนม|อร่อย|มาก', 'khanom aroi mak', 'Kakan är jättegod.')],
      vocab: [w('ครู', 'khru', 'lärare'), w('ปลา', 'pla', 'fisk'), w('คลอง', 'khlong', 'kanal'), w('ขวา', 'khwa', 'höger'), w('หมา', 'ma', 'hund', 'ห är stumt men ger stigande ton.'),
        w('หนู', 'nu', 'mus; jag (barn till vuxen)'), w('อย่า', 'ya', 'gör inte'), w('อยาก', 'yak', 'vilja'), w('ขนม', 'khanom', 'kaka, godis'), w('จริง', 'ching', 'sann, verkligen', 'ร hörs inte.'), w('ลืม', 'luem', 'glömma')],
      grammar: { title: O('Två konsonanter i början', 'พยัญชนะต้นสองตัว'),
        body: O('Äkta kluster: ร, ล eller ว efter ก ข ค ต ป พ uttalas tillsammans: ปลา (pla), ครู (khru), ขวา (khwa). I vardagstal hörs r ofta som l eller försvinner, men i skolan uttalar man det.\n\nFalska kluster: ทร låter s (ทราย sai). Efter จ ซ ศ ส hörs ร inte (จริง ching, สร้าง sang).\n\nLedande konsonant: ett stumt ห före ง ญ น ม ย ร ล ว ger högklassens toner (หมา ma, stigande). อ före ย gör samma sak i fyra ord: อย่า อยู่ อย่าง อยาก. I ord som ขนม och ตลาด läses ett kort a efter första bokstaven, och den styr tonen på nästa stavelse.',
          'คำควบกล้ำแท้: ร ล ว ตามหลัง ก ข ค ต ป พ ออกเสียงพร้อมกัน เช่น ปลา ครู ขวา ในภาษาพูดมักออกเสียง ร เป็น ล หรือไม่ออกเสียง แต่ในโรงเรียนควรออกเสียงให้ชัด\n\nคำควบกล้ำไม่แท้: ทร ออกเสียงเป็น ซ (ทราย) และ ร ที่ตามหลัง จ ซ ศ ส ไม่ออกเสียง (จริง สร้าง)\n\nอักษรนำ: ห นำอักษรต่ำเดี่ยว ทำให้ผันเสียงแบบอักษรสูง (หมา) อ นำ ย มี ๔ คำ: อย่า อยู่ อย่าง อยาก คำอย่าง ขนม ตลาด อ่านพยัญชนะตัวแรกมีเสียง อะ และตัวแรกนำเสียงวรรณยุกต์ของพยางค์ถัดไป') },
      exercises: [
        { type: 'mc', prompt: 'ทราย', q: O('Hur låter ทร här?', 'ทร ในคำนี้ออกเสียงอย่างไร'), opts: ['s', 'thr', 'tr'], a: 0 },
        { type: 'mc', prompt: 'หมา', q: O('Vilken ton får หมา?', 'หมา เป็นเสียงวรรณยุกต์อะไร'), opts: [O('stigande', 'จัตวา'), O('mellan', 'สามัญ'), O('hög', 'ตรี')], a: 0 },
        { type: 'mc', prompt: 'จริง', q: O('Hörs ร?', 'ออกเสียง ร หรือไม่'), opts: [O('nej', 'ไม่ออกเสียง'), O('ja', 'ออกเสียง')], a: 0 },
        { type: 'listen', say: 'ครู', opts: ['ครู', 'คู', 'ขู'], a: 0 },
        { type: 'listen', say: 'ปลา', opts: ['ปลา', 'ปา', 'ผา'], a: 0 },
        { type: 'order', answer: 'อย่า|ลืม|การบ้าน', rom: 'ya luem kanban', tr: { sv: 'Glöm inte läxan.' } }
      ] },
    { id: 'th-4-reading', level: 'L4', icon: '✉️', skills: ['reading', 'listening', 'writing'],
      title: O('Läsförståelse: ett brev från Bangkok', 'อ่านจับใจความ: จดหมายจากกรุงเทพฯ'),
      goal: O('Läsa och förstå ett kort brev, och skriva ett eget', 'อ่านและเข้าใจจดหมายสั้น ๆ และเขียนจดหมายเอง'),
      objectives: [O('Hitta vem, var och vad i en text', 'หาว่าใคร ที่ไหน ทำอะไร จากเรื่องที่อ่าน'), O('Förstå หนู och คิดถึง', 'เข้าใจคำว่า หนู และ คิดถึง'), O('Skriva ett brev på 3–4 meningar', 'เขียนจดหมาย ๓–๔ ประโยค')],
      dialogue: [d('', 'ถึง|ยาย|ที่|สวีเดน', 'thueng yai thi sawiden', 'Till mormor i Sverige,'),
        d('', 'ตอนนี้|หนู|อยู่|ที่|กรุงเทพฯ|กับ|พ่อ|แม่', 'tonni nu yu thi krungthep kap pho mae', 'Nu är jag i Bangkok med mamma och pappa.'),
        d('', 'อากาศ|ร้อน|มาก|แต่|อาหาร|อร่อย', 'akat ron mak tae ahan aroi', 'Det är väldigt varmt men maten är god.'),
        d('', 'เมื่อวาน|เรา|ไป|ตลาดน้ำ|และ|กิน|ผลไม้', 'mueawan rao pai talatnam lae kin phonlamai', 'I går åkte vi till en flytande marknad och åt frukt.'),
        d('', 'หนู|คิดถึง|ยาย|มาก|ค่ะ', 'nu khitthueng yai mak kha', 'Jag saknar dig så mycket, mormor.')],
      vocab: [w('ถึง', 'thueng', 'till (i brev); komma fram'), w('อากาศ', 'akat', 'väder; luft'), w('ร้อน', 'ron', 'varm, het'), w('ตลาดน้ำ', 'talatnam', 'flytande marknad'),
        w('ผลไม้', 'phonlamai', 'frukt'), w('คิดถึง', 'khitthueng', 'sakna, tänka på'), w('เรา', 'rao', 'vi'), w('กรุงเทพฯ', 'krungthep', 'Bangkok')],
      grammar: { title: O('Läsa en text steg för steg', 'อ่านเรื่องทีละขั้น'),
        body: O('Läs först hela texten och leta efter vem, var, när och vad. Läs sedan mening för mening och lyssna. Mellanslagen visar var en fras slutar.\n\nหนู betyder mus, men barn använder också ordet om sig själva när de talar med vuxna i familjen: หนูคิดถึงยาย = jag saknar mormor.\n\nฯ är ett förkortningstecken: กรุงเทพฯ är den korta formen av Bangkoks långa thailändska namn.\n\nEtt brev börjar ofta med ถึง + namn och slutar med en hälsning, till exempel คิดถึงนะ.',
          'อ่านทั้งเรื่องก่อน แล้วหาว่า ใคร ที่ไหน เมื่อไร ทำอะไร จากนั้นอ่านทีละประโยคและฟังเสียง การเว้นวรรคบอกการจบวลี\n\nหนู แปลว่าสัตว์ แต่เด็กใช้แทนตัวเองเมื่อพูดกับผู้ใหญ่ในครอบครัว เช่น หนูคิดถึงยาย\n\nฯ (ไปยาลน้อย) ใช้ย่อคำ เช่น กรุงเทพฯ\n\nจดหมายมักขึ้นต้นด้วย ถึง + ชื่อ และลงท้ายด้วยคำทักทาย เช่น คิดถึงนะ') },
      exercises: [
        { type: 'mc', prompt: 'หนูอยู่ที่ไหน', q: O('Läs brevet. Var är barnet nu?', 'อ่านจดหมาย ตอนนี้เด็กอยู่ที่ไหน'), opts: ['กรุงเทพฯ', 'สวีเดน', 'ตลาดน้ำ'], a: 0 },
        { type: 'mc', prompt: 'อากาศเป็นอย่างไร', q: O('Hur är vädret?', 'อากาศเป็นอย่างไร'), opts: [O('varmt', 'ร้อน'), O('kallt', 'หนาว'), O('regnigt', 'ฝนตก')], a: 0 },
        { type: 'mc', prompt: 'คิดถึง', q: VQ, opts: ['sakna', 'tänka efter', 'skriva'], a: 0 },
        { type: 'gap', text: 'อากาศร้อน___อาหารอร่อย', opts: ['แต่', 'และ', 'เพราะ'], a: 'แต่', tr: { sv: 'Det är varmt men maten är god.' } },
        { type: 'write', task: O('Skriv ett kort brev (3–4 meningar) till någon i Thailand.', 'เขียนจดหมายสั้น ๆ ๓–๔ ประโยค ถึงคนที่อยู่ประเทศไทย'), model: 'ถึงคุณยาย ตอนนี้หนูอยู่ที่สวีเดน อากาศหนาวมาก หนูคิดถึงยายค่ะ' }
      ] },
    /* ---------- Level 5 ---------- */
    { id: 'th-5-songkran', level: 'L5', icon: '💦', skills: ['reading', 'culture', 'writing'],
      title: O('Längre text: Songkran', 'อ่านเรื่องยาว: วันสงกรานต์'),
      goal: O('Läsa en längre text om en thailändsk högtid och berätta om en egen', 'อ่านเรื่องยาวเกี่ยวกับเทศกาลไทยและเล่าเรื่องเทศกาลของตัวเอง'),
      objectives: [O('Förstå en text på fem meningar', 'เข้าใจเรื่องที่มี ๕ ประโยค'), O('Använda ที่ som ”som/då”', 'ใช้ ที่ เชื่อมประโยค'), O('Veta vad ๆ betyder', 'รู้ความหมายของ ๆ')],
      dialogue: [d('', 'สงกรานต์|เป็น|วันขึ้นปีใหม่|ของ|ไทย', 'songkran pen wan khuen pi mai khong thai', 'Songkran är det thailändska nyåret.'),
        d('', 'ตรงกับ|วันที่|๑๓|ถึง|๑๕|เมษายน', 'trong kap wanthi sipsam thueng sipha mesayon', 'Det infaller den 13–15 april.'),
        d('', 'คนไทย|ไป|ทำบุญ|ที่|วัด|และ|รดน้ำ|ผู้ใหญ่', 'khon thai pai thambun thi wat lae rotnam phuyai', 'Man går till templet, ger gåvor och häller vatten över de äldres händer.'),
        d('', 'เด็กๆ|ชอบ|เล่น|สาดน้ำ|กัน|บน|ถนน', 'dekdek chop len satnam kan bon thanon', 'Barnen tycker om att stänka vatten på varandra på gatan.'),
        d('', 'สงกรานต์|เป็น|เวลา|ที่|ครอบครัว|อยู่|พร้อมหน้า|กัน', 'songkran pen wela thi khropkhrua yu phromna kan', 'Songkran är en tid då hela familjen samlas.')],
      vocab: [w('สงกรานต์', 'songkran', 'Songkran (thailändskt nyår)'), w('ปีใหม่', 'pi mai', 'nyår'), w('วัด', 'wat', 'tempel'), w('ทำบุญ', 'thambun', 'göra gott, ge gåvor till munkar'),
        w('รดน้ำ', 'rotnam', 'hälla vatten (som välsignelse)'), w('ผู้ใหญ่', 'phuyai', 'vuxna, äldre'), w('เล่น', 'len', 'leka, spela'), w('ถนน', 'thanon', 'gata'), w('เมษายน', 'mesayon', 'april'), w('ครอบครัว', 'khropkhrua', 'familj')],
      grammar: { title: O('Längre meningar med ที่ och ๆ', 'ประโยคยาวกับ ที่ และ ๆ'),
        body: O('ที่ binder ihop ett substantiv med en bisats, som svenska ”som” eller ”då”: เวลาที่ครอบครัวอยู่พร้อมหน้ากัน = en tid då familjen är samlad. ที่ betyder också ”vid, i”: ที่วัด = i templet.\n\nๆ (mai yamok) betyder att ordet före upprepas: เด็กๆ läses dek dek och betyder ”barnen” i allmänhet.\n\nThailändska siffror (๑๓ = 13) syns i datum och i officiella texter.\n\nOm kulturen: att hälla vatten över de äldres händer (รดน้ำดำหัว) är ett sätt att visa respekt och be om välsignelse.',
          'ที่ เชื่อมคำนามกับประโยคขยาย: เวลาที่ครอบครัวอยู่พร้อมหน้ากัน และ ที่ ยังแปลว่าสถานที่ เช่น ที่วัด\n\nๆ (ไม้ยมก) ให้อ่านคำข้างหน้าซ้ำ: เด็กๆ อ่านว่า เด็ก เด็ก\n\nเลขไทย (๑๓) ใช้ในวันที่และเอกสารทางการ\n\nการรดน้ำดำหัวผู้ใหญ่เป็นการแสดงความเคารพและขอพร') },
      exercises: [
        { type: 'mc', prompt: 'สงกรานต์ตรงกับเดือนอะไร', q: O('Vilken månad är Songkran?', 'สงกรานต์ตรงกับเดือนอะไร'), opts: ['เมษายน', 'ธันวาคม', 'มกราคม'], a: 0 },
        { type: 'mc', prompt: 'ๆ', noSay: true, q: O('Vad betyder tecknet ๆ?', 'ไม้ยมก ๆ ใช้ทำอะไร'), opts: [O('upprepa ordet före', 'อ่านคำข้างหน้าซ้ำ'), O('förkortning', 'ย่อคำ'), O('slut på meningen', 'จบประโยค')], a: 0 },
        { type: 'gap', text: 'สงกรานต์เป็นเวลา___ครอบครัวอยู่พร้อมหน้ากัน', opts: ['ที่', 'แต่', 'กับ'], a: 'ที่', tr: { sv: 'Songkran är en tid då familjen samlas.' } },
        { type: 'mc', prompt: 'รดน้ำผู้ใหญ่', q: O('Vad betyder det?', 'หมายความว่าอะไร'), opts: ['hälla vatten över de äldres händer', 'tvätta bilen', 'dricka vatten med de äldre'], a: 0 },
        { type: 'write', task: O('Berätta om en högtid som din familj firar (4–5 meningar).', 'เล่าเรื่องเทศกาลที่ครอบครัวของคุณฉลอง ๔–๕ ประโยค'), model: 'ครอบครัวของฉันฉลองสงกรานต์ เราไปวัดและรดน้ำผู้ใหญ่ ฉันชอบเล่นน้ำกับพี่ชาย' }
      ] },
    { id: 'th-5-translate', level: 'L5', icon: '🔁', skills: ['grammar', 'writing', 'translation'],
      title: O('Översätta och sammansatta meningar', 'การแปลและประโยคซับซ้อน'),
      goal: O('Förstå och bygga meningar med om, fast, som och när – och översätta mellan svenska och thailändska', 'เข้าใจและสร้างประโยคด้วย ถ้า ถึงแม้ว่า ที่ เมื่อ และแปลระหว่างภาษาสวีเดนกับภาษาไทย'),
      objectives: [O('Använda ถ้า … ก็ och ถึงแม้ว่า … แต่', 'ใช้ ถ้า … ก็ และ ถึงแม้ว่า … แต่'), O('Använda ที่ och เมื่อ', 'ใช้ ที่ และ เมื่อ'), O('Översätta mening för mening, inte ord för ord', 'แปลทีละประโยค ไม่ใช่ทีละคำ')],
      dialogue: [d('', 'ถ้า|ฝนตก|เรา|ก็|อยู่|บ้าน', 'tha fon tok rao ko yu ban', 'Om det regnar stannar vi hemma.'),
        d('', 'ถึงแม้ว่า|ภาษาไทย|ยาก|แต่|ฉัน|ก็|ชอบ|เรียน', 'thueng maewa phasa thai yak tae chan ko chop rian', 'Fast thailändska är svårt tycker jag om att lära mig det.'),
        d('', 'เพื่อน|ที่|มา|จาก|เชียงใหม่|พูด|ภาษาเหนือ', 'phuean thi ma chak chiang mai phut phasa nuea', 'Kompisen som kommer från Chiang Mai talar nordthailändska.'),
        d('', 'เมื่อ|ฉัน|ไป|ประเทศไทย|ฉัน|จะ|ไป|หา|ยาย', 'muea chan pai prathet thai chan cha pai ha yai', 'När jag åker till Thailand ska jag hälsa på mormor.')],
      vocab: [w('ถ้า', 'tha', 'om (villkor)'), w('ก็', 'ko', 'så, då; också'), w('ถึงแม้ว่า', 'thueng maewa', 'fastän'), w('ยาก', 'yak', 'svår'), w('ง่าย', 'ngai', 'lätt'),
        w('ที่', 'thi', 'som (relativ); vid'), w('เมื่อ', 'muea', 'när'), w('ฝนตก', 'fon tok', 'det regnar'), w('แปล', 'plae', 'översätta'), w('หา', 'ha', 'hälsa på; leta efter')],
      grammar: { title: O('Villkor, medgivande, relativsatser – och att översätta', 'ประโยคเงื่อนไข ประโยคขัดแย้ง ประโยคขยาย และการแปล'),
        body: O('ถ้า … ก็ … = om … så …: ถ้าฝนตก เราก็อยู่บ้าน. ก็ kan ofta utelämnas.\n\nถึงแม้ว่า … แต่ … ก็ … = fast … så …: på thailändska används både ”fast” och ”men”, vilket man inte gör på svenska.\n\nที่ (eller formellt ซึ่ง) = som: เพื่อนที่มาจากเชียงใหม่. เมื่อ = när: เมื่อฉันไปประเทศไทย.\n\nNär du översätter: tänk på hela meningen. Thailändskan utelämnar ofta subjektet, har ingen tempusböjning och lägger artighetsord sist. Svenska ”jag” kan bli ฉัน, ผม eller หนู beroende på vem som talar.',
          'ถ้า … ก็ … ใช้บอกเงื่อนไข: ถ้าฝนตก เราก็อยู่บ้าน\n\nถึงแม้ว่า … แต่ … ก็ … ใช้บอกความขัดแย้ง ภาษาไทยใช้ทั้ง ถึงแม้ว่า และ แต่ ในประโยคเดียว แต่ภาษาสวีเดนใช้คำเดียว\n\nที่ (ทางการใช้ ซึ่ง) เชื่อมคำนามกับประโยคขยาย เมื่อ ใช้บอกเวลา\n\nเวลาแปล ให้คิดทั้งประโยค ภาษาไทยมักละประธาน ไม่เปลี่ยนรูปคำกริยาตามเวลา และมีคำลงท้าย คำว่า "jag" ในภาษาสวีเดนแปลได้ทั้ง ฉัน ผม หรือ หนู ขึ้นกับผู้พูด') },
      exercises: [
        { type: 'gap', text: '___ฝนตก เราก็อยู่บ้าน', opts: ['ถ้า', 'แต่', 'ที่'], a: 'ถ้า', tr: { sv: 'Om det regnar stannar vi hemma.' } },
        { type: 'order', answer: 'เพื่อน|ที่|มา|จาก|เชียงใหม่', rom: 'phuean thi ma chak chiang mai', tr: { sv: 'kompisen som kommer från Chiang Mai' } },
        { type: 'mc', prompt: 'ถึงแม้ว่าเหนื่อย แต่เขาก็ทำงานต่อ', q: O('Vad betyder meningen?', 'ประโยคนี้หมายความว่าอะไร'), opts: ['Fast hon är trött fortsätter hon att arbeta.', 'Hon är trött och slutar arbeta.', 'Om hon är trött slutar hon.'], a: 0 },
        { type: 'mc', prompt: 'När jag är hemma läser jag.', noSay: true, q: O('Välj rätt översättning.', 'เลือกคำแปลที่ถูกต้อง'), opts: ['เมื่ออยู่บ้าน ฉันอ่านหนังสือ', 'ถ้าอยู่บ้าน ฉันก็ไม่อ่าน', 'ฉันอ่านหนังสือที่บ้านเพื่อน'], a: 0 },
        { type: 'write', task: O('Översätt till thailändska: ”Om det är varmt i morgon ska vi bada.”', 'แปลเป็นภาษาไทย: "Om det är varmt i morgon ska vi bada."'), model: 'ถ้าพรุ่งนี้อากาศร้อน เราจะไปว่ายน้ำ' }
      ] }
  ];

  const have = new Set(course.lessons.map(l => l.id));
  NEW.forEach(l => { if (!have.has(l.id)) course.lessons.push(l); });

  /* level names after the curriculum plan (ability levels, not ages) */
  const LV = { L1: ['Nybörjare', 'Beginner', 'ระดับเริ่มต้น'], L2: ['Grundnivå', 'Foundation', 'ระดับพื้นฐาน'], L3: ['Elementär nivå', 'Elementary', 'ระดับต้น'],
    L4: ['Mellannivå', 'Intermediate', 'ระดับกลาง'], L5: ['Avancerad nivå', 'Advanced', 'ระดับสูง'] };
  (course.levels || []).forEach(lv => { const n = LV[lv.id]; if (n) lv.name = { sv: n[0], en: n[1], th: n[2] }; });

  /* units: Level → Unit → Lesson. The lesson order of the course follows the units. */
  course.units = [
    { id: 'u1', level: 'L1', title: O('Skrift och ljud', 'ตัวอักษรและเสียง'), lessons: ['th-1-intro', 'th-1-consonants', 'th-1-vowels', 'th-1-tones'] },
    { id: 'u2', level: 'L1', title: O('Första orden', 'คำแรก ๆ'), lessons: ['th-1-greet', 'th-1-numbers'] },
    { id: 'u3', level: 'L2', title: O('Läsa och stava', 'อ่านและสะกดคำ'), lessons: ['th-2-spelling', 'th-2-sentences'] },
    { id: 'u4', level: 'L2', title: O('Vardag', 'ชีวิตประจำวัน'), lessons: ['th-2-family', 'th-2-food'] },
    { id: 'u5', level: 'L3', title: O('Ljud och meningar', 'เสียงและประโยค'), lessons: ['th-3-finals', 'th-3-sentences'] },
    { id: 'u6', level: 'L3', title: O('Ute i stan', 'ออกไปข้างนอก'), lessons: ['th-3-shopping', 'th-3-directions'] },
    { id: 'u7', level: 'L4', title: O('Läsa mer', 'อ่านให้มากขึ้น'), lessons: ['th-4-clusters', 'th-4-reading'] },
    { id: 'u8', level: 'L4', title: O('Praktisk thailändska', 'ภาษาไทยใช้งานจริง'), lessons: ['th-4-health', 'th-4-work'] },
    { id: 'u9', level: 'L5', title: O('Texter och kultur', 'เรื่องอ่านและวัฒนธรรม'), lessons: ['th-5-songkran', 'th-5-translate'] },
    { id: 'u10', level: 'L5', title: O('Kommunikation', 'การสื่อสาร'), lessons: ['th-5-opinion', 'th-5-register'] }
  ];
  const order = [].concat(...course.units.map(u => u.lessons));
  const pos = id => { const i = order.indexOf(id); return i < 0 ? 1e6 : i; };
  course.lessons.sort((a, b) => pos(a.id) - pos(b.id));
})(typeof window !== 'undefined' ? window : globalThis);
