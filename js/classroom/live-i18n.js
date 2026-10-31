/* Texts for the classroom and live lessons (live.html, the Classroom tab in the Academy, the class page for teachers).
   Swedish, English and Thai. Added to FGH.FT under "live" and "cls". */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const S = {
    sv: {
      live: {
        title: 'Direktlektion', liveNow: '🔴 Pågår nu', join: 'Gå med i lektionen', joinInfo: 'Tryck för att gå med. Då kan ljudet spelas upp när läraren spelar upp thailändska.',
        waiting: 'Läraren har inte startat någon direktlektion just nu. Sidan uppdateras av sig själv.', paused: '⏸ Läraren har pausat lektionen.', ended: 'Lektionen är slut. Tack!',
        backAcademy: 'Till Academy', backTeacher: 'Till klassen', lessonNav: 'Lektionens delar', step: 'Del {i} av {n}', prev: 'Föregående', next: 'Nästa',
        pause: 'Pausa', resume: 'Fortsätt', end: 'Avsluta lektionen', endAsk: 'Avsluta direktlektionen för hela klassen?', playAll: 'Spela för alla', play: 'Lyssna',
        exercises: 'Övningar', showEx: 'Visa för klassen', reveal: 'Visa rätt svar', clear: 'Ta bort övningen', onScreen: 'På skärmen',
        answers: '{n} av {m} har svarat · {r} rätt', yourAnswer: 'Ditt svar', saved: 'Ditt svar är sparat – vänta på läraren.', change: 'Du kan ändra svaret tills läraren visar rätt svar.',
        right: '✅ Rätt!', wrong: '❌ Inte riktigt.', correctIs: 'Rätt svar: {a}', noEx: 'Ingen övning på skärmen.',
        talk: 'Frågor och kommentarer', ask: 'Fråga läraren', comment: 'Kommentar till klassen', askPh: 'Skriv en fråga …', commentPh: 'Skriv en kommentar …', send: 'Skicka',
        qOpen: 'Fråga (bara du och läraren ser den tills läraren svarar)', qFrom: 'Fråga från {name}', answered: 'Svar', reply: 'Svara', replyPh: 'Ditt svar …', noTalk: 'Inga frågor eller kommentarer än.',
        notes: 'Mina anteckningar (bara du ser dem)', notePh: 'Anteckning …', save: 'Spara', tooMany: 'Du har skickat många meddelanden. Vänta en stund.',
        people: 'Deltagande', here: 'här', away: 'borta', notJoined: 'inte med', studentsHere: '{n} av {m} är med', answeredN: '{n} svar · {r} rätt', posts: '{n} inlägg',
        progress: 'Lektionens förlopp', assignHw: 'Ge läxa', hwTitle: 'Läxans titel', hwDue: 'Lämnas in senast', hwSaved: 'Läxan är skapad.',
        rtOn: '⚡ Direktanslutning', rtOff: '↻ Uppdateras var tredje sekund', teacher: 'Lärare', you: 'du',
        kind: { intro: 'Start', tones: 'Toner', grammar: 'Grammatik', lines: 'Läsning', words: 'Ord', images: 'Bilder', end: 'Slut' },
        endText: 'Bra jobbat! Repetera orden i Academy och gör läxan om du har fått en.',
        lessonMissing: 'Lektionen finns inte på den här enheten.', notAllowed: 'Du har inte tillgång till den här lektionen.', needsUpdate: 'Databasen behöver uppdateras (migration 0008).',
        signIn: 'Logga in som elev', error: 'Något gick fel: {m}'
      },
      cls: {
        title: 'Klassrum', teacher: 'Lärare', announcements: 'Meddelanden från läraren', noAnnouncements: 'Inga meddelanden.', schedule: 'Schema', noSchedule: 'Inga planerade lektioner.',
        today: 'I dag', pinned: '📌 Fäst', newAnn: 'Nytt meddelande till klassen', pin: 'Fäst överst', post: 'Publicera', archive: 'Ta bort',
        addLesson: 'Planera en lektion', date: 'Datum och tid', minutes: 'Minuter', lessonTitle: 'Rubrik', lesson: 'Lektion (valfritt)', none: '– ingen –', note: 'Anteckning', add: 'Lägg till', del: 'Ta bort',
        live: 'Direktlektion', liveStart: 'Starta direktlektion', liveOpen: 'Öppna direktlektionen', chooseLesson: 'Välj lektion', recent: 'Tidigare direktlektioner', took: '{n} elever deltog',
        homework: 'Läxor', homeworkText: 'Dina läxor, inlämningar, betyg och lärarens kommentarer finns under Läxor.', openHw: 'Till läxorna', join: 'Gå med nu',
        needsUpdate: 'Klassrummet behöver en databasuppdatering (migration 0008).', loading: 'Hämtar klassrummet …', min: '{n} min'
      }
    },
    en: {
      live: {
        title: 'Live lesson', liveNow: '🔴 Live now', join: 'Join the lesson', joinInfo: 'Tap to join. Then sound can play when the teacher plays Thai.',
        waiting: 'Your teacher has not started a live lesson right now. This page updates by itself.', paused: '⏸ The teacher has paused the lesson.', ended: 'The lesson has ended. Thank you!',
        backAcademy: 'To the Academy', backTeacher: 'To the class', lessonNav: 'Parts of the lesson', step: 'Part {i} of {n}', prev: 'Previous', next: 'Next',
        pause: 'Pause', resume: 'Continue', end: 'End lesson', endAsk: 'End the live lesson for the whole class?', playAll: 'Play for everyone', play: 'Listen',
        exercises: 'Exercises', showEx: 'Show to the class', reveal: 'Show the right answer', clear: 'Remove the exercise', onScreen: 'On screen',
        answers: '{n} of {m} answered · {r} right', yourAnswer: 'Your answer', saved: 'Your answer is saved – wait for the teacher.', change: 'You can change it until the teacher shows the answer.',
        right: '✅ Right!', wrong: '❌ Not quite.', correctIs: 'Right answer: {a}', noEx: 'No exercise on screen.',
        talk: 'Questions and comments', ask: 'Ask the teacher', comment: 'Comment to the class', askPh: 'Write a question …', commentPh: 'Write a comment …', send: 'Send',
        qOpen: 'Question (only you and the teacher see it until the teacher answers)', qFrom: 'Question from {name}', answered: 'Answer', reply: 'Answer', replyPh: 'Your answer …', noTalk: 'No questions or comments yet.',
        notes: 'My notes (only you see them)', notePh: 'Note …', save: 'Save', tooMany: 'You have sent many messages. Please wait a moment.',
        people: 'Participation', here: 'here', away: 'away', notJoined: 'not joined', studentsHere: '{n} of {m} are here', answeredN: '{n} answers · {r} right', posts: '{n} posts',
        progress: 'Lesson progress', assignHw: 'Assign homework', hwTitle: 'Homework title', hwDue: 'Due', hwSaved: 'Homework created.',
        rtOn: '⚡ Live connection', rtOff: '↻ Updates every three seconds', teacher: 'Teacher', you: 'you',
        kind: { intro: 'Start', tones: 'Tones', grammar: 'Grammar', lines: 'Reading', words: 'Words', images: 'Pictures', end: 'End' },
        endText: 'Well done! Review the words in the Academy and do the homework if you got one.',
        lessonMissing: 'This lesson is not available on this device.', notAllowed: 'You do not have access to this lesson.', needsUpdate: 'The database needs an update (migration 0008).',
        signIn: 'Sign in as a student', error: 'Something went wrong: {m}'
      },
      cls: {
        title: 'Classroom', teacher: 'Teacher', announcements: 'Announcements from the teacher', noAnnouncements: 'No announcements.', schedule: 'Schedule', noSchedule: 'No planned lessons.',
        today: 'Today', pinned: '📌 Pinned', newAnn: 'New announcement to the class', pin: 'Pin to top', post: 'Publish', archive: 'Remove',
        addLesson: 'Plan a lesson', date: 'Date and time', minutes: 'Minutes', lessonTitle: 'Title', lesson: 'Lesson (optional)', none: '– none –', note: 'Note', add: 'Add', del: 'Delete',
        live: 'Live lesson', liveStart: 'Start live lesson', liveOpen: 'Open the live lesson', chooseLesson: 'Choose a lesson', recent: 'Earlier live lessons', took: '{n} students took part',
        homework: 'Homework', homeworkText: 'Your homework, hand-ins, grades and the teacher’s comments are under Homework.', openHw: 'To homework', join: 'Join now',
        needsUpdate: 'The classroom needs a database update (migration 0008).', loading: 'Loading the classroom …', min: '{n} min'
      }
    },
    th: {
      live: {
        title: 'เรียนสด', liveNow: '🔴 กำลังสอนอยู่', join: 'เข้าห้องเรียน', joinInfo: 'แตะเพื่อเข้าห้องเรียน เมื่อครูเปิดเสียงภาษาไทย เครื่องของคุณจะเล่นเสียงด้วย',
        waiting: 'ตอนนี้ครูยังไม่ได้เริ่มเรียนสด หน้านี้จะอัปเดตเอง', paused: '⏸ ครูหยุดบทเรียนไว้ชั่วคราว', ended: 'จบบทเรียนแล้ว ขอบคุณ!',
        backAcademy: 'กลับไป Academy', backTeacher: 'กลับไปหน้าห้องเรียน', lessonNav: 'ส่วนต่าง ๆ ของบทเรียน', step: 'ส่วนที่ {i} จาก {n}', prev: 'ก่อนหน้า', next: 'ถัดไป',
        pause: 'หยุดชั่วคราว', resume: 'เรียนต่อ', end: 'จบบทเรียน', endAsk: 'จบการเรียนสดสำหรับทั้งห้องใช่ไหม', playAll: 'เปิดเสียงให้ทุกคน', play: 'ฟัง',
        exercises: 'แบบฝึกหัด', showEx: 'แสดงให้ทั้งห้อง', reveal: 'เฉลย', clear: 'เอาแบบฝึกหัดออก', onScreen: 'บนจอ',
        answers: 'ตอบแล้ว {n} จาก {m} คน · ถูก {r} คน', yourAnswer: 'คำตอบของคุณ', saved: 'บันทึกคำตอบแล้ว – รอครูเฉลย', change: 'เปลี่ยนคำตอบได้จนกว่าครูจะเฉลย',
        right: '✅ ถูกต้อง!', wrong: '❌ ยังไม่ถูก', correctIs: 'คำตอบที่ถูก: {a}', noEx: 'ยังไม่มีแบบฝึกหัดบนจอ',
        talk: 'คำถามและความคิดเห็น', ask: 'ถามครู', comment: 'ความคิดเห็นถึงเพื่อนในห้อง', askPh: 'พิมพ์คำถาม …', commentPh: 'พิมพ์ความคิดเห็น …', send: 'ส่ง',
        qOpen: 'คำถาม (เห็นเฉพาะคุณกับครูจนกว่าครูจะตอบ)', qFrom: 'คำถามจาก {name}', answered: 'คำตอบ', reply: 'ตอบ', replyPh: 'คำตอบของครู …', noTalk: 'ยังไม่มีคำถามหรือความคิดเห็น',
        notes: 'บันทึกของครู (เห็นเฉพาะคุณ)', notePh: 'บันทึก …', save: 'บันทึก', tooMany: 'ส่งข้อความหลายครั้งแล้ว รอสักครู่นะ',
        people: 'การมีส่วนร่วม', here: 'อยู่', away: 'ไม่อยู่', notJoined: 'ยังไม่เข้า', studentsHere: 'อยู่ในห้อง {n} จาก {m} คน', answeredN: 'ตอบ {n} ข้อ · ถูก {r}', posts: '{n} ข้อความ',
        progress: 'ความคืบหน้าของบทเรียน', assignHw: 'สั่งการบ้าน', hwTitle: 'ชื่อการบ้าน', hwDue: 'ส่งภายใน', hwSaved: 'สร้างการบ้านแล้ว',
        rtOn: '⚡ เชื่อมต่อสด', rtOff: '↻ อัปเดตทุกสามวินาที', teacher: 'ครู', you: 'คุณ',
        kind: { intro: 'เริ่มต้น', tones: 'วรรณยุกต์', grammar: 'ไวยากรณ์', lines: 'การอ่าน', words: 'คำศัพท์', images: 'รูปภาพ', end: 'จบ' },
        endText: 'เก่งมาก! ทบทวนคำศัพท์ใน Academy และทำการบ้านถ้าครูสั่งไว้',
        lessonMissing: 'บทเรียนนี้ไม่มีในเครื่องนี้', notAllowed: 'คุณไม่มีสิทธิ์เข้าบทเรียนนี้', needsUpdate: 'ฐานข้อมูลต้องอัปเดต (migration 0008)',
        signIn: 'เข้าสู่ระบบนักเรียน', error: 'เกิดข้อผิดพลาด: {m}'
      },
      cls: {
        title: 'ห้องเรียน', teacher: 'ครู', announcements: 'ประกาศจากครู', noAnnouncements: 'ยังไม่มีประกาศ', schedule: 'ตารางเรียน', noSchedule: 'ยังไม่มีบทเรียนที่วางแผนไว้',
        today: 'วันนี้', pinned: '📌 ปักหมุด', newAnn: 'ประกาศใหม่ถึงห้องเรียน', pin: 'ปักหมุดไว้บนสุด', post: 'ประกาศ', archive: 'ลบ',
        addLesson: 'วางแผนบทเรียน', date: 'วันและเวลา', minutes: 'นาที', lessonTitle: 'หัวข้อ', lesson: 'บทเรียน (ไม่บังคับ)', none: '– ไม่มี –', note: 'หมายเหตุ', add: 'เพิ่ม', del: 'ลบ',
        live: 'เรียนสด', liveStart: 'เริ่มเรียนสด', liveOpen: 'เปิดห้องเรียนสด', chooseLesson: 'เลือกบทเรียน', recent: 'การเรียนสดที่ผ่านมา', took: 'นักเรียนเข้าร่วม {n} คน',
        homework: 'การบ้าน', homeworkText: 'การบ้าน งานที่ส่ง คะแนน และความคิดเห็นของครูอยู่ในเมนูการบ้าน', openHw: 'ไปที่การบ้าน', join: 'เข้าเรียนเลย',
        needsUpdate: 'ห้องเรียนต้องอัปเดตฐานข้อมูล (migration 0008)', loading: 'กำลังโหลดห้องเรียน …', min: '{n} นาที'
      }
    }
  };
  FGH.FT = FGH.FT || {};
  for (const l in S) FGH.FT[l] = Object.assign(FGH.FT[l] || {}, S[l]);
  FGH.liveTexts = S;
})(typeof window !== 'undefined' ? window : globalThis);
