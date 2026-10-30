/* Adult Language Academy – English course (explanations in Thai and Swedish) and Spanish course (explanations in Thai and English).
   SAMPLE CONTENT: a few lessons to show the format; the level structure A1–C1 is ready for more lessons.
   Same lesson format as content/academy-sv.js. */
(function (G) {
  'use strict';
  const C = G.FGH_CONTENT = G.FGH_CONTENT || {};
  const A = C.academy = C.academy || { courses: {} };

  /* ---------------- English for Thai and Swedish speakers ---------------- */
  const de = (who, t, th, sv) => ({ who, t, tr: { th, sv } });
  const ve = (t, th, sv, note) => ({ t, tr: { th, sv }, note: note || null });
  A.courses.en = {
    target: 'en', explain: ['th', 'sv'], sample: true, passPct: 70,
    lessons: [
      { id: 'en-a1-intro', level: 'A1', icon: '👋', skills: ['conversation', 'vocabulary', 'speaking'],
        title: { th: 'แนะนำตัว', sv: 'Presentera dig' }, goal: { th: 'บอกชื่อ งาน และที่อยู่ได้', sv: 'Säga vad du heter, vad du jobbar med och var du bor' },
        dialogue: [
          de('A', 'Hi, I’m Sam. Nice to meet you.', 'สวัสดีครับ ผมชื่อแซม ยินดีที่ได้รู้จัก', 'Hej, jag heter Sam. Trevligt att träffas.'),
          de('B', 'Nice to meet you too. I’m Nok.', 'ยินดีที่ได้รู้จักเช่นกันค่ะ ฉันชื่อนก', 'Trevligt att träffas. Jag heter Nok.'),
          de('A', 'What do you do, Nok?', 'นกทำงานอะไรครับ', 'Vad jobbar du med, Nok?'),
          de('B', 'I’m a nurse. I work at a hospital in Uppsala.', 'ฉันเป็นพยาบาลค่ะ ทำงานที่โรงพยาบาลในอุปซอลา', 'Jag är sjuksköterska. Jag jobbar på ett sjukhus i Uppsala.'),
          de('A', 'Do you live in Uppsala too?', 'แล้วอยู่ที่อุปซอลาด้วยไหมครับ', 'Bor du också i Uppsala?'),
          de('B', 'No, I live in Stockholm.', 'ไม่ค่ะ ฉันอยู่สตอกโฮล์ม', 'Nej, jag bor i Stockholm.')
        ],
        vocab: [ve('nice to meet you', 'ยินดีที่ได้รู้จัก', 'trevligt att träffas'), ve('what do you do?', 'ทำงานอะไร', 'vad jobbar du med?', { th: 'คำถามนี้ถามเรื่องอาชีพ ไม่ใช่ถามว่ากำลังทำอะไรอยู่', sv: 'Frågan gäller yrke, inte vad man gör just nu.' }),
          ve('nurse', 'พยาบาล', 'sjuksköterska'), ve('hospital', 'โรงพยาบาล', 'sjukhus'), ve('live', 'อาศัยอยู่', 'bo'), ve('work', 'ทำงาน', 'jobba, arbeta'), ve('too', 'ด้วย', 'också')],
        grammar: { title: { th: 'a / an กับอาชีพ และคำถามด้วย do', sv: 'a/an framför yrken och frågor med do' },
          body: { th: 'ภาษาอังกฤษใส่ a/an หน้าอาชีพ: I’m a nurse. She’s an engineer. (an ใช้หน้าเสียงสระ)\n\nคำถามกับกริยาทั่วไปใช้ do: Do you live in Uppsala? What do you do?',
            sv: 'Engelskan har a/an framför yrken: I’m a nurse. She’s an engineer. (an före vokalljud). På svenska säger man bara ”Jag är sjuksköterska”.\n\nFrågor med vanliga verb bildas med do: Do you live in Uppsala? What do you do?' } },
        exercises: [
          { type: 'gap', text: 'I’m ___ nurse.', opts: ['a', 'an', '–'], a: 'a' },
          { type: 'gap', text: '___ you live in Stockholm?', opts: ['Do', 'Are', 'Is'], a: 'Do' },
          { type: 'mc', prompt: 'What do you do?', q: { th: 'ประโยคนี้ถามอะไร', sv: 'Vad betyder frågan?' }, opts: [{ th: 'ทำงานอะไร', sv: 'Vad jobbar du med?' }, { th: 'ตอนนี้กำลังทำอะไร', sv: 'Vad gör du just nu?' }, { th: 'สบายดีไหม', sv: 'Hur mår du?' }], a: 0 },
          { type: 'order', answer: 'I work at a hospital.' },
          { type: 'listen', say: 'No, I live in Stockholm.', opts: [{ th: 'ไม่ ฉันอยู่สตอกโฮล์ม', sv: 'Nej, jag bor i Stockholm.' }, { th: 'ใช่ ฉันอยู่อุปซอลา', sv: 'Ja, jag bor i Uppsala.' }, { th: 'ไม่ ฉันทำงานที่สตอกโฮล์ม', sv: 'Nej, jag jobbar i Stockholm.' }], a: 0 },
          { type: 'write', task: { th: 'แนะนำตัว 3 ประโยค: ชื่อ อาชีพ และที่อยู่', sv: 'Presentera dig med tre meningar: namn, yrke och var du bor.' }, model: 'Hi, I’m Ken. I’m a machinist. I live in Sweden.' }
        ] },
      { id: 'en-a2-doctor', level: 'A2', icon: '🩺', skills: ['real', 'listening', 'conversation'],
        title: { th: 'ไปหาหมอ', sv: 'Hos läkaren' }, goal: { th: 'บอกอาการและเข้าใจคำแนะนำของหมอ', sv: 'Beskriva symtom och förstå läkarens råd' },
        dialogue: [
          de('A', 'What seems to be the problem?', 'มีอาการอะไรครับ', 'Vad har hänt? / Vad gäller det?'),
          de('B', 'I’ve had a sore throat since Monday.', 'เจ็บคอมาตั้งแต่วันจันทร์ค่ะ', 'Jag har haft ont i halsen sedan i måndags.'),
          de('A', 'Do you have a temperature?', 'มีไข้ไหมครับ', 'Har du feber?'),
          de('B', 'Yes, a little. About thirty-eight degrees.', 'มีนิดหน่อยค่ะ ประมาณสามสิบแปดองศา', 'Ja, lite. Ungefär trettioåtta grader.'),
          de('A', 'Drink plenty of water and rest. If it gets worse, come back.', 'ดื่มน้ำเยอะ ๆ และพักผ่อน ถ้าอาการแย่ลงให้กลับมาใหม่นะครับ', 'Drick mycket vatten och vila. Om det blir värre, kom tillbaka.')
        ],
        vocab: [ve('sore throat', 'เจ็บคอ', 'ont i halsen'), ve('temperature', 'ไข้; อุณหภูมิ', 'feber; temperatur', { th: 'have a temperature = มีไข้', sv: 'have a temperature = ha feber' }),
          ve('since Monday', 'ตั้งแต่วันจันทร์', 'sedan i måndags'), ve('rest', 'พักผ่อน', 'vila'), ve('get worse', 'แย่ลง', 'bli värre'), ve('plenty of', 'มาก ๆ', 'mycket, gott om')],
        grammar: { title: { th: 'I’ve had … since … (present perfect)', sv: 'I’ve had … since … (perfekt)' },
          body: { th: 'ใช้ have/has + V3 กับเรื่องที่เริ่มในอดีตและยังเป็นอยู่: I’ve had a sore throat since Monday.\nsince + จุดเริ่ม (since Monday), for + ช่วงเวลา (for three days)',
            sv: 'Som svenskans ”har haft”: I’ve had a sore throat since Monday.\nsince + startpunkt (since Monday), for + tidslängd (for three days) – på svenska ”sedan” och ”i”.' } },
        exercises: [
          { type: 'gap', text: 'I’ve had a cough ___ three days.', opts: ['for', 'since', 'from'], a: 'for' },
          { type: 'gap', text: 'I’ve had a sore throat ___ Monday.', opts: ['since', 'for', 'at'], a: 'since' },
          { type: 'listen', say: 'If it gets worse, come back.', opts: [{ th: 'ถ้าแย่ลงให้กลับมาใหม่', sv: 'Om det blir värre, kom tillbaka.' }, { th: 'ถ้าดีขึ้นไม่ต้องมา', sv: 'Om det blir bättre behöver du inte komma.' }, { th: 'กลับมาพรุ่งนี้', sv: 'Kom tillbaka i morgon.' }], a: 0 },
          { type: 'order', answer: 'Do you have a temperature?' }
        ] },
      { id: 'en-b1-interview', level: 'B1', icon: '🤝', skills: ['work', 'speaking', 'real'],
        title: { th: 'สัมภาษณ์งาน', sv: 'Anställningsintervju' }, goal: { th: 'ตอบคำถามสัมภาษณ์งานเกี่ยวกับประสบการณ์และจุดแข็ง', sv: 'Svara på intervjufrågor om erfarenhet och styrkor' },
        dialogue: [
          de('A', 'Could you tell me a bit about yourself?', 'ช่วยเล่าเกี่ยวกับตัวคุณสักหน่อยได้ไหมคะ', 'Kan du berätta lite om dig själv?'),
          de('B', 'Sure. I’ve worked as a CNC machinist for twelve years, mostly with milling.', 'ได้ครับ ผมทำงานเป็นช่าง CNC มาสิบสองปี ส่วนใหญ่ทำงานกัด', 'Visst. Jag har jobbat som CNC-operatör i tolv år, mest med fräsning.'),
          de('A', 'What would you say is your greatest strength?', 'คุณคิดว่าจุดแข็งที่สุดของคุณคืออะไรคะ', 'Vad skulle du säga är din största styrka?'),
          de('B', 'I’m very accurate, and I enjoy solving problems when something goes wrong.', 'ผมทำงานละเอียดมาก และชอบแก้ปัญหาเวลามีอะไรผิดพลาดครับ', 'Jag är väldigt noggrann, och jag tycker om att lösa problem när något går fel.'),
          de('A', 'Why do you want to work here?', 'ทำไมถึงอยากทำงานที่นี่คะ', 'Varför vill du jobba här?'),
          de('B', 'Because you work with advanced machines, and I want to keep developing my skills.', 'เพราะที่นี่ใช้เครื่องจักรขั้นสูง และผมอยากพัฒนาทักษะต่อไปครับ', 'Eftersom ni arbetar med avancerade maskiner, och jag vill fortsätta utveckla min kompetens.')
        ],
        vocab: [ve('tell me about yourself', 'เล่าเกี่ยวกับตัวคุณ', 'berätta om dig själv'), ve('strength', 'จุดแข็ง', 'styrka'), ve('accurate', 'ละเอียด แม่นยำ', 'noggrann'),
          ve('solve problems', 'แก้ปัญหา', 'lösa problem'), ve('develop my skills', 'พัฒนาทักษะ', 'utveckla min kompetens'), ve('experience', 'ประสบการณ์', 'erfarenhet')],
        grammar: { title: { th: 'I have worked … for … กับ I worked …', sv: 'I have worked … for … eller I worked …' },
          body: { th: 'I’ve worked here for twelve years = ทำมา 12 ปีและยังทำอยู่\nI worked there for twelve years = เคยทำ 12 ปี แต่ตอนนี้ไม่ได้ทำแล้ว',
            sv: 'I’ve worked here for twelve years = jag har jobbat här i tolv år (och gör det fortfarande).\nI worked there for twelve years = jag jobbade där i tolv år (men slutade).' } },
        exercises: [
          { type: 'mc', prompt: 'I worked there for five years.', q: { th: 'ตอนนี้ยังทำงานที่นั่นไหม', sv: 'Jobbar personen kvar där?' }, opts: [{ th: 'ไม่ได้ทำแล้ว', sv: 'Nej' }, { th: 'ยังทำอยู่', sv: 'Ja' }], a: 0 },
          { type: 'gap', text: 'I ___ worked as a machinist for twelve years.', opts: ['have', 'am', 'was'], a: 'have' },
          { type: 'order', answer: 'What would you say is your greatest strength?' },
          { type: 'write', task: { th: 'ตอบคำถาม “What is your greatest strength?” 2–3 ประโยค', sv: 'Svara på ”What is your greatest strength?” med 2–3 meningar.' }, model: 'I’m very reliable. I always finish my work on time, and I like learning new things.' }
        ] }
    ]
  };

  /* ---------------- Spanish (Spain) for Thai and English speakers ---------------- */
  const ds = (who, t, th, en) => ({ who, t, tr: { th, en } });
  const vs = (t, th, en, note) => ({ t, tr: { th, en }, note: note || null });
  A.courses.es = {
    target: 'es', explain: ['th', 'en'], sample: true, passPct: 70,
    lessons: [
      { id: 'es-a1-hola', level: 'A1', icon: '👋', skills: ['conversation', 'vocabulary', 'pronunciation'],
        title: { th: 'ทักทายและแนะนำตัว', en: 'Greetings and introductions' }, goal: { th: 'ทักทาย บอกชื่อ และบอกว่ามาจากไหน', en: 'Greet people, say your name and where you are from' },
        dialogue: [
          ds('A', '¡Hola! ¿Cómo te llamas?', 'สวัสดี คุณชื่ออะไร', 'Hi! What’s your name?'),
          ds('B', 'Me llamo Pim. ¿Y tú?', 'ฉันชื่อพิม แล้วคุณล่ะ', 'My name is Pim. And you?'),
          ds('A', 'Me llamo Carlos. ¿De dónde eres?', 'ผมชื่อคาร์ลอส คุณมาจากไหน', 'I’m Carlos. Where are you from?'),
          ds('B', 'Soy de Tailandia, pero vivo en Suecia.', 'ฉันมาจากประเทศไทย แต่อาศัยอยู่ที่สวีเดน', 'I’m from Thailand, but I live in Sweden.'),
          ds('A', '¡Encantado!', 'ยินดีที่ได้รู้จัก', 'Pleased to meet you!'),
          ds('B', 'Encantada.', 'ยินดีที่ได้รู้จักเช่นกัน', 'Pleased to meet you too.')
        ],
        vocab: [vs('hola', 'สวัสดี', 'hello'), vs('me llamo …', 'ฉันชื่อ …', 'my name is …'), vs('¿de dónde eres?', 'คุณมาจากไหน', 'where are you from?'),
          vs('soy de …', 'ฉันมาจาก …', 'I’m from …'), vs('vivo en …', 'ฉันอาศัยอยู่ที่ …', 'I live in …'), vs('pero', 'แต่', 'but'),
          vs('encantado / encantada', 'ยินดีที่ได้รู้จัก', 'pleased to meet you', { th: 'ผู้ชายพูด encantado ผู้หญิงพูด encantada', en: 'A man says encantado, a woman says encantada.' })],
        grammar: { title: { th: 'เครื่องหมาย ¿ ¡ และ ser (soy, eres)', en: 'The marks ¿ ¡ and the verb ser (soy, eres)' },
          body: { th: 'ภาษาสเปนเปิดคำถามด้วย ¿ และอุทานด้วย ¡ : ¿Cómo te llamas? ¡Hola!\n\nser = เป็น/มาจาก: yo soy, tú eres, él/ella es\nตัว ll ในสเปนออกเสียงคล้าย “ย”: llamo = “ยาโม”',
            en: 'Spanish opens questions with ¿ and exclamations with ¡: ¿Cómo te llamas? ¡Hola!\n\nser = to be / to be from: yo soy, tú eres, él/ella es.\nIn Spain, ll sounds like English y: llamo ≈ “yah-mo”.' },
          table: [['yo', 'soy'], ['tú', 'eres'], ['él / ella', 'es']] },
        exercises: [
          { type: 'gap', text: 'Me ___ Pim.', opts: ['llamo', 'soy', 'vivo'], a: 'llamo' },
          { type: 'gap', text: 'Yo ___ de Tailandia.', opts: ['soy', 'eres', 'es'], a: 'soy' },
          { type: 'mc', prompt: '¿De dónde eres?', q: { th: 'ประโยคนี้แปลว่าอะไร', en: 'What does this mean?' }, opts: [{ th: 'คุณมาจากไหน', en: 'Where are you from?' }, { th: 'คุณอยู่ที่ไหน', en: 'Where do you live?' }, { th: 'คุณชื่ออะไร', en: 'What’s your name?' }], a: 0 },
          { type: 'order', answer: 'Soy de Tailandia, pero vivo en Suecia.' },
          { type: 'listen', say: '¿Cómo te llamas?', opts: [{ th: 'คุณชื่ออะไร', en: 'What’s your name?' }, { th: 'สบายดีไหม', en: 'How are you?' }, { th: 'คุณอายุเท่าไร', en: 'How old are you?' }], a: 0 }
        ] },
      { id: 'es-a2-restaurante', level: 'A2', icon: '🍽️', skills: ['real', 'conversation', 'listening'],
        title: { th: 'สั่งอาหารในร้านอาหาร', en: 'Ordering in a restaurant' }, goal: { th: 'สั่งอาหาร ขอเครื่องดื่ม และขอเช็คบิล', en: 'Order food and drinks and ask for the bill' },
        dialogue: [
          ds('A', 'Buenas noches. ¿Qué van a tomar?', 'สวัสดีตอนเย็นครับ จะรับอะไรดีครับ', 'Good evening. What would you like?'),
          ds('B', 'Para mí, una paella, por favor.', 'ขอปาเอย่าหนึ่งที่ค่ะ', 'A paella for me, please.'),
          ds('A', '¿Y para beber?', 'แล้วเครื่องดื่มล่ะครับ', 'And to drink?'),
          ds('B', 'Un agua con gas, por favor.', 'น้ำแร่อัดแก๊สหนึ่งขวดค่ะ', 'A sparkling water, please.'),
          ds('B', 'La cuenta, por favor.', 'เช็คบิลด้วยค่ะ', 'The bill, please.')
        ],
        vocab: [vs('¿qué van a tomar?', 'จะรับอะไรดี', 'what would you like?'), vs('para mí', 'สำหรับฉัน', 'for me'), vs('por favor', 'กรุณา, ด้วยค่ะ/ครับ', 'please'),
          vs('beber', 'ดื่ม', 'to drink'), vs('agua con gas', 'น้ำแร่อัดแก๊ส', 'sparkling water'), vs('la cuenta', 'บิล', 'the bill'),
          vs('un agua', 'น้ำหนึ่งขวด/แก้ว', 'a (bottle of) water', { th: 'agua เป็นคำเพศหญิง แต่ใช้ un/el เพราะขึ้นต้นด้วยเสียง a ที่ลงเสียงหนัก', en: 'agua is feminine but takes un/el because it starts with a stressed a-sound.' })],
        grammar: { title: { th: 'un / una และ el / la', en: 'un / una and el / la' },
          body: { th: 'คำนามเพศชายใช้ un / el (un plato, el vino) คำนามเพศหญิงใช้ una / la (una paella, la cuenta)\nส่วนใหญ่คำที่ลงท้าย -o เป็นเพศชาย และ -a เป็นเพศหญิง แต่มีข้อยกเว้น',
            en: 'Masculine nouns take un / el (un plato, el vino); feminine nouns take una / la (una paella, la cuenta).\nMost nouns ending in -o are masculine and most ending in -a are feminine, but there are exceptions.' } },
        exercises: [
          { type: 'gap', text: '___ cuenta, por favor.', opts: ['La', 'El', 'Un'], a: 'La' },
          { type: 'gap', text: 'Para mí, ___ paella.', opts: ['una', 'un', 'el'], a: 'una' },
          { type: 'listen', say: '¿Y para beber?', opts: [{ th: 'แล้วเครื่องดื่มล่ะ', en: 'And to drink?' }, { th: 'แล้วของหวานล่ะ', en: 'And for dessert?' }, { th: 'กี่ท่าน', en: 'How many people?' }], a: 0 },
          { type: 'order', answer: 'Un agua con gas, por favor.' }
        ] }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
