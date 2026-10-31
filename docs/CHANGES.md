# Changes in this version

## 31 Oct 2026 – Phase I–J: Admin Panel, natural Thai cloud voice, one design, deploy guide

* **Thai voice on every device.** New Supabase Edge Function `supabase/functions/tts` asks Google Cloud Text-to-Speech for a natural
  Thai voice (best available: Chirp 3 HD → Neural2 → WaveNet → Standard, female or male). The Google key stays on the server.
  Each sentence is generated once, stored in the private bucket `tts-cache` and reused; daily limits per user/visitor and in total
  (migration `0007_thai_cloud_voice.sql`). In the browser (`js/family/cloud-voice.js`): automatic when the device has no Thai voice,
  or always / never per device; sentences are cached in the browser too; lesson audio is fetched in the background when a lesson
  opens. If the function is missing, offline or over the limit, the device voice is used and nothing breaks.
  Recorded audio from the Content Manager still comes first.
* **Thai voice notice.** When a device cannot read Thai at all, the Academy shows why and how to add a Thai voice for that device
  (iPad/iPhone, Android, Windows, Mac, Chromebook). Voice settings has a new "Thai voice" card. The voice list no longer shows course ids.
* **Admin Panel** (`admin.html`, System Creator and Admins): access requests, users (role, status, permissions), invitations with a
  one-time link (`teacher.html?invite=…`), all classes, published courses, security log, and a system check of migrations 0001–0007,
  Storage buckets, BOOK 42 and the cloud voice. Everything is checked by the database, not by the page.
* **One design.** All pages use the Pasathai palette (warm paper, deep indigo, teal) and Noto Sans / Noto Sans Thai Looped, light and
  dark. KeyKids keeps its own fonts. Checked at 390, 820 and 1280 px wide, light and dark: no sideways scrolling on any page.
* **Docs:** `docs/DEPLOY.md` has the full setup order and step-by-step Google/Supabase instructions for the Thai voice.
* Tests: `tests/cloud-voice.test.js`, `supabase/tests/tts.test.js`, `supabase/tests/tts-function.test.js`.

## 31 Oct 2026 – New name: Pasathai

* The product is now called **Pasathai** (ภาษาไทย) instead of ThaiElevate, on every page title, the brand top left
  ("Pasa**thai**"), the welcome heading "ยินดีต้อนรับสู่ Pasathai", menus, buttons, texts in all three languages and the docs.
* Unchanged on purpose: file names, saved data keys (`fgh.*`, `te.explain`) and code names, so nobody loses data or links.

## 31 Oct 2026 – Phase F: Teacher Content Manager

**Database** `supabase/migrations/0006_content_manager.sql` (+ `supabase/rollback/0006_rollback.sql`). Run after 0005 in the SQL Editor.
Until then the Content Manager says that the database needs the update; everything else keeps working.

* **New page `content.html`** (teacher page → 📚 Course content), only for approved teachers and admins:
  - **My courses**: create a course (id `t-…`), open, see published version and saved draft.
  - **Import** – the file is read in the browser, nothing is sent anywhere until the teacher saves:
    - **Excel (.xlsx) and CSV**: sheet choice, "first row is a header", column mapping (Thai, romanization, Swedish, Thai explanation,
      note, audio file, lesson, level, picture) guessed from the header and changeable, every row checked with the reason shown
      (no Thai, no Swedish, unknown level, duplicate…); words grouped into lessons by the lesson and level columns. Old .xls: the page asks
      for .xlsx or CSV.
    - **Word (.docx)**: headings, paragraphs, lists, tables and pictures in order; the teacher marks each part as title, reading,
      explanation, words, questions or picture (a guess is made, nothing is used unmarked).
    - **PDF**: text per page with pdf.js (loaded from jsDelivr only when a PDF is opened), page range, "mark these pages as…", repair of
      Thai text split by Word-made PDFs (ท า → ทำ, น ้า → น้ำ, ป ่ า → ป่า). Pages without text (scanned) can be read with OCR
      (Tesseract, Thai + Swedish) – marked as "can make mistakes"; OCR could not be tested here (no internet).
    - Lines like "ยาย mormor" are split into Thai and Swedish automatically; "thai | romanization | svenska" works everywhere.
  - **Lesson editor**: titles (sv/th), level, icon, goal, reading lines, words, explanations (sv/th), open questions; listening questions
    are made from the words again when the words change; audio files are linked to words by file name (word, romanization or number);
    pictures; a preview with the real Thai voice.
  - **Draft → check → publish**: the check lists every problem; publishing asks for confirmation; students see the course at once.
    **Unpublish** keeps the content as a draft. **Versions**: every earlier publication is kept (append-only) and can be loaded back as a
    draft (never published automatically).
