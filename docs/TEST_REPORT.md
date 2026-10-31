# Test report – Thai course, voice settings, home page (31 Oct 2026)

All results below were produced by actually running the tests in the build sandbox on 31 Oct 2026.

| Suite | Command | Result |
|---|---|---|
| Existing family, KeyKids and hub tests (`family`, `keykids`, `hub`) | `npm test` | 22/22 pass (unchanged) |
| New: Thai course, voice logic, per-learner voice settings, home page texts (`tests/thai-voice.test.js`, 6 tests) | `npm test` | 6/6 pass |
| Database suites (security, online client, points, family sync) | `npm run test:security` | 32/32 pass (same PostgreSQL 16 adapter as below) |

Total: 28 + 32 = 60 tests pass.

**What the new tests check:** Level 1–5 each have lessons; every Thai word and line has Thai script, RTGS romanization and a Swedish
translation; polite particles are written without a space; Thai word-order answers have no spaces and rebuild from their tiles; every generated
exercise has its answer among the options; the tone lesson has the five tones สามัญ เอก โท ตรี จัตวา with คา ข่า ค่า ค้า ขา; สวัสดี = sawatdi = Hej
with the note “En vanlig hälsning på thailändska.”; Continue Learning and level tests work with Level 1–5; the Swedish course keeps A1–C1.
Voices: only voices of the asked language are listed (a Finnish voice is never offered for Swedish), main accent first, the chosen voice is
restored, a missing voice is replaced by the closest (name → accent + gender → accent → gender), never a voice of another language;
sentence splitting, pauses, Thai without added spaces, mixed Swedish/Thai text split by script; settings kept per learner, saved and loaded,
reset, merged from two devices (newer choice wins); an old speed-slider value is kept.

**Browser run (Chromium + Playwright, voices simulated with 7 named voices because the sandbox has none):** home page in English with hero,
Kids Zone, Academy, Parent Zone (summary hidden without PIN), 4 language cards, picker Thai → Swedish → `academy.html?course=th&explain=sv`,
a family game still opens; new adult learner → Thai course setup → tone lesson (graph with 5 curves, ขา read by the Thai voice at 0.85×, slow
button ≤ 0.6×) → greeting lesson (repeat ×3, speed changed to 1.25× inside the lesson, whole dialogue read line by line by the Thai voice)
→ all exercises answered → 100 %; voice screen lists Thai/Swedish/English/Spanish voices, select Niwat → saved for this learner → used after
reload → reset → default voice again; home page Continue Learning shows the learner, course, last lesson, % and words to review; switching
to the Swedish course and back keeps Thai progress; parent, kids, KeyKids and online pages render. Mobile 375 px: no horizontal scroll.
No JavaScript errors (only blocked external network in the sandbox). The earlier smoke scripts (points, rewards, KeyKids → ledger) still pass.

**Not tested here:** real voices on real devices (iPhone, Android, Windows) – how each device's Thai voice sounds and which voices exist
varies; the gender shown is guessed from known voice names. Thai content should be read through by a native speaker before wider use.

---

# Test report – Family learning platform (30 Oct 2026)

## Automated

| Suite | Command | Result |
|---|---|---|
| Family logic, content, texts, pages (`tests/family.test.js`, 11 tests) | `npm test` | 11/11 pass |
| KeyKids regression after the module split (`tests/keykids.test.js`) | `npm test` | pass |
| Hub (`tests/hub.test.js`, 10 tests) | `npm test` | 10/10 pass |
| Database security from 0001 (`supabase/tests/security.test.js`, 16) | `npm run test:security` | 16/16 pass |
| Online client from 0001 (`online-client.test.js`, 4) | `npm run test:security` | 4/4 pass |
| Points, rewards, PIN, learning state – 0002 (`points.test.js`, 11) | `npm run test:security` | 11/11 pass |
| Two devices end-to-end through `cloud-sync.js` (`family-sync.test.js`) | `npm run test:security` | pass |

Total: 22 + 32 = 54 tests pass.

Note on the environment: the npm registry was not reachable from the build sandbox, so PGlite could not be installed there.
The database suites were run against a real PostgreSQL 16 server through a small test-only adapter with PGlite's API
(not part of the repository). On your computer `npm install && npm run test:security` uses PGlite itself.

### What the tests cover (selection)

* **Existing system:** KeyKids layouts, lessons, spelling and flag logic unchanged; hub players, matches and history unchanged;
  migration links KeyKids learners and hub players by name, turns old KeyKids points into an opening balance, can run twice without doubling.
* **Rewards:** create/edit/validate, request reserves points, double request refused, per-child and total limits, start/end dates,
  only-for-some-children, auto-approve, approve spends once, second approve refused, reject spends nothing, never negative, archive instead of delete when there is history.
* **Points:** the same activity key never pays twice, forged numbers clamped, per-activity and per-day caps, replay share, adults earn nothing, daily-goal bonus once per day.
* **Security (server):** no table writes for any client, PIN hash unreadable, parent functions need owner/manager + PIN, 5 wrong PINs lock, other families and guests refused, rules sanitised.
* **Kids learning:** all 5 language pairs × 4 age bands × every lesson produce exercises with the right answer among the options; Thai sentences rebuild from their word breaks; all four languages present in every row.
* **Adult learning:** courses sv/en/es, A1–C1 present for Swedish, every text exists in each explanation language, level tests, continue-learning never restarts, spaced repetition intervals.
* **Database & sync:** upload of local history, sync to a second device, reward requested on one device and approved on another, progress merged from two devices, stale revisions refused.

## Browser checks (Chromium, Playwright)

* Viewports: iPhone 13 (390×844) and iPad (810×1080) for `index.html`, `keykids.html`, `kids.html`, `academy.html`, `parent.html`; 1024 px desktop.
  No horizontal scrolling on any page; no JavaScript errors (only blocked Google Fonts in the sandbox).
* Flows clicked through: kids word game (8 questions incl. spelling) → points; KeyKids lesson → points in the ledger and KeyKids shows the new total;
  kids language lesson (dialogue, reply, build); memory and maths; academy setup → lesson → all exercise types → dashboard;
  parent PIN → add child → two rewards → negative adjustment refused → +120 → child requests → second reward blocked by reserved points → parent approves → balance 70.

## Not tested here (needs real devices or a real Supabase project)

* Safari on a physical iPhone/iPad, Android tablet hardware (layout was checked with device emulation only).
* Which text-to-speech voices each device has; speech recognition accuracy.
* Supabase Auth e-mails, session refresh, Realtime (see DESIGN.md section 6).
