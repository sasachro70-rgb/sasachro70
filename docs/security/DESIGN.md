# Family Game Hub – accounts, rooms and profile linking: security design

Status: **design + database layer**. The schema, RLS policies and database functions in
`supabase/migrations/0001_family_hub_security.sql` are implemented and tested against a real Postgres
engine (see "How this is tested"). The browser app does **not** talk to Supabase yet; that step needs a
Supabase project (URL + anon key) and is described at the end.

## 1. Goals

* Adults sign in with a permanent account (Supabase Auth) and open the same family and profiles on any device.
* Children and visitors join a game room with a room code, without a permanent account.
* A guest's profile, scores and history can be moved into a family when an adult of that family approves.
* The database, not the app, decides who may read or change what. Hiding a button is never the protection.

## 2. Data model

Three kinds of identity are kept apart:

| Kind | Table | Key | Notes |
|---|---|---|---|
| **Auth identity** (who signs in) | `auth.users` (Supabase) | `auth.uid()` | Permanent accounts and Supabase *anonymous* users (guests). A guest is a real, signed JWT with `is_anonymous = true`, so it can be verified and limited. |
| **Player profile** (who plays) | `player_profiles` | `id uuid` | Nickname, avatar, progress. The nickname is only a label, never a key. A child profile has no login of its own. |
| **Family membership** (who belongs where) | `family_members` | `(family_id, user_id)` | Role per family: `owner`, `manager`, `member`. Roles are read from this table on every check. |

```
families ─┬─< family_members >── auth.users
          ├─< player_profiles ─< profile_managers >── auth.users   (adults assigned to a child)
          ├─< rooms ─┬─< room_invites            (hashed codes, expiry, max uses, revoke)
          │          ├─< room_participants      (who joined, as which profile, left_at)
          │          └─< game_sessions ─┬─< session_turns    (questions; answers written only by submit_answer)
          │                             ├── private.answer_keys (right answers; clients can never read them)
          │                             └─< results          (written only by finish_session)
          └─< audit_log                           (link, unlink, role changes, score corrections)
private.room_code_pepper, private.join_attempts    (no client access at all)
```

Every score row carries `profile_id`, `session_id` and `family_id`, all checked by the function that writes it.

## 3. Roles

| Role | Where it comes from | Can | Cannot |
|---|---|---|---|
| **Family Owner** | `family_members.role = 'owner'` | Manage the family, members, roles, all child profiles, approve profile links, correct scores (logged) | Read other families |
| **Family Manager (adult)** | `role = 'manager'` | Create child profiles; manage the profiles assigned to them in `profile_managers`; host rooms | Change roles, manage unassigned profiles |
| **Family Member** | `role = 'member'` | Read their own family's profiles and results; play | Manage profiles or members |
| **Room Host** | `rooms.host_user_id` | Create/revoke invites, start and finish sessions in their room | Read data of a family they do not belong to |
| **Room Participant** | `room_participants` row with `left_at is null` | See their room, submit **their own** answers | Change anyone's answers or the final scores |
| **Guest** | Supabase anonymous user | Join a room with a valid code, play as their guest profile | Create families, invites or anything for permanent members |
| **System service** | `service_role` on the server only | Maintenance jobs | Never shipped to the browser |

The app may show or hide buttons by role, but every function re-reads the role from the database.

## 4. Threat model

| # | Threat | Protection |
|---|---|---|
| T1 | Guessing a room code | 10 characters from a 32-letter alphabet (~50 bits) from Postgres' secure random generator; codes expire (default 2 h), have a use limit, and wrong tries are limited per user (5 per 10 min) |
| T2 | A stolen database dump reveals live codes | Only `sha256(pepper ‖ code)` is stored; the pepper sits in a schema clients cannot read |
| T3 | A room code used as a password or admin key | Joining only adds a `room_participants` row; it never grants family membership or roles |
| T4 | Reading another family's data | RLS on every table; membership checked in `is_family_member()` |
| T5 | Seeing members or history before joining | `join_room()` returns only the room id; room data is readable only once the caller is a participant |
| T6 | Taking over a profile that already has an owner by "linking" it | Linking needs a request from the guest who owns the profile **and** approval by an owner/manager of the target family; profiles already in a family are refused, never merged |
| T7 | Sending fake scores | Clients cannot write `session_turns.answer*` or `results`; `submit_answer()` checks the answer against a hidden key and the server clock; `finish_session()` computes totals itself |
| T8 | Replaying or double-sending a result | `submit_answer()` takes an idempotency key and accepts one answer per turn; `finish_session()` is idempotent |
| T9 | A member who left still acting | Every function checks `left_at is null` / `revoked_at is null` at the moment of the call |
| T10 | Trusting a role sent by the app | Functions never take a role as input; roles come from tables |
| T11 | Leaked `service_role` key | Never in the frontend; the browser uses only the anon key, which RLS limits |
| T12 | Realtime leaking events to other rooms | Private channels named `room:<id>` with an RLS policy on `realtime.messages` that checks room participation |
| T13 | Silent data loss on conflicts | Linking stops with an error on any conflict; nothing is deleted or overwritten automatically |

