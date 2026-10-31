# Changes in this version

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

## 31 Oct 2026 – ThaiElevate, Phase C: Thai Learning Academy navigation and dashboard

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

## 31 Oct 2026 – ThaiElevate, Phase B: new name and two main areas

Built on `feature/family-game-hub` at 043009f. Approved scope: branding + two entry areas. No database change, no saved data renamed,
no file deleted. Audit and plan: "ThaiElevate – Phase 0 audit report".

* **New welcome page** `index.html` (+ `css/welcome.css`, `js/welcome.js`): ThaiElevate brand top left, "ยินดีต้อนรับสู่ ThaiElevate"
  with the English and Swedish subtitles, two doors – 🎮 **Play Zone** and 📚 **Thai Learning Academy** – the explanation language
  (Svenska / ภาษาไทย, saved on the device as `te.explain`, sent to the Academy as `?explain=`), account menu (sign in, student, teacher,
  parent) and menu language th / sv / en (shared with the Play Zone). Noto Sans / Noto Sans Thai Looped / Noto Serif Thai (OFL) from
  Google Fonts; system fonts when offline.
* **Play Zone** `play.html` = the former `index.html`, same scripts and the same saved data (`fgh.v1`, `keykids.v1`, `fgh.family.v1`).
  Its home shows the games, KeyKids, kids area, Family Online, players, history and Parent Zone. The language-course picker and the
  School section are no longer on this page (they belong to the Academy / welcome page; nothing was removed from the code).
* **Branding:** page titles, header brand, `FGH.FT.*.hub` and the hub hero say ThaiElevate. KeyKids, Family Online and the kids area
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
