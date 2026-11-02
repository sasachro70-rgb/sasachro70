-- Family Game Hub, part 2: one points ledger for every game and lesson, rewards with parent approval,
-- learning progress that follows a learner across devices, and a parent PIN checked by the server.
-- Builds on 0001 (families, family_members, player_profiles, roles, audit). Nothing in 0001 is changed.
-- Same rules as 0001:
--   * clients only SELECT through RLS; every write goes through a SECURITY DEFINER function with a fixed search_path;
--   * roles are read from family_members on every call, never taken as input;
--   * the balance is never stored: it is the sum of point_transactions, which nobody can update or delete.
-- Design notes: docs/security/DESIGN.md, section 8.
--
-- Migration plan: additive only. New tables start empty; existing families, profiles, rooms and results are untouched.
-- A device's local history is uploaded once by a parent with import_points() (idempotent, see below).
-- Rollback: drop the objects created here (listed at the end of DESIGN.md section 8); 0001 keeps working.

-- ============================================================================================
-- Tables
-- ============================================================================================
create table public.family_settings (
  family_id uuid primary key references public.families on delete cascade,
  rules jsonb not null default '{}'::jsonb,
  time_zone text not null default 'Europe/Stockholm',
  pin_salt text,
  pin_hash text,
  updated_at timestamptz not null default now()
);

-- what the app needs to know about a learner beyond 0001's nickname and avatar; nothing more is stored about a child
create table public.profile_settings (
  profile_id uuid primary key references public.player_profiles on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  kind text not null default 'child' check (kind in ('child', 'adult')),
  age smallint check (age between 2 and 99),
  difficulty smallint not null default 0 check (difficulty between 0 and 4),
  goal_min smallint not null default 15 check (goal_min between 0 and 180),
  tts_rate numeric(3, 2) not null default 0.9 check (tts_rate between 0.5 and 1.3),
  archived boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  profile_id uuid not null references public.player_profiles on delete cascade,
  kind text not null check (kind in ('earn', 'spend', 'adjust', 'opening', 'refund')),
  amount int not null check (amount <> 0 and abs(amount) <= 100000),
  source text not null default '',
  key text not null check (char_length(key) between 3 and 120),
  note text not null default '' check (char_length(note) <= 200),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (family_id, key)
);
create index point_transactions_profile on public.point_transactions (profile_id, created_at);

-- units already completed once (for the "replay earns less" rule)
create table public.completed_units (
  profile_id uuid not null references public.player_profiles on delete cascade,
  unit text not null check (char_length(unit) <= 160),
  first_at timestamptz not null default now(),
  primary key (profile_id, unit)
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  profile_id uuid not null references public.player_profiles on delete cascade,
  key text not null check (char_length(key) between 3 and 120),
  area text not null check (area in ('keykids', 'hub', 'kids', 'kidslang', 'academy')),
  kind text not null check (char_length(kind) <= 20),
  title text not null default '' check (char_length(title) <= 120),
  ms int not null default 0 check (ms between 0 and 10800000),
  score int, max int, pct smallint check (pct between 0 and 100),
  points int not null default 0,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (family_id, key)
);
create index activity_log_profile on public.activity_log (profile_id, created_at);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text not null default '🎁' check (char_length(icon) <= 8),
  image text not null default '' check (char_length(image) <= 400000 and (image = '' or image ~ '^(data:image/(png|jpeg|webp|gif);base64,|https://)')),
  description text not null default '' check (char_length(description) <= 300),
  cost int not null check (cost between 1 and 1000000),
  per_child_limit int check (per_child_limit >= 0),
  total_limit int check (total_limit >= 0),
  starts_on date, ends_on date check (ends_on is null or starts_on is null or ends_on >= starts_on),
  active boolean not null default true,
  auto_approve boolean not null default false,
  profile_ids uuid[] not null default '{}',
  archived boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key,
  family_id uuid not null references public.families on delete cascade,
  profile_id uuid not null references public.player_profiles on delete cascade,
  reward_id uuid not null references public.rewards on delete restrict,
  reward_name text not null, reward_icon text not null, cost int not null check (cost > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  note text not null default '' check (char_length(note) <= 200),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz, decided_by uuid
);
create index reward_redemptions_open on public.reward_redemptions (profile_id, status);