Known limits (accepted, not solved):
* In the flag game the flag picture itself identifies the answer, so a player who inspects the app's data can look it up.
  The server still stops forged points, replays and answering for others, but cannot stop looking things up.
* The host prepares the questions for a session (`start_session`). The database checks that every right answer is
  one of the choices and that every player is in the room, but a host could give easier questions to some players.
  The host is a trusted adult of the family.
* Rate limiting is per account. Someone who creates many anonymous accounts gets 5 tries per account; an
  IP-based limit needs an Edge Function or Supabase's own auth rate limits.
* Adding a second adult to a family uses the adult's account id; an e-mail invitation flow is not built yet.

The tests were also checked against nine deliberately introduced holes (for example "expired codes still work",
"answers can be replayed", "families readable by everyone"); every hole made the matching test fail.

## 5. RLS overview

RLS is enabled on every table in `public`. Clients get `SELECT` through policies; most writes go through
`SECURITY DEFINER` functions with a fixed `search_path`, which check permissions themselves.

| Table | SELECT | INSERT / UPDATE / DELETE by clients |
|---|---|---|
| families | members of the family | insert via `create_family()` only; update by owner |
| family_members | members of the same family | via `set_member_role()` / `remove_member()` (owner) |
| player_profiles | family members; a guest sees their own guest profile | create via `create_child_profile()` / `create_guest_profile()`; update by owner or assigned manager |
| profile_managers | family members | owner only |
| rooms | host, participants, members of the room's family | via `create_room()` |
| room_invites | host only (code hash never leaves the database in clear text) | via `create_room_invite()` / `revoke_room_invite()` |
| room_participants | participants of the same room, family members | via `join_room()` / `leave_room()` |
| game_sessions, session_turns | participants and family members | via `start_session()`, `submit_answer()`, `finish_session()` |
| results | family members, participants of the session | none; `finish_session()` and `adjust_score()` only |
| audit_log | family owner | none (written by functions) |
| private.* | nobody (no grants) | nobody |

## 6. How this is tested

`supabase/tests/security.test.js` loads the migration into **PGlite** (real PostgreSQL 16 compiled to
WebAssembly) and adds a small stand-in for Supabase's `auth` schema (`auth.uid()` and `auth.jwt()` read
`request.jwt.claims`, exactly as in Supabase). Every test switches to the real `authenticated` or `anon`
database role and calls tables and functions directly, without the app, so hidden buttons play no part.

What this does **not** cover, and must be checked on a real Supabase project:
* Supabase Auth itself (sign-in, anonymous sign-in, email linking, session expiry and sign-out).
* Realtime authorization (the `realtime.messages` policy is included but only applied when that schema exists).
* Edge Functions (none are needed for the database checks; an IP-based rate limit would need one).
* PostgREST's exposure of functions and views.

## 7. The app side (built) and what still needs a real project

Built in `online.html` and `js/online/`:

| File | Role |
|---|---|
| `config.js` | Project URL and **anon** key. Empty by default, so online play is off and nothing is downloaded. |
| `supabase-client.js` | Loads supabase-js (pinned 2.45.4) only when configured; refuses service_role / secret keys. |
| `auth-service.js` | Sign up, sign in, sign-in link, guest (anonymous) sign-in, keep a guest's progress (adds e-mail + password, same account id), password reset, sign out on this device or everywhere. Separate from games and family data. |
| `online-service.js` | Families, profiles, rooms, codes, sessions, answers, results and linking, only through the database functions and RLS-protected reads. Answers that cannot be sent wait on the device and are re-sent with the same idempotency key. |
| `online-ui.js` | The page: sign-in, family and children, link requests, rooms with a code shown once, revoke, players on the host's iPad, playing across devices, results. |

Tested:
* `supabase/tests/online-client.test.js` runs the real `online-service.js` against the migration in PGlite: a full game with a
  guest, a dropped connection and a lost reply (the answer counts once), results, linking, revoked codes.
* `tests/harness/two-devices.html` (test only, never loaded by the app) runs the real page on two "devices" side by side
  against one in-browser PGlite database. Checked by hand in the browser: sign-up, family, child, room code, guest joins with a
  wrong and a right code, a 2-round game across both devices, a direct call to play someone else's turn refused, results on
  both devices, link request and approval, guest keeps progress and signs in again, sign-out, layout at iPad width.

