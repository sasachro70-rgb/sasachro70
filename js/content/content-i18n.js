/* Texts for the Teacher Content Manager (content.html) in Swedish, English and Thai. Added to FGH.FT under "cm". */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const S = {
    sv: { cm: {
      title: 'Kursinnehåll', checking: 'Kontrollerar behörighet…', onlyStaff: 'Kursinnehåll är bara för godkända lärare och administratörer.', signIn: 'Logga in på lärarsidan',
      needsUpdate: 'Kursinnehåll kräver databasuppdateringen (migration 0006). Kontakta administratören.', myCourses: 'Mina kurser', noCourses: 'Inga kurser än. Skapa din första kurs.',
      newCourse: 'Ny kurs', courseName: 'Kursens namn', create: 'Skapa', open: 'Öppna', published: 'Publicerad version {v}', notPublished: 'Inte publicerad', draftSaved: 'Utkast sparat {d}', lessonsN: '{n} lektioner',
      back: 'Tillbaka', saveDraft: 'Spara utkast', publish: 'Granska och publicera', unpublish: 'Avpublicera', history: 'Versioner', deleteDraft: 'Släng utkastet',
      draftNote: 'Du arbetar i ett utkast. Eleverna ser ingenting förrän du publicerar.', unsaved: 'Osparade ändringar', saved: 'Sparat.',
      lessons: 'Lektioner', addLesson: 'Ny tom lektion', importTitle: 'Importera från fil', importHelp: 'Excel (.xlsx), CSV, Word (.docx) eller PDF. Innehållet läses i din webbläsare och blir ett utkast som du granskar.',
      chooseFile: 'Välj fil', xlsOld: 'Gamla .xls-filer kan inte läsas. Spara filen som .xlsx eller CSV i Excel och försök igen.', readError: 'Filen kunde inte läsas.',
      edit: 'Redigera', remove: 'Ta bort', up: 'Upp', down: 'Ner', removeAsk: 'Ta bort lektionen "{t}" från utkastet?', words: 'ord', lines: 'rader', questions: 'frågor',
      /* mapping */
      sheet: 'Blad', hasHeader: 'Första raden är rubriker', mapTitle: 'Vilken kolumn är vad?', none: '– ingen –', defLevel: 'Nivå (om kolumnen saknas)', defLesson: 'Lektionens namn (om kolumnen saknas)',
      f: { thai: 'Thailändska *', rom: 'Romanisering', sv: 'Svenska *', th: 'Förklaring på thai', note: 'Anteckning', audio: 'Ljudfil (namn)', lesson: 'Lektion', level: 'Nivå', image: 'Bild (namn)' },
      result: '{n} ord i {m} lektioner', problems: 'Rader som inte tas med', warnings: 'Att kontrollera', addToDraft: 'Lägg till i utkastet', preview: 'Förhandsvisning (första raderna)',
      e: { no_thai: 'saknar thailändska', not_thai: 'innehåller inga thailändska tecken', no_swedish: 'saknar svenska', bad_level: 'okänd nivå', duplicate: 'finns redan i lektionen', rom_has_thai: 'romaniseringen innehåller thailändska tecken' },
      row: 'Rad {n}',
      /* blocks */
      blocksTitle: 'Markera vad varje del är', blocksHelp: 'Inget används utan markering. Läsrader kan skrivas "thai | romanisering | svenska".',
      role: { skip: 'Hoppa över', title: 'Rubrik', reading: 'Läsning', explanation: 'Förklaring', words: 'Ord', questions: 'Frågor', image: 'Bild' },
      pages: 'Sidor', from: 'från', to: 'till', markPages: 'Markera sidorna som', apply: 'Använd', page: 'Sida {n}', emptyPage: 'Ingen text (skannad sida?)', ocr: 'Läs texten (OCR)',
      ocrNote: 'OCR kan göra fel – kontrollera alltid texten.', ocrBusy: 'Läser sidan…', makeLesson: 'Skapa lektion av markeringarna', lessonLevel: 'Nivå', pdfLoading: 'Läser PDF…',
      /* lesson editor */
      lessonTitle: 'Lektion', tSv: 'Rubrik (svenska) *', tTh: 'Rubrik (thai)', level: 'Nivå', icon: 'Ikon', goal: 'Mål (svenska)', reading: 'Läsning – en rad per mening: thai | romanisering | svenska',
      vocab: 'Ord – en rad per ord: thai | romanisering | svenska | anteckning', explSv: 'Förklaring (svenska)', explTh: 'Förklaring (thai)', openQ: 'Öppna frågor – en per rad (eleven skriver svar)',
      audio: 'Ljud till orden', audioHelp: 'Ladda upp ljudfiler (mp3, m4a, wav). Filnamnet kopplas automatiskt till ordet om det är samma som orden eller romaniseringen.', uploadAudio: 'Ladda upp ljud',
      images: 'Bilder', uploadImage: 'Ladda upp bild', noFile: 'ingen fil', done: 'Klar', previewL: 'Förhandsvisning', listen: 'Lyssna',
      /* publish */
      checkTitle: 'Kontroll före publicering', ok: 'Allt ser bra ut.', publishAsk: 'Publicera nu? Elever och lärare med behörighet ser kursen direkt.', publishedOk: 'Publicerad – version {v}.',
      unpublishAsk: 'Avpublicera kursen? Eleverna ser den inte längre. Innehållet sparas som ditt utkast och i versionerna.', restore: 'Hämta som utkast', restoreAsk: 'Hämta version {v} som utkast? Den publiceras inte förrän du publicerar.',
      noHistory: 'Inga tidigare versioner.', yes: 'Ja', no: 'Nej', leaveAsk: 'Du har osparade ändringar. Lämna ändå?',
      p: { no_lessons: 'kursen har inga lektioner', lesson_without_id: 'lektion utan id', duplicate_lesson_id: 'två lektioner har samma id', no_title: 'saknar rubrik', bad_level: 'okänd nivå', empty_lesson: 'har varken ord eller läsrader', bad_word: 'ord utan thailändska eller svenska', bad_line: 'läsrad utan thailändska', bad_exercise: 'övning med fel svar' }
    } },
    en: { cm: {
      title: 'Course content', checking: 'Checking access…', onlyStaff: 'Course content is only for approved teachers and administrators.', signIn: 'Sign in on the teacher page',
      needsUpdate: 'Course content needs the database update (migration 0006). Contact the administrator.', myCourses: 'My courses', noCourses: 'No courses yet. Create your first course.',
      newCourse: 'New course', courseName: 'Course name', create: 'Create', open: 'Open', published: 'Published version {v}', notPublished: 'Not published', draftSaved: 'Draft saved {d}', lessonsN: '{n} lessons',
      back: 'Back', saveDraft: 'Save draft', publish: 'Check and publish', unpublish: 'Unpublish', history: 'Versions', deleteDraft: 'Discard draft',
      draftNote: 'You are working in a draft. Students see nothing until you publish.', unsaved: 'Unsaved changes', saved: 'Saved.',
      lessons: 'Lessons', addLesson: 'New empty lesson', importTitle: 'Import from a file', importHelp: 'Excel (.xlsx), CSV, Word (.docx) or PDF. The file is read in your browser and becomes a draft you review.',
      chooseFile: 'Choose file', xlsOld: 'Old .xls files cannot be read. Save the file as .xlsx or CSV in Excel and try again.', readError: 'The file could not be read.',
      edit: 'Edit', remove: 'Remove', up: 'Up', down: 'Down', removeAsk: 'Remove the lesson "{t}" from the draft?', words: 'words', lines: 'lines', questions: 'questions',
      sheet: 'Sheet', hasHeader: 'The first row is a header', mapTitle: 'Which column is what?', none: '– none –', defLevel: 'Level (if there is no column)', defLesson: 'Lesson name (if there is no column)',
      f: { thai: 'Thai *', rom: 'Romanization', sv: 'Swedish *', th: 'Explanation in Thai', note: 'Note', audio: 'Audio file (name)', lesson: 'Lesson', level: 'Level', image: 'Picture (name)' },
      result: '{n} words in {m} lessons', problems: 'Rows left out', warnings: 'To check', addToDraft: 'Add to the draft', preview: 'Preview (first rows)',
      e: { no_thai: 'no Thai', not_thai: 'no Thai letters', no_swedish: 'no Swedish', bad_level: 'unknown level', duplicate: 'already in the lesson', rom_has_thai: 'romanization contains Thai letters' },
      row: 'Row {n}',
      blocksTitle: 'Mark what each part is', blocksHelp: 'Nothing is used without a mark. Reading lines can be written "Thai | romanization | Swedish".',
      role: { skip: 'Skip', title: 'Title', reading: 'Reading', explanation: 'Explanation', words: 'Words', questions: 'Questions', image: 'Picture' },
      pages: 'Pages', from: 'from', to: 'to', markPages: 'Mark the pages as', apply: 'Apply', page: 'Page {n}', emptyPage: 'No text (scanned page?)', ocr: 'Read the text (OCR)',
      ocrNote: 'OCR can make mistakes – always check the text.', ocrBusy: 'Reading the page…', makeLesson: 'Make a lesson from the marks', lessonLevel: 'Level', pdfLoading: 'Reading the PDF…',
      lessonTitle: 'Lesson', tSv: 'Title (Swedish) *', tTh: 'Title (Thai)', level: 'Level', icon: 'Icon', goal: 'Goal (Swedish)', reading: 'Reading – one line per sentence: Thai | romanization | Swedish',
      vocab: 'Words – one line per word: Thai | romanization | Swedish | note', explSv: 'Explanation (Swedish)', explTh: 'Explanation (Thai)', openQ: 'Open questions – one per line (the student writes an answer)',
      audio: 'Audio for the words', audioHelp: 'Upload audio files (mp3, m4a, wav). A file is linked to a word automatically when its name is the word or its romanization.', uploadAudio: 'Upload audio',
      images: 'Pictures', uploadImage: 'Upload picture', noFile: 'no file', done: 'Done', previewL: 'Preview', listen: 'Listen',
      checkTitle: 'Check before publishing', ok: 'Everything looks fine.', publishAsk: 'Publish now? Students and teachers with access see the course at once.', publishedOk: 'Published – version {v}.',
      unpublishAsk: 'Unpublish the course? Students no longer see it. The content is kept as your draft and in the versions.', restore: 'Load as draft', restoreAsk: 'Load version {v} as a draft? It is not published until you publish.',
      noHistory: 'No earlier versions.', yes: 'Yes', no: 'No', leaveAsk: 'You have unsaved changes. Leave anyway?',
      p: { no_lessons: 'the course has no lessons', lesson_without_id: 'lesson without id', duplicate_lesson_id: 'two lessons have the same id', no_title: 'no title', bad_level: 'unknown level', empty_lesson: 'has no words and no reading lines', bad_word: 'word without Thai or Swedish', bad_line: 'reading line without Thai', bad_exercise: 'exercise with a wrong answer' }
    } },
    th: { cm: {
      title: 'จัดการเนื้อหาบทเรียน', checking: 'กำลังตรวจสอบสิทธิ์…', onlyStaff: 'ส่วนนี้สำหรับครูและผู้ดูแลระบบที่ได้รับอนุมัติเท่านั้น', signIn: 'เข้าสู่ระบบที่หน้าครู',
      needsUpdate: 'ส่วนนี้ต้องอัปเดตฐานข้อมูล (migration 0006) กรุณาติดต่อผู้ดูแลระบบ', myCourses: 'คอร์สของฉัน', noCourses: 'ยังไม่มีคอร์ส สร้างคอร์สแรกได้เลย',
      newCourse: 'สร้างคอร์สใหม่', courseName: 'ชื่อคอร์ส', create: 'สร้าง', open: 'เปิด', published: 'เผยแพร่แล้ว ฉบับที่ {v}', notPublished: 'ยังไม่เผยแพร่', draftSaved: 'บันทึกฉบับร่างเมื่อ {d}', lessonsN: '{n} บทเรียน',
      back: 'กลับ', saveDraft: 'บันทึกฉบับร่าง', publish: 'ตรวจสอบและเผยแพร่', unpublish: 'หยุดเผยแพร่', history: 'ฉบับก่อนหน้า', deleteDraft: 'ทิ้งฉบับร่าง',
      draftNote: 'กำลังแก้ไขฉบับร่าง นักเรียนจะยังไม่เห็นจนกว่าจะกดเผยแพร่', unsaved: 'ยังไม่ได้บันทึก', saved: 'บันทึกแล้ว',
      lessons: 'บทเรียน', addLesson: 'บทเรียนว่างใหม่', importTitle: 'นำเข้าจากไฟล์', importHelp: 'Excel (.xlsx), CSV, Word (.docx) หรือ PDF ไฟล์จะถูกอ่านในเบราว์เซอร์และกลายเป็นฉบับร่างให้ครูตรวจก่อน',
      chooseFile: 'เลือกไฟล์', xlsOld: 'อ่านไฟล์ .xls แบบเก่าไม่ได้ กรุณาบันทึกเป็น .xlsx หรือ CSV ใน Excel แล้วลองใหม่', readError: 'อ่านไฟล์ไม่สำเร็จ',
      edit: 'แก้ไข', remove: 'ลบ', up: 'ขึ้น', down: 'ลง', removeAsk: 'ลบบทเรียน "{t}" ออกจากฉบับร่างหรือไม่', words: 'คำ', lines: 'บรรทัด', questions: 'คำถาม',
      sheet: 'ชีต', hasHeader: 'แถวแรกเป็นหัวตาราง', mapTitle: 'แต่ละคอลัมน์คืออะไร', none: '– ไม่มี –', defLevel: 'ระดับ (ถ้าไม่มีคอลัมน์)', defLesson: 'ชื่อบทเรียน (ถ้าไม่มีคอลัมน์)',
      f: { thai: 'ภาษาไทย *', rom: 'คำอ่าน', sv: 'ภาษาสวีเดน *', th: 'คำอธิบายภาษาไทย', note: 'หมายเหตุ', audio: 'ไฟล์เสียง (ชื่อ)', lesson: 'บทเรียน', level: 'ระดับ', image: 'รูปภาพ (ชื่อ)' },
      result: '{n} คำ ใน {m} บทเรียน', problems: 'แถวที่ไม่ถูกนำเข้า', warnings: 'ควรตรวจสอบ', addToDraft: 'เพิ่มในฉบับร่าง', preview: 'ตัวอย่าง (แถวแรก ๆ)',
      e: { no_thai: 'ไม่มีภาษาไทย', not_thai: 'ไม่มีตัวอักษรไทย', no_swedish: 'ไม่มีภาษาสวีเดน', bad_level: 'ระดับไม่ถูกต้อง', duplicate: 'มีคำนี้ในบทแล้ว', rom_has_thai: 'คำอ่านมีตัวอักษรไทย' },
      row: 'แถว {n}',
      blocksTitle: 'ระบุว่าแต่ละส่วนคืออะไร', blocksHelp: 'ส่วนที่ไม่ได้ระบุจะไม่ถูกใช้ บรรทัดอ่านเขียนแบบ "ไทย | คำอ่าน | สวีเดน" ได้',
      role: { skip: 'ข้าม', title: 'หัวข้อ', reading: 'บทอ่าน', explanation: 'คำอธิบาย', words: 'คำศัพท์', questions: 'คำถาม', image: 'รูปภาพ' },
      pages: 'หน้า', from: 'จาก', to: 'ถึง', markPages: 'ระบุหน้าเหล่านี้เป็น', apply: 'ใช้', page: 'หน้า {n}', emptyPage: 'ไม่มีข้อความ (หน้าสแกน?)', ocr: 'อ่านข้อความ (OCR)',
      ocrNote: 'OCR อาจอ่านผิด ต้องตรวจทุกครั้ง', ocrBusy: 'กำลังอ่านหน้า…', makeLesson: 'สร้างบทเรียนจากส่วนที่ระบุ', lessonLevel: 'ระดับ', pdfLoading: 'กำลังอ่าน PDF…',
      lessonTitle: 'บทเรียน', tSv: 'หัวข้อ (สวีเดน) *', tTh: 'หัวข้อ (ไทย)', level: 'ระดับ', icon: 'ไอคอน', goal: 'จุดประสงค์ (สวีเดน)', reading: 'บทอ่าน – หนึ่งประโยคต่อบรรทัด: ไทย | คำอ่าน | สวีเดน',
      vocab: 'คำศัพท์ – หนึ่งคำต่อบรรทัด: ไทย | คำอ่าน | สวีเดน | หมายเหตุ', explSv: 'คำอธิบาย (สวีเดน)', explTh: 'คำอธิบาย (ไทย)', openQ: 'คำถามปลายเปิด – หนึ่งข้อต่อบรรทัด (นักเรียนเขียนตอบ)',
      audio: 'เสียงของคำศัพท์', audioHelp: 'อัปโหลดไฟล์เสียง (mp3, m4a, wav) ระบบจะจับคู่กับคำศัพท์ให้ถ้าชื่อไฟล์ตรงกับคำหรือคำอ่าน', uploadAudio: 'อัปโหลดเสียง',
      images: 'รูปภาพ', uploadImage: 'อัปโหลดรูป', noFile: 'ไม่มีไฟล์', done: 'เสร็จ', previewL: 'ตัวอย่าง', listen: 'ฟัง',
      checkTitle: 'ตรวจสอบก่อนเผยแพร่', ok: 'ทุกอย่างเรียบร้อย', publishAsk: 'เผยแพร่ตอนนี้หรือไม่ นักเรียนและครูที่มีสิทธิ์จะเห็นทันที', publishedOk: 'เผยแพร่แล้ว – ฉบับที่ {v}',
      unpublishAsk: 'หยุดเผยแพร่คอร์สหรือไม่ นักเรียนจะไม่เห็นอีก เนื้อหาจะเก็บไว้เป็นฉบับร่างและในประวัติ', restore: 'นำกลับมาเป็นฉบับร่าง', restoreAsk: 'นำฉบับที่ {v} กลับมาเป็นฉบับร่างหรือไม่ จะยังไม่เผยแพร่จนกว่าจะกดเผยแพร่',
      noHistory: 'ยังไม่มีฉบับก่อนหน้า', yes: 'ใช่', no: 'ไม่', leaveAsk: 'ยังไม่ได้บันทึก ต้องการออกหรือไม่',
      p: { no_lessons: 'คอร์สยังไม่มีบทเรียน', lesson_without_id: 'บทเรียนไม่มีรหัส', duplicate_lesson_id: 'มีบทเรียนรหัสซ้ำกัน', no_title: 'ไม่มีหัวข้อ', bad_level: 'ระดับไม่ถูกต้อง', empty_lesson: 'ไม่มีทั้งคำศัพท์และบทอ่าน', bad_word: 'คำศัพท์ไม่มีภาษาไทยหรือสวีเดน', bad_line: 'บทอ่านไม่มีภาษาไทย', bad_exercise: 'แบบฝึกหัดมีคำตอบผิด' }
    } }
  };
  FGH.FT = FGH.FT || {};
  for (const l in S) FGH.FT[l] = Object.assign(FGH.FT[l] || {}, S[l]);
  FGH.contentTexts = S;
})(typeof window !== 'undefined' ? window : globalThis);
