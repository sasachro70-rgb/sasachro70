-- Family Game Hub: families, profiles, rooms with codes, game sessions and scores, protected by RLS.
-- Design and threat model: docs/security/DESIGN.md.
-- Rules followed everywhere:
--   * clients (role "authenticated") may only SELECT through RLS policies; all writes go through the
--     SECURITY DEFINER functions below, which read roles from tables and never take a role as input;
--   * "anon" (not signed in) gets nothing;
--   * guests are Supabase anonymous users: role "authenticated" with the JWT claim is_anonymous = true.

-- ============================================================================================
-- Schemas, types
-- ============================================================================================
create schema if not exists private;
revoke all on schema private from public;

create type public.family_role as enum ('owner', 'manager', 'member');
create type public.room_status as enum ('open', 'closed');
create type public.session_status as enum ('playing', 'finished');

-- ============================================================================================
-- Tables
-- ============================================================================================
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families on delete cascade,
  user_id uuid not null,
  role public.family_role not null,
  added_by uuid,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- A player profile: a child or adult in a family, or a guest profile owned by an anonymous user.
-- The nickname is only a label; id is the permanent identifier.
create table public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families on delete restrict,
  guest_owner uuid,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 20),
  avatar text not null default '🙂' check (char_length(avatar) <= 16),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint profile_has_home check (family_id is not null or guest_owner is not null)
);

