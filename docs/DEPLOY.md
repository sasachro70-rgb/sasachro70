# Deploying · ขั้นตอน Deploy

## 1. GitHub Pages (the site)

The site is plain HTML, CSS and JavaScript with relative paths: there is no build step and no environment variables in the browser code.

1. Put all files of this folder into the repository `sasachro70-rgb/sasachro70`, branch `feature/family-game-hub`
   (or merge that branch into `main`). Keep the folder structure (`css/`, `js/`, `content/`, `docs/`, `supabase/`, `tests/`).
   * With git: `git add -A && git commit -m "Family learning platform" && git push`
   * In the browser: GitHub → *Add file → Upload files* → drag the **folders** in (GitHub keeps the structure).
2. GitHub → *Settings → Pages* → *Deploy from a branch* → choose the branch, folder `/ (root)` → Save.
3. After 1–2 minutes open `https://sasachro70-rgb.github.io/sasachro70/`. Check: hub start page, KeyKids, `kids.html`,
   `academy.html`, `parent.html`. Existing players, KeyKids learners and points are linked automatically on first open
   (nothing is deleted).
4. Do not upload `node_modules/` (already in `.gitignore`).

## 2. Without a family account

Works immediately. Data is saved in each browser (localStorage). Use *Parent Dashboard → Settings → Download a backup* now and then.
Limits: no sync between devices; a child who knows browser developer tools could change local data.

## 3. With a family account (Supabase) – sync between iPad, iPhone, tablet and computer

1. Create a project at supabase.com (free tier is enough). *Authentication → Providers*: enable **Email** and **Anonymous sign-ins** (for guest rooms).
2. Run the migrations in order: `supabase db push`, or paste `supabase/migrations/0001_family_hub_security.sql`, then
   `0002_points_rewards_learning.sql`, then `0003_accounts_access_control.sql` into *SQL Editor* and run each once.
   After 0003: create your own account in the app (`online.html` → New account, confirm the e-mail), then run once in the
   SQL Editor `select private.set_system_owner('your-email');` – that account becomes the System Creator (Super Admin).
   The same command moves ownership later. Undo 0003 only with `supabase/rollback/0003_rollback.sql`.
   Then run `0004_classes_students.sql` once (classes and Student Mode; closes new family creation). Check
   *Authentication → Rate Limits → anonymous sign-ins*: a whole class signing in from one school network needs more than the default.
   Teachers: ask for access on `teacher.html`, approve them as *teacher* (or invite them). Students sign in on `student.html`.
3. *Settings → API*: copy the **Project URL** and the **anon / publishable** key into `js/online/config.js`.
   Never use the `service_role` / secret key; the app refuses it.
4. *Authentication → URL Configuration*: add `https://sasachro70-rgb.github.io/sasachro70/` as Site URL / redirect URL.
5. Open `online.html`, create the parent account and the family.
6. Open `parent.html`, enter the PIN (the same PIN is now also set on the server the first time) → *Settings → Upload this
   device's data to the family account* (once per device that has old data).
7. On every other device: open `online.html`, sign in with a family account, then use the hub as usual.
   A child's tablet can be signed in with a **member** account (role `member`): it can play and ask for rewards but can never manage rewards or points.

## 4. External services and APIs

| Service | Needed for | Required? |
|---|---|---|
| GitHub Pages | hosting | yes |
| Supabase (Auth, Postgres, optionally Realtime) | accounts, sync, server-checked points | only for multi-device sync and online rooms |
| `cdn.jsdelivr.net` (supabase-js 2.45.4) | loaded only when Supabase is configured | with Supabase |
| Google Fonts (Fredoka, Mali) | KeyKids look; falls back to system fonts | no |
| Browser Web Speech API – speech synthesis | reading words aloud; depends on the voices installed on the device (Thai, Swedish, English, Spanish) | no – the word is shown when a voice is missing |
| Google Cloud Text-to-Speech (through the Supabase Edge Function `tts`) | natural Thai voice on devices without a Thai voice | recommended – see "Thai cloud voice" below; the key stays on the server |
| Google Fonts (Noto Sans, Noto Sans Thai Looped) | Pasathai look; falls back to system fonts | no |
| Browser Web Speech API – speech recognition | “Speak and repeat” check (Chrome, Edge, Safari 14.5+ partly) | no – “I said it” button otherwise; it compares text, it does not grade pronunciation |

No AI service and no analytics are used. Nothing is sent anywhere unless Supabase is configured. The only service that can cost money is Google Cloud Text-to-Speech, and only above its monthly free amount; the Edge Function has daily limits so it stays inside it (see below).

## 5. After deploying – checklist

* [ ] Start page shows “Learning & rewards” with Kids area, Adult Language Academy, Parents
* [ ] Old players and KeyKids learners appear under Parent Dashboard → Profiles, KeyKids points shown as “Points from before”
* [ ] A game in the Kids area adds points; a reward request appears under Requests; approving lowers the balance once
* [ ] On iPad: the voice reads Thai/Swedish/Spanish words (install voices in *Settings → Accessibility → Spoken Content → Voices* if missing)
* [ ] With Supabase: a second device signed in to the family shows the same balance after a few seconds


## Migration 0005 (homework and protected course content)

