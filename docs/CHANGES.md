# Changes in this version

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