* Media: private Storage bucket `course-media` (audio/images ≤ 20 MB). Upload: whoever may edit that course. Read: staff and signed-in
  students, through links valid 1 hour made after the access check. Imported audio replaces the synthetic voice for that word.
* Academy lessons show imported pictures. Teacher-made courses appear in the Thai Academy's course list like the others.
* **Tests**: `tests/import.test.js` (Excel, CSV, Word, PDF text repair, mapping, row checks, engine compatibility; small test files in
  `tests/fixtures/`), `supabase/tests/content.test.js` (F1–F4: own courses, drafts invisible to students, publish, history, restore,
  unpublish, media rules, rollback). Browser run: a teacher imports Excel, Word and the real BOOK 42 PDF (page 13), uploads audio, publishes;
  a student sees the course, the uploaded audio is used, the story is there; a student cannot open the Content Manager.

## 31 Oct 2026 – Phase H: homework, hand-in, review, feedback; closed Thai Academy; protected course content

**Database** `supabase/migrations/0005_homework_protected_content.sql` (+ `supabase/rollback/0005_rollback.sql`) – additive.
Run it in the Supabase SQL Editor (or `supabase db push`) **before** using the new parts; until then the Thai Academy shows
"the school database needs an update" and the teacher page says homework needs the update. Everything else keeps working.

* **Thai Learning Academy is closed** to everyone except approved teachers/admins and devices signed in as a student. The database
  decides (`teaching_access()`); the page only shows what it returns. Other language courses (`academy.html?course=sv|en|es`) and the
  Play Zone stay open.
* **Protected course content** (`course_content`, `get_course_content()`): teaching material that must not be public – for example the
  full BOOK 42 course – lives only in the database, is read only after the access check and is added to the page in memory
  (`js/academy/access.js`). It is never committed to this public repository. Only the System Creator / Admins with `classes.manage` save it.
* **Homework** (`assignments`, `submissions`, `homework_messages`):
  - Teacher page → class → 📝 Homework: create (title, instructions, due date, linked lesson, max points, resubmit rule), archive,
    see who handed in / is late / waits for review, open a student's hand-in (all versions, text, file), give points, **Approve** or
    **Ask for a correction**, write feedback (ครูแสดงความคิดเห็น).
  - Academy → Homework (signed-in student): list with status, open, read instructions, open the linked lesson, write an answer, attach a
    file (PDF, Word, photo, audio, ≤ 10 MB), hand in, see versions, points and teacher feedback, write comments (นักเรียนแสดงความคิดเห็น).
  - Every hand-in is a new version; messages are append-only (a trigger blocks edits and deletes, even for the table owner).
* **Files:** private Storage bucket `submissions` (created by the migration on Supabase); a student uploads only under their own id and
  reads only their own files; a teacher reads files of their own classes; links are valid 1 hour.
* **Tests:** `supabase/tests/homework.test.js` (H1–H5: access, protected content, the whole homework flow, rules and file paths, rollback).
  Checked here on a real PostgreSQL 16; plus a browser run of the whole flow (teacher signs up and is approved, creates a class and
  homework; a student signs in, hands in with a file and a question; the teacher returns it with feedback; the student hands in again;
  the teacher approves 10/10).
* Student page: new **Thai Learning Academy** tile.

