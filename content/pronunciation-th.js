/* Thai pronunciation module (Phase D): consonants, vowels, tones, final consonants, live and dead syllables, clusters, leading
   consonants, words and sentence rhythm. Written for Pasathai (not copied from a book). Romanization: RTGS (Thailand's official
   system; it shows neither tone nor vowel length – always listen). Explanations in Swedish (sv) and Thai (th).
   "say" is what the Thai voice reads (a consonant is read with its name, e.g. "กอ ไก่"; a vowel with the silent carrier อ).
   Used by js/academy/pron-ui.js; checked by tests/pronunciation.test.js. */
(function (G) {
  'use strict';
  const C = G.FGH_CONTENT = G.FGH_CONTENT || {};

  /* letter, name word, RTGS name, Swedish meaning, class (m = mid, h = high, l = low), sound at the start, sound at the end (null = never final), obsolete */
  const CONS = [
    ['ก', 'ไก่', 'ko kai', 'höna', 'm', 'k', 'k'], ['ข', 'ไข่', 'kho khai', 'ägg', 'h', 'kh', 'k'], ['ฃ', 'ขวด', 'kho khuat', 'flaska', 'h', 'kh', 'k', 1],
    ['ค', 'ควาย', 'kho khwai', 'vattenbuffel', 'l', 'kh', 'k'], ['ฅ', 'คน', 'kho khon', 'människa', 'l', 'kh', 'k', 1], ['ฆ', 'ระฆัง', 'kho rakhang', 'tempelklocka', 'l', 'kh', 'k'],
    ['ง', 'งู', 'ngo ngu', 'orm', 'l', 'ng', 'ng'], ['จ', 'จาน', 'cho chan', 'tallrik', 'm', 'ch', 't'], ['ฉ', 'ฉิ่ง', 'cho ching', 'små cymbaler', 'h', 'ch', null],
    ['ช', 'ช้าง', 'cho chang', 'elefant', 'l', 'ch', 't'], ['ซ', 'โซ่', 'so so', 'kedja', 'l', 's', 't'], ['ฌ', 'เฌอ', 'cho choe', 'träd', 'l', 'ch', 't'],
    ['ญ', 'หญิง', 'yo ying', 'kvinna', 'l', 'y', 'n'], ['ฎ', 'ชฎา', 'do chada', 'dansarkrona', 'm', 'd', 't'], ['ฏ', 'ปฏัก', 'to patak', 'elefantpik', 'm', 't', 't'],
    ['ฐ', 'ฐาน', 'tho than', 'sockel', 'h', 'th', 't'], ['ฑ', 'มณโฑ', 'tho montho', 'Montho (kvinna i Ramakien)', 'l', 'th', 't'], ['ฒ', 'ผู้เฒ่า', 'tho phuthao', 'gammal man', 'l', 'th', 't'],
    ['ณ', 'เณร', 'no nen', 'novis (ung munk)', 'l', 'n', 'n'], ['ด', 'เด็ก', 'do dek', 'barn', 'm', 'd', 't'], ['ต', 'เต่า', 'to tao', 'sköldpadda', 'm', 't', 't'],
    ['ถ', 'ถุง', 'tho thung', 'påse', 'h', 'th', 't'], ['ท', 'ทหาร', 'tho thahan', 'soldat', 'l', 'th', 't'], ['ธ', 'ธง', 'tho thong', 'flagga', 'l', 'th', 't'],
    ['น', 'หนู', 'no nu', 'mus, råtta', 'l', 'n', 'n'], ['บ', 'ใบไม้', 'bo baimai', 'löv', 'm', 'b', 'p'], ['ป', 'ปลา', 'po pla', 'fisk', 'm', 'p', 'p'],
    ['ผ', 'ผึ้ง', 'pho phueng', 'bi', 'h', 'ph', null], ['ฝ', 'ฝา', 'fo fa', 'lock', 'h', 'f', null], ['พ', 'พาน', 'pho phan', 'offerfat på fot', 'l', 'ph', 'p'],
    ['ฟ', 'ฟัน', 'fo fan', 'tand', 'l', 'f', 'p'], ['ภ', 'สำเภา', 'pho samphao', 'djonk (segelskepp)', 'l', 'ph', 'p'], ['ม', 'ม้า', 'mo ma', 'häst', 'l', 'm', 'm'],
    ['ย', 'ยักษ์', 'yo yak', 'jätte', 'l', 'y', 'y'], ['ร', 'เรือ', 'ro ruea', 'båt', 'l', 'r', 'n'], ['ล', 'ลิง', 'lo ling', 'apa', 'l', 'l', 'n'],
    ['ว', 'แหวน', 'wo waen', 'ring', 'l', 'w', 'w'], ['ศ', 'ศาลา', 'so sala', 'paviljong', 'h', 's', 't'], ['ษ', 'ฤๅษี', 'so ruesi', 'eremit', 'h', 's', 't'],
    ['ส', 'เสือ', 'so suea', 'tiger', 'h', 's', 't'], ['ห', 'หีบ', 'ho hip', 'kista', 'h', 'h', null], ['ฬ', 'จุฬา', 'lo chula', 'stjärnformad drake', 'l', 'l', 'n'],
    ['อ', 'อ่าง', 'o ang', 'balja', 'm', '–', null], ['ฮ', 'นกฮูก', 'ho nokhuk', 'uggla', 'l', 'h', null]
  ].map(([t, name, rom, sv, cls, ini, fin, old]) => ({ t, name, say: t + 'อ ' + name, rom, sv, cls, ini, fin, old: !!old }));

  /* form (– = where the consonant goes), carrier reading, RTGS, short/long, example, example RTGS, Swedish */
  const VOW = [
    ['–ะ', 'อะ', 'a', 's', 'จะ', 'cha', 'ska (framtid)'], ['–า', 'อา', 'a', 'l', 'มา', 'ma', 'komma'],
    ['–ิ', 'อิ', 'i', 's', 'กิน', 'kin', 'äta'], ['–ี', 'อี', 'i', 'l', 'ดี', 'di', 'bra'],
    ['–ึ', 'อึ', 'ue', 's', 'ถึง', 'thueng', 'komma fram till'], ['–ือ', 'อือ', 'ue', 'l', 'มือ', 'mue', 'hand'],
    ['–ุ', 'อุ', 'u', 's', 'ดุ', 'du', 'sträng, skälla'], ['–ู', 'อู', 'u', 'l', 'ดู', 'du', 'titta'],
    ['เ–ะ', 'เอะ', 'e', 's', 'เตะ', 'te', 'sparka'], ['เ–', 'เอ', 'e', 'l', 'เท', 'the', 'hälla'],
    ['แ–ะ', 'แอะ', 'ae', 's', 'แกะ', 'kae', 'får (djuret)'], ['แ–', 'แอ', 'ae', 'l', 'แม่', 'mae', 'mamma'],
    ['โ–ะ', 'โอะ', 'o', 's', 'โต๊ะ', 'to', 'bord'], ['โ–', 'โอ', 'o', 'l', 'โต', 'to', 'stor, växa'],
    ['เ–าะ', 'เอาะ', 'o', 's', 'เกาะ', 'ko', 'ö'], ['–อ', 'ออ', 'o', 'l', 'พ่อ', 'pho', 'pappa'],
    ['เ–อะ', 'เออะ', 'oe', 's', 'เลอะ', 'loe', 'nedkladdad'], ['เ–อ', 'เออ', 'oe', 'l', 'เธอ', 'thoe', 'du, hon'],
    ['เ–ียะ', 'เอียะ', 'ia', 's', 'เกี๊ยะ', 'kia', 'träsko'], ['เ–ีย', 'เอีย', 'ia', 'l', 'เรียน', 'rian', 'studera'],
    ['เ–ือ', 'เอือ', 'uea', 'l', 'เรือ', 'ruea', 'båt'], ['–ัว', 'อัว', 'ua', 'l', 'วัว', 'wua', 'ko'],
    ['–ำ', 'อำ', 'am', 'x', 'น้ำ', 'nam', 'vatten'], ['ใ–', 'ใอ', 'ai', 'x', 'ใจ', 'chai', 'hjärta'],
    ['ไ–', 'ไอ', 'ai', 'x', 'ไป', 'pai', 'gå, åka'], ['เ–า', 'เอา', 'ao', 'x', 'เขา', 'khao', 'han, hon; berg']
  ].map(([t, say, rom, len, ex, exRom, sv]) => ({ t, say, rom, len, ex, exRom, sv }));

  /* the five tones on "kha": the classic minimal set */
  const TONES = [
    { t: 'คา', rom: 'kha', tone: 'mid', sv: 'fastna, sitta fast', mark: '' },
    { t: 'ข่า', rom: 'kha', tone: 'low', sv: 'galangal (kryddrot)', mark: '่' },
    { t: 'ค่า', rom: 'kha', tone: 'falling', sv: 'värde, pris', mark: '่' },
    { t: 'ค้า', rom: 'kha', tone: 'high', sv: 'handla med varor', mark: '้' },
    { t: 'ขา', rom: 'kha', tone: 'rising', sv: 'ben', mark: '' }
  ];
  const TONE_NAMES = {
    mid: { sv: 'Mellanton', th: 'เสียงสามัญ' }, low: { sv: 'Låg ton', th: 'เสียงเอก' }, falling: { sv: 'Fallande ton', th: 'เสียงโท' },
    high: { sv: 'Hög ton', th: 'เสียงตรี' }, rising: { sv: 'Stigande ton', th: 'เสียงจัตวา' }
  };
  const MARKS = [
    { t: '่', name: 'ไม้เอก', rom: 'mai ek' }, { t: '้', name: 'ไม้โท', rom: 'mai tho' }, { t: '๊', name: 'ไม้ตรี', rom: 'mai tri' }, { t: '๋', name: 'ไม้จัตวา', rom: 'mai chattawa' }
  ];
  /* tone rules: class → [no mark, live] [no mark, dead short] [no mark, dead long] ่ ้ ๊ ๋ */
  const RULES = [
    { cls: 'm', live: 'mid', deadS: 'low', deadL: 'low', ek: 'low', tho: 'falling', tri: 'high', chat: 'rising' },
    { cls: 'h', live: 'rising', deadS: 'low', deadL: 'low', ek: 'low', tho: 'falling', tri: null, chat: null },
    { cls: 'l', live: 'mid', deadS: 'high', deadL: 'falling', ek: 'falling', tho: 'high', tri: null, chat: null }
  ];

  const FINALS = [
    { t: 'แม่ ก กา', rom: 'mae ko ka', sound: '', letters: '', ex: 'มา', exRom: 'ma', sv: 'komma', note: { sv: 'Ingen slutkonsonant: stavelsen slutar på vokalen.', th: 'ไม่มีตัวสะกด' } },
    { t: 'แม่กก', rom: 'mae kok', sound: 'k', letters: 'ก ข ค ฆ', ex: 'นก', exRom: 'nok', sv: 'fågel' },
    { t: 'แม่กด', rom: 'mae kot', sound: 't', letters: 'ด จ ช ซ ฎ ฏ ฐ ฑ ฒ ต ถ ท ธ ศ ษ ส', ex: 'มด', exRom: 'mot', sv: 'myra' },
    { t: 'แม่กบ', rom: 'mae kop', sound: 'p', letters: 'บ ป พ ฟ ภ', ex: 'กบ', exRom: 'kop', sv: 'groda' },
    { t: 'แม่กง', rom: 'mae kong', sound: 'ng', letters: 'ง', ex: 'ลิง', exRom: 'ling', sv: 'apa' },
    { t: 'แม่กน', rom: 'mae kon', sound: 'n', letters: 'น ญ ณ ร ล ฬ', ex: 'อาหาร', exRom: 'ahan', sv: 'mat', note: { sv: 'ร och ล i slutet låter n: อาหาร (ahan).', th: 'ร และ ล เมื่อเป็นตัวสะกดออกเสียงเป็น น' } },
    { t: 'แม่กม', rom: 'mae kom', sound: 'm', letters: 'ม', ex: 'ส้ม', exRom: 'som', sv: 'apelsin' },
    { t: 'แม่เกย', rom: 'mae koei', sound: 'y (i)', letters: 'ย', ex: 'ยาย', exRom: 'yai', sv: 'mormor' },
    { t: 'แม่เกอว', rom: 'mae koeo', sound: 'w (o)', letters: 'ว', ex: 'ขาว', exRom: 'khao', sv: 'vit' }
  ];

  const LIVEDEAD = [
    { t: 'มา', rom: 'ma', sv: 'komma', live: true, why: { sv: 'lång vokal, ingen slutkonsonant', th: 'สระเสียงยาว ไม่มีตัวสะกด' } },
    { t: 'กิน', rom: 'kin', sv: 'äta', live: true, why: { sv: 'slutar på n', th: 'สะกดด้วยแม่กน' } },
    { t: 'ลม', rom: 'lom', sv: 'vind', live: true, why: { sv: 'slutar på m', th: 'สะกดด้วยแม่กม' } },
    { t: 'จะ', rom: 'cha', sv: 'ska', live: false, why: { sv: 'kort vokal, ingen slutkonsonant', th: 'สระเสียงสั้น ไม่มีตัวสะกด' } },
    { t: 'นก', rom: 'nok', sv: 'fågel', live: false, why: { sv: 'slutar på k', th: 'สะกดด้วยแม่กก' } },
    { t: 'มด', rom: 'mot', sv: 'myra', live: false, why: { sv: 'slutar på t', th: 'สะกดด้วยแม่กด' } },
    { t: 'กบ', rom: 'kop', sv: 'groda', live: false, why: { sv: 'slutar på p', th: 'สะกดด้วยแม่กบ' } }
  ];

  const CLUSTERS = [
    { t: 'กลาง', rom: 'klang', sv: 'mitten', pair: 'กล' }, { t: 'กว้าง', rom: 'kwang', sv: 'bred', pair: 'กว' }, { t: 'กรุง', rom: 'krung', sv: 'huvudstad', pair: 'กร' },
    { t: 'ขวา', rom: 'khwa', sv: 'höger', pair: 'ขว' }, { t: 'ขลุ่ย', rom: 'khlui', sv: 'flöjt', pair: 'ขล' }, { t: 'ครู', rom: 'khru', sv: 'lärare', pair: 'คร' },
    { t: 'คลอง', rom: 'khlong', sv: 'kanal', pair: 'คล' }, { t: 'ความ', rom: 'khwam', sv: '-het (gör ord till substantiv)', pair: 'คว' }, { t: 'ตรง', rom: 'trong', sv: 'rak, rakt', pair: 'ตร' },
    { t: 'ประเทศ', rom: 'prathet', sv: 'land', pair: 'ปร' }, { t: 'ปลา', rom: 'pla', sv: 'fisk', pair: 'ปล' }, { t: 'พระ', rom: 'phra', sv: 'munk', pair: 'พร' },
    { t: 'เพลง', rom: 'phleng', sv: 'sång', pair: 'พล' }
  ];
  const FALSE_CLUSTERS = [
    { t: 'ทราย', rom: 'sai', sv: 'sand', note: { sv: 'ทร låter s', th: 'ทร ออกเสียงเป็น ซ' } },
    { t: 'ทราบ', rom: 'sap', sv: 'veta (artigt)', note: { sv: 'ทร låter s', th: 'ทร ออกเสียงเป็น ซ' } },
    { t: 'จริง', rom: 'ching', sv: 'sann, verkligen', note: { sv: 'ร hörs inte', th: 'ไม่ออกเสียง ร' } },
    { t: 'สร้าง', rom: 'sang', sv: 'bygga', note: { sv: 'ร hörs inte', th: 'ไม่ออกเสียง ร' } },
    { t: 'เศร้า', rom: 'sao', sv: 'ledsen', note: { sv: 'ร hörs inte', th: 'ไม่ออกเสียง ร' } }
  ];

  const LEADING = [
    { t: 'หมา', rom: 'ma', sv: 'hund', lead: 'ห' }, { t: 'หนู', rom: 'nu', sv: 'mus, råtta', lead: 'ห' }, { t: 'ใหม่', rom: 'mai', sv: 'ny', lead: 'ห' },
    { t: 'หลาย', rom: 'lai', sv: 'många', lead: 'ห' }, { t: 'หวาน', rom: 'wan', sv: 'söt', lead: 'ห' }, { t: 'หญิง', rom: 'ying', sv: 'kvinna', lead: 'ห' },
    { t: 'อย่า', rom: 'ya', sv: 'gör inte', lead: 'อ' }, { t: 'อยู่', rom: 'yu', sv: 'vara, bo', lead: 'อ' }, { t: 'อย่าง', rom: 'yang', sv: 'sort, sätt', lead: 'อ' },
    { t: 'อยาก', rom: 'yak', sv: 'vilja', lead: 'อ' },
    { t: 'ขนม', rom: 'khanom', sv: 'kaka, godis', lead: 'ข' }, { t: 'ตลาด', rom: 'talat', sv: 'marknad', lead: 'ต' }, { t: 'สนุก', rom: 'sanuk', sv: 'rolig', lead: 'ส' }
  ];

  const WORDS = [
    { t: 'สวัสดี', rom: 'sawatdi', sv: 'hej' }, { t: 'ขอบคุณ', rom: 'khop khun', sv: 'tack' }, { t: 'ไม่เป็นไร', rom: 'mai pen rai', sv: 'det gör inget' },
    { t: 'ภาษาไทย', rom: 'phasa thai', sv: 'thailändska (språket)' }, { t: 'ประเทศไทย', rom: 'prathet thai', sv: 'Thailand' }, { t: 'สวีเดน', rom: 'sawiden', sv: 'Sverige' },
    { t: 'อร่อย', rom: 'aroi', sv: 'gott' }, { t: 'โรงเรียน', rom: 'rongrian', sv: 'skola' }, { t: 'ครอบครัว', rom: 'khropkhrua', sv: 'familj' },
    { t: 'เพื่อน', rom: 'phuean', sv: 'vän' }, { t: 'คุณแม่', rom: 'khun mae', sv: 'mamma (artigt)' }, { t: 'คุณพ่อ', rom: 'khun pho', sv: 'pappa (artigt)' }
  ];
  const RHYTHM = [
    { t: 'ผม|ชื่อ|ต้น|ครับ', rom: 'phom chue ton khrap', sv: 'Jag heter Ton. (sagt av en man)' },
    { t: 'ฉัน|มา|จาก|สวีเดน|ค่ะ', rom: 'chan ma chak sawiden kha', sv: 'Jag kommer från Sverige. (sagt av en kvinna)' },
    { t: 'วันนี้|อากาศ|ดี|มาก', rom: 'wanni akat di mak', sv: 'Vädret är mycket fint i dag.' },
    { t: 'คุณ|พูด|ภาษาไทย|ได้|ไหม', rom: 'khun phut phasa thai dai mai', sv: 'Kan du tala thailändska?' },
    { t: 'ขอบคุณ|มาก|ครับ', rom: 'khop khun mak khrap', sv: 'Tack så mycket.' }
  ];

  const SECTIONS = [
    { id: 'consonants', icon: 'ก', title: { sv: 'Konsonanter (44)', th: 'พยัญชนะ ๔๔ ตัว' },
      intro: { sv: 'Thailändskan har 44 konsonanttecken men färre ljud: flera tecken låter likadant. Varje konsonant har ett namn med ett exempelord, ก ไก่ = ”k som i höna”. Konsonanterna delas i tre klasser (mellan, hög, låg); klassen styr tonen. Två tecken (ฃ, ฅ) används inte längre. I slutet av en stavelse låter många konsonanter annorlunda än i början.',
        th: 'ภาษาไทยมีพยัญชนะ ๔๔ ตัว แต่มีเสียงน้อยกว่านั้น เพราะหลายตัวออกเสียงเหมือนกัน พยัญชนะแต่ละตัวมีชื่อเรียกพร้อมคำตัวอย่าง เช่น ก ไก่ พยัญชนะแบ่งเป็น ๓ หมู่ คือ อักษรกลาง อักษรสูง และอักษรต่ำ ซึ่งมีผลต่อเสียงวรรณยุกต์ ฃ และ ฅ เลิกใช้แล้ว เมื่อเป็นตัวสะกด พยัญชนะหลายตัวออกเสียงต่างจากตอนเป็นพยัญชนะต้น' } },
    { id: 'vowels', icon: 'อา', title: { sv: 'Vokaler – korta och långa', th: 'สระเสียงสั้นและเสียงยาว' },
      intro: { sv: 'Vokalerna kommer i par: en kort och en lång. Längden kan ändra betydelsen (ดุ du ”sträng” – ดู du ”titta”). Vokaltecknet kan stå före, efter, över eller under konsonanten; strecket – visar var konsonanten står. När ett ord börjar med en vokal skrivs den stumma bäraren อ.',
        th: 'สระมักเป็นคู่ คือ เสียงสั้นและเสียงยาว ความยาวของเสียงทำให้ความหมายเปลี่ยนได้ เช่น ดุ กับ ดู รูปสระวางได้ทั้งหน้า หลัง บน และล่างพยัญชนะ ขีด – แสดงตำแหน่งของพยัญชนะ ถ้าคำขึ้นต้นด้วยเสียงสระ จะใช้ อ เป็นตัวนำ' } },
    { id: 'tones', icon: '♪', title: { sv: 'De fem tonerna', th: 'วรรณยุกต์ ๕ เสียง' },
      intro: { sv: 'Thailändskan har fem toner: mellan, låg, fallande, hög och stigande. Samma stavelse med olika ton är olika ord: คา ข่า ค่า ค้า ขา. Tonen bestäms av konsonantklassen, om stavelsen är levande eller död, vokalens längd och tonmärket (ก่ ก้ ก๊ ก๋). Lyssna och härma – romaniseringen visar inte tonen.',
        th: 'ภาษาไทยมี ๕ เสียงวรรณยุกต์ คือ สามัญ เอก โท ตรี จัตวา พยางค์เดียวกันแต่ต่างเสียงวรรณยุกต์จะเป็นคนละคำ เช่น คา ข่า ค่า ค้า ขา เสียงวรรณยุกต์ขึ้นกับหมู่ของพยัญชนะ คำเป็นหรือคำตาย ความยาวของสระ และรูปวรรณยุกต์' } },
    { id: 'finals', icon: '–ก', title: { sv: 'Slutkonsonanter', th: 'มาตราตัวสะกด' },
      intro: { sv: 'I slutet av en stavelse finns bara åtta ljud: k, t, p, ng, n, m, y och w. Slutljuden k, t och p släpps inte ut – munnen stängs utan luftpuff. Många olika tecken låter t i slutet.',
        th: 'ตัวสะกดในภาษาไทยมี ๘ มาตรา คือ แม่กก กด กบ กง กน กม เกย เกอว เสียง ก ด บ ท้ายคำไม่ปล่อยลม พยัญชนะหลายตัวเมื่อเป็นตัวสะกดออกเสียงเป็น ด' } },
    { id: 'livedead', icon: '⚖', title: { sv: 'Levande och döda stavelser', th: 'คำเป็น คำตาย' },
      intro: { sv: 'En levande stavelse (คำเป็น) har lång vokal eller slutar på ng, n, m, y eller w – den kan dras ut. En död stavelse (คำตาย) har kort vokal utan slutkonsonant eller slutar på k, t eller p – den tar tvärt slut. Det påverkar tonen.',
        th: 'คำเป็น คือ คำที่ประสมสระเสียงยาว หรือมีตัวสะกดแม่กง กน กม เกย เกอว คำตาย คือ คำที่ประสมสระเสียงสั้นไม่มีตัวสะกด หรือมีตัวสะกดแม่กก กด กบ คำเป็นคำตายมีผลต่อเสียงวรรณยุกต์' } },
    { id: 'clusters', icon: 'กร', title: { sv: 'Konsonantkluster', th: 'คำควบกล้ำ' },
      intro: { sv: 'Två konsonanter i början som uttalas tillsammans: ร, ล eller ว efter ก ข ค ต ป พ (ปลา pla, ครู khru). I vardagstal hörs r ofta som l eller försvinner, men i skolan lär man sig att uttala det. Vissa kluster är ”falska”: ทร låter s, och efter จ ซ ศ ส hörs ร inte.',
        th: 'คำควบกล้ำแท้ คือ พยัญชนะต้น ๒ ตัวที่ออกเสียงพร้อมกัน โดยมี ร ล ว ตามหลัง ก ข ค ต ป พ เช่น ปลา ครู คำควบกล้ำไม่แท้ คือ ทร ออกเสียงเป็น ซ และ ร ที่ตามหลัง จ ซ ศ ส ไม่ออกเสียง' } },
    { id: 'leading', icon: 'ห', title: { sv: 'Ledande konsonanter (อักษรนำ)', th: 'อักษรนำ' },
      intro: { sv: 'Ett stumt ห före en lågklasskonsonant (ง ญ น ม ย ร ล ว) gör att stavelsen får högklassens toner: หมา ma (stigande ton). อ före ย gör samma sak i fyra ord: อย่า อยู่ อย่าง อยาก. Ibland läses en mellan- eller högklasskonsonant med ett kort a och styr tonen på nästa stavelse: ขนม khanom, ตลาด talat.',
        th: 'อักษรนำ คือ ห นำอักษรต่ำเดี่ยว (ง ญ น ม ย ร ล ว) ทำให้ออกเสียงวรรณยุกต์ตามอักษรสูง เช่น หมา และ อ นำ ย มี ๔ คำ คือ อย่า อยู่ อย่าง อยาก นอกจากนี้อักษรกลางหรืออักษรสูงอาจนำอักษรต่ำ เช่น ขนม ตลาด' } },
    { id: 'words', icon: '💬', title: { sv: 'Ord att öva', th: 'ฝึกออกเสียงคำ' },
      intro: { sv: 'Vanliga ord. Lyssna, säg efter, och lyssna igen långsamt. Tryck 🧩 för att höra ordet stavelse för stavelse eller ord för ord.', th: 'คำที่ใช้บ่อย ฟัง พูดตาม และฟังซ้ำแบบช้า กด 🧩 เพื่อฟังทีละคำ' } },
    { id: 'rhythm', icon: '〰', title: { sv: 'Meningsrytm', th: 'จังหวะของประโยค' },
      intro: { sv: 'Thailändska skrivs utan mellanslag mellan orden; ett mellanslag betyder en paus mellan fraser eller meningar. Man talar i små ordgrupper, och sista stavelsen i ett ord eller en fras får lite mer tyngd. Artighetsorden ครับ (män) och ค่ะ (kvinnor) kommer sist. Lyssna ord för ord med 🧩 och sedan hela meningen.',
        th: 'ภาษาไทยเขียนติดกันโดยไม่เว้นวรรคระหว่างคำ การเว้นวรรคแสดงการหยุดระหว่างวลีหรือประโยค เวลาพูดจะแบ่งเป็นกลุ่มคำสั้น ๆ พยางค์ท้ายของคำหรือวลีมักออกเสียงหนักกว่า คำลงท้าย ครับ ค่ะ อยู่ท้ายประโยค' } }
  ];

  C.pronunciation = { SECTIONS, CONS, VOW, TONES, TONE_NAMES, MARKS, RULES, FINALS, LIVEDEAD, CLUSTERS, FALSE_CLUSTERS, LEADING, WORDS, RHYTHM,
    CLASS: { m: { sv: 'mellanklass', th: 'อักษรกลาง' }, h: { sv: 'högklass', th: 'อักษรสูง' }, l: { sv: 'lågklass', th: 'อักษรต่ำ' } } };
})(typeof window !== 'undefined' ? window : globalThis);
