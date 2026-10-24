# Family Game Hub

Family games for one shared iPad: players take turns ("pass the iPad"), every match is scored and timed, and
results go into a shared history. **KeyKids** (typing, spelling and flags for children aged 3–10) is part of the hub.

Open `index.html` (or the GitHub Pages address). It works offline and also when opened directly as a file.

## What is where

| Path | What it is |
|---|---|
| `index.html` | Hub start page: games, players, history, resume an unfinished match |
| `keykids.html` | KeyKids, unchanged except a proper HTML header (doctype, charset, viewport) and a link back to the hub |
| `js/hub-core.js` | Shared logic without any screen code: players, matches, turns, scoring, standings, history, game registry |
| `js/hub-ui.js` | Hub screens: home, players, match setup, pass-the-iPad turns with timer and pause, results, history |
| `js/games/flag-quiz.js` | Guess the Flag (levels: 3 different flags / 4 choices / 4 look-alike flags) |
| `js/data/countries.js` | 30 countries: names in Thai, Swedish and English, capitals, flag drawings, look-alike groups |
| `js/i18n.js` | Hub texts in Thai, Swedish and English |
| `css/hub.css` | Tablet-first layout, light and dark |
| `tests/` | Hub tests and the KeyKids regression test (`npm test`) |
| `supabase/` | Database design for accounts, rooms and profile linking, with security tests (`npm run test:security`) |
| `docs/security/DESIGN.md` | Data model, roles, threat model, RLS overview and known limits |

Saved data stays in the browser (`localStorage`): `fgh.v1` for the hub, `keykids.v1` for KeyKids.

## Adding a game

Create `js/games/<name>.js`, call `FGH.core.registerGame({...})` with `id`, `icon`, `name`, `desc`, `levels`,
`makeQuestion`, `isCorrect`, `questionHTML` and `answerText` (see the comment at the top of `js/hub-core.js`),
and add one `<script>` line to `index.html` after `flag-quiz.js`. Players, turns, timer, scoring and history then
work for the new game without other changes.

## Tests

```bash
npm install
npm test
npm run test:security
```

`npm test` needs no packages. `npm run test:security` uses PGlite (PostgreSQL in WebAssembly), installed by `npm install`.