## 31 Oct 2026 – Thai Learning Academy: "Läsa och skriva thailändska" (อ่านเขียนภาษาไทย), after BOOK 42

* New course `content/academy-th-read.js` (key `thr`, target Thai): **10 chapters in 5 steps**, in the order of the teacher's book
  BOOK 42 by Kru Aom – vowel groups chapter by chapter, the 9 final-consonant groups, vowels that change or hide their form, consonant
  classes and tones, clusters and leading consonants, live/dead syllables, punctuation (ๆ ฯ ฯลฯ), ฤ ฦ, the silent-letter mark ์ and
  all 32 vowel sounds. Sentences, words, explanations and exercises are written for the app; the book's stories and pages are not copied
  (the repository is public). Each chapter: reading lines with audio and RTGS, 8 words, a rule with a table (แจกลูก, มาตรา, tone table
  – every Thai cell has 🔊), 6–8 exercises (listen and pick the Thai word, build a syllable, live or dead syllable, final-consonant
  group, consonant class, tone, word order, gap) plus the generated word questions and a speaking task.
* **Thai explanations** for every title, goal and grammar text of this course (shown when the learner picks ภาษาไทย); Swedish everywhere.
* Academy **Courses** screen: both Thai courses as cards (reading/writing and conversation), progress per course, pick one; the setup
  screen also lets you pick. Lessons, Thai Practice, Learning Games and level tests follow the chosen course; word review covers the words
  of both. Progress key `ac:thr:sv`. The "other language courses" picker and the home page leave this course out (`track: 'thai'`).
* Loaded by `academy.html`, `parent.html`, `student.html`. Tests: `tests/thai-read.test.js` (structure, every answer is an option, Thai facts:
  คำเป็น/คำตาย, มาตรา, tones, classes, 9 groups, 32 vowels).

## 31 Oct 2026 – Pasathai, Phase C: Thai Learning Academy navigation and dashboard

No database change; saved data keeps its keys.

* `academy.html` (and `?course=th`) is now the **Thai Learning Academy**: Thai is the only target language, and children as well as
  adults can learn (a signed-in school student is a child profile). Its own navigation: Dashboard · Courses · Lessons · Thai Practice ·
  Learning Games · Classroom · Homework · My Progress.
* **Explanation language** Svenska / ภาษาไทย on every screen, saved per learner (`adult[pid].thExplain`) and on the device (`te.explain`).
  Thai explanation texts are not written yet: the app says so and shows Swedish. Thai progress always uses the key `ac:th:sv`, so
  switching the explanation language never hides progress.
* **Dashboard:** welcome + name, course and level, Continue / Today's lesson, minutes today, words to review, progress, recent activity.
  Homework and teacher feedback show an honest "comes in a later update" (built in Phase H).
* **Learning Games:** Listen and choose, Find the Thai word, Build the sentence – generated from the lessons up to the learner's level;
  a game counts as study time and never changes lesson results.
* **Classroom:** shows the signed-in student's class; otherwise links to Student login and the teacher page. Live lessons: Phase G.
* **Other language courses** (Swedish, English, Spanish) unchanged at `academy.html?course=sv|en|es` (welcome page footer link).
* Files: `js/family/academy-ui.js`, `js/family/i18n.js` (`tla*` texts in en/sv/th), `css/family.css`, `academy.html`, `index.html`, `tests/welcome.test.js`.

## 31 Oct 2026 – Pasathai, Phase B: new name and two main areas

Built on `feature/family-game-hub` at 043009f. Approved scope: branding + two entry areas. No database change, no saved data renamed,
no file deleted. Audit and plan: "Pasathai – Phase 0 audit report".

* **New welcome page** `index.html` (+ `css/welcome.css`, `js/welcome.js`): Pasathai brand top left, "ยินดีต้อนรับสู่ Pasathai"
  with the English and Swedish subtitles, two doors – 🎮 **Play Zone** and 📚 **Thai Learning Academy** – the explanation language
  (Svenska / ภาษาไทย, saved on the device as `te.explain`, sent to the Academy as `?explain=`), account menu (sign in, student, teacher,
  parent) and menu language th / sv / en (shared with the Play Zone). Noto Sans / Noto Sans Thai Looped / Noto Serif Thai (OFL) from
  Google Fonts; system fonts when offline.
