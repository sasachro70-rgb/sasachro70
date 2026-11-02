/* Kids Language Learning – course content (SAMPLE CONTENT, not a complete curriculum).
   Content only, no game logic: js/family/kids-language.js builds every exercise from these rows.
   Every entry has the word or sentence in all four languages, so any language pair works:
     th = Thai, sv = Swedish, en = English, es = Spanish (Spain).
   Thai has no spaces between words; in sentences "|" marks the word breaks used by the "build the sentence"
   exercise and is removed before display. Translations are natural, not word-for-word; "note" explains a
   difference where one language makes a distinction the other does not.
   Pictures: an emoji, "color:#hex" or "num:<n>" (drawn by the app).
   To add content: add a lesson object to a level (unique id), or rows to a lesson. Nothing else needs to change.
   Parents can also add their own words in the Parent Dashboard (stored with the family, not in this file). */
(function (G) {
  'use strict';
  const C = G.FGH_CONTENT = G.FGH_CONTENT || {};
  const w = (id, pic, th, sv, en, es, note) => ({ id, pic, th, sv, en, es, note: note || null });
  const s = (id, pic, th, sv, en, es, note) => ({ id, pic, th, sv, en, es, note: note || null });

  C.kidsLanguage = {
    sample: true,
    version: 1,
    pairs: [
      { id: 'th-es', from: 'th', to: 'es' },
      { id: 'th-sv', from: 'th', to: 'sv' },
      { id: 'sv-th', from: 'sv', to: 'th' },
      { id: 'en-sv', from: 'en', to: 'sv' },
      { id: 'sv-en', from: 'sv', to: 'en' }
    ],
    levels: [
      { n: 1, id: 'first', icon: '🌱', ages: '2–4', name: { th: 'คำแรก', sv: 'Första orden', en: 'First Words' }, lessons: [
        { id: 'greet', icon: '👋', type: 'words', name: { th: 'คำทักทาย', sv: 'Hälsningar', en: 'Greetings' }, items: [
          w('hello', '👋', 'สวัสดี', 'hej', 'hello', 'hola'),
          w('bye', '🙋', 'ลาก่อน', 'hej då', 'goodbye', 'adiós'),
          w('thanks', '🙏', 'ขอบคุณ', 'tack', 'thank you', 'gracias'),
          w('sorry', '😔', 'ขอโทษ', 'förlåt', 'sorry', 'lo siento'),
          w('morning', '🌅', 'อรุณสวัสดิ์', 'god morgon', 'good morning', 'buenos días'),
          w('night', '🌙', 'ราตรีสวัสดิ์', 'god natt', 'good night', 'buenas noches'),
          w('yes', '👍', 'ใช่', 'ja', 'yes', 'sí'),
          w('no', '👎', 'ไม่ใช่', 'nej', 'no', 'no')
        ] },
        { id: 'colors', icon: '🎨', type: 'words', name: { th: 'สี', sv: 'Färger', en: 'Colours' }, items: [
          w('red', 'color:#D8343A', 'สีแดง', 'röd', 'red', 'rojo'),
          w('blue', 'color:#2F7FD8', 'สีฟ้า', 'blå', 'blue', 'azul', { th: 'ภาษาไทยแยก “สีฟ้า” (ฟ้าอ่อน) กับ “สีน้ำเงิน” (ฟ้าเข้ม) ภาษาอื่นใช้คำเดียว', sv: 'Thai har två ord: สีฟ้า (ljusblå) och สีน้ำเงิน (mörkblå).', en: 'Thai has two words: สีฟ้า (light blue) and สีน้ำเงิน (dark blue).' }),
          w('green', 'color:#2E9B4E', 'สีเขียว', 'grön', 'green', 'verde'),
          w('yellow', 'color:#F5CF1B', 'สีเหลือง', 'gul', 'yellow', 'amarillo'),
          w('black', 'color:#1E1E1E', 'สีดำ', 'svart', 'black', 'negro'),
          w('white', 'color:#FFFFFF', 'สีขาว', 'vit', 'white', 'blanco'),
          w('pink', 'color:#F28DB8', 'สีชมพู', 'rosa', 'pink', 'rosa'),
          w('orange', 'color:#F2832B', 'สีส้ม', 'orange', 'orange', 'naranja'),
          w('purple', 'color:#8A4FC7', 'สีม่วง', 'lila', 'purple', 'morado'),
          w('brown', 'color:#8B5A2B', 'สีน้ำตาล', 'brun', 'brown', 'marrón')
        ] },
        { id: 'numbers', icon: '🔢', type: 'words', name: { th: 'ตัวเลข', sv: 'Siffror', en: 'Numbers' }, items: [
          w('n1', 'num:1', 'หนึ่ง', 'ett', 'one', 'uno'), w('n2', 'num:2', 'สอง', 'två', 'two', 'dos'), w('n3', 'num:3', 'สาม', 'tre', 'three', 'tres'),
          w('n4', 'num:4', 'สี่', 'fyra', 'four', 'cuatro'), w('n5', 'num:5', 'ห้า', 'fem', 'five', 'cinco'), w('n6', 'num:6', 'หก', 'sex', 'six', 'seis'),
          w('n7', 'num:7', 'เจ็ด', 'sju', 'seven', 'siete'), w('n8', 'num:8', 'แปด', 'åtta', 'eight', 'ocho'), w('n9', 'num:9', 'เก้า', 'nio', 'nine', 'nueve'),
          w('n10', 'num:10', 'สิบ', 'tio', 'ten', 'diez')
        ] },
        { id: 'animals', icon: '🐾', type: 'words', name: { th: 'สัตว์', sv: 'Djur', en: 'Animals' }, items: [
          w('cat', '🐱', 'แมว', 'katt', 'cat', 'gato'), w('dog', '🐶', 'หมา', 'hund', 'dog', 'perro'), w('bird', '🐦', 'นก', 'fågel', 'bird', 'pájaro'),
          w('fish', '🐟', 'ปลา', 'fisk', 'fish', 'pez', { th: 'ภาษาสเปน: ปลาที่ยังมีชีวิต = pez, ปลาที่เป็นอาหาร = pescado', sv: 'Spanska: levande fisk = pez, fisk som mat = pescado.', en: 'Spanish: a living fish is pez, fish as food is pescado.' }),
          w('cow', '🐄', 'วัว', 'ko', 'cow', 'vaca'), w('horse', '🐴', 'ม้า', 'häst', 'horse', 'caballo'), w('elephant', '🐘', 'ช้าง', 'elefant', 'elephant', 'elefante'),
          w('rabbit', '🐰', 'กระต่าย', 'kanin', 'rabbit', 'conejo'), w('pig', '🐷', 'หมู', 'gris', 'pig', 'cerdo'), w('duck', '🦆', 'เป็ด', 'anka', 'duck', 'pato')
        ] },
        { id: 'fruit', icon: '🍎', type: 'words', name: { th: 'ผลไม้', sv: 'Frukt', en: 'Fruit' }, items: [
          w('apple', '🍎', 'แอปเปิล', 'äpple', 'apple', 'manzana'), w('banana', '🍌', 'กล้วย', 'banan', 'banana', 'plátano'), w('orangef', '🍊', 'ส้ม', 'apelsin', 'orange', 'naranja'),
          w('grapes', '🍇', 'องุ่น', 'vindruvor', 'grapes', 'uvas'), w('strawberry', '🍓', 'สตรอว์เบอร์รี', 'jordgubbe', 'strawberry', 'fresa'),
          w('watermelon', '🍉', 'แตงโม', 'vattenmelon', 'watermelon', 'sandía'), w('mango', '🥭', 'มะม่วง', 'mango', 'mango', 'mango'),
          w('pineapple', '🍍', 'สับปะรด', 'ananas', 'pineapple', 'piña'), w('pear', '🍐', 'ลูกแพร์', 'päron', 'pear', 'pera'), w('lemon', '🍋', 'เลมอน', 'citron', 'lemon', 'limón',
            { th: 'มะนาวไทยลูกเขียวคือ lime (sv: lime, es: lima) ส่วนลูกเหลืองคือเลมอน', sv: 'Thailändsk มะนาว är oftast en grön lime; den gula är citron.', en: 'Thai มะนาว usually means a green lime; the yellow one is a lemon.' })
        ] },
        { id: 'family', icon: '👨‍👩‍👧', type: 'words', name: { th: 'ครอบครัว', sv: 'Familjen', en: 'Family' }, items: [
          w('mum', '👩', 'แม่', 'mamma', 'mum', 'mamá'), w('dad', '👨', 'พ่อ', 'pappa', 'dad', 'papá'),
          w('brother', '👦', 'พี่ชาย/น้องชาย', 'bror', 'brother', 'hermano', { th: 'ภาษาไทยบอกว่าอายุมากกว่า (พี่) หรือน้อยกว่า (น้อง) ภาษาอื่นไม่แยก', sv: 'Thai skiljer på äldre (พี่) och yngre (น้อง) syskon.', en: 'Thai says whether the sibling is older (พี่) or younger (น้อง).' }),
          w('sister', '👧', 'พี่สาว/น้องสาว', 'syster', 'sister', 'hermana', { th: 'พี่สาว = อายุมากกว่า, น้องสาว = อายุน้อยกว่า', sv: 'พี่สาว = äldre syster, น้องสาว = yngre syster.', en: 'พี่สาว = older sister, น้องสาว = younger sister.' }),
          w('grandma', '👵', 'ยาย/ย่า', 'mormor/farmor', 'grandma', 'abuela', { th: 'ยาย/มอร์มอร์ = แม่ของแม่, ย่า/ฟาร์มอร์ = แม่ของพ่อ', sv: 'mormor = mammas mamma (ยาย), farmor = pappas mamma (ย่า).', en: 'Thai and Swedish say which side: mother’s mother (ยาย, mormor) or father’s mother (ย่า, farmor).' }),
          w('grandpa', '👴', 'ตา/ปู่', 'morfar/farfar', 'grandpa', 'abuelo', { th: 'ตา = พ่อของแม่, ปู่ = พ่อของพ่อ', sv: 'morfar = mammas pappa (ตา), farfar = pappas pappa (ปู่).', en: 'mother’s father: ตา, morfar; father’s father: ปู่, farfar.' }),
          w('baby', '👶', 'เด็กทารก', 'bebis', 'baby', 'bebé'), w('familyw', '👨‍👩‍👧‍👦', 'ครอบครัว', 'familj', 'family', 'familia')
        ] }
      ] },
      { n: 2, id: 'basic', icon: '🌿', ages: '4–6', name: { th: 'คำศัพท์พื้นฐาน', sv: 'Grundord', en: 'Basic Vocabulary' }, lessons: [
        { id: 'home', icon: '🏠', type: 'words', name: { th: 'สิ่งของในบ้าน', sv: 'Hemma', en: 'At home' }, items: [
          w('house', '🏠', 'บ้าน', 'hus', 'house', 'casa'), w('door', '🚪', 'ประตู', 'dörr', 'door', 'puerta'), w('window', '🪟', 'หน้าต่าง', 'fönster', 'window', 'ventana'),
          w('table', '🍽️', 'โต๊ะ', 'bord', 'table', 'mesa'), w('chair', '🪑', 'เก้าอี้', 'stol', 'chair', 'silla'), w('bed', '🛏️', 'เตียง', 'säng', 'bed', 'cama'),
          w('kitchen', '🍳', 'ห้องครัว', 'kök', 'kitchen', 'cocina'), w('lamp', '💡', 'โคมไฟ', 'lampa', 'lamp', 'lámpara')
        ] },
        { id: 'food', icon: '🍚', type: 'words', name: { th: 'อาหาร', sv: 'Mat', en: 'Food' }, items: [
          w('rice', '🍚', 'ข้าว', 'ris', 'rice', 'arroz'), w('bread', '🍞', 'ขนมปัง', 'bröd', 'bread', 'pan'), w('milk', '🥛', 'นม', 'mjölk', 'milk', 'leche'),
          w('water', '💧', 'น้ำ', 'vatten', 'water', 'agua'), w('egg', '🥚', 'ไข่', 'ägg', 'egg', 'huevo'), w('cheese', '🧀', 'ชีส', 'ost', 'cheese', 'queso'),
          w('soup', '🍲', 'ซุป', 'soppa', 'soup', 'sopa'), w('icecream', '🍦', 'ไอศกรีม', 'glass', 'ice cream', 'helado')
        ] },
        { id: 'school', icon: '🏫', type: 'words', name: { th: 'โรงเรียน', sv: 'Skolan', en: 'School' }, items: [
          w('schoolw', '🏫', 'โรงเรียน', 'skola', 'school', 'escuela'), w('book', '📕', 'หนังสือ', 'bok', 'book', 'libro'), w('pencil', '✏️', 'ดินสอ', 'penna', 'pencil', 'lápiz'),
          w('teacher', '🧑‍🏫', 'ครู', 'lärare', 'teacher', 'maestro', { th: 'ภาษาสเปน: ครูผู้ชาย = maestro, ครูผู้หญิง = maestra', sv: 'Spanska: maestro (man), maestra (kvinna).', en: 'Spanish: maestro (man), maestra (woman).' }),
          w('friend', '🧒', 'เพื่อน', 'kompis', 'friend', 'amigo', { th: 'ภาษาสเปน: เพื่อนผู้หญิง = amiga', sv: 'Spanska: en flicka är amiga.', en: 'Spanish: a girl friend is amiga.' }),
          w('bag', '🎒', 'กระเป๋านักเรียน', 'skolväska', 'school bag', 'mochila'), w('scissors', '✂️', 'กรรไกร', 'sax', 'scissors', 'tijeras'), w('ruler', '📏', 'ไม้บรรทัด', 'linjal', 'ruler', 'regla')
        ] },
        { id: 'body', icon: '🧍', type: 'words', name: { th: 'ร่างกาย', sv: 'Kroppen', en: 'The body' }, items: [
          w('head', '🙂', 'หัว', 'huvud', 'head', 'cabeza'), w('eye', '👁️', 'ตา', 'öga', 'eye', 'ojo'), w('ear', '👂', 'หู', 'öra', 'ear', 'oreja'),
          w('nose', '👃', 'จมูก', 'näsa', 'nose', 'nariz'), w('mouth', '👄', 'ปาก', 'mun', 'mouth', 'boca'), w('hand', '✋', 'มือ', 'hand', 'hand', 'mano'),
          w('foot', '🦶', 'เท้า', 'fot', 'foot', 'pie'), w('tooth', '🦷', 'ฟัน', 'tand', 'tooth', 'diente')
        ] },
        { id: 'daily', icon: '⏰', type: 'words', name: { th: 'กิจวัตรประจำวัน', sv: 'Varje dag', en: 'Every day' }, items: [
          w('eat', '🍽️', 'กิน', 'äta', 'eat', 'comer'), w('drink', '🥤', 'ดื่ม', 'dricka', 'drink', 'beber'), w('sleep', '😴', 'นอน', 'sova', 'sleep', 'dormir'),
          w('play', '🧸', 'เล่น', 'leka', 'play', 'jugar'), w('wash', '🧼', 'ล้างมือ', 'tvätta händerna', 'wash your hands', 'lavarse las manos'),
          w('brush', '🪥', 'แปรงฟัน', 'borsta tänderna', 'brush your teeth', 'cepillarse los dientes')
        ] }
      ] },
      { n: 3, id: 'simple', icon: '🌳', ages: '6–8', name: { th: 'ประโยคง่าย ๆ', sv: 'Enkla meningar', en: 'Simple Sentences' }, lessons: [
        { id: 'myname', icon: '🙋', type: 'sentences', name: { th: 'ฉันชื่อ…', sv: 'Jag heter …', en: 'My name is …' }, items: [
          s('name1', '🙋', 'ฉัน|ชื่อ|มีอา', 'Jag heter Mia.', 'My name is Mia.', 'Me llamo Mia.', { th: 'เด็กผู้ชายพูดว่า “ผม” แทน “ฉัน”', sv: 'En pojke säger ofta ผม i stället för ฉัน.', en: 'A boy usually says ผม instead of ฉัน.' }),
          s('name2', '🧒', 'เธอ|ชื่อ|อะไร', 'Vad heter du?', 'What is your name?', '¿Cómo te llamas?'),
          s('age1', '🎂', 'ฉัน|อายุ|หก|ขวบ', 'Jag är sex år.', 'I am six years old.', 'Tengo seis años.')
        ] },
        { id: 'iwant', icon: '🙏', type: 'sentences', name: { th: 'ฉันอยาก…', sv: 'Jag vill …', en: 'I want …' }, items: [
          s('want1', '💧', 'ฉัน|อยาก|ดื่ม|น้ำ', 'Jag vill ha vatten.', 'I want some water.', 'Quiero agua.'),
          s('want2', '🧸', 'ฉัน|อยาก|เล่น', 'Jag vill leka.', 'I want to play.', 'Quiero jugar.'),
          s('want3', '🍞', 'ขอ|ขนมปัง|หน่อย', 'Kan jag få bröd, tack?', 'Can I have some bread, please?', '¿Me das pan, por favor?')
        ] },
        { id: 'ilike', icon: '❤️', type: 'sentences', name: { th: 'ฉันชอบ…', sv: 'Jag gillar …', en: 'I like …' }, items: [
          s('like1', '🐱', 'ฉัน|ชอบ|แมว', 'Jag gillar katter.', 'I like cats.', 'Me gustan los gatos.'),
          s('like2', '🍦', 'ฉัน|ชอบ|ไอศกรีม', 'Jag gillar glass.', 'I like ice cream.', 'Me gusta el helado.'),
          s('like3', '⚽', 'ฉัน|ชอบ|เล่น|ฟุตบอล', 'Jag gillar att spela fotboll.', 'I like playing football.', 'Me gusta jugar al fútbol.')
        ] },
        { id: 'whatis', icon: '❓', type: 'sentences', name: { th: 'นี่คืออะไร', sv: 'Vad är det här?', en: 'What is this?' }, items: [
          s('what1', '❓', 'นี่|คือ|อะไร', 'Vad är det här?', 'What is this?', '¿Qué es esto?'),
          s('what2', '🐶', 'นี่|คือ|หมา', 'Det här är en hund.', 'This is a dog.', 'Esto es un perro.'),
          s('what3', '📕', 'นี่|คือ|หนังสือ|ของ|ฉัน', 'Det här är min bok.', 'This is my book.', 'Este es mi libro.')
        ] },
        { id: 'today', icon: '☀️', type: 'sentences', name: { th: 'วันนี้เป็นอย่างไร', sv: 'Hur är det idag?', en: 'How is today?' }, items: [
          s('today1', '🙂', 'วันนี้|เป็น|อย่างไร|บ้าง', 'Hur mår du idag?', 'How are you today?', '¿Cómo estás hoy?'),
          s('today2', '😊', 'ฉัน|มี|ความสุข', 'Jag är glad.', 'I am happy.', 'Estoy feliz.'),
          s('today3', '☀️', 'วันนี้|แดด|ออก', 'Idag är det soligt.', 'It is sunny today.', 'Hoy hace sol.'),
          s('today4', '🌧️', 'วันนี้|ฝน|ตก', 'Idag regnar det.', 'It is raining today.', 'Hoy llueve.')
        ] }
      ] },
      { n: 4, id: 'everyday', icon: '🏡', ages: '7–9', name: { th: 'การสื่อสารในชีวิตประจำวัน', sv: 'Vardagsprat', en: 'Everyday Communication' }, lessons: [
        { id: 'intro', icon: '🤝', type: 'dialogue', name: { th: 'แนะนำตัว', sv: 'Presentera sig', en: 'Introducing yourself' }, items: [
          s('i1', 'A', 'สวัสดี|เธอ|ชื่อ|อะไร', 'Hej! Vad heter du?', 'Hi! What is your name?', '¡Hola! ¿Cómo te llamas?'),
          s('i2', 'B', 'ฉัน|ชื่อ|ลีโอ|แล้ว|เธอ|ล่ะ', 'Jag heter Leo. Och du?', 'I am Leo. And you?', 'Me llamo Leo. ¿Y tú?'),
          s('i3', 'A', 'ฉัน|ชื่อ|มีอา|เธอ|อายุ|เท่าไร', 'Jag heter Mia. Hur gammal är du?', 'I am Mia. How old are you?', 'Me llamo Mia. ¿Cuántos años tienes?'),
          s('i4', 'B', 'ฉัน|อายุ|เจ็ด|ขวบ', 'Jag är sju år.', 'I am seven.', 'Tengo siete años.')
        ] },
        { id: 'dinner', icon: '🍲', type: 'dialogue', name: { th: 'คุยกันในครอบครัว', sv: 'Middag med familjen', en: 'Family dinner' }, items: [
          s('d1', 'A', 'อาหาร|เสร็จ|หรือยัง', 'Är maten klar?', 'Is the food ready?', '¿Está lista la comida?'),
          s('d2', 'B', 'เสร็จ|แล้ว|มา|กิน|ข้าว|เร็ว', 'Ja, kom och ät!', 'Yes, come and eat!', '¡Sí, ven a comer!'),
          s('d3', 'A', 'ขอ|น้ำ|หน่อย|ได้ไหม', 'Kan jag få lite vatten?', 'Can I have some water?', '¿Me das un poco de agua?'),
          s('d4', 'B', 'นี่|จ้ะ', 'Varsågod.', 'Here you are.', 'Aquí tienes.'),
          s('d5', 'A', 'ขอบคุณ', 'Tack!', 'Thank you!', '¡Gracias!')
        ] },
        { id: 'shop', icon: '🛒', type: 'dialogue', name: { th: 'ซื้อของ', sv: 'Handla', en: 'Shopping' }, items: [
          s('s1', 'A', 'แอปเปิล|ราคา|เท่าไร', 'Hur mycket kostar äpplet?', 'How much is the apple?', '¿Cuánto cuesta la manzana?'),
          s('s2', 'B', 'ลูก|ละ|ห้า|บาท', 'Det kostar fem kronor.', 'It costs one pound.', 'Cuesta un euro.', { th: 'แต่ละภาษาใช้เงินของประเทศตัวเอง: บาท โครนา ปอนด์ ยูโร', sv: 'Varje språk använder sitt lands pengar: baht, kronor, pund, euro.', en: 'Each language uses its own country’s money: baht, kronor, pounds, euros.' }),
          s('s3', 'A', 'ขอ|สอง|ลูก|นะ', 'Jag tar två, tack.', 'I will take two, please.', 'Me llevo dos, por favor.'),
          s('s4', 'B', 'นี่|จ้ะ|ขอบใจ|นะ', 'Varsågod, tack ska du ha.', 'Here you are. Thank you!', 'Aquí tienes. ¡Gracias!')
        ] },
        { id: 'class', icon: '🏫', type: 'dialogue', name: { th: 'พูดในโรงเรียน', sv: 'I skolan', en: 'At school' }, items: [
          s('c1', 'A', 'ขอ|ไป|ห้องน้ำ|ได้ไหม', 'Får jag gå på toaletten?', 'May I go to the toilet?', '¿Puedo ir al baño?'),
          s('c2', 'B', 'ได้|จ้ะ', 'Ja, det får du.', 'Yes, you may.', 'Sí, puedes ir.'),
          s('c3', 'A', 'หนู|ไม่|เข้าใจ|ช่วย|หน่อย|ได้ไหม', 'Jag förstår inte. Kan du hjälpa mig?', 'I don’t understand. Can you help me?', 'No entiendo. ¿Me puedes ayudar?'),
          s('c4', 'B', 'ได้|สิ', 'Självklart!', 'Of course!', '¡Claro!')
        ] }
      ] },
      { n: 5, id: 'advanced', icon: '🚀', ages: '8–10', name: { th: 'ขั้นสูงสำหรับเด็ก', sv: 'Avancerat för barn', en: 'Advanced for Kids' }, lessons: [
        { id: 'story_cat', icon: '🐈', type: 'story', name: { th: 'เรื่องสั้น: แมวหาย', sv: 'Berättelse: Katten som försvann', en: 'Story: The lost cat' }, items: [
          s('t1', '🐈', 'มีอา|มี|แมว|ตัว|เล็ก|ชื่อ|โซล', 'Mia har en liten katt som heter Sol.', 'Mia has a little cat called Sol.', 'Mia tiene un gato pequeño que se llama Sol.'),
          s('t2', '🌅', 'เช้า|วันหนึ่ง|มีอา|หา|โซล|ไม่|เจอ', 'En morgon kan Mia inte hitta Sol.', 'One morning Mia cannot find Sol.', 'Una mañana, Mia no encuentra a Sol.'),
          s('t3', '🛏️', 'เธอ|หา|ใต้|เตียง|และ|ใน|ห้องครัว', 'Hon letar under sängen och i köket.', 'She looks under the bed and in the kitchen.', 'Busca debajo de la cama y en la cocina.'),
          s('t4', '👂', 'ในที่สุด|เธอ|ได้ยิน|เสียง|ใน|สวน', 'Till slut hör hon ett ljud i trädgården.', 'At last she hears a sound in the garden.', 'Al final oye un ruido en el jardín.'),
          s('t5', '🌳', 'โซล|นั่ง|อยู่|บน|ต้นไม้|และ|ร้อง|เหมียว', 'Sol sitter i ett träd och jamar.', 'Sol is sitting in a tree, meowing.', 'Sol está en un árbol y maúlla.'),
          s('t6', '🪜', 'พ่อ|ไป|เอา|บันได|มา|แล้ว|โซล|ก็|ลง|มา', 'Pappa hämtar en stege, och Sol kommer ner.', 'Dad fetches a ladder, and Sol comes down.', 'Papá trae una escalera y Sol baja.'),
          s('t7', '😊', 'มีอา|ดีใจ|มาก', 'Mia är så glad!', 'Mia is so happy!', '¡Mia está muy feliz!')
        ], questions: [
          { q: { th: 'แมวชื่ออะไร', sv: 'Vad heter katten?', en: 'What is the cat’s name?', es: '¿Cómo se llama el gato?' }, a: 0,
            opts: [{ th: 'โซล', sv: 'Sol', en: 'Sol', es: 'Sol' }, { th: 'มีอา', sv: 'Mia', en: 'Mia', es: 'Mia' }, { th: 'ลีโอ', sv: 'Leo', en: 'Leo', es: 'Leo' }] },
          { q: { th: 'โซลอยู่ที่ไหน', sv: 'Var är Sol?', en: 'Where is Sol?', es: '¿Dónde está Sol?' }, a: 1,
            opts: [{ th: 'ใต้เตียง', sv: 'Under sängen', en: 'Under the bed', es: 'Debajo de la cama' }, { th: 'บนต้นไม้', sv: 'I ett träd', en: 'In a tree', es: 'En un árbol' }, { th: 'ในห้องครัว', sv: 'I köket', en: 'In the kitchen', es: 'En la cocina' }] },
          { q: { th: 'ใครไปเอาบันไดมา', sv: 'Vem hämtar en stege?', en: 'Who fetches a ladder?', es: '¿Quién trae una escalera?' }, a: 2,
            opts: [{ th: 'มีอา', sv: 'Mia', en: 'Mia', es: 'Mia' }, { th: 'แม่', sv: 'Mamma', en: 'Mum', es: 'Mamá' }, { th: 'พ่อ', sv: 'Pappa', en: 'Dad', es: 'Papá' }] },
          { q: { th: 'ตอนจบมีอารู้สึกอย่างไร', sv: 'Hur känner sig Mia på slutet?', en: 'How does Mia feel at the end?', es: '¿Cómo se siente Mia al final?' }, a: 0,
            opts: [{ th: 'ดีใจ', sv: 'Glad', en: 'Happy', es: 'Feliz' }, { th: 'เสียใจ', sv: 'Ledsen', en: 'Sad', es: 'Triste' }, { th: 'โกรธ', sv: 'Arg', en: 'Angry', es: 'Enfadada' }] }
        ] },
        { id: 'doctor', icon: '🩺', type: 'dialogue', name: { th: 'สถานการณ์: ไปหาหมอ', sv: 'Situation: hos doktorn', en: 'Situation: at the doctor' }, items: [
          s('m1', 'A', 'หนู|เป็น|อะไร|จ๊ะ', 'Hur mår du? Vad har hänt?', 'How are you feeling? What happened?', '¿Qué te pasa?'),
          s('m2', 'B', 'หนู|ปวด|ท้อง', 'Jag har ont i magen.', 'I have a stomach ache.', 'Me duele la barriga.'),
          s('m3', 'A', 'เป็น|มา|นาน|แค่ไหน|แล้ว', 'Hur länge har det gjort ont?', 'How long has it hurt?', '¿Desde cuándo te duele?'),
          s('m4', 'B', 'ตั้งแต่|เมื่อวาน', 'Sedan i går.', 'Since yesterday.', 'Desde ayer.'),
          s('m5', 'A', 'พักผ่อน|เยอะๆ|แล้ว|ดื่ม|น้ำ|นะ', 'Vila och drick mycket vatten.', 'Rest and drink lots of water.', 'Descansa y bebe mucha agua.')
        ] }
      ] }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