-- learning progress (kids language course, adult academy, word review) as one versioned document per learner
create table public.learning_state (
  profile_id uuid primary key references public.player_profiles on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 400000),
  rev int not null default 0,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table private.parent_unlocks (
  user_id uuid not null, family_id uuid not null, until timestamptz not null,
  primary key (user_id, family_id)
);
create table private.pin_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null, family_id uuid not null, ok boolean not null, at timestamptz not null default now()
);
create index pin_attempts_recent on private.pin_attempts (user_id, family_id, at);

-- ============================================================================================
-- Helpers
-- ============================================================================================
create function private.default_rules() returns jsonb language sql immutable set search_path = '' as $$
  select '{"typing":10,"spellMax":100,"quizPerCorrect":2,"kidsLesson":20,"kidsPassBonus":10,"reviewPerWord":1,"reviewMax":20,
           "dailyGoalBonus":15,"repeatFactor":0.5,"maxPerActivity":150,"dailyCap":400}'::jsonb
$$;
create function private.rules(p_family uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select private.default_rules() || coalesce((select rules from public.family_settings where family_id = p_family), '{}'::jsonb)
$$;
create function private.family_day(p_family uuid, p_at timestamptz) returns date language sql stable security definer set search_path = '' as $$
  select (p_at at time zone coalesce((select time_zone from public.family_settings where family_id = p_family), 'Europe/Stockholm'))::date
$$;
create function private.profile_family(p_profile uuid) returns uuid language sql stable security definer set search_path = '' as $$
  select family_id from public.player_profiles where id = p_profile
$$;
create function public.point_balance(p_profile uuid) returns int language sql stable security definer set search_path = '' as $$
  select case when public.is_family_member(private.profile_family(p_profile))
              then coalesce((select sum(amount)::int from public.point_transactions where profile_id = p_profile), 0) end
$$;
create function private.balance(p_profile uuid) returns int language sql stable set search_path = '' as $$
  select coalesce((select sum(amount)::int from public.point_transactions where profile_id = p_profile), 0)
$$;
create function private.held(p_profile uuid) returns int language sql stable set search_path = '' as $$
  select coalesce((select sum(cost)::int from public.reward_redemptions where profile_id = p_profile and status = 'pending'), 0)
$$;
-- 1000 rounds of salted SHA-256; the PIN is short, so the real protection is the attempt limit below
create function private.pin_hash(p_salt text, p_pin text) returns text language plpgsql immutable set search_path = '' as $$
declare h bytea := convert_to(p_salt || ':' || p_pin, 'UTF8');
begin
  for i in 1..1000 loop h := sha256(h || convert_to(p_salt, 'UTF8')); end loop;
  return encode(h, 'hex');
end $$;
-- a parent action needs an owner/manager account AND the parent PIN entered on this account in the last 15 minutes
create function private.require_parent(p_family uuid) returns uuid language plpgsql stable set search_path = '' as $$
declare v_uid uuid := private.require_member();
begin
  if p_family is null or not public.is_family_admin(p_family) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not exists (select 1 from private.parent_unlocks where user_id = v_uid and family_id = p_family and until > now()) then
    raise exception 'pin_required' using errcode = '42501';
  end if;
  return v_uid;
end $$;
create function private.require_family_member(p_family uuid) returns uuid language plpgsql stable set search_path = '' as $$
declare v_uid uuid := private.require_member();
begin
  if p_family is null or not public.is_family_member(p_family) then raise exception 'not_allowed' using errcode = '42501'; end if;
  return v_uid;
end $$;
create function private.int_or(p jsonb, k text, lo int, hi int, dflt int) returns int language sql immutable set search_path = '' as $$
  select least(hi, greatest(lo, coalesce(case when jsonb_typeof(p -> k) = 'number' then floor((p ->> k)::numeric)::int end, dflt)))
$$;

-- ============================================================================================
-- Parent PIN
-- ============================================================================================
create function public.set_parent_pin(p_family uuid, p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_salt text := replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_family_admin(p_family) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_pin !~ '^[0-9]{4,8}$' then raise exception 'pin_format'; end if;
  if exists (select 1 from public.family_settings where family_id = p_family and pin_hash is not null) then perform private.require_parent(p_family); end if;
  insert into public.family_settings (family_id, pin_salt, pin_hash) values (p_family, v_salt, private.pin_hash(v_salt, p_pin))
  on conflict (family_id) do update set pin_salt = excluded.pin_salt, pin_hash = excluded.pin_hash, updated_at = now();
  perform private.audit(p_family, 'parent_pin_set', v_uid);
end $$;
-- forgotten PIN: only the owner, who can prove the account with its password, may clear it
create function public.reset_parent_pin(p_family uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member();
begin
  if public.family_role_of(p_family) is distinct from 'owner' then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.family_settings set pin_hash = null, pin_salt = null, updated_at = now() where family_id = p_family;
  delete from private.parent_unlocks where family_id = p_family;
  perform private.audit(p_family, 'parent_pin_reset', v_uid);
end $$;
-- 5 wrong PINs in 10 minutes block this account for that family. Answers with jsonb instead of raising,
-- so the failed attempt is recorded (an exception would roll the record back).
create function public.unlock_parent(p_family uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_set public.family_settings; v_until timestamptz := now() + interval '15 minutes';
begin
  if not public.is_family_admin(p_family) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if (select count(*) from private.pin_attempts where user_id = v_uid and family_id = p_family and not ok and at > now() - interval '10 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  select * into v_set from public.family_settings where family_id = p_family;
  if v_set.pin_hash is null then return jsonb_build_object('ok', false, 'error', 'no_pin'); end if;
  if private.pin_hash(v_set.pin_salt, coalesce(p_pin, '')) <> v_set.pin_hash then
    insert into private.pin_attempts (user_id, family_id, ok) values (v_uid, p_family, false);
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  insert into private.pin_attempts (user_id, family_id, ok) values (v_uid, p_family, true);
  insert into private.parent_unlocks values (v_uid, p_family, v_until) on conflict (user_id, family_id) do update set until = excluded.until;
  return jsonb_build_object('ok', true, 'until', v_until);
end $$;
create function public.lock_parent(p_family uuid) returns void
language sql security definer set search_path = '' as $$
  delete from private.parent_unlocks where user_id = auth.uid() and family_id = p_family
$$;

-- ============================================================================================
-- Profiles: settings and archiving (create with 0001's create_child_profile)
-- ============================================================================================
create function public.save_profile_settings(p_profile uuid, p_kind text, p_age int, p_difficulty int, p_goal int, p_tts numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_family uuid := private.profile_family(p_profile);
begin
  if v_family is null or not public.can_manage_profile(p_profile) then raise exception 'not_allowed' using errcode = '42501'; end if;
  insert into public.profile_settings (profile_id, family_id, kind, age, difficulty, goal_min, tts_rate)
  values (p_profile, v_family, case when p_kind = 'adult' then 'adult' else 'child' end, least(99, greatest(2, coalesce(p_age, 6))),
          least(4, greatest(0, coalesce(p_difficulty, 0))), least(180, greatest(0, coalesce(p_goal, 15))), least(1.3, greatest(0.5, coalesce(p_tts, 0.9))))
  on conflict (profile_id) do update set kind = excluded.kind, age = excluded.age, difficulty = excluded.difficulty, goal_min = excluded.goal_min,
    tts_rate = excluded.tts_rate, updated_at = now();
end $$;
-- a removed profile is archived: it disappears from lists, its points history stays complete
create function public.archive_profile(p_profile uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := private.profile_family(p_profile); v_uid uuid := private.require_parent(v_family);
begin
  insert into public.profile_settings (profile_id, family_id, archived) values (p_profile, v_family, true)
  on conflict (profile_id) do update set archived = true, updated_at = now();
  update public.reward_redemptions set status = 'rejected', note = 'profile removed', decided_at = now(), decided_by = v_uid where profile_id = p_profile and status = 'pending';
  perform private.audit(v_family, 'profile_archived', p_profile);
end $$;

-- ============================================================================================
-- Activities and points
-- ============================================================================================
-- The app reports what was finished; the server decides the points from the family's rules and caps.
-- The same key never pays twice. Adults and archived profiles get the activity logged but no points.
create function public.finish_activity(p_profile uuid, p_key text, p_unit text, p_area text, p_kind text, p_title text, p_ms int, p_meta jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_family uuid := private.profile_family(p_profile); v_uid uuid := private.require_family_member(v_family);
  r jsonb := private.rules(v_family); v_set public.profile_settings; v_repeat boolean := false; v_val numeric := 0; v_amount int;
  v_day date := private.family_day(v_family, now()); v_today int; v_room int; v_capped boolean := false; v_goal_bonus int := 0; v_minutes int;
  m jsonb := coalesce(p_meta, '{}'::jsonb);
  v_correct int := private.int_or(m, 'correct', 0, 50, 0); v_d int := private.int_or(m, 'd', 1, 4, 1); v_pct int := private.int_or(m, 'pct', 0, 100, 0);
  v_score int := private.int_or(m, 'score', 0, 100000, 0); v_stars int := private.int_or(m, 'stars', 0, 3, 0);
begin
  if p_key is null or char_length(p_key) not between 3 and 120 then raise exception 'bad_request'; end if;
  perform 1 from public.player_profiles where id = p_profile for update;   -- one award at a time per learner
  if exists (select 1 from public.activity_log where family_id = v_family and key = p_key) then
    return jsonb_build_object('ok', true, 'duplicate', true, 'amount', coalesce((select amount from public.point_transactions where family_id = v_family and key = 'act:' || p_key), 0));
  end if;
  select * into v_set from public.profile_settings where profile_id = p_profile;
  if p_unit is not null and p_unit <> '' then
    v_repeat := exists (select 1 from public.completed_units where profile_id = p_profile and unit = p_unit);
    if coalesce((m ->> 'completed')::boolean, true) then insert into public.completed_units (profile_id, unit) values (p_profile, left(p_unit, 160)) on conflict do nothing; end if;
  end if;
  if coalesce(v_set.kind, 'child') = 'child' and not coalesce(v_set.archived, false) and coalesce((m ->> 'points')::boolean, true) then
    v_val := case p_kind
      when 'typing' then case when v_stars >= 1 then (r ->> 'typing')::numeric else 0 end
      when 'spell' then least((r ->> 'spellMax')::numeric, v_score)
      when 'flags' then least((r ->> 'spellMax')::numeric, v_score)
      when 'quiz' then v_correct * (r ->> 'quizPerCorrect')::numeric * v_d
      when 'kidslesson' then (r ->> 'kidsLesson')::numeric + case when v_pct >= 80 then (r ->> 'kidsPassBonus')::numeric else 0 end
      when 'review' then least((r ->> 'reviewMax')::numeric, v_correct * (r ->> 'reviewPerWord')::numeric)
      else 0 end;
    if v_repeat then v_val := v_val * (r ->> 'repeatFactor')::numeric; end if;
    v_amount := greatest(0, round(least(v_val, (r ->> 'maxPerActivity')::numeric)))::int;
    if (r ->> 'dailyCap')::int > 0 then
      select coalesce(sum(amount), 0) into v_today from public.point_transactions
        where profile_id = p_profile and kind = 'earn' and private.family_day(v_family, created_at) = v_day;
      v_room := greatest(0, (r ->> 'dailyCap')::int - v_today);
      if v_amount > v_room then v_amount := v_room; v_capped := true; end if;
    end if;
  else
    v_amount := 0;
  end if;
  insert into public.activity_log (family_id, profile_id, key, area, kind, title, ms, score, max, pct, points, created_by)
  values (v_family, p_profile, p_key, p_area, left(coalesce(p_kind, ''), 20), left(coalesce(p_title, ''), 120), least(10800000, greatest(0, coalesce(p_ms, 0))),
          case when m ? 'score' then v_score end, case when m ? 'max' then private.int_or(m, 'max', 0, 100000, 0) end, case when m ? 'pct' then v_pct end, v_amount, v_uid);
  if v_amount > 0 then
    insert into public.point_transactions (family_id, profile_id, kind, amount, source, key, note, created_by)
    values (v_family, p_profile, 'earn', v_amount, left(p_kind, 20), 'act:' || p_key, left(coalesce(p_title, ''), 200), v_uid);
  end if;
  -- daily goal bonus, once per day, when the learner's minutes reach the goal set by a parent
  if coalesce(v_set.kind, 'child') = 'child' and coalesce(v_set.goal_min, 15) > 0 then
    select coalesce(sum(ms), 0) / 60000 into v_minutes from public.activity_log where profile_id = p_profile and private.family_day(v_family, created_at) = v_day;
    if v_minutes >= coalesce(v_set.goal_min, 15) and not exists (select 1 from public.point_transactions where family_id = v_family and key = 'dailygoal:' || p_profile || ':' || v_day) then
      v_goal_bonus := (r ->> 'dailyGoalBonus')::int;
      if v_goal_bonus > 0 then
        insert into public.point_transactions (family_id, profile_id, kind, amount, source, key, note, created_by)
        values (v_family, p_profile, 'earn', v_goal_bonus, 'dailygoal', 'dailygoal:' || p_profile || ':' || v_day, 'daily goal', v_uid);
      end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'amount', v_amount, 'bonus', v_goal_bonus, 'capped', v_capped, 'repeat', v_repeat);
end $$;

-- parent correction; never below what is reserved by waiting requests, so never negative
create function public.adjust_points(p_profile uuid, p_amount int, p_note text, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := private.profile_family(p_profile); v_uid uuid := private.require_parent(v_family);
begin
  if p_amount is null or p_amount = 0 or abs(p_amount) > 100000 then raise exception 'bad_amount'; end if;
  if coalesce(btrim(p_note), '') = '' then raise exception 'note_required'; end if;
  perform 1 from public.player_profiles where id = p_profile for update;
  if exists (select 1 from public.point_transactions where family_id = v_family and key = p_key) then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if private.balance(p_profile) + p_amount < private.held(p_profile) then raise exception 'would_go_negative'; end if;
  insert into public.point_transactions (family_id, profile_id, kind, amount, source, key, note, created_by)
  values (v_family, p_profile, 'adjust', p_amount, 'parent', p_key, left(btrim(p_note), 200), v_uid);
  perform private.audit(v_family, 'points_adjusted', p_profile, jsonb_build_object('amount', p_amount, 'note', p_note));
  return jsonb_build_object('ok', true);
end $$;

-- one-time upload of a device's history (opening balances and earlier entries); idempotent by key, the result may not be negative
create function public.import_points(p_profile uuid, p_entries jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := private.profile_family(p_profile); v_uid uuid := private.require_parent(v_family); e jsonb; n int := 0;
begin
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 5000 then raise exception 'bad_request'; end if;
  perform 1 from public.player_profiles where id = p_profile for update;
  for e in select * from jsonb_array_elements(p_entries) loop
    if (e ->> 'kind') not in ('earn', 'spend', 'adjust', 'opening') or coalesce((e ->> 'amount')::int, 0) = 0 then continue; end if;
    insert into public.point_transactions (family_id, profile_id, kind, amount, source, key, note, created_by, created_at)
    values (v_family, p_profile, e ->> 'kind', (e ->> 'amount')::int, left(coalesce(e ->> 'source', 'import'), 20), 'import:' || left(e ->> 'key', 110),
            left(coalesce(e ->> 'note', ''), 200), v_uid, least(now(), coalesce((e ->> 'at')::timestamptz, now())))
    on conflict (family_id, key) do nothing;
    if found then n := n + 1; end if;
  end loop;
  if private.balance(p_profile) < 0 then raise exception 'would_go_negative'; end if;
  perform private.audit(v_family, 'points_imported', p_profile, jsonb_build_object('rows', n));
  return n;
end $$;

create function public.save_point_rules(p_family uuid, p_rules jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_parent(p_family); k text; v_clean jsonb := '{}'::jsonb; v numeric;
begin
  for k in select jsonb_object_keys(private.default_rules()) loop
    if jsonb_typeof(p_rules -> k) = 'number' then
      v := (p_rules ->> k)::numeric;
      if v >= 0 then v_clean := v_clean || jsonb_build_object(k, case when k = 'repeatFactor' then least(1, v) else least(10000, round(v)) end); end if;
    end if;
  end loop;
  insert into public.family_settings (family_id, rules) values (p_family, v_clean)
  on conflict (family_id) do update set rules = excluded.rules, updated_at = now();
  perform private.audit(p_family, 'point_rules_saved', p_family, v_clean);
  return private.rules(p_family);
end $$;

-- ============================================================================================
-- Rewards and redemptions
-- ============================================================================================
create function public.save_reward(p_family uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_parent(p_family); v_id uuid := coalesce((p ->> 'id')::uuid, gen_random_uuid());
  v_ids uuid[] := coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p -> 'profileIds', '[]'::jsonb)) x), '{}');
begin
  if exists (select 1 from public.rewards where id = v_id and family_id <> p_family) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if exists (select 1 from unnest(v_ids) i where private.profile_family(i) is distinct from p_family) then raise exception 'not_allowed' using errcode = '42501'; end if;
  insert into public.rewards as rw (id, family_id, name, icon, image, description, cost, per_child_limit, total_limit, starts_on, ends_on, active, auto_approve, profile_ids, created_by)
  values (v_id, p_family, btrim(p ->> 'name'), coalesce(nullif(p ->> 'icon', ''), '🎁'), coalesce(p ->> 'image', ''), coalesce(p ->> 'description', ''),
          (p ->> 'cost')::int, (nullif(p ->> 'perChildLimit', ''))::int, (nullif(p ->> 'totalLimit', ''))::int, (nullif(p ->> 'startsOn', ''))::date, (nullif(p ->> 'endsOn', ''))::date,
          coalesce((p ->> 'active')::boolean, true), coalesce((p ->> 'autoApprove')::boolean, false), v_ids, v_uid)
  on conflict (id) do update set name = excluded.name, icon = excluded.icon, image = excluded.image, description = excluded.description, cost = excluded.cost,
    per_child_limit = excluded.per_child_limit, total_limit = excluded.total_limit, starts_on = excluded.starts_on, ends_on = excluded.ends_on,
    active = excluded.active, auto_approve = excluded.auto_approve, profile_ids = excluded.profile_ids, updated_at = now()
    where rw.family_id = p_family;
  perform private.audit(p_family, 'reward_saved', v_id);
  return v_id;
end $$;

create function public.delete_reward(p_reward uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := (select family_id from public.rewards where id = p_reward); v_uid uuid := private.require_parent(v_family);
begin
  if exists (select 1 from public.reward_redemptions where reward_id = p_reward and status = 'pending') then raise exception 'has_pending'; end if;
  if exists (select 1 from public.reward_redemptions where reward_id = p_reward) then
    update public.rewards set archived = true, active = false, updated_at = now() where id = p_reward;
    perform private.audit(v_family, 'reward_archived', p_reward);
    return jsonb_build_object('ok', true, 'archived', true);
  end if;
  delete from public.rewards where id = p_reward;
  perform private.audit(v_family, 'reward_deleted', p_reward);
  return jsonb_build_object('ok', true);
end $$;

-- Asking for a reward. Points are reserved, not spent; a parent's approval spends them (or auto-approval).
create function public.request_reward(p_profile uuid, p_reward uuid, p_request uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := private.profile_family(p_profile); v_uid uuid := private.require_family_member(v_family);
  rw public.rewards; v_day date := private.family_day(v_family, now()); v_set public.profile_settings;
begin
  perform 1 from public.player_profiles where id = p_profile for update;
  if exists (select 1 from public.reward_redemptions where id = p_request) then return jsonb_build_object('ok', false, 'error', 'duplicate'); end if;
  select * into rw from public.rewards where id = p_reward and family_id = v_family for update;
  select * into v_set from public.profile_settings where profile_id = p_profile;
  if rw.id is null or rw.archived then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if coalesce(v_set.kind, 'child') <> 'child' or coalesce(v_set.archived, false) then return jsonb_build_object('ok', false, 'error', 'not_for_you'); end if;
  if not rw.active then return jsonb_build_object('ok', false, 'error', 'inactive'); end if;
  if cardinality(rw.profile_ids) > 0 and not (p_profile = any (rw.profile_ids)) then return jsonb_build_object('ok', false, 'error', 'not_for_you'); end if;
  if rw.starts_on is not null and v_day < rw.starts_on then return jsonb_build_object('ok', false, 'error', 'not_started'); end if;
  if rw.ends_on is not null and v_day > rw.ends_on then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if rw.total_limit is not null and (select count(*) from public.reward_redemptions where reward_id = rw.id and status in ('pending', 'approved')) >= rw.total_limit then
    return jsonb_build_object('ok', false, 'error', 'sold_out'); end if;
  if rw.per_child_limit is not null and (select count(*) from public.reward_redemptions where reward_id = rw.id and profile_id = p_profile and status in ('pending', 'approved')) >= rw.per_child_limit then
    return jsonb_build_object('ok', false, 'error', 'limit_reached'); end if;
  if exists (select 1 from public.reward_redemptions where reward_id = rw.id and profile_id = p_profile and status = 'pending') then
    return jsonb_build_object('ok', false, 'error', 'pending_exists'); end if;
  if private.balance(p_profile) - private.held(p_profile) < rw.cost then return jsonb_build_object('ok', false, 'error', 'not_enough'); end if;
  insert into public.reward_redemptions (id, family_id, profile_id, reward_id, reward_name, reward_icon, cost, status, created_by, decided_at, decided_by)
  values (p_request, v_family, p_profile, rw.id, rw.name, rw.icon, rw.cost, case when rw.auto_approve then 'approved' else 'pending' end, v_uid,
          case when rw.auto_approve then now() end, case when rw.auto_approve then v_uid end);
  if rw.auto_approve then
    insert into public.point_transactions (family_id, profile_id, kind, amount, source, key, note, created_by)
    values (v_family, p_profile, 'spend', -rw.cost, 'reward', 'redeem:' || p_request, rw.name, v_uid);
  end if;
  return jsonb_build_object('ok', true, 'status', case when rw.auto_approve then 'approved' else 'pending' end);
end $$;

create function public.cancel_redemption(p_request uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_red public.reward_redemptions; v_uid uuid;
begin
  select * into v_red from public.reward_redemptions where id = p_request for update;
  v_uid := private.require_family_member(v_red.family_id);
  if v_red.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;
  update public.reward_redemptions set status = 'cancelled', decided_at = now(), decided_by = v_uid where id = p_request;
  return jsonb_build_object('ok', true);
end $$;

create function public.decide_redemption(p_request uuid, p_approve boolean, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_red public.reward_redemptions; v_uid uuid;
begin
  select * into v_red from public.reward_redemptions where id = p_request;
  v_uid := private.require_parent(v_red.family_id);
  perform 1 from public.player_profiles where id = v_red.profile_id for update;
  select * into v_red from public.reward_redemptions where id = p_request for update;
  if v_red.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;
  if p_approve then
    if private.balance(v_red.profile_id) - (private.held(v_red.profile_id) - v_red.cost) < v_red.cost then return jsonb_build_object('ok', false, 'error', 'not_enough'); end if;
    insert into public.point_transactions (family_id, profile_id, kind, amount, source, key, note, created_by)
    values (v_red.family_id, v_red.profile_id, 'spend', -v_red.cost, 'reward', 'redeem:' || v_red.id, v_red.reward_name, v_uid);
    update public.reward_redemptions set status = 'approved', decided_at = now(), decided_by = v_uid where id = p_request;
  else
    update public.reward_redemptions set status = 'rejected', note = left(coalesce(p_note, ''), 200), decided_at = now(), decided_by = v_uid where id = p_request;
  end if;
  perform private.audit(v_red.family_id, case when p_approve then 'reward_approved' else 'reward_rejected' end, v_red.id);
  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================================
-- Learning progress: one document per learner with a revision number. A write with an old revision is refused
-- and gets the current document back, so the app merges instead of overwriting another device's progress.
-- ============================================================================================
create function public.save_learning_state(p_profile uuid, p_data jsonb, p_rev int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := private.profile_family(p_profile); v_uid uuid := private.require_family_member(v_family); v_cur public.learning_state;
begin
  if jsonb_typeof(p_data) <> 'object' then raise exception 'bad_request'; end if;
  select * into v_cur from public.learning_state where profile_id = p_profile for update;
  if v_cur.profile_id is not null and coalesce(p_rev, -1) <> v_cur.rev then
    return jsonb_build_object('ok', false, 'error', 'stale', 'rev', v_cur.rev, 'data', v_cur.data);
  end if;
  insert into public.learning_state (profile_id, family_id, data, rev, updated_by) values (p_profile, v_family, p_data, 1, v_uid)
  on conflict (profile_id) do update set data = excluded.data, rev = public.learning_state.rev + 1, updated_by = v_uid, updated_at = now();
  return jsonb_build_object('ok', true, 'rev', coalesce(v_cur.rev, 0) + 1);
end $$;

-- ============================================================================================
-- Row level security and grants
-- ============================================================================================
alter table public.family_settings enable row level security;
alter table public.profile_settings enable row level security;
alter table public.point_transactions enable row level security;
alter table public.completed_units enable row level security;
alter table public.activity_log enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.learning_state enable row level security;

create policy family_settings_read on public.family_settings for select to authenticated using (public.is_family_member(family_id));
create policy profile_settings_read on public.profile_settings for select to authenticated using (public.is_family_member(family_id));
create policy point_transactions_read on public.point_transactions for select to authenticated using (public.is_family_member(family_id));
create policy completed_units_read on public.completed_units for select to authenticated using (public.is_family_member(private.profile_family(profile_id)));
create policy activity_log_read on public.activity_log for select to authenticated using (public.is_family_member(family_id));
create policy rewards_read on public.rewards for select to authenticated using (public.is_family_member(family_id));
create policy reward_redemptions_read on public.reward_redemptions for select to authenticated using (public.is_family_member(family_id));
create policy learning_state_read on public.learning_state for select to authenticated using (public.is_family_member(family_id));

revoke all on public.family_settings, public.profile_settings, public.point_transactions, public.completed_units, public.activity_log,
  public.rewards, public.reward_redemptions, public.learning_state from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.point_balance(uuid), public.set_parent_pin(uuid, text), public.reset_parent_pin(uuid), public.unlock_parent(uuid, text), public.lock_parent(uuid),
  public.save_profile_settings(uuid, text, int, int, int, numeric), public.archive_profile(uuid),
  public.finish_activity(uuid, text, text, text, text, text, int, jsonb), public.adjust_points(uuid, int, text, text), public.import_points(uuid, jsonb),
  public.save_point_rules(uuid, jsonb), public.save_reward(uuid, jsonb), public.delete_reward(uuid), public.request_reward(uuid, uuid, uuid),
  public.cancel_redemption(uuid), public.decide_redemption(uuid, boolean, text), public.save_learning_state(uuid, jsonb, int) from public, anon, authenticated;

-- the PIN salt and hash never leave the database
grant select (family_id, rules, time_zone, updated_at) on public.family_settings to authenticated;
grant select on public.profile_settings, public.point_transactions, public.completed_units, public.activity_log, public.rewards, public.reward_redemptions, public.learning_state to authenticated;
grant execute on function public.point_balance(uuid), public.set_parent_pin(uuid, text), public.reset_parent_pin(uuid), public.unlock_parent(uuid, text), public.lock_parent(uuid),
  public.save_profile_settings(uuid, text, int, int, int, numeric), public.archive_profile(uuid),
  public.finish_activity(uuid, text, text, text, text, text, int, jsonb), public.adjust_points(uuid, int, text, text), public.import_points(uuid, jsonb),
  public.save_point_rules(uuid, jsonb), public.save_reward(uuid, jsonb), public.delete_reward(uuid), public.request_reward(uuid, uuid, uuid),
  public.cancel_redemption(uuid), public.decide_redemption(uuid, boolean, text), public.save_learning_state(uuid, jsonb, int) to authenticated;