* **Play Zone** `play.html` = the former `index.html`, same scripts and the same saved data (`fgh.v1`, `keykids.v1`, `fgh.family.v1`).
  Its home shows the games, KeyKids, kids area, Family Online, players, history and Parent Zone. The language-course picker and the
  School section are no longer on this page (they belong to the Academy / welcome page; nothing was removed from the code).
* **Branding:** page titles, header brand, `FGH.FT.*.hub` and the hub hero say Pasathai. KeyKids, Family Online and the kids area
  lead back to the Play Zone (`<body data-home="play.html">`); Academy, parent, teacher and student pages lead to the welcome page.
* **Kept reachable:** Swedish, English and Spanish courses (footer link "Other language courses" → `academy.html`); all five kids
  language pairs stay in the Play Zone. Thai explanations are not written yet: choosing ภาษาไทย shows a note and the lessons fall back to Swedish.
* **Tests:** `tests/welcome.test.js` (6 tests); `tests/family.test.js` now also checks `play.html`, `student.html`, `teacher.html`.
* **Rollback:** `git revert` of this commit, or `git mv play.html index.html` and restore the old `index.html` – no data to undo.
* **Note:** home-screen icons and bookmarks to `index.html` now open the welcome page; one tap more to the games.

## 31 Oct 2026 – Classes and Student Mode (step A)

* **Database** `supabase/migrations/0004_classes_students.sql` (+ `supabase/rollback/0004_rollback.sql`): classes, students with
  class code + student ID + PIN, device sessions, progress and activity saved on the server. `create_family()` closed except for the System Creator.
* **New pages** `teacher.html` (sign in, ask for teacher access, create classes by number or list of names, printable login cards,
  progress per student, add students, new PIN, rename, archive) and `student.html` (student login, Continue where you left off, log out).
* **New files** `js/school/school-service.js`, `school-i18n.js`, `teacher-ui.js`, `student-ui.js`, `student-sync.js`; tests
  `supabase/tests/classes.test.js`, `tests/school.test.js`.
* **Changed** `kids.html` (saves a signed-in student's progress), `js/online/online-ui.js` + `i18n-online.js` (no "new family" form;
  links to the teacher and student pages), `js/family/hub-bridge.js` + `js/hub-ui.js` (School section on the home page),
  `css/family.css` (forms, login cards, print), docs.
* Not yet: homework PDFs (step B).

## 31 Oct 2026 – Thai course, voice settings, new home page

Built on `feature/family-game-hub` at 216673a. Existing features, files and saved data are kept; no database migration.

**Added**

| File | Purpose |
|---|---|
| `content/academy-th.js` | “Lär dig thailändska” – Thai for Swedish speakers, Level 1–5, 14 sample lessons, RTGS romanization, tone lesson |
| `js/family/voice.js` | Voice choice per learner and language, speed 0.5–1.5× (default 0.85×), sentence splitting, pauses, mixed Thai/Swedish text, recorded-audio support |
| `js/family/voice-ui.js` | Voice settings screen (preview, select, reset) and the speed bar used in lessons |
| `tests/thai-voice.test.js` | Thai content checks, voice logic, per-learner settings, home page texts |

**Changed**