-- adults (managers) assigned to a child profile
create table public.profile_managers (
  profile_id uuid not null references public.player_profiles on delete cascade,
  user_id uuid not null,
  primary key (profile_id, user_id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  host_user_id uuid not null,
  game_id text not null check (game_id ~ '^[a-z0-9_-]{1,32}$'),
  status public.room_status not null default 'open',
  max_participants int not null default 8 check (max_participants between 1 and 20),
  created_at timestamptz not null default now()
);

-- Only the hash of a room code is stored. The code itself is shown once, to the host.
create table public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  code_hash bytea not null unique,
  expires_at timestamptz not null,
  max_uses int not null default 10 check (max_uses between 1 and 50),
  uses int not null default 0,
  revoked_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table public.room_participants (
  room_id uuid not null references public.rooms on delete cascade,
  user_id uuid not null,
  profile_id uuid references public.player_profiles,
  role text not null check (role in ('host', 'participant')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (room_id, user_id),
  constraint participant_has_profile check (role = 'host' or profile_id is not null)
);

-- Profiles playing on the host's own device (pass-and-play); the host answers for them.
create table public.room_local_players (
  room_id uuid not null references public.rooms on delete cascade,
  profile_id uuid not null references public.player_profiles,
  primary key (room_id, profile_id)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  game_id text not null,
  status public.session_status not null default 'playing',
  timer_sec int not null default 15 check (timer_sec between 0 and 120),
  started_by uuid not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.session_turns (
  session_id uuid not null references public.game_sessions on delete cascade,
  turn_no int not null check (turn_no >= 0),
  profile_id uuid not null references public.player_profiles,
  question jsonb not null,
  started_at timestamptz,
  answer text,
  correct boolean,
  points int,
  ms int,
  answered_at timestamptz,
  answered_by uuid,
  idempotency_key uuid unique,
  primary key (session_id, turn_no)
);

-- right answers: no client role can read this schema
create table private.answer_keys (
  session_id uuid not null,
  turn_no int not null,
  answer text not null,
  primary key (session_id, turn_no),
  foreign key (session_id, turn_no) references public.session_turns on delete cascade
);

create table public.results (
  session_id uuid not null references public.game_sessions on delete cascade,
  profile_id uuid not null references public.player_profiles,
  family_id uuid not null references public.families on delete cascade,
  score int not null,
  correct int not null,
  answered int not null,
  rank int not null,
  primary key (session_id, profile_id)
);

create table public.score_adjustments (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  profile_id uuid not null,
  delta int not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 200),
  by_user uuid not null,
  at timestamptz not null default now()
);

create table public.profile_link_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.player_profiles on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  requested_by uuid not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz
);
create unique index one_pending_link_per_profile on public.profile_link_requests (profile_id) where status = 'pending';

create table public.audit_log (
  id bigint generated always as identity primary key,
  family_id uuid,
  actor uuid,
  action text not null,
  target uuid,
  details jsonb not null default '{}',
  at timestamptz not null default now()
);

create table private.room_code_pepper (
  id int primary key default 1 check (id = 1),
  pepper bytea not null
);
insert into private.room_code_pepper (pepper)
values (decode(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 'hex'));

create table private.join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index join_attempts_recent on private.join_attempts (user_id, at);

-- ============================================================================================
-- Permission helpers (SECURITY DEFINER so policies can use them without recursion)
-- ============================================================================================
create function public.is_guest() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

create function public.family_role_of(p_family uuid) returns public.family_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.family_members m where m.family_id = p_family and m.user_id = auth.uid()
$$;

create function public.is_family_member(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m where m.family_id = p_family and m.user_id = auth.uid())
$$;

create function public.is_family_admin(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m
                 where m.family_id = p_family and m.user_id = auth.uid() and m.role in ('owner', 'manager'))
$$;

create function public.is_room_participant(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_participants p
                 where p.room_id = p_room and p.user_id = auth.uid() and p.left_at is null)
$$;

create function public.can_see_room(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rooms r
                 where r.id = p_room
                   and (r.host_user_id = auth.uid() or public.is_room_participant(r.id) or public.is_family_member(r.family_id)))
$$;

-- a profile is visible to its family, its guest owner, and to people in the same room (after joining)
create function public.can_see_profile(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.player_profiles pp
    where pp.id = p_profile
      and (public.is_family_member(pp.family_id)
           or pp.guest_owner = auth.uid()
           or exists (select 1 from public.room_participants rp
                      join public.room_participants me on me.room_id = rp.room_id and me.user_id = auth.uid() and me.left_at is null
                      where rp.profile_id = pp.id and rp.left_at is null)
           or exists (select 1 from public.room_local_players lp
                      join public.room_participants me on me.room_id = lp.room_id and me.user_id = auth.uid() and me.left_at is null
                      where lp.profile_id = pp.id)))
$$;

create function public.can_manage_profile(p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.player_profiles pp
    where pp.id = p_profile
      and ((pp.family_id is not null and public.family_role_of(pp.family_id) = 'owner')
           or (pp.family_id is not null and public.family_role_of(pp.family_id) = 'manager'
               and exists (select 1 from public.profile_managers pm where pm.profile_id = pp.id and pm.user_id = auth.uid()))
           or (pp.family_id is null and pp.guest_owner = auth.uid())))
$$;

-- Realtime: may this user use the private channel "room:<uuid>"?
create function public.room_topic_allowed(p_topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_room uuid;
begin
  if p_topic is null or p_topic !~ '^room:[0-9a-f-]{36}$' then return false; end if;
  v_room := substr(p_topic, 6)::uuid;
  return public.is_room_participant(v_room)
      or exists (select 1 from public.rooms r where r.id = v_room and r.host_user_id = auth.uid());
end $$;

create function private.require_member() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if public.is_guest() then raise exception 'permanent_account_required' using errcode = '42501'; end if;
  return auth.uid();
end $$;

create function private.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  return auth.uid();
end $$;

create function private.audit(p_family uuid, p_action text, p_target uuid, p_details jsonb default '{}')
returns void language sql set search_path = '' as $$
  insert into public.audit_log (family_id, actor, action, target, details) values (p_family, auth.uid(), p_action, p_target, p_details)
$$;

-- 10 characters from 32 letters/digits (no 0, O, 1, I): 50 random bits from the database's secure generator.
-- Only the fully random first bytes of each v4 UUID are used, and 256 % 32 = 0, so there is no bias.
create function private.new_room_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  b bytea := substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 6)
          || substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 4);
  out text := '';