Still needs a real Supabase project (not testable here):
1. Create a project, enable **anonymous sign-ins** and e-mail sign-in, run the migration (`supabase db push`).
2. Put the project URL and anon key into `js/online/config.js`.
3. Check by hand: e-mail confirmation, sign-in links, password reset, session expiry and refresh, sign-out everywhere,
   Realtime private channels (`room:<id>`), and that supabase-js 2.45.4 behaves like the stand-in used in the tests.
4. Optionally run the same SQL checks on the real database with `supabase test db` (pgTAP) – not written yet.

## 8. Points, rewards, learning progress and the parent PIN (migration 0002)

### Data model

| Table | Holds | Written by |
|---|---|---|
| `family_settings` | points rules (jsonb), time zone, parent PIN salt + hash | `save_point_rules`, `set_parent_pin`, `reset_parent_pin` |
| `profile_settings` | kind (child/adult), age, difficulty, daily goal, voice speed, archived | `save_profile_settings`, `archive_profile` |
| `point_transactions` | every change of points; unique `(family_id, key)` | `finish_activity`, `adjust_points`, `import_points`, `request_reward` (auto-approve), `decide_redemption` |
| `completed_units` | units finished once (for the replay rule) | `finish_activity` |
| `activity_log` | finished games and lessons with time and result | `finish_activity` |
| `rewards` | the family's rewards | `save_reward`, `delete_reward` (archives when there is history) |
| `reward_redemptions` | requests: pending / approved / rejected / cancelled | `request_reward`, `cancel_redemption`, `decide_redemption` |
| `learning_state` | one versioned document per learner (courses, word cards, favourites) | `save_learning_state` |
| `private.parent_unlocks`, `private.pin_attempts` | PIN sessions and failed tries | `unlock_parent` |

The balance is never stored. It is `sum(amount)` of `point_transactions`, which no client can insert, update or delete.

### Rules enforced by the database

| # | Threat | Protection |
|---|---|---|
| P1 | A child edits its points | No write grants on any table; only the functions above write, and they compute amounts themselves |
| P2 | Forged game results ("I got 9999 right") | `finish_activity` clamps every number, applies the family's rules, a per-activity cap and a per-day cap; unknown kinds earn 0 |
| P3 | Replaying the same result / double-tap / lost reply | Every activity has a key; `(family_id, key)` is unique, a second call returns `duplicate` and pays nothing |
| P4 | Farming one easy lesson | `completed_units`: a replay earns only the replay share (default 50 %) |
| P5 | Redeeming twice, overspending, negative balance | Requests reserve points; a second pending request for the same reward is refused; approval re-checks the balance under a row lock and spends once (key `redeem:<id>`); adjustments and imports may not go below the reserved amount |
| P6 | Rejected request still costs points | Rejection writes no transaction |
| P7 | A child on the parent's signed-in tablet opens parent functions | Parent functions need an owner/manager account **and** `unlock_parent` with the PIN within the last 15 minutes; 5 wrong PINs in 10 minutes block that account; the PIN hash is not readable (column grant) |
| P8 | Another family's data | RLS `is_family_member()` on every table; functions check the profile's family |
| P9 | Overwriting progress from another device | `save_learning_state` refuses an old revision and returns the current document; the app merges and retries |
| P10 | A guest or member manages rewards | `require_parent` reads the role from `family_members` |

Known limits: a client can still *claim* to have finished a game it did not play. The caps (per activity and per day,
set by the parent) bound what that can earn; full prevention would need every game to run on the server.
Without a family account all of this runs in the browser (`js/family/ledger.js`) with the same rules; a child with
browser developer tools could change local data. The PIN then only keeps children out of the dashboard.

### Migration and rollback

* 0002 only adds objects; nothing in 0001 changes. Run it after 0001 (`supabase db push`).
* A device's existing local data is uploaded once by a parent ("Upload this device's data" in the dashboard):
  profiles are created with `create_child_profile`, local transactions go in with `import_points` (idempotent, keys
  prefixed `import:`), rewards with `save_reward`, progress with `save_learning_state`. Until then the device keeps its
  local history next to the server's.
* Rollback: `drop function` for the 17 public functions and the private helpers of 0002, `drop table` for its 8 public and 2 private tables,
  in reverse order. 0001 keeps working.

### How this is tested

`supabase/tests/points.test.js` (11 tests) and `supabase/tests/family-sync.test.js` (two devices, upload, earn,
redeem, approve, merge) run the migrations in PostgreSQL as the real `authenticated` role. See `docs/TEST_REPORT.md`.