| File | Change |
|---|---|
| `js/hub-ui.js`, `js/family/hub-bridge.js`, `css/hub.css`, `index.html` | New home page: hero, Kids Zone, Adult Language Academy with language picker and Continue Learning, Parent Zone (summary only after the parent PIN). All games, players and history unchanged |
| `js/family/academy.js`, `academy-ui.js` | Courses may have their own levels (Thai: Level 1–5); romanization, listen / slow / repeat buttons, tone graph, Thai word-order tiles without spaces, speed bar, voice screen, `?course=&explain=` links. Level per course is remembered |
| `js/family/kit.js` | `speak()` and `voiceFor()` use the learner’s chosen voice (falls back to the old behaviour if voice.js is not loaded) |
| `js/family/kids-ui.js` | Central speed bar and voice screen instead of the old speed slider (an old slider value is kept) |
| `js/family/store.js`, `cloud-sync.js` | New `voice` part in the family record; synced inside the learner’s learning document (newer choice wins) |
| `js/family/parent-ui.js` | Shows course name and Level for the Thai course |
| `content/academy-sv.js`, `academy-en-es.js` | Course descriptions for the home page |
| `academy.html`, `parent.html`, `kids.html` | Load the new files |

**Saved data:** `fgh.family.v1` gets `voice[profileId] = { rate, rateAt, langs: { th: { id, name, region, gender, at } }, lastLang, lastUsed, updated }` and `adult[profileId].levels`. Nothing existing is renamed or removed.

---

## 30 Oct 2026 – learning platform

Built on branch `feature/family-game-hub` (commit 597778d). Existing features, files and saved data are kept.

## Data migration (browser)

* New key `fgh.family.v1`. On first open of any page it **links** existing hub players (`fgh.v1`) and KeyKids learners
  (`keykids.v1`) to family profiles (same name = same person). Their own data is not changed or moved.
* KeyKids `points` become one “points from before” opening entry in the ledger; afterwards KeyKids shows the ledger balance.
* Runs again safely (only new learners are added). Backup: Parent Dashboard → Settings → Download a backup.

## Database migration

* `supabase/migrations/0002_points_rewards_learning.sql` – additive; see `docs/security/DESIGN.md` section 8 (tables, functions, RLS, rollback).

## Added

| File | Purpose |
|---|---|
| `kids.html`, `academy.html`, `parent.html` | Kids area, Adult Language Academy, Parent Dashboard |
| `css/family.css` | Styles for the three areas (kids / academy / parent look) |
| `css/keykids.css`, `js/keykids/core.js`, `js/keykids/ui.js` | KeyKids split out of `keykids.html` |
| `js/family/ledger.js`, `store.js`, `actions.js`, `cloud-sync.js` | Points, rewards, family record, change pipeline, server sync |
| `js/family/kids-knowledge.js`, `kids-language.js`, `academy.js`, `srs.js` | Game, lesson, test and review engines |
| `js/family/kids-ui.js`, `academy-ui.js`, `parent-ui.js`, `kit.js`, `i18n.js` | Screens, shared helpers, texts |
| `js/family/keykids-bridge.js`, `hub-bridge.js` | KeyKids and family games → ledger |
| `content/kids-language.js`, `content/knowledge.js`, `content/academy-sv.js`, `content/academy-en-es.js` | Sample content |
| `supabase/tests/points.test.js`, `supabase/tests/family-sync.test.js`, `tests/family.test.js` | Tests |
| `docs/PARENT_GUIDE.md`, `CONTENT_GUIDE.md`, `DEPLOY.md`, `TEST_REPORT.md`, `CHANGES.md` | Documentation |

## Changed

| File | Change |
|---|---|
| `keykids.html` | Now loads `css/keykids.css` and `js/keykids/*.js` (+ family bridge) instead of inline code |
| `js/keykids/ui.js` (was inline in `keykids.html`) | Extension points: finished lessons/games report to the bridge, links to the kids area and shop, session ids for idempotent points, profile `kind/diff/ttsRate` fields with safe defaults |
| `index.html`, `js/hub-ui.js` | Loads the family ledger; finished matches earn points; new “Learning & rewards” section |
| `tests/keykids.test.js` | Reads the KeyKids scripts from `js/keykids/` |
| `README.md`, `docs/security/DESIGN.md` | Updated / section 8 added |

Unchanged: `online.html`, `js/online/*`, `js/hub-core.js`, `js/games/*`, `js/data/*`, `js/i18n.js`, `css/hub.css`, migration 0001, existing tests.