begin
  for i in 0..9 loop out := out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1); end loop;
  return out;
end $$;

create function private.hash_room_code(p_code text) returns bytea
language sql stable set search_path = '' as $$
  select sha256((select pepper from private.room_code_pepper where id = 1)
                || convert_to(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8'))
$$;

-- ============================================================================================
-- Families and profiles
-- ============================================================================================
create function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_id uuid;
begin
  insert into public.families (name, created_by) values (btrim(p_name), v_uid) returning id into v_id;
  insert into public.family_members (family_id, user_id, role, added_by) values (v_id, v_uid, 'owner', v_uid);
  perform private.audit(v_id, 'family_created', v_id);
  return v_id;
end $$;

-- Adding an adult: the owner enters the other adult's account id (shared by that adult from their own
-- signed-in device). An e-mail invitation flow would need an Edge Function; see DESIGN.md.
create function public.set_member_role(p_family uuid, p_user uuid, p_role public.family_role) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_old public.family_role;
begin
  if public.family_role_of(p_family) is distinct from 'owner' then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_user = v_uid and p_role <> 'owner' then raise exception 'owner_cannot_demote_self'; end if;
  select role into v_old from public.family_members where family_id = p_family and user_id = p_user;
  insert into public.family_members (family_id, user_id, role, added_by) values (p_family, p_user, p_role, v_uid)
  on conflict (family_id, user_id) do update set role = excluded.role;
  perform private.audit(p_family, 'role_changed', p_user, jsonb_build_object('from', v_old, 'to', p_role));
end $$;

create function public.remove_member(p_family uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member();
begin
  if public.family_role_of(p_family) is distinct from 'owner' or p_user = v_uid then raise exception 'not_allowed' using errcode = '42501'; end if;
  delete from public.family_members where family_id = p_family and user_id = p_user;
  delete from public.profile_managers pm using public.player_profiles pp where pm.profile_id = pp.id and pp.family_id = p_family and pm.user_id = p_user;
  perform private.audit(p_family, 'member_removed', p_user);
end $$;

create function public.create_child_profile(p_family uuid, p_name text, p_avatar text default '🙂') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_role public.family_role := public.family_role_of(p_family); v_id uuid;
begin
  if v_role is null or v_role = 'member' then raise exception 'not_allowed' using errcode = '42501'; end if;
  insert into public.player_profiles (family_id, display_name, avatar, created_by) values (p_family, btrim(p_name), p_avatar, v_uid) returning id into v_id;
  if v_role = 'manager' then insert into public.profile_managers values (v_id, v_uid); end if;
  perform private.audit(p_family, 'profile_created', v_id);
  return v_id;
end $$;

create function public.assign_profile_manager(p_profile uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_family uuid;
begin
  select family_id into v_family from public.player_profiles where id = p_profile;
  if v_family is null or public.family_role_of(v_family) is distinct from 'owner' then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.family_members where family_id = v_family and user_id = p_user and role = 'manager') then raise exception 'not_a_manager'; end if;
  insert into public.profile_managers values (p_profile, p_user) on conflict do nothing;
  perform private.audit(v_family, 'manager_assigned', p_profile, jsonb_build_object('user', p_user));
end $$;

-- guests (and signed-in users) can have up to 5 guest profiles of their own
create function public.create_guest_profile(p_name text, p_avatar text default '🙂') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_id uuid;
begin
  if (select count(*) from public.player_profiles where guest_owner = v_uid and family_id is null) >= 5 then raise exception 'too_many_guest_profiles'; end if;
  insert into public.player_profiles (guest_owner, display_name, avatar, created_by) values (v_uid, btrim(p_name), p_avatar, v_uid) returning id into v_id;
  return v_id;
end $$;

-- ============================================================================================
-- Rooms and codes
-- ============================================================================================
create function public.create_room(p_family uuid, p_game text, p_max int default 8) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_id uuid;
begin
  if not public.is_family_admin(p_family) then raise exception 'not_allowed' using errcode = '42501'; end if;
  insert into public.rooms (family_id, host_user_id, game_id, max_participants) values (p_family, v_uid, p_game, p_max) returning id into v_id;
  insert into public.room_participants (room_id, user_id, role) values (v_id, v_uid, 'host');
  perform private.audit(p_family, 'room_created', v_id);
  return v_id;
end $$;

-- returns the code once; afterwards only its hash exists
create function public.create_room_invite(p_room uuid, p_minutes int default 120, p_max_uses int default 10)
returns table (invite_id uuid, code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_code text; v_id uuid; v_exp timestamptz;
begin
  if not exists (select 1 from public.rooms r where r.id = p_room and r.host_user_id = v_uid and r.status = 'open') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_minutes not between 5 and 1440 then raise exception 'bad_expiry'; end if;
  v_code := private.new_room_code();
  v_exp := now() + make_interval(mins => p_minutes);
  insert into public.room_invites (room_id, code_hash, expires_at, max_uses, created_by)
  values (p_room, private.hash_room_code(v_code), v_exp, p_max_uses, v_uid) returning id into v_id;
  return query select v_id, substr(v_code, 1, 5) || '-' || substr(v_code, 6, 5), v_exp;
end $$;

create function public.revoke_room_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_family uuid;
begin
  select r.family_id into v_family from public.room_invites i join public.rooms r on r.id = i.room_id
  where i.id = p_invite and r.host_user_id = v_uid;
  if v_family is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.room_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite;
  perform private.audit(v_family, 'invite_revoked', p_invite);
end $$;

-- Join with a code. Wrong, expired, revoked and used-up codes all give the same answer, and failures
-- are counted: 5 failures in 10 minutes block further tries for that user. Returns only the room id.
create function public.join_room(p_code text, p_profile uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_inv public.room_invites; v_room public.rooms; v_count int;
begin
  if (select count(*) from private.join_attempts where user_id = v_uid and not ok and at > now() - interval '10 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  select * into v_inv from public.room_invites where code_hash = private.hash_room_code(p_code) for update;
  if v_inv.id is null or v_inv.revoked_at is not null or v_inv.expires_at <= now() or v_inv.uses >= v_inv.max_uses then
    insert into private.join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  select * into v_room from public.rooms where id = v_inv.room_id;
  if v_room.status <> 'open' then
    insert into private.join_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  -- the profile must belong to the caller: their own guest profile, or a profile of the room's family they may manage
  if not exists (select 1 from public.player_profiles pp where pp.id = p_profile
                   and ((pp.guest_owner = v_uid and pp.family_id is null)
                        or (pp.guest_owner = v_uid and pp.family_id = v_room.family_id)
                        or (pp.family_id = v_room.family_id and public.can_manage_profile(pp.id)))) then
    return jsonb_build_object('ok', false, 'error', 'profile_not_yours');
  end if;
  select count(*) into v_count from public.room_participants where room_id = v_room.id and left_at is null and role = 'participant';
  if v_count >= v_room.max_participants and not exists (select 1 from public.room_participants where room_id = v_room.id and user_id = v_uid and left_at is null) then
    return jsonb_build_object('ok', false, 'error', 'room_full');
  end if;
  insert into public.room_participants (room_id, user_id, profile_id, role) values (v_room.id, v_uid, p_profile, 'participant')
  on conflict (room_id, user_id) do update set profile_id = excluded.profile_id, left_at = null, joined_at = now()
    where public.room_participants.role = 'participant';
  update public.room_invites set uses = uses + 1 where id = v_inv.id;
  insert into private.join_attempts (user_id, ok) values (v_uid, true);
  return jsonb_build_object('ok', true, 'room_id', v_room.id);
end $$;

create function public.leave_room(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user();
begin
  update public.room_participants set left_at = now() where room_id = p_room and user_id = v_uid and role = 'participant' and left_at is null;
end $$;

create function public.remove_participant(p_room uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member();
begin
  if not exists (select 1 from public.rooms where id = p_room and host_user_id = v_uid) then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.room_participants set left_at = now() where room_id = p_room and user_id = p_user and role = 'participant';
end $$;

create function public.add_local_player(p_room uuid, p_profile uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_family uuid;
begin
  select family_id into v_family from public.rooms where id = p_room and host_user_id = v_uid;
  if v_family is null or not exists (select 1 from public.player_profiles where id = p_profile and family_id = v_family) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.room_local_players values (p_room, p_profile) on conflict do nothing;
end $$;

create function public.close_room(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member();
begin
  update public.rooms set status = 'closed' where id = p_room and host_user_id = v_uid;
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.room_invites set revoked_at = coalesce(revoked_at, now()) where room_id = p_room;
end $$;

-- ============================================================================================
-- Game sessions, answers and results
-- ============================================================================================
-- p_turns: [{ "profile_id": uuid, "question": {...}, "answer": "se" }]; the answer must be one of question.opts
create function public.start_session(p_room uuid, p_game text, p_timer int, p_turns jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_room public.rooms; v_id uuid; v_turn jsonb; v_no int := 0; v_profile uuid;
begin
  select * into v_room from public.rooms where id = p_room and host_user_id = v_uid and status = 'open';
  if v_room.id is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  if jsonb_typeof(p_turns) <> 'array' or jsonb_array_length(p_turns) not between 1 and 200 then raise exception 'bad_turns'; end if;
  insert into public.game_sessions (room_id, family_id, game_id, timer_sec, started_by) values (p_room, v_room.family_id, p_game, p_timer, v_uid) returning id into v_id;
  for v_turn in select * from jsonb_array_elements(p_turns) loop
    v_profile := (v_turn ->> 'profile_id')::uuid;
    if not exists (select 1 from public.room_participants where room_id = p_room and profile_id = v_profile and left_at is null)
       and not exists (select 1 from public.room_local_players where room_id = p_room and profile_id = v_profile) then
      raise exception 'profile_not_in_room';
    end if;
    if not (v_turn -> 'question' -> 'opts') ? (v_turn ->> 'answer') then raise exception 'answer_not_an_option'; end if;
    insert into public.session_turns (session_id, turn_no, profile_id, question) values (v_id, v_no, v_profile, v_turn -> 'question');
    insert into private.answer_keys values (v_id, v_no, v_turn ->> 'answer');
    v_no := v_no + 1;
  end loop;
  perform private.audit(v_room.family_id, 'session_started', v_id, jsonb_build_object('turns', v_no));
  return v_id;
end $$;

-- who may play a turn: the remote participant who joined with that profile, or the host for local players
create function private.may_play_turn(p_session uuid, p_turn int) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.session_turns t join public.game_sessions s on s.id = t.session_id
    where t.session_id = p_session and t.turn_no = p_turn and s.status = 'playing'
      and (exists (select 1 from public.room_participants rp where rp.room_id = s.room_id and rp.user_id = auth.uid()
                   and rp.profile_id = t.profile_id and rp.left_at is null and rp.role = 'participant')
           or (exists (select 1 from public.room_local_players lp where lp.room_id = s.room_id and lp.profile_id = t.profile_id)
               and exists (select 1 from public.rooms r where r.id = s.room_id and r.host_user_id = auth.uid()))))
$$;

-- the clock starts on the server when the player sees the question
create function public.begin_turn(p_session uuid, p_turn int) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_at timestamptz;
begin
  if not private.may_play_turn(p_session, p_turn) then raise exception 'not_your_turn' using errcode = '42501'; end if;
  if exists (select 1 from public.session_turns where session_id = p_session and turn_no < p_turn and answer is null) then raise exception 'previous_turn_open'; end if;
  update public.session_turns set started_at = coalesce(started_at, now()) where session_id = p_session and turn_no = p_turn returning started_at into v_at;
  return v_at;
end $$;

-- The only way to answer. Points come from the hidden key and the server clock, never from the client.
-- Sending the same idempotency key again returns the first result instead of scoring twice.
create function public.submit_answer(p_session uuid, p_turn int, p_answer text, p_key uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_t public.session_turns; v_timer int; v_right text; v_ms int; v_ok boolean; v_pts int;
begin
  if p_key is null then raise exception 'idempotency_key_required'; end if;
  select * into v_t from public.session_turns where idempotency_key = p_key;
  if v_t.session_id is not null then
    if v_t.answered_by <> v_uid or v_t.session_id <> p_session or v_t.turn_no <> p_turn then raise exception 'idempotency_key_reused' using errcode = '42501'; end if;
    return jsonb_build_object('correct', v_t.correct, 'points', v_t.points, 'replayed', true);
  end if;
  if not private.may_play_turn(p_session, p_turn) then raise exception 'not_your_turn' using errcode = '42501'; end if;
  select * into v_t from public.session_turns where session_id = p_session and turn_no = p_turn for update;
  if v_t.answer is not null then raise exception 'already_answered'; end if;
  if v_t.started_at is null then raise exception 'turn_not_started'; end if;
  select timer_sec into v_timer from public.game_sessions where id = p_session;
  select answer into v_right from private.answer_keys where session_id = p_session and turn_no = p_turn;
  v_ms := greatest(0, round(extract(epoch from (now() - v_t.started_at)) * 1000))::int;
  v_ok := p_answer is not null and p_answer = v_right and (v_timer = 0 or v_ms <= v_timer * 1000 + 2000);  -- 2 s for network delay
  v_pts := case when not v_ok then 0 when v_timer = 0 then 10
                else 10 + round(5 * greatest(0, 1 - v_ms::numeric / (v_timer * 1000)))::int end;
  update public.session_turns set answer = coalesce(p_answer, ''), correct = v_ok, points = v_pts, ms = v_ms, answered_at = now(), answered_by = v_uid, idempotency_key = p_key
  where session_id = p_session and turn_no = p_turn;
  return jsonb_build_object('correct', v_ok, 'points', v_pts, 'answer', v_right, 'replayed', false);
end $$;

-- Totals are computed here from the answers; finishing twice changes nothing.
create function public.finish_session(p_session uuid) returns setof public.results
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_s public.game_sessions;
begin
  select s.* into v_s from public.game_sessions s join public.rooms r on r.id = s.room_id where s.id = p_session and r.host_user_id = v_uid for update of s;
  if v_s.id is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_s.status = 'playing' then
    insert into public.results (session_id, profile_id, family_id, score, correct, answered, rank)
    select p_session, t.profile_id, v_s.family_id, coalesce(sum(t.points), 0), count(*) filter (where t.correct), count(t.answer),
           rank() over (order by coalesce(sum(t.points), 0) desc, count(*) filter (where t.correct) desc)
    from public.session_turns t where t.session_id = p_session group by t.profile_id;
    update public.game_sessions set status = 'finished', finished_at = now() where id = p_session;
    perform private.audit(v_s.family_id, 'session_finished', p_session);
  end if;
  return query select * from public.results where session_id = p_session order by rank;
end $$;

-- Changing a score afterwards: family owner only, with a reason, always logged.
create function public.adjust_score(p_session uuid, p_profile uuid, p_delta int, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_family uuid;
begin
  select family_id into v_family from public.results where session_id = p_session and profile_id = p_profile;
  if v_family is null or public.family_role_of(v_family) is distinct from 'owner' then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.results set score = score + p_delta where session_id = p_session and profile_id = p_profile;
  insert into public.score_adjustments (session_id, profile_id, delta, reason, by_user) values (p_session, p_profile, p_delta, btrim(p_reason), v_uid);
  perform private.audit(v_family, 'score_adjusted', p_profile, jsonb_build_object('session', p_session, 'delta', p_delta, 'reason', p_reason));
end $$;

-- ============================================================================================
-- Linking a guest profile into a family
-- ============================================================================================
-- Step 1: the guest who owns the profile asks. They must have played in a room of that family.
create function public.request_profile_link(p_profile uuid, p_family uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_id uuid;
begin
  if not exists (select 1 from public.player_profiles where id = p_profile and guest_owner = v_uid and family_id is null) then
    raise exception 'not_your_guest_profile' using errcode = '42501';
  end if;
  if not exists (select 1 from public.room_participants rp join public.rooms r on r.id = rp.room_id
                 where rp.user_id = v_uid and r.family_id = p_family) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  insert into public.profile_link_requests (profile_id, family_id, requested_by) values (p_profile, p_family, v_uid) returning id into v_id;
  return v_id;
end $$;

-- Step 2: an owner or manager of that family approves. The profile keeps its id, so every score and
-- result stays attached; nothing is copied or merged. Any conflict stops with an error.
create function public.approve_profile_link(p_request uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_r public.profile_link_requests; v_p public.player_profiles;
begin
  select * into v_r from public.profile_link_requests where id = p_request for update;
  if v_r.id is null or not public.is_family_admin(v_r.family_id) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_r.status <> 'pending' then raise exception 'request_not_pending'; end if;
  select * into v_p from public.player_profiles where id = v_r.profile_id for update;
  if v_p.family_id is not null then raise exception 'conflict_profile_already_in_a_family'; end if;
  if v_p.guest_owner is distinct from v_r.requested_by then raise exception 'conflict_owner_changed'; end if;
  update public.player_profiles set family_id = v_r.family_id where id = v_p.id;
  if public.family_role_of(v_r.family_id) = 'manager' then insert into public.profile_managers values (v_p.id, v_uid) on conflict do nothing; end if;
  update public.profile_link_requests set status = 'approved', decided_by = v_uid, decided_at = now() where id = p_request;
  perform private.audit(v_r.family_id, 'profile_linked', v_p.id, jsonb_build_object('guest_owner', v_p.guest_owner, 'request', p_request));
  return v_p.id;
end $$;

create function public.reject_profile_link(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_family uuid;
begin
  select family_id into v_family from public.profile_link_requests where id = p_request and status = 'pending';
  if v_family is null or not public.is_family_admin(v_family) then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.profile_link_requests set status = 'rejected', decided_by = v_uid, decided_at = now() where id = p_request;
  perform private.audit(v_family, 'profile_link_rejected', p_request);
end $$;

-- Unlinking gives a linked guest profile back to its guest owner; results stay where they are.
create function public.unlink_profile(p_profile uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_p public.player_profiles;
begin
  select * into v_p from public.player_profiles where id = p_profile for update;
  if v_p.family_id is null or public.family_role_of(v_p.family_id) is distinct from 'owner' then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_p.guest_owner is null then raise exception 'not_a_linked_guest_profile'; end if;
  update public.player_profiles set family_id = null where id = p_profile;
  delete from public.profile_managers where profile_id = p_profile;
  perform private.audit(v_p.family_id, 'profile_unlinked', p_profile);
end $$;

-- ============================================================================================
-- Row level security
-- ============================================================================================
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.player_profiles enable row level security;
alter table public.profile_managers enable row level security;
alter table public.rooms enable row level security;
alter table public.room_invites enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_local_players enable row level security;
alter table public.game_sessions enable row level security;
alter table public.session_turns enable row level security;
alter table public.results enable row level security;
alter table public.score_adjustments enable row level security;
alter table public.profile_link_requests enable row level security;
alter table public.audit_log enable row level security;

create policy families_read on public.families for select to authenticated using (public.is_family_member(id));
create policy family_members_read on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy profiles_read on public.player_profiles for select to authenticated using (public.can_see_profile(id));
create policy profiles_update on public.player_profiles for update to authenticated
  using (public.can_manage_profile(id)) with check (public.can_manage_profile(id));
create policy profile_managers_read on public.profile_managers for select to authenticated
  using (exists (select 1 from public.player_profiles pp where pp.id = profile_id and public.is_family_member(pp.family_id)));
create policy rooms_read on public.rooms for select to authenticated using (public.can_see_room(id));
create policy invites_read on public.room_invites for select to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and r.host_user_id = auth.uid()));
create policy participants_read on public.room_participants for select to authenticated using (public.can_see_room(room_id));
create policy local_players_read on public.room_local_players for select to authenticated using (public.can_see_room(room_id));
create policy sessions_read on public.game_sessions for select to authenticated using (public.can_see_room(room_id));
create policy turns_read on public.session_turns for select to authenticated
  using (exists (select 1 from public.game_sessions s where s.id = session_id and public.can_see_room(s.room_id)));
create policy results_read on public.results for select to authenticated
  using (public.is_family_member(family_id)
         or exists (select 1 from public.game_sessions s where s.id = session_id and public.is_room_participant(s.room_id)));
create policy adjustments_read on public.score_adjustments for select to authenticated
  using (exists (select 1 from public.results r where r.session_id = score_adjustments.session_id and r.profile_id = score_adjustments.profile_id
                 and public.family_role_of(r.family_id) = 'owner'));
create policy link_requests_read on public.profile_link_requests for select to authenticated
  using (requested_by = auth.uid() or public.is_family_admin(family_id));
create policy audit_read on public.audit_log for select to authenticated using (public.family_role_of(family_id) = 'owner');

-- ============================================================================================
-- Grants: start from nothing (Supabase grants everything on new objects by default), then allow
-- exactly what is listed. Column lists keep code hashes and internal columns out of reach.
-- ============================================================================================
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.families, public.family_members, public.player_profiles, public.profile_managers, public.rooms,
  public.room_participants, public.room_local_players, public.game_sessions, public.results, public.score_adjustments,
  public.profile_link_requests, public.audit_log to authenticated;
grant select (id, room_id, expires_at, max_uses, uses, revoked_at, created_at) on public.room_invites to authenticated;
grant select (session_id, turn_no, profile_id, question, started_at, answer, correct, points, ms, answered_at) on public.session_turns to authenticated;
grant update (display_name, avatar) on public.player_profiles to authenticated;

grant execute on function
  public.is_guest(), public.is_family_member(uuid), public.is_family_admin(uuid), public.family_role_of(uuid),
  public.is_room_participant(uuid), public.can_see_room(uuid), public.can_see_profile(uuid), public.can_manage_profile(uuid),
  public.room_topic_allowed(text),
  public.create_family(text), public.set_member_role(uuid, uuid, public.family_role), public.remove_member(uuid, uuid),
  public.create_child_profile(uuid, text, text), public.assign_profile_manager(uuid, uuid), public.create_guest_profile(text, text),
  public.create_room(uuid, text, int), public.create_room_invite(uuid, int, int), public.revoke_room_invite(uuid),
  public.join_room(text, uuid), public.leave_room(uuid), public.remove_participant(uuid, uuid), public.add_local_player(uuid, uuid),
  public.close_room(uuid), public.start_session(uuid, text, int, jsonb), public.begin_turn(uuid, int),
  public.submit_answer(uuid, int, text, uuid), public.finish_session(uuid), public.adjust_score(uuid, uuid, int, text),
  public.request_profile_link(uuid, uuid), public.approve_profile_link(uuid), public.reject_profile_link(uuid), public.unlink_profile(uuid)
to authenticated;

-- ============================================================================================
-- Realtime: private channels "room:<id>" only for people in that room (applied when Supabase Realtime exists)
-- ============================================================================================
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'realtime')
     and exists (select 1 from pg_tables where schemaname = 'realtime' and tablename = 'messages') then
    execute 'create policy room_channel_read on realtime.messages for select to authenticated using (public.room_topic_allowed(realtime.topic()))';
    execute 'create policy room_channel_write on realtime.messages for insert to authenticated with check (public.room_topic_allowed(realtime.topic()))';
  end if;
end $$;
