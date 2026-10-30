# Family Game Hub

A learning platform for the whole family, as a static site (GitHub Pages) with an optional Supabase family account:

* **Family games** for one shared iPad (pass the iPad, turns, timer, scores, history) – `index.html`
* **KeyKids** – typing, spelling and flags for children aged 3–10 – `keykids.html`
* **Kids area** – Knowledge & Word Games, Kids Language Learning (5 language pairs) and the Reward shop – `kids.html`
* **Adult Language Academy** – CEFR A1–C1 lessons, level tests and spaced-repetition word review – `academy.html`
* **Parent Dashboard** – PIN-protected: points, rewards, requests, history, learning progress, profiles, rules – `parent.html`
* **Family Online** – accounts, guest rooms with codes, play across devices – `online.html`

Every game and lesson feeds **one points ledger**. Children ask for rewards in the shop; a parent approves or rejects.
Without configuration everything is saved in the browser. With a Supabase project the family's points, rewards and
progress follow every learner across devices, and the server checks every points change.

Lesson content is **sample content** (marked in the app): it shows the course structure and is correct, but it is not a complete curriculum.

## Where to read more

| Document | For |
|---|---|
| `docs/PARENT_GUIDE.md` | Parents: dashboard, rewards, approving requests, points rules (Thai + English) |
| `docs/CONTENT_GUIDE.md` | Adding courses, lessons, words and questions |
| `docs/DEPLOY.md` | Publishing on GitHub Pages, connecting Supabase, external services |
| `docs/TEST_REPORT.md` | What was tested and how |
| `docs/CHANGES.md` | Files added and changed in this version, data migration |
| `docs/security/DESIGN.md` | Data model, roles, threat model, RLS (sections 1–7: rooms; section 8: points, rewards, learning) |

## What is where

| Path | What it is |
|---|---|
| `index.html`, `js/hub-core.js`, `js/hub-ui.js`, `js/games/` | Family games hub (unchanged logic; links to the new areas, matches feed the points ledger) |
| `keykids.html`, `js/keykids/core.js`, `js/keykids/ui.js`, `css/keykids.css` | KeyKids, split from one 198 KB file into modules; behaviour unchanged |
| `kids.html`, `academy.html`, `parent.html` | The three new areas |
| `js/family/ledger.js` | Points ledger, rewards, redemptions (pure logic) |
| `js/family/store.js` | Family record: profiles, links to hub players and KeyKids learners, activity history, progress, parent PIN |
| `js/family/kids-knowledge.js`, `kids-language.js`, `academy.js`, `srs.js` | Game and lesson engines (no DOM, tested in Node) |
| `js/family/*-ui.js`, `kit.js`, `i18n.js`, `css/family.css` | Screens, shared helpers, texts in Thai/Swedish/English |
| `js/family/actions.js`, `cloud-sync.js` | Every change goes through actions; with a family account, cloud-sync sends it to the server |
| `js/family/keykids-bridge.js`, `hub-bridge.js` | Connect KeyKids and the family games to the ledger |
| `content/` | Lesson and question content, separate from game logic |
| `supabase/migrations/0001_…`, `0002_…` | Database: rooms (0001); points, rewards, learning, parent PIN (0002) |
| `tests/`, `supabase/tests/` | `npm test` (no packages) and `npm run test:security` (PGlite) |

Saved data in the browser: `fgh.v1` (hub), `keykids.v1` (KeyKids), `fgh.family.v1` (family: points, rewards, progress).

## Tests

```bash
npm test               # family logic, content checks, KeyKids regression, hub – no packages needed
npm install
npm run test:security  # database rules, points, rewards, sync – real PostgreSQL via PGlite
```