## 9. Accounts, approval, roles and permissions (migration 0003)

Additive: no table, policy or function from 0001/0002 is changed. Tests: `supabase/tests/accounts.test.js` (A1–A8).

**Tables.** `app_accounts` (one row per person = auth user id; `account_no` is the short Account ID; `role`
super_admin / admin / teacher / parent / student / user; `status` pending / approved / rejected / suspended / deactivated),
`permissions` (catalogue of 14 keys), `admin_permissions` (per Admin), `invitations` (only a SHA-256 hash of the token is
stored; single use; 1–30 days; revocable), `account_audit` (append-only: a trigger blocks UPDATE, DELETE and TRUNCATE, also
for SECURITY DEFINER functions and the table owner), `private.system_owner` (exactly one), `private.invite_attempts`.

**Who can do what.**

| Action | Needs |
|---|---|
| Create account (request access) | signed in, not a guest → status *pending* |
| Approve / reject a request | `users.approve` + the permission for the role (`families.manage`, `teachers.manage`, `students.manage`, `users.create`); Admin role never this way |
| Invite | permission for the role; Admin invitations only by the System Creator |
| Suspend / re-activate / deactivate | `users.suspend` |
| Change role | `users.edit` + permission for the new role; to/from Admin only the System Creator |
| Set an Admin's permissions | System Creator only; `admins.manage` can never be granted |
| Read accounts / invitations | own row, or `users.view` (token hash never readable) |
| Read the security log | `security.manage` (System Creator always) |
| Set or move the System Creator | only `private.set_system_owner(email)` in the Supabase SQL Editor |

Always: nobody acts on their own account (except name/language), nobody acts on the System Creator through the API,
Admins never act on other Admins, permissions are re-read from the tables on every call, so suspending an Admin removes
their rights at the next request. Invitation guessing: 5 wrong tokens per 15 minutes per user.

**Existing data.** Every adult already in `family_members` gets an *approved* `parent` account during the migration.

**Not yet enforced (next step, needs its own approval).** The 0001/0002 functions (families, rooms, points, rewards,
learning) do not check `is_approved()` yet, so a signed-in but unapproved account can still create its own family.
Enforcing it means adding `public.is_approved()` to those functions and policies.

**Limits.** Supabase Auth itself handles passwords (bcrypt), sign-in rate limits and failed-login logs (Dashboard →
Logs → Auth); `record_login()` adds a "login" entry to `account_audit` at most every 10 minutes. Ending the sessions of a
suspended account in Supabase Auth needs the service key; the database already refuses everything at the next request.

**Rollback.** `supabase/rollback/0003_rollback.sql` drops only what 0003 created (export `app_accounts` and
`account_audit` first if you need them). Tested in A8: families, profiles and points keep working, and 0003 can be applied again.

## 10. Classes, Student Mode and closed family creation (migration 0004)

Tests: `supabase/tests/classes.test.js` (C1–C7), `tests/school.test.js`.

* **Family creation closed.** `create_family()` now refuses everyone except the System Creator (`family_creation_closed`).
  Existing families, members, profiles, points, rewards and progress are unchanged. The rollback restores the old function.
* **Classes.** `create_class(name, count | names)` for approved teachers (role `teacher`), the System Creator and Admins with
  `classes.manage`. A class gets a unique 6-character code; students get numbers 1, 2, 3 … and a random 4-digit PIN, stored as
  salt + 1000× SHA-256 (same as the parent PIN). PINs are returned once (login cards); a reset makes a new PIN and ends every
  device session of that student. Teachers see only their own classes (RLS `can_teach`); PIN columns are never readable.
* **Student sign-in.** The device signs in anonymously (Supabase), then `student_login(code, number, PIN)` binds that device
  session to the student (`student_sessions`). Permanent accounts cannot become students. Wrong code, number or PIN all answer
  `wrong`; 5 wrong PINs for one student or 20 wrong tries from one device in 15 minutes → `too_many_attempts`.
* **Progress.** `student_save_progress(document, revision)` – a stale revision returns the server copy, which the device merges
  (best results and newest cards from both) and saves again; `student_record_activity(key, …)` stores each finished lesson once,
  with clamped numbers. Students never read tables; everything goes through `student_me()` and the functions above.
* **On the device** (`js/school/student-sync.js`): the student is a normal local learner, so all games and lessons work
  unchanged; changes are saved automatically; logging out saves, ends the session and removes the student's local copy
  (shared school iPads).
* **Supabase setting to check:** anonymous sign-ins are rate limited per IP (Authentication → Rate Limits). A whole class
  signing in from one school network needs a higher limit than the default.
* **Rollback:** `supabase/rollback/0004_rollback.sql`.
