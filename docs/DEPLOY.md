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
| Browser Web Speech API – speech recognition | “Speak and repeat” check (Chrome, Edge, Safari 14.5+ partly) | no – “I said it” button otherwise; it compares text, it does not grade pronunciation |

No paid API, no AI service and no analytics are used. Nothing is sent anywhere unless a family account is configured.

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
