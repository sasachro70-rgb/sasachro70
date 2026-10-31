/* Adult Language Academy – Swedish course (SAMPLE CONTENT: two lessons per level from A1 to B1, one at B2 and C1).
   Explanations in Thai (th) and English (en). Content only; js/family/academy.js builds the exercises and tests.
   Lesson fields:
     id, level (A1–C1), skills (see FGH.FT.*.skills), icon, title {th,en}, goal {th,en}
     dialogue: [{ who, t (Swedish), tr {th,en} }]   (a reading text uses who: '' )
     vocab:    [{ t, tr {th,en}, note? {th,en} }]
     grammar:  { title {th,en}, body {th,en} (plain text, blank line = new paragraph), table? [[cells]] }
     exercises: mc | gap | order | translate | listen | write  (see js/family/academy.js)
   Translations are written as natural Thai and English, not word-for-word. */
(function (G) {
  'use strict';
  const C = G.FGH_CONTENT = G.FGH_CONTENT || {};
  const A = C.academy = C.academy || { courses: {} };
  const d = (who, t, th, en) => ({ who, t, tr: { th, en } });
  const v = (t, th, en, note) => ({ t, tr: { th, en }, note: note || null });

  A.courses.sv = {
    desc: { en: 'Swedish for everyday life, work and study in Sweden – explained in Thai or English.', sv: 'Svenska för vardag, jobb och studier – förklaringar på thai eller engelska.', th: 'ภาษาสวีเดนสำหรับชีวิตประจำวัน การทำงาน และการเรียน อธิบายเป็นภาษาไทยหรืออังกฤษ' },
    target: 'sv', explain: ['th', 'en'], sample: true, passPct: 70,
    lessons: [
      { id: 'sv-a1-hej', level: 'A1', icon: '👋', skills: ['conversation', 'vocabulary', 'pronunciation', 'speaking'],
        title: { th: 'ทักทายและแนะนำตัว', en: 'Greetings and introducing yourself' },
        goal: { th: 'บอกชื่อ บอกว่ามาจากไหน และถามคนอื่นได้', en: 'Say your name and where you are from, and ask others' },
        dialogue: [
          d('A', 'Hej! Jag heter Anna. Vad heter du?', 'สวัสดีค่ะ ฉันชื่อแอนนา คุณชื่ออะไรคะ', 'Hi! My name is Anna. What’s your name?'),
          d('B', 'Hej! Jag heter Somchai.', 'สวัสดีครับ ผมชื่อสมชาย', 'Hi! I’m Somchai.'),
          d('A', 'Var kommer du ifrån?', 'คุณมาจากไหนคะ', 'Where are you from?'),
          d('B', 'Jag kommer från Thailand. Och du?', 'ผมมาจากประเทศไทยครับ แล้วคุณล่ะครับ', 'I’m from Thailand. And you?'),
          d('A', 'Jag kommer från Sverige. Trevligt att träffas!', 'ฉันมาจากสวีเดนค่ะ ยินดีที่ได้รู้จักค่ะ', 'I’m from Sweden. Nice to meet you!'),
          d('B', 'Detsamma!', 'เช่นกันครับ', 'You too!')
        ],
        vocab: [
          v('hej', 'สวัสดี', 'hi, hello'), v('jag', 'ฉัน, ผม', 'I'), v('du', 'คุณ, เธอ', 'you'),
          v('heter', 'ชื่อ (ใช้กับคน)', 'am/is called', { th: 'Jag heter … = ฉันชื่อ … (ไม่ใช้ “är” ในประโยคนี้)', en: 'Jag heter … = my name is … (Swedish uses a verb, not “is”).' }),
          v('vad', 'อะไร', 'what'), v('var', 'ที่ไหน', 'where'), v('kommer från', 'มาจาก', 'come(s) from'),
          v('och', 'และ', 'and'), v('trevligt att träffas', 'ยินดีที่ได้รู้จัก', 'nice to meet you'), v('detsamma', 'เช่นกัน', 'likewise, you too')
        ],
        grammar: { title: { th: 'กริยาไม่เปลี่ยนตามบุคคล และกริยาอยู่ตำแหน่งที่สอง', en: 'Verbs do not change with the person, and the verb comes second' },
          body: {
            th: 'ภาษาสวีเดนใช้กริยารูปเดียวกับทุกคน: jag heter, du heter, hon heter, vi heter\n\nในประโยคคำถามที่มีคำแสดงคำถาม (vad, var, när) คำถามมาก่อน แล้วตามด้วยกริยา: Vad heter du? Var bor du?\n\nการออกเสียง: å ออกเสียงคล้าย “โอ”, ä คล้าย “แอ”, ö คล้าย “เออ” ตัว j ออกเสียงเหมือน “ย” เช่น jag = “ยาก”',
            en: 'A Swedish verb has the same form for everyone: jag heter, du heter, hon heter, vi heter.\n\nIn a question with a question word (vad, var, när) the question word comes first and the verb second: Vad heter du? Var bor du?\n\nPronunciation: å sounds roughly like the vowel in “more”, ä like in “bed”, ö like in “bird” (without the r). The letter j sounds like English y: jag = “yaag”.' },
          table: [['jag', 'heter', 'Anna'], ['du', 'heter', 'Somchai'], ['hon / han', 'heter', '…'], ['Vad', 'heter', 'du?']] },
        exercises: [
          { type: 'gap', text: 'Jag ___ Somchai.', opts: ['heter', 'kommer', 'bor'], a: 'heter' },
          { type: 'mc', prompt: 'Var kommer du ifrån?', q: { th: 'ประโยคนี้แปลว่าอะไร', en: 'What does this mean?' }, opts: [{ th: 'คุณมาจากไหน', en: 'Where are you from?' }, { th: 'คุณชื่ออะไร', en: 'What is your name?' }, { th: 'คุณอยู่ที่ไหน', en: 'Where do you live?' }], a: 0 },
          { type: 'order', answer: 'Vad heter du?' },
          { type: 'translate', from: { th: 'ฉันมาจากประเทศไทย', en: 'I come from Thailand.' }, answer: 'Jag kommer från Thailand.', accept: ['Jag kommer från Thailand'] },
          { type: 'listen', say: 'Trevligt att träffas!', opts: [{ th: 'ยินดีที่ได้รู้จัก', en: 'Nice to meet you!' }, { th: 'ขอบคุณมาก', en: 'Thank you very much!' }, { th: 'แล้วพบกันใหม่', en: 'See you later!' }], a: 0 },
          { type: 'write', task: { th: 'แนะนำตัวเองสองประโยค: ชื่อ และมาจากไหน', en: 'Introduce yourself in two sentences: your name and where you are from.' }, model: 'Hej! Jag heter Lina. Jag kommer från Thailand.' }
        ] },

      { id: 'sv-a1-handla', level: 'A1', icon: '🛒', skills: ['real', 'vocabulary', 'listening', 'conversation'],
        title: { th: 'ซื้อของในร้าน', en: 'Shopping for food' },
        goal: { th: 'ขอซื้อของ ถามราคา และจ่ายเงินได้', en: 'Ask for things, ask the price and pay' },
        dialogue: [
          d('A', 'Hej! Kan jag hjälpa dig?', 'สวัสดีค่ะ มีอะไรให้ช่วยไหมคะ', 'Hi! Can I help you?'),
          d('B', 'Ja, tack. Jag vill ha två kilo potatis.', 'ครับ ผมอยากได้มันฝรั่งสองกิโลครับ', 'Yes, please. I’d like two kilos of potatoes.'),
          d('A', 'Något mer?', 'รับอะไรเพิ่มอีกไหมคะ', 'Anything else?'),
          d('B', 'En liter mjölk, tack. Vad kostar det?', 'นมหนึ่งลิตรครับ ทั้งหมดเท่าไรครับ', 'A litre of milk, please. How much is it?'),
          d('A', 'Det blir femtiofem kronor.', 'ทั้งหมดห้าสิบห้าโครนาค่ะ', 'That’s fifty-five kronor.'),
          d('B', 'Kan jag betala med kort?', 'จ่ายด้วยบัตรได้ไหมครับ', 'Can I pay by card?'),
          d('A', 'Ja, absolut.', 'ได้แน่นอนค่ะ', 'Yes, of course.')
        ],
        vocab: [
          v('jag vill ha', 'ฉันอยากได้', 'I would like'), v('något mer?', 'เอาอะไรเพิ่มไหม', 'anything else?'), v('vad kostar det?', 'ราคาเท่าไร', 'how much is it?'),
          v('det blir …', 'ทั้งหมด …', 'that comes to …'), v('betala', 'จ่าย', 'to pay'), v('kort', 'บัตร', 'card'), v('kontant', 'เงินสด', 'cash'),
          v('tack', 'ขอบคุณ; ใช้ท้ายคำขอแทน “ครับ/ค่ะ”', 'thanks; also used for “please” in requests', { th: 'คนสวีเดนพูด “…, tack” ท้ายคำขอ เช่น En kaffe, tack.', en: 'Swedes end a request with “…, tack”: En kaffe, tack.' }),
          v('femtiofem', 'ห้าสิบห้า', 'fifty-five')
        ],
        grammar: { title: { th: 'คำนาม en และ ett', en: 'en-words and ett-words' },
          body: {
            th: 'คำนามภาษาสวีเดนมีสองกลุ่ม: en (เช่น en bil = รถหนึ่งคัน) และ ett (เช่น ett hus = บ้านหนึ่งหลัง) ประมาณ 3 ใน 4 ของคำนามเป็น en ควรจำคำนามพร้อม en/ett เสมอ\n\nตัวเลขหลักสิบ: tjugo (20), trettio (30), fyrtio (40), femtio (50), sextio (60), sjuttio (70), åttio (80), nittio (90), hundra (100) ตัวเลขผสมเขียนติดกัน: femtiofem = 55',
            en: 'Swedish nouns come in two groups: en (en bil = a car) and ett (ett hus = a house). About three in four nouns are en-words. Learn every noun together with en or ett.\n\nTens: tjugo (20), trettio (30), fyrtio (40), femtio (50), sextio (60), sjuttio (70), åttio (80), nittio (90), hundra (100). Numbers are written as one word: femtiofem = 55.' },
          table: [['en', 'bil, liter, banan, kaffe'], ['ett', 'hus, kilo, äpple, kort']] },
        exercises: [
          { type: 'gap', text: 'Jag vill ___ två kilo potatis.', opts: ['ha', 'heter', 'kostar'], a: 'ha' },
          { type: 'mc', prompt: 'Vad kostar det?', q: { th: 'ประโยคนี้แปลว่าอะไร', en: 'What does this mean?' }, opts: [{ th: 'ราคาเท่าไร', en: 'How much is it?' }, { th: 'นี่คืออะไร', en: 'What is this?' }, { th: 'จ่ายด้วยบัตรได้ไหม', en: 'Can I pay by card?' }], a: 0 },
          { type: 'gap', text: 'Jag har ___ hus.', opts: ['ett', 'en'], a: 'ett' },
          { type: 'order', answer: 'Kan jag betala med kort?' },
          { type: 'listen', say: 'Det blir femtiofem kronor.', opts: [{ th: '55 โครนา', en: '55 kronor' }, { th: '15 โครนา', en: '15 kronor' }, { th: '50 โครนา', en: '50 kronor' }], a: 0 },
          { type: 'translate', from: { th: 'นมหนึ่งลิตร ขอบคุณครับ', en: 'A litre of milk, please.' }, answer: 'En liter mjölk, tack.', accept: ['En liter mjölk tack'] }
        ] },

      { id: 'sv-a2-jobb', level: 'A2', icon: '💼', skills: ['work', 'conversation', 'grammar'],
        title: { th: 'วันแรกที่ทำงาน', en: 'First day at work' },
        goal: { th: 'คุยกับหัวหน้างาน ถามเรื่องเวลาและกฎในที่ทำงาน', en: 'Talk with a manager and ask about times and routines at work' },
        dialogue: [
          d('A', 'Välkommen! Du måste vara Lina.', 'ยินดีต้อนรับครับ คุณคือลีน่าใช่ไหมครับ', 'Welcome! You must be Lina.'),
          d('B', 'Ja, det stämmer. Jag börjar idag.', 'ใช่ค่ะ ฉันเริ่มงานวันนี้ค่ะ', 'Yes, that’s right. I start today.'),
          d('A', 'Jag heter Erik och jag är din chef. Vi börjar klockan åtta varje dag.', 'ผมชื่อเอริก เป็นหัวหน้าของคุณ เราเริ่มงานแปดโมงเช้าทุกวันครับ', 'I’m Erik and I’m your manager. We start at eight every day.'),
          d('B', 'Okej. När har vi lunch?', 'ค่ะ พักกลางวันกี่โมงคะ', 'OK. When do we have lunch?'),
          d('A', 'Mellan tolv och ett. Har du några frågor?', 'ระหว่างเที่ยงถึงบ่ายโมง มีคำถามอะไรไหมครับ', 'Between twelve and one. Do you have any questions?'),
          d('B', 'Ja, var kan jag hänga min jacka?', 'มีค่ะ ฉันแขวนเสื้อแจ็กเก็ตได้ที่ไหนคะ', 'Yes, where can I hang my jacket?')
        ],
        vocab: [
          v('chef', 'หัวหน้างาน', 'manager, boss', { th: 'chef ภาษาสวีเดนแปลว่าหัวหน้า ไม่ใช่พ่อครัว (พ่อครัว = kock)', en: 'Swedish chef means boss, not a cook (a cook is kock).' }),
          v('börja', 'เริ่ม', 'to start'), v('klockan åtta', 'แปดโมง', 'at eight o’clock'), v('varje dag', 'ทุกวัน', 'every day'), v('när', 'เมื่อไร', 'when'),
          v('mellan … och …', 'ระหว่าง … ถึง …', 'between … and …'), v('det stämmer', 'ถูกต้อง', 'that’s right'),
          v('halv nio', 'แปดโมงครึ่ง', 'half past eight', { th: 'ระวัง! halv nio = 8.30 (ครึ่งชั่วโมงก่อนเก้าโมง) ไม่ใช่ 9.30', en: 'Careful! halv nio = 8:30 (half an hour before nine), not 9:30.' }),
          v('fråga', 'คำถาม; ถาม', 'question; to ask')
        ],
        grammar: { title: { th: 'กริยาช่วย kan, måste, vill + กริยารูปพื้นฐาน', en: 'kan, måste, vill + the infinitive' },
          body: {
            th: 'หลัง kan (ทำได้), måste (ต้อง), vill (อยาก), ska (จะ) ใช้กริยารูปพื้นฐานโดยไม่มี att: Jag kan börja i morgon. Du måste vara Lina.\n\nการบอกเวลา: klockan åtta (8.00), kvart över åtta (8.15), halv nio (8.30), kvart i nio (8.45)',
            en: 'After kan (can), måste (must), vill (want to) and ska (will/shall) use the infinitive without att: Jag kan börja i morgon. Du måste vara Lina.\n\nTelling the time: klockan åtta (8:00), kvart över åtta (8:15), halv nio (8:30), kvart i nio (8:45).' },
          table: [['8:00', 'klockan åtta'], ['8:15', 'kvart över åtta'], ['8:30', 'halv nio'], ['8:45', 'kvart i nio']] },
        exercises: [
          { type: 'mc', prompt: 'halv nio', q: { th: 'กี่โมง', en: 'What time is it?' }, opts: [{ th: '8.30', en: '8:30' }, { th: '9.30', en: '9:30' }, { th: '9.00', en: '9:00' }], a: 0 },
          { type: 'gap', text: 'Vi ___ börja klockan åtta.', opts: ['måste', 'har', 'är'], a: 'måste' },
          { type: 'mc', prompt: 'Erik är min chef.', q: { th: 'Erik เป็นใคร', en: 'Who is Erik?' }, opts: [{ th: 'หัวหน้างาน', en: 'The manager' }, { th: 'พ่อครัว', en: 'The cook' }, { th: 'ลูกค้า', en: 'A customer' }], a: 0 },
          { type: 'order', answer: 'När har vi lunch?' },
          { type: 'listen', say: 'Vi börjar klockan åtta varje dag.', opts: [{ th: 'เราเริ่มงานแปดโมงทุกวัน', en: 'We start at eight every day.' }, { th: 'เราพักกลางวันแปดโมง', en: 'We have lunch at eight.' }, { th: 'เราเลิกงานแปดโมง', en: 'We finish at eight.' }], a: 0 },
          { type: 'write', task: { th: 'เขียนสองประโยค: คุณเริ่มงานกี่โมง และพักกลางวันเมื่อไร', en: 'Write two sentences: when you start work and when you have lunch.' }, model: 'Jag börjar klockan sju. Jag har lunch mellan elva och tolv.' }
        ] },

      { id: 'sv-a2-boka', level: 'A2', icon: '📞', skills: ['real', 'listening', 'speaking', 'conversation'],
        title: { th: 'โทรนัดหมอที่ศูนย์สุขภาพ', en: 'Phoning the health centre for an appointment' },
        goal: { th: 'โทรศัพท์ อธิบายอาการสั้น ๆ และนัดเวลาได้', en: 'Make a phone call, describe a problem briefly and book a time' },
        dialogue: [
          d('A', 'Vårdcentralen, Maria här.', 'ศูนย์สุขภาพค่ะ มาเรียพูดค่ะ', 'Health centre, Maria speaking.'),
          d('B', 'Hej, jag skulle vilja boka en tid.', 'สวัสดีค่ะ ฉันอยากนัดเวลาค่ะ', 'Hello, I would like to book an appointment.'),
          d('A', 'Vad gäller det?', 'เรื่องอะไรคะ', 'What is it about?'),
          d('B', 'Min dotter har haft feber i tre dagar.', 'ลูกสาวของฉันมีไข้มาสามวันแล้วค่ะ', 'My daughter has had a fever for three days.'),
          d('A', 'Kan ni komma i morgon klockan tio?', 'มาพรุ่งนี้สิบโมงได้ไหมคะ', 'Can you come tomorrow at ten?'),
          d('B', 'Ja, det passar bra. Tack så mycket!', 'ได้ค่ะ สะดวกค่ะ ขอบคุณมากค่ะ', 'Yes, that suits me. Thank you very much!')
        ],
        vocab: [
          v('vårdcentral', 'ศูนย์สุขภาพ (คลินิกใกล้บ้าน)', 'health centre (local clinic)'), v('boka en tid', 'นัดเวลา', 'book an appointment'),
          v('jag skulle vilja …', 'ฉันอยากจะ … (สุภาพ)', 'I would like to … (polite)'), v('vad gäller det?', 'เรื่องอะไร', 'what is it about?'),
          v('feber', 'ไข้', 'fever'), v('i morgon', 'พรุ่งนี้', 'tomorrow'), v('det passar bra', 'สะดวก', 'that suits me'), v('dotter', 'ลูกสาว', 'daughter'), v('son', 'ลูกชาย', 'son')
        ],
        grammar: { title: { th: 'har + กริยารูป supinum (เคย/มาแล้ว)', en: 'har + supine (present perfect)' },
          body: {
            th: 'ใช้ har + supinum เมื่อเรื่องเริ่มในอดีตและยังเกี่ยวกับตอนนี้: Hon har haft feber i tre dagar (เธอมีไข้มาสามวันแล้ว)\n\nกลุ่มที่พบบ่อย: ha → haft, vara → varit, göra → gjort, boka → bokat\n\n“i tre dagar” = เป็นเวลาสามวัน ใช้บอกช่วงเวลา',
            en: 'Use har + supine when something started in the past and still matters now: Hon har haft feber i tre dagar (She has had a fever for three days).\n\nCommon forms: ha → haft, vara → varit, göra → gjort, boka → bokat.\n\n“i tre dagar” = for three days (a length of time).' },
          table: [['ha', 'har haft'], ['vara', 'har varit'], ['göra', 'har gjort'], ['boka', 'har bokat']] },
        exercises: [
          { type: 'gap', text: 'Hon har ___ feber i tre dagar.', opts: ['haft', 'ha', 'har'], a: 'haft' },
          { type: 'mc', prompt: 'Vad gäller det?', q: { th: 'ประโยคนี้แปลว่าอะไร', en: 'What does this mean?' }, opts: [{ th: 'เรื่องอะไร', en: 'What is it about?' }, { th: 'ราคาเท่าไร', en: 'How much is it?' }, { th: 'คุณเป็นอย่างไร', en: 'How are you?' }], a: 0 },
          { type: 'order', answer: 'Jag skulle vilja boka en tid.' },
          { type: 'listen', say: 'Kan ni komma i morgon klockan tio?', opts: [{ th: 'มาพรุ่งนี้สิบโมงได้ไหม', en: 'Can you come tomorrow at ten?' }, { th: 'มาวันนี้สิบโมงได้ไหม', en: 'Can you come today at ten?' }, { th: 'มาพรุ่งนี้สองโมงได้ไหม', en: 'Can you come tomorrow at two?' }], a: 0 },
          { type: 'translate', from: { th: 'สะดวกค่ะ ขอบคุณมาก', en: 'That suits me. Thank you very much!' }, answer: 'Det passar bra. Tack så mycket!', accept: ['Det passar bra, tack så mycket', 'Det passar bra tack så mycket'] }
        ] },

      { id: 'sv-b1-helgen', level: 'B1', icon: '🏝️', skills: ['conversation', 'grammar', 'speaking'],
        title: { th: 'เล่าว่าทำอะไรช่วงสุดสัปดาห์', en: 'Telling what happened at the weekend' },
        goal: { th: 'เล่าเหตุการณ์ในอดีตต่อเนื่องได้ และใช้ลำดับคำหลังคำบอกเวลาได้ถูก', en: 'Tell a short story in the past and use the right word order after a time phrase' },
        dialogue: [
          d('A', 'Hur var helgen?', 'สุดสัปดาห์เป็นอย่างไรบ้าง', 'How was the weekend?'),
          d('B', 'Den var jättebra! I lördags åkte vi ut i skärgården.', 'ดีมากเลย วันเสาร์ที่แล้วเรานั่งเรือไปเที่ยวหมู่เกาะ', 'It was great! On Saturday we went out to the archipelago.'),
          d('A', 'Vad gjorde ni där?', 'ไปทำอะไรกันที่นั่น', 'What did you do there?'),
          d('B', 'Vi badade och grillade. Men på kvällen började det regna, så vi fick åka hem tidigare.', 'เราว่ายน้ำและปิ้งย่างกัน แต่ตอนเย็นฝนเริ่มตก เลยต้องกลับบ้านเร็วกว่าที่ตั้งใจ', 'We swam and had a barbecue. But in the evening it started to rain, so we had to go home early.'),
          d('A', 'Synd! Men det låter mysigt ändå.', 'น่าเสียดาย แต่ก็ฟังดูสนุกนะ', 'What a pity! But it still sounds lovely.')
        ],
        vocab: [
          v('helgen', 'สุดสัปดาห์', 'the weekend'), v('i lördags', 'วันเสาร์ที่แล้ว', 'last Saturday', { th: 'i lördags = เสาร์ที่ผ่านมา, på lördag = เสาร์ที่จะถึง', en: 'i lördags = last Saturday, på lördag = this coming Saturday.' }),
          v('skärgården', 'หมู่เกาะ (นอกชายฝั่ง)', 'the archipelago'), v('bada', 'ว่ายน้ำ, เล่นน้ำ', 'to swim, go for a dip'), v('grilla', 'ปิ้งย่าง', 'to barbecue'),
          v('fick', 'ต้อง (อดีตของ få)', 'had to (past of få)'), v('synd', 'น่าเสียดาย', 'what a pity'), v('mysigt', 'อบอุ่น สบาย ๆ', 'cosy, lovely'), v('ändå', 'ถึงอย่างนั้นก็ตาม', 'still, anyway')
        ],
        grammar: { title: { th: 'อดีตกาล (preteritum) และกริยาอยู่ตำแหน่งที่สอง', en: 'The past tense (preteritum) and verb-second word order' },
          body: {
            th: 'กริยากลุ่ม 1 ลงท้าย -ade: bada → badade, grilla → grillade\nกริยาไม่ปกติต้องจำ: åka → åkte, göra → gjorde, få → fick, vara → var\n\nเมื่อประโยคขึ้นต้นด้วยคำบอกเวลา กริยายังต้องอยู่ตำแหน่งที่สอง ประธานจึงย้ายไปหลังกริยา: I lördags åkte vi … (ไม่ใช่ I lördags vi åkte)',
            en: 'Group 1 verbs end in -ade: bada → badade, grilla → grillade.\nIrregular verbs must be learned: åka → åkte, göra → gjorde, få → fick, vara → var.\n\nWhen a sentence starts with a time phrase, the verb still comes second, so the subject moves after it: I lördags åkte vi … (not: I lördags vi åkte).' },
          table: [['bada', 'badade'], ['åka', 'åkte'], ['göra', 'gjorde'], ['få', 'fick']] },
        exercises: [
          { type: 'gap', text: 'I lördags ___ vi till skärgården.', opts: ['åkte', 'åker', 'åka'], a: 'åkte' },
          { type: 'mc', prompt: 'I lördags åkte vi ut i skärgården.', q: { th: 'ลำดับคำแบบไหนถูก', en: 'Why is “åkte” before “vi”?' }, opts: [{ th: 'เพราะกริยาต้องอยู่ตำแหน่งที่สอง', en: 'Because the verb must come second' }, { th: 'เพราะเป็นประโยคคำถาม', en: 'Because it is a question' }, { th: 'เพราะ vi เป็นพหูพจน์', en: 'Because vi is plural' }], a: 0 },
          { type: 'order', answer: 'På kvällen började det regna.' },
          { type: 'gap', text: 'Vad ___ ni där?', opts: ['gjorde', 'göra', 'gör'], a: 'gjorde' },
          { type: 'listen', say: 'Så vi fick åka hem tidigare.', opts: [{ th: 'เราเลยต้องกลับบ้านเร็วขึ้น', en: 'So we had to go home early.' }, { th: 'เราเลยอยู่ต่อนานขึ้น', en: 'So we stayed longer.' }, { th: 'เราเลยไม่ได้ไป', en: 'So we did not go.' }], a: 0 },
          { type: 'write', task: { th: 'เขียน 3 ประโยค เล่าว่าสุดสัปดาห์ที่แล้วคุณทำอะไร เริ่มประโยคหนึ่งด้วย I lördags หรือ I söndags', en: 'Write 3 sentences about last weekend. Start one with I lördags or I söndags.' }, model: 'I lördags träffade jag mina vänner. Vi lagade mat tillsammans. I söndags vilade jag hemma.' }
        ] },

      { id: 'sv-b1-asikt', level: 'B1', icon: '💬', skills: ['speaking', 'grammar', 'work'],
        title: { th: 'แสดงความคิดเห็นและให้เหตุผล', en: 'Giving your opinion and reasons' },
        goal: { th: 'บอกความคิดเห็นด้วย jag tycker att … และให้เหตุผลด้วย eftersom', en: 'Say what you think with jag tycker att … and give a reason with eftersom' },
        dialogue: [
          d('A', 'Vad tycker du om att jobba hemifrån?', 'คุณคิดอย่างไรกับการทำงานจากบ้าน', 'What do you think about working from home?'),
          d('B', 'Jag tycker att det är skönt, eftersom jag slipper pendla.', 'ฉันคิดว่าสบายดี เพราะไม่ต้องเดินทางไปทำงาน', 'I think it’s nice, because I don’t have to commute.'),
          d('A', 'Men blir det inte ensamt?', 'แต่ไม่เหงาเหรอ', 'But doesn’t it get lonely?'),
          d('B', 'Jo, ibland. Därför åker jag till kontoret två dagar i veckan.', 'ก็เหงาบ้าง เพราะอย่างนั้นฉันจึงเข้าออฟฟิศสัปดาห์ละสองวัน', 'Yes, sometimes. That’s why I go to the office two days a week.'),
          d('A', 'Det låter som en bra kompromiss.', 'ฟังดูเป็นทางสายกลางที่ดีนะ', 'That sounds like a good compromise.')
        ],
        vocab: [
          v('tycka att', 'คิดว่า (ความเห็น)', 'to think that (opinion)'), v('eftersom', 'เพราะว่า', 'because, since'), v('slippa', 'ไม่ต้อง (ดีใจที่ไม่ต้อง)', 'to not have to (and be glad of it)'),
          v('pendla', 'เดินทางไปกลับที่ทำงาน', 'to commute'), v('ensamt', 'เหงา', 'lonely'), v('därför', 'ดังนั้น, เพราะอย่างนั้น', 'that’s why'),
          v('jo', 'ใช่ (ตอบคำถามปฏิเสธ)', 'yes (to a negative question)', { th: 'ตอบคำถามที่มี inte ว่า “ใช่” ใช้ jo ไม่ใช่ ja', en: 'Answer “yes” to a question with inte using jo, not ja.' }), v('kontoret', 'ออฟฟิศ', 'the office')
        ],
        grammar: { title: { th: 'ประโยคย่อย: inte อยู่ก่อนกริยา', en: 'Subordinate clauses: inte comes before the verb' },
          body: {
            th: 'หลัง att, eftersom, om, när ประธานมาก่อนกริยาเสมอ และคำอย่าง inte, alltid, ofta จะอยู่ก่อนกริยา:\nJag stannar hemma eftersom jag inte mår bra.\n(ในประโยคหลัก: Jag mår inte bra.)\n\nตอบคำถามปฏิเสธ “Blir det inte ensamt?” ว่า “ใช่” ด้วย Jo',
            en: 'After att, eftersom, om and när the subject always comes before the verb, and words like inte, alltid, ofta go before the verb:\nJag stannar hemma eftersom jag inte mår bra.\n(In a main clause: Jag mår inte bra.)\n\nAnswer “yes” to a negative question (“Blir det inte ensamt?”) with Jo.' },
          table: [['main clause', 'Jag mår inte bra.'], ['subordinate', '… eftersom jag inte mår bra.']] },
        exercises: [
          { type: 'mc', prompt: 'Blir det inte ensamt? – ___, ibland.', q: { th: 'ตอบว่า “ใช่” อย่างไร', en: 'How do you say “yes” here?' }, opts: [{ th: 'Jo', en: 'Jo' }, { th: 'Ja', en: 'Ja' }, { th: 'Nej', en: 'Nej' }], a: 0 },
          { type: 'order', answer: 'Jag stannar hemma eftersom jag inte mår bra.' },
          { type: 'gap', text: 'Jag tycker ___ det är skönt.', opts: ['att', 'om', 'när'], a: 'att' },
          { type: 'listen', say: 'Därför åker jag till kontoret två dagar i veckan.', opts: [{ th: 'จึงเข้าออฟฟิศสัปดาห์ละสองวัน', en: 'That’s why I go to the office two days a week.' }, { th: 'จึงทำงานจากบ้านทุกวัน', en: 'That’s why I work from home every day.' }, { th: 'จึงเปลี่ยนงานใหม่', en: 'That’s why I changed jobs.' }], a: 0 },
          { type: 'write', task: { th: 'คุณคิดอย่างไรกับการทำงานจากบ้าน เขียน 2–3 ประโยคโดยใช้ tycker att และ eftersom', en: 'What do you think about working from home? Write 2–3 sentences with tycker att and eftersom.' }, model: 'Jag tycker att det är bra att jobba hemifrån ibland, eftersom jag kan koncentrera mig bättre. Men jag saknar mina kollegor.' }
        ] },

      { id: 'sv-b2-mote', level: 'B2', icon: '📊', skills: ['work', 'listening', 'grammar'],
        title: { th: 'การประชุมที่ทำงาน', en: 'A meeting at work' },
        goal: { th: 'ยกประเด็น อธิบายผลกระทบ และเสนอทางออกในที่ประชุม', en: 'Raise an issue, explain its consequences and propose a solution in a meeting' },
        dialogue: [
          d('A', 'Ska vi sätta igång? Första punkten på dagordningen är budgeten.', 'เริ่มกันเลยไหมครับ วาระแรกคือเรื่องงบประมาณ', 'Shall we get started? The first item on the agenda is the budget.'),
          d('B', 'Innan vi går vidare vill jag lyfta en sak. Leveransen har blivit försenad.', 'ก่อนจะไปต่อ ฉันขอยกเรื่องหนึ่งขึ้นมาค่ะ การส่งของล่าช้าค่ะ', 'Before we move on, I’d like to raise one thing. The delivery has been delayed.'),
          d('A', 'Hur påverkar det tidsplanen?', 'เรื่องนี้กระทบกำหนดการอย่างไรครับ', 'How does that affect the schedule?'),
          d('B', 'Om vi inte hittar en ny leverantör riskerar vi att missa deadline med två veckor.', 'ถ้าเราหาผู้จัดส่งรายใหม่ไม่ได้ เราเสี่ยงที่จะเลยกำหนดส่งไปสองสัปดาห์ค่ะ', 'If we don’t find a new supplier, we risk missing the deadline by two weeks.'),
          d('A', 'Då föreslår jag att vi tar fram ett par alternativ till nästa möte.', 'ถ้าอย่างนั้นผมเสนอให้เราเตรียมทางเลือกสักสองสามทางสำหรับการประชุมครั้งหน้าครับ', 'Then I suggest that we come up with a couple of alternatives for the next meeting.')
        ],
        vocab: [
          v('sätta igång', 'เริ่ม', 'to get started'), v('dagordning', 'วาระการประชุม', 'agenda'), v('lyfta en fråga', 'ยกประเด็นขึ้นมา', 'to raise an issue'),
          v('försenad', 'ล่าช้า', 'delayed'), v('påverka', 'ส่งผลกระทบ', 'to affect'), v('tidsplan', 'กำหนดการ', 'schedule'), v('leverantör', 'ผู้จัดส่ง, ซัพพลายเออร์', 'supplier'),
          v('riskera att', 'เสี่ยงที่จะ', 'to risk (doing)'), v('föreslå', 'เสนอ', 'to suggest'), v('ta fram', 'จัดทำ, เตรียม', 'to produce, come up with')
        ],
        grammar: { title: { th: 'ประโยคเงื่อนไข om และ passive แบบ bli', en: 'Conditions with om, and the bli-passive' },
          body: {
            th: 'om = ถ้า เป็นประโยคย่อย inte จึงอยู่ก่อนกริยา: Om vi inte hittar …\nเมื่อประโยคย่อยมาก่อน ประโยคหลักต้องเริ่มด้วยกริยา: Om vi inte hittar en ny leverantör, riskerar vi …\n\nPassive แบบ bli/ha blivit + participle เน้นผล: Leveransen har blivit försenad (การส่งของถูกเลื่อนออกไป)',
            en: 'om = if. It starts a subordinate clause, so inte comes before the verb: Om vi inte hittar …\nWhen the subordinate clause comes first, the main clause starts with its verb: Om vi inte hittar en ny leverantör, riskerar vi …\n\nThe passive with bli / har blivit + participle stresses the result: Leveransen har blivit försenad (The delivery has been delayed).' } },
        exercises: [
          { type: 'order', answer: 'Om vi inte hittar en ny leverantör riskerar vi att missa deadline.' },
          { type: 'gap', text: 'Leveransen har ___ försenad.', opts: ['blivit', 'varit', 'bli'], a: 'blivit' },
          { type: 'mc', prompt: 'Jag vill lyfta en sak.', q: { th: 'ประโยคนี้ใช้ทำอะไรในการประชุม', en: 'What is the speaker doing?' }, opts: [{ th: 'ยกประเด็นใหม่', en: 'Raising an issue' }, { th: 'ปิดการประชุม', en: 'Closing the meeting' }, { th: 'ขอบคุณทุกคน', en: 'Thanking everyone' }], a: 0 },
          { type: 'listen', say: 'Hur påverkar det tidsplanen?', opts: [{ th: 'กระทบกำหนดการอย่างไร', en: 'How does it affect the schedule?' }, { th: 'งบประมาณเท่าไร', en: 'What is the budget?' }, { th: 'ใครรับผิดชอบ', en: 'Who is responsible?' }], a: 0 },
          { type: 'write', task: { th: 'เขียนอีเมลสั้น ๆ ถึงหัวหน้า (3–4 ประโยค): บอกปัญหา ผลกระทบ และข้อเสนอ', en: 'Write a short e-mail to your manager (3–4 sentences): the problem, the consequence and your proposal.' }, model: 'Hej Erik! Leveransen från vår leverantör har blivit försenad. Om vi inte agerar nu riskerar vi att missa deadline. Jag föreslår att vi kontaktar en annan leverantör redan i dag. Vänliga hälsningar, Lina' }
        ] },

      { id: 'sv-c1-argument', level: 'C1', icon: '🖋️', skills: ['reading', 'writing', 'grammar'],
        title: { th: 'เขียนแสดงเหตุผลอย่างมีน้ำหนัก', en: 'Nuanced argumentation in writing' },
        goal: { th: 'อ่านและเขียนข้อความแสดงความเห็นที่มองหลายด้าน ใช้คำเชื่อมระดับสูง', en: 'Read and write a balanced argument using advanced linking words' },
        dialogue: [
          d('', 'Visserligen kan distansarbete öka produktiviteten, men det förutsätter tydliga rutiner.', 'จริงอยู่ที่การทำงานทางไกลอาจเพิ่มประสิทธิภาพการทำงาน แต่ต้องอาศัยระบบการทำงานที่ชัดเจน', 'Admittedly, remote work can increase productivity, but it requires clear routines.'),
          d('', 'Dessutom är det värt att påpeka att inte alla yrken lämpar sig för det.', 'นอกจากนี้ ควรชี้ให้เห็นว่าไม่ใช่ทุกอาชีพที่เหมาะกับการทำงานแบบนี้', 'It is also worth pointing out that not all professions are suited to it.'),
          d('', 'Å ena sidan sparar man tid, å andra sidan kan gränsen mellan arbete och fritid suddas ut.', 'ในด้านหนึ่งช่วยประหยัดเวลา แต่อีกด้านหนึ่ง เส้นแบ่งระหว่างงานกับเวลาส่วนตัวอาจเลือนหายไป', 'On the one hand it saves time; on the other hand, the line between work and free time can become blurred.'),
          d('', 'Sammanfattningsvis anser jag att en flexibel modell är att föredra.', 'โดยสรุป ข้าพเจ้าเห็นว่ารูปแบบที่ยืดหยุ่นน่าจะดีที่สุด', 'In conclusion, I believe that a flexible model is preferable.')
        ],
        vocab: [
          v('visserligen … men', 'จริงอยู่ที่ … แต่', 'admittedly … but'), v('förutsätta', 'ต้องอาศัย, มีเงื่อนไขว่า', 'to require, presuppose'), v('dessutom', 'นอกจากนี้', 'moreover, in addition'),
          v('värt att påpeka', 'ควรชี้ให้เห็น', 'worth pointing out'), v('lämpa sig för', 'เหมาะกับ', 'to be suited to'), v('å ena sidan … å andra sidan', 'ในด้านหนึ่ง … อีกด้านหนึ่ง', 'on the one hand … on the other hand'),
          v('suddas ut', 'เลือนหายไป', 'to become blurred'), v('sammanfattningsvis', 'โดยสรุป', 'in conclusion'), v('anse', 'เห็นว่า (ทางการ)', 'to consider, believe (formal)'), v('att föredra', 'ดีกว่า, น่าเลือกกว่า', 'preferable')
        ],
        grammar: { title: { th: 'คำเชื่อมสำหรับงานเขียนเชิงโต้แย้ง และ passive แบบ -s', en: 'Linking words for argument texts, and the s-passive' },
          body: {
            th: 'โครงสร้างย่อหน้าโต้แย้ง: ยอมรับอีกฝ่าย (Visserligen …) → แต่ (men …) → เพิ่มเหตุผล (Dessutom …) → ชั่งน้ำหนัก (Å ena sidan … å andra sidan …) → สรุป (Sammanfattningsvis …)\n\nPassive แบบ -s ใช้มากในภาษาเขียน: suddas ut, diskuteras, kan ifrågasättas\n\n“inte alla” = ไม่ใช่ทุก … (ลำดับคำที่เป็นมาตรฐานในภาษาเขียน)',
            en: 'A typical argument paragraph: concede (Visserligen …) → contrast (men …) → add (Dessutom …) → weigh up (Å ena sidan … å andra sidan …) → conclude (Sammanfattningsvis …).\n\nThe s-passive is common in formal writing: suddas ut, diskuteras, kan ifrågasättas.\n\n“inte alla” = not all (the standard written word order).' } },
        exercises: [
          { type: 'gap', text: '___ kan distansarbete öka produktiviteten, men det förutsätter tydliga rutiner.', opts: ['Visserligen', 'Sammanfattningsvis', 'Därför'], a: 'Visserligen' },
          { type: 'mc', prompt: 'Sammanfattningsvis anser jag att …', q: { th: 'ประโยคนี้อยู่ส่วนไหนของข้อความ', en: 'Where in a text does this sentence belong?' }, opts: [{ th: 'ตอนสรุป', en: 'In the conclusion' }, { th: 'ตอนเริ่ม', en: 'At the start' }, { th: 'กลางย่อหน้า', en: 'In the middle of a paragraph' }], a: 0 },
          { type: 'gap', text: 'Gränsen mellan arbete och fritid kan ___ ut.', opts: ['suddas', 'sudda', 'suddade'], a: 'suddas' },
          { type: 'order', answer: 'Dessutom är det värt att påpeka att inte alla yrken lämpar sig för det.' },
          { type: 'write', task: { th: 'เขียนย่อหน้า 4–5 ประโยค: ควรมีวันทำงาน 4 วันต่อสัปดาห์หรือไม่ ใช้คำเชื่อมอย่างน้อย 3 คำจากบทนี้', en: 'Write 4–5 sentences: should we have a four-day working week? Use at least three linking words from this lesson.' },
            model: 'Visserligen skulle en fyradagarsvecka ge mer tid för återhämtning, men den förutsätter att arbetet organiseras effektivt. Dessutom är det värt att påpeka att inte alla branscher kan minska arbetstiden utan att kostnaderna ökar. Å ena sidan kan personalen bli mer motiverad, å andra sidan riskerar arbetsbelastningen att öka under de dagar man arbetar. Sammanfattningsvis anser jag att modellen bör prövas, men inte införas överallt på en gång.' }
        ] }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
