/* Knowledge & Word Games – question bank (SAMPLE CONTENT).
   Content only; js/family/kids-knowledge.js turns it into games. Maths questions are generated, not listed here.
   band: 1 = ages 3–4, 2 = 5–6, 3 = 7–8, 4 = 9–10. The first answer is the right one (the game shuffles them).
   Every text is in Thai, Swedish and English. Add a question by adding a row; keep facts checkable. */
(function (G) {
  'use strict';
  const C = G.FGH_CONTENT = G.FGH_CONTENT || {};
  const T = (th, sv, en) => ({ th, sv, en });
  const q = (id, band, cat, pic, question, answers) => ({ id, band, cat, pic, q: question, a: answers });

  C.knowledge = {
    sample: true,
    categories: {
      sounds: { icon: '🔊', name: T('เสียงสัตว์', 'Djurläten', 'Animal sounds') },
      animals: { icon: '🐾', name: T('สัตว์', 'Djur', 'Animals') },
      nature: { icon: '🌳', name: T('ธรรมชาติ', 'Naturen', 'Nature') },
      world: { icon: '🌍', name: T('โลกของเรา', 'Världen', 'The world') },
      science: { icon: '🔬', name: T('วิทยาศาสตร์', 'Naturvetenskap', 'Science') },
      thinking: { icon: '🧩', name: T('คิดวิเคราะห์', 'Klurigt', 'Thinking') }
    },
    /* "Which animal says …?" – each language writes the sound its own way */
    sounds: [
      { pic: '🐄', name: T('วัว', 'ko', 'cow'), say: T('มอ มอ', 'mu mu', 'moo moo') },
      { pic: '🐶', name: T('หมา', 'hund', 'dog'), say: T('โฮ่ง โฮ่ง', 'vov vov', 'woof woof') },
      { pic: '🐱', name: T('แมว', 'katt', 'cat'), say: T('เหมียว เหมียว', 'mjau mjau', 'meow meow') },
      { pic: '🦆', name: T('เป็ด', 'anka', 'duck'), say: T('ก้าบ ก้าบ', 'kvack kvack', 'quack quack') },
      { pic: '🐓', name: T('ไก่', 'tupp', 'rooster'), say: T('เอ้กอี๊เอ้กเอ้ก', 'kuckeliku', 'cock-a-doodle-doo') },
      { pic: '🐑', name: T('แกะ', 'får', 'sheep'), say: T('แบ๊ะ แบ๊ะ', 'bä bä', 'baa baa') },
      { pic: '🐷', name: T('หมู', 'gris', 'pig'), say: T('อู๊ด อู๊ด', 'nöff nöff', 'oink oink') },
      { pic: '🐝', name: T('ผึ้ง', 'bi', 'bee'), say: T('หึ่ง หึ่ง', 'surr surr', 'buzz buzz') }
    ],
    questions: [
      q('banana', 2, 'nature', '🍌', T('กล้วยสุกมีสีอะไร', 'Vilken färg har en mogen banan?', 'What colour is a ripe banana?'),
        [T('สีเหลือง', 'Gul', 'Yellow'), T('สีฟ้า', 'Blå', 'Blue'), T('สีม่วง', 'Lila', 'Purple')]),
      q('doglegs', 2, 'animals', '🐶', T('หมามีกี่ขา', 'Hur många ben har en hund?', 'How many legs does a dog have?'),
        [T('4', '4', '4'), T('2', '2', '2'), T('6', '6', '6')]),
      q('fishlive', 2, 'animals', '🐟', T('ปลาอาศัยอยู่ที่ไหน', 'Var bor fiskar?', 'Where do fish live?'),
        [T('ในน้ำ', 'I vattnet', 'In water'), T('บนต้นไม้', 'I träd', 'In trees'), T('ในทราย', 'I sanden', 'In the sand')]),
      q('honey', 2, 'animals', '🐝', T('ผึ้งทำอะไร', 'Vad gör bin?', 'What do bees make?'),
        [T('น้ำผึ้ง', 'Honung', 'Honey'), T('นม', 'Mjölk', 'Milk'), T('ขนมปัง', 'Bröd', 'Bread')]),
      q('bigger', 2, 'animals', '🐘', T('ตัวไหนใหญ่กว่ากัน', 'Vilket djur är störst?', 'Which animal is the biggest?'),
        [T('ช้าง', 'Elefanten', 'The elephant'), T('หนู', 'Musen', 'The mouse'), T('แมว', 'Katten', 'The cat')]),
      q('see', 2, 'science', '👀', T('เราใช้อะไรมองเห็น', 'Vad ser vi med?', 'What do we see with?'),
        [T('ตา', 'Ögonen', 'Our eyes'), T('หู', 'Öronen', 'Our ears'), T('จมูก', 'Näsan', 'Our nose')]),
      q('tuesday', 2, 'world', '📅', T('วันไหนมาหลังวันจันทร์', 'Vilken dag kommer efter måndag?', 'Which day comes after Monday?'),
        [T('วันอังคาร', 'Tisdag', 'Tuesday'), T('วันอาทิตย์', 'Söndag', 'Sunday'), T('วันศุกร์', 'Fredag', 'Friday')]),
      q('dark', 2, 'nature', '🌙', T('ข้างนอกมืดตอนไหน', 'När är det mörkt ute?', 'When is it dark outside?'),
        [T('ตอนกลางคืน', 'På natten', 'At night'), T('ตอนเที่ยง', 'Mitt på dagen', 'At midday'), T('ตอนเช้า', 'På förmiddagen', 'In the late morning')]),
      q('fly', 2, 'animals', '🪽', T('สัตว์ตัวไหนบินได้', 'Vilket djur kan flyga?', 'Which animal can fly?'),
        [T('นก', 'Fågeln', 'The bird'), T('หมา', 'Hunden', 'The dog'), T('ปลา', 'Fisken', 'The fish')]),
      q('kitten', 2, 'animals', '🐈', T('ลูกของแมวเรียกว่าอะไร', 'Vad heter en kattunge?', 'What is a baby cat called?'),
        [T('ลูกแมว', 'Kattunge', 'A kitten'), T('ลูกหมา', 'Valp', 'A puppy'), T('ลูกเจี๊ยบ', 'Kyckling', 'A chick')]),

      q('week', 3, 'world', '🗓️', T('หนึ่งสัปดาห์มีกี่วัน', 'Hur många dagar har en vecka?', 'How many days are in a week?'),
        [T('7 วัน', '7 dagar', '7 days'), T('5 วัน', '5 dagar', '5 days'), T('10 วัน', '10 dagar', '10 days')]),
      q('months', 3, 'world', '📆', T('หนึ่งปีมีกี่เดือน', 'Hur många månader har ett år?', 'How many months are in a year?'),
        [T('12 เดือน', '12 månader', '12 months'), T('10 เดือน', '10 månader', '10 months'), T('7 เดือน', '7 månader', '7 months')]),
      q('earth', 3, 'science', '🌍', T('เราอาศัยอยู่บนดาวดวงไหน', 'Vilken planet bor vi på?', 'Which planet do we live on?'),
        [T('โลก', 'Jorden', 'Earth'), T('ดาวอังคาร', 'Mars', 'Mars'), T('ดาวพฤหัสบดี', 'Jupiter', 'Jupiter')]),
      q('plants', 3, 'nature', '🌱', T('ต้นไม้ต้องการอะไรเพื่อเติบโต', 'Vad behöver växter för att växa?', 'What do plants need to grow?'),
        [T('แสงแดดและน้ำ', 'Solljus och vatten', 'Sunlight and water'), T('ความมืดอย่างเดียว', 'Bara mörker', 'Only darkness'), T('ทรายอย่างเดียว', 'Bara sand', 'Only sand')]),
      q('ocean', 3, 'world', '🌊', T('มหาสมุทรที่ใหญ่ที่สุดในโลกคือมหาสมุทรอะไร', 'Vilket är världens största hav?', 'Which is the largest ocean?'),
        [T('มหาสมุทรแปซิฟิก', 'Stilla havet', 'The Pacific Ocean'), T('มหาสมุทรแอตแลนติก', 'Atlanten', 'The Atlantic Ocean'), T('มหาสมุทรอินเดีย', 'Indiska oceanen', 'The Indian Ocean')]),
      q('capse', 3, 'world', '🇸🇪', T('เมืองหลวงของสวีเดนคือเมืองอะไร', 'Vad heter Sveriges huvudstad?', 'What is the capital of Sweden?'),
        [T('สตอกโฮล์ม', 'Stockholm', 'Stockholm'), T('ออสโล', 'Oslo', 'Oslo'), T('โคเปนเฮเกน', 'Köpenhamn', 'Copenhagen')]),
      q('capth', 3, 'world', '🇹🇭', T('เมืองหลวงของประเทศไทยคือเมืองอะไร', 'Vad heter Thailands huvudstad?', 'What is the capital of Thailand?'),
        [T('กรุงเทพฯ', 'Bangkok', 'Bangkok'), T('เชียงใหม่', 'Chiang Mai', 'Chiang Mai'), T('ภูเก็ต', 'Phuket', 'Phuket')]),
      q('freeze', 3, 'science', '🧊', T('น้ำกลายเป็นน้ำแข็งที่อุณหภูมิเท่าไร', 'Vid vilken temperatur fryser vatten till is?', 'At what temperature does water freeze?'),
        [T('0 °C', '0 °C', '0 °C'), T('50 °C', '50 °C', '50 °C'), T('100 °C', '100 °C', '100 °C')]),
      q('mammal', 3, 'animals', '🐋', T('สัตว์ตัวไหนเป็นสัตว์เลี้ยงลูกด้วยนม', 'Vilket djur är ett däggdjur?', 'Which animal is a mammal?'),
        [T('วาฬ', 'Valen', 'The whale'), T('ฉลาม', 'Hajen', 'The shark'), T('ปลาทอง', 'Guldfisken', 'The goldfish')]),
      q('oxygen', 3, 'science', '🫁', T('เราหายใจเอาก๊าซอะไรเข้าไปเพื่อมีชีวิต', 'Vilken gas andas vi in för att leva?', 'Which gas do we breathe in to stay alive?'),
        [T('ออกซิเจน', 'Syre', 'Oxygen'), T('ฮีเลียม', 'Helium', 'Helium'), T('ควัน', 'Rök', 'Smoke')]),
      q('winter', 3, 'nature', '❄️', T('ในสวีเดน ฤดูไหนหนาวที่สุด', 'Vilken årstid är kallast i Sverige?', 'Which season is the coldest in Sweden?'),
        [T('ฤดูหนาว', 'Vintern', 'Winter'), T('ฤดูร้อน', 'Sommaren', 'Summer'), T('ฤดูใบไม้ผลิ', 'Våren', 'Spring')]),
      q('insect', 3, 'animals', '🐞', T('แมลงมีกี่ขา', 'Hur många ben har en insekt?', 'How many legs does an insect have?'),
        [T('6 ขา', '6 ben', '6 legs'), T('8 ขา', '8 ben', '8 legs'), T('4 ขา', '4 ben', '4 legs')]),

      q('mercury', 4, 'science', '☀️', T('ดาวเคราะห์ดวงไหนอยู่ใกล้ดวงอาทิตย์ที่สุด', 'Vilken planet ligger närmast solen?', 'Which planet is closest to the Sun?'),
        [T('ดาวพุธ', 'Merkurius', 'Mercury'), T('ดาวศุกร์', 'Venus', 'Venus'), T('ดาวอังคาร', 'Mars', 'Mars')]),
      q('hottest', 4, 'science', '🔥', T('ดาวเคราะห์ดวงไหนร้อนที่สุด (เพราะมีบรรยากาศหนามากกักความร้อนไว้)', 'Vilken planet är varmast? (Den tjocka atmosfären håller kvar värmen.)', 'Which planet is the hottest? (Its thick atmosphere traps the heat.)'),
        [T('ดาวศุกร์', 'Venus', 'Venus'), T('ดาวพุธ', 'Merkurius', 'Mercury'), T('ดาวอังคาร', 'Mars', 'Mars')]),
      q('jupiter', 4, 'science', '🪐', T('ดาวเคราะห์ดวงไหนใหญ่ที่สุดในระบบสุริยะ', 'Vilken är den största planeten i solsystemet?', 'Which is the largest planet in our solar system?'),
        [T('ดาวพฤหัสบดี', 'Jupiter', 'Jupiter'), T('โลก', 'Jorden', 'Earth'), T('ดาวพุธ', 'Merkurius', 'Mercury')]),
      q('boil', 4, 'science', '♨️', T('ที่ระดับน้ำทะเล น้ำเดือดที่อุณหภูมิเท่าไร', 'Vid vilken temperatur kokar vatten vid havsytan?', 'At sea level, at what temperature does water boil?'),
        [T('100 °C', '100 °C', '100 °C'), T('50 °C', '50 °C', '50 °C'), T('200 °C', '200 °C', '200 °C')]),
      q('asia', 4, 'world', '🗺️', T('ประเทศไทยอยู่ในทวีปอะไร', 'I vilken världsdel ligger Thailand?', 'Which continent is Thailand in?'),
        [T('เอเชีย', 'Asien', 'Asia'), T('ยุโรป', 'Europa', 'Europe'), T('แอฟริกา', 'Afrika', 'Africa')]),
      q('capes', 4, 'world', '🇪🇸', T('เมืองหลวงของสเปนคือเมืองอะไร', 'Vad heter Spaniens huvudstad?', 'What is the capital of Spain?'),
        [T('มาดริด', 'Madrid', 'Madrid'), T('บาร์เซโลนา', 'Barcelona', 'Barcelona'), T('เซบียา', 'Sevilla', 'Seville')]),
      q('herbivore', 4, 'animals', '🦒', T('สัตว์ที่กินแต่พืชเรียกว่าอะไร', 'Vad kallas djur som bara äter växter?', 'What are animals that eat only plants called?'),
        [T('สัตว์กินพืช', 'Växtätare', 'Herbivores'), T('สัตว์กินเนื้อ', 'Köttätare', 'Carnivores'), T('สัตว์กินทั้งพืชและสัตว์', 'Allätare', 'Omnivores')]),
      q('heart', 4, 'science', '❤️', T('อวัยวะไหนสูบฉีดเลือดไปทั่วร่างกาย', 'Vilket organ pumpar runt blodet i kroppen?', 'Which organ pumps blood around the body?'),
        [T('หัวใจ', 'Hjärtat', 'The heart'), T('ปอด', 'Lungorna', 'The lungs'), T('กระเพาะอาหาร', 'Magsäcken', 'The stomach')]),
      q('co2', 4, 'science', '🌿', T('พืชดูดก๊าซอะไรจากอากาศเพื่อสร้างอาหาร', 'Vilken gas tar växter upp ur luften för att göra näring?', 'Which gas do plants take from the air to make food?'),
        [T('คาร์บอนไดออกไซด์', 'Koldioxid', 'Carbon dioxide'), T('ฮีเลียม', 'Helium', 'Helium'), T('ไนโตรเจนเหลว', 'Flytande kväve', 'Liquid nitrogen')]),
      q('rainbow', 4, 'nature', '🌈', T('รุ้งเกิดจากอะไร', 'Hur uppstår en regnbåge?', 'What makes a rainbow?'),
        [T('แสงแดดส่องผ่านหยดน้ำฝน', 'Solljus som går genom regndroppar', 'Sunlight shining through raindrops'), T('ลมพัดแรง', 'Stark vind', 'Strong wind'), T('แสงจันทร์บนหิมะ', 'Månljus på snö', 'Moonlight on snow')]),
      q('tallest', 4, 'thinking', '📏', T('มีอาสูงกว่าลีโอ ลีโอสูงกว่าแซม ใครเตี้ยที่สุด', 'Mia är längre än Leo. Leo är längre än Sam. Vem är kortast?', 'Mia is taller than Leo. Leo is taller than Sam. Who is the shortest?'),
        [T('แซม', 'Sam', 'Sam'), T('มีอา', 'Mia', 'Mia'), T('ลีโอ', 'Leo', 'Leo')]),
      q('pattern', 4, 'thinking', '🔢', T('2, 4, 6, 8 … ตัวต่อไปคืออะไร', '2, 4, 6, 8 … vad kommer sedan?', '2, 4, 6, 8 … what comes next?'),
        [T('10', '10', '10'), T('9', '9', '9'), T('12', '12', '12')]),
      q('pizza', 4, 'thinking', '🍕', T('ตัดพิซซ่าเป็น 4 ชิ้นเท่ากัน กินไป 1 ชิ้น กินไปเท่าไรของทั้งถาด', 'En pizza delas i 4 lika stora bitar och du äter 1. Hur stor del åt du?', 'A pizza is cut into 4 equal slices and you eat 1. What part did you eat?'),
        [T('1/4', '1/4', '1/4'), T('1/2', '1/2', '1/2'), T('3/4', '3/4', '3/4')]),
      q('odd', 4, 'thinking', '🧩', T('อันไหนไม่เข้าพวก: แมว หมา ม้า ส้ม', 'Vilken passar inte in: katt, hund, häst, apelsin?', 'Which one does not belong: cat, dog, horse, orange?'),
        [T('ส้ม', 'Apelsin', 'Orange'), T('ม้า', 'Häst', 'Horse'), T('หมา', 'Hund', 'Dog')])
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
