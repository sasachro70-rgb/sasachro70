# Changes in this version

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