1. Supabase Dashboard → **SQL Editor** → paste `supabase/migrations/0005_homework_protected_content.sql` → **Run**.
   (It needs 0001–0004 first.) It also creates the private Storage bucket `submissions` and its two access rules.
2. Check: Storage → Buckets → `submissions` is **private**.
3. Protected course content (for example the BOOK 42 course) is loaded separately with a SQL file that is **not** in this repository
   (the repository is public). Paste that file into the SQL Editor and run it; run it again to update the content.
4. Undo: `supabase/rollback/0005_rollback.sql` (export the homework tables first if you want to keep them).


## Migration 0006 (Teacher Content Manager)

1. SQL Editor → paste `supabase/migrations/0006_content_manager.sql` → Run (needs 0005). It creates the private bucket `course-media`.
2. Teachers open **teacher.html → 📚 Course content** (`content.html`).
3. Undo: `supabase/rollback/0006_rollback.sql` (published courses stay).


## Migration 0007 and the Thai cloud voice (important: Thai audio on every device)

Many computers (Windows, Chromebooks, some Android tablets) have **no Thai voice**. Without one, Thai words cannot be read aloud.
Pasathai therefore asks Google Cloud Text-to-Speech for a natural Thai voice through a small server function. The Google key is
kept on the server, every sentence is generated once and then reused for everybody, and daily limits stop unexpected costs.
Devices that already have a good Thai voice (iPad/iPhone "Kanya", Microsoft Edge "Premwadee/Niwat") keep using it.

1. **Database:** SQL Editor → paste `supabase/migrations/0007_thai_cloud_voice.sql` → Run. It creates the usage counter and the
   private Storage bucket `tts-cache` (only the server function can read or write it).
2. **Google key:**
   1. Go to console.cloud.google.com → create a project (e.g. "pasathai") → attach a billing account (Google requires one,
      even for the free amount).
   2. *APIs & Services → Library* → **Cloud Text-to-Speech API** → *Enable*.
   3. *APIs & Services → Credentials → Create credentials → API key*. Then *Edit key → API restrictions → Restrict key* →
      choose only **Cloud Text-to-Speech API** → Save. Never put this key in the website or in GitHub.
   4. Recommended: *Billing → Budgets & alerts* → a small budget (e.g. 5 USD) with e-mail alerts.
3. **Server function:** with the Supabase CLI (`npm i -g supabase` or `brew install supabase/tap/supabase`), from this folder:
   ```
   supabase login
   supabase link --project-ref fgnczbpqkopxemybmtij
   supabase secrets set GOOGLE_TTS_API_KEY=the-key-from-step-2
   supabase functions deploy tts --no-verify-jwt
   ```
   (Without the CLI: Supabase Dashboard → *Edge Functions → Deploy a new function* → name `tts` → paste
   `supabase/functions/tts/index.ts` → turn **off** "Verify JWT" → Deploy; then *Edge Functions → Secrets* → add `GOOGLE_TTS_API_KEY`.)
4. **Check:** open `admin.html` → *System check* → "Thai cloud voice" must be ✓ and shows the voice used
   (for example `th-TH-Chirp3-HD-Achernar`). In the Academy, *Practice → Voice settings → Thai voice* → "Listen to the cloud voice".
5. **Optional secrets:** `TTS_ALLOWED_ORIGINS` (other web addresses than https://sasachro70-rgb.github.io), `TTS_VOICE_TYPES`
   (default `Chirp3-HD,Neural2,Wavenet,Standard`), `TTS_VOICE` (one fixed voice), `TTS_USER_DAILY` (new characters per user/visitor
   per day, default 6000), `TTS_TOTAL_DAILY` (new characters per day for everybody, default 30000 ≈ 900 000 a month).
   Already generated sentences are free and do not count.
6. **Cost (check Google's pricing page, it can change):** Google lists a monthly free amount of 1 million characters for Chirp 3 HD
   and Neural2 voices and 4 million for Standard/WaveNet voices. The default total limit stays below 1 million a month. To make sure
   it can never pass the free amount, use `TTS_VOICE_TYPES=Standard` (4 million free) or lower `TTS_TOTAL_DAILY`.
7. Undo: `supabase/rollback/0007_rollback.sql` and `supabase functions delete tts`. The app then uses the device voices only.

Per device, *Voice settings → Thai voice* chooses **Automatic** (device voice, cloud when there is none – default),
**Natural cloud voice** (always) or **This device only**. When neither works, lesson pages show how to add a Thai voice for that
kind of device (iPad/iPhone, Android, Windows, Mac, Chromebook).


## Full setup order (new Supabase project)

1. Authentication → Providers: Email ON, **Anonymous sign-ins ON** (student login and guest rooms). Rate limits for anonymous
   sign-ins raised for school networks.
2. SQL Editor, in this order, each once: `0001` → `0002` → `0003` (then `select private.set_system_owner('your-email');`) → `0004`
   → `0005` → `0006` → `0007`.
3. Storage: `submissions`, `course-media`, `tts-cache` exist and are **private**.
4. The protected BOOK 42 course: run the separate SQL file (not in this repository).
5. Edge Function `tts` + secret `GOOGLE_TTS_API_KEY` (section above).
6. `js/online/config.js`: Project URL + publishable key. Authentication → URL Configuration: the GitHub Pages address.
7. `admin.html` → System check: everything ✓.
