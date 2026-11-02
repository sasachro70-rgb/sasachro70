-- Family Game Hub, part 3: accounts, approval, roles & permissions, invitations, system owner, security log.
-- Builds on 0001 and 0002. ADDITIVE ONLY: no existing table, column, policy or function is changed or dropped.
--
-- What this adds
--   * public.app_accounts      one row per person (= auth user id): role, status (pending/approved/rejected/suspended/deactivated)
--   * public.permissions       the catalogue of permission keys (users.view, users.approve, …)
--   * public.admin_permissions which permissions each Admin has (granted only by the System Creator)
--   * public.invitations       single-use invitation tokens with a role, an expiry date and who used them (only a hash is stored)
--   * public.account_audit     security log; nobody can change or delete a row (blocked by a trigger, also for functions)
--   * private.system_owner     the one System Creator (Super Admin); set only from the Supabase SQL Editor
--   * private.invite_attempts  rate limit for guessing invitation tokens
-- Rules (same as 0001/0002)
--   * clients only SELECT through RLS; every change goes through a SECURITY DEFINER function with an empty search_path;
--   * roles and permissions are read from the tables on every call, never taken from the client;
--   * nobody can give themselves more rights: only the System Creator makes Admins and sets Admin permissions,
--     an account can never act on itself, and the System Creator cannot be suspended, demoted or deleted through the API.
-- What this does NOT do yet (needs its own approval): it does not block the existing family / room / points functions
-- for accounts that are not approved. public.is_approved() is ready for that step.
--
-- First System Creator (run once in Supabase → SQL Editor, after creating your own account in the app):
--     select private.set_system_owner('your-email@example.com');
-- The same command moves ownership to another account (recovery / hand-over). Only someone with access to the
-- Supabase project can run it; there is no default password anywhere.
--
-- Existing data: every adult already in a family (family_members, not anonymous) gets an APPROVED account with role
-- "parent", so nobody loses access. Nothing else is copied or changed.
-- Rollback: supabase/rollback/0003_rollback.sql (drops only what this file creates).

-- ============================================================================================
-- Types
-- ============================================================================================
create type public.account_status as enum ('pending', 'approved', 'rejected', 'suspended', 'deactivated');
create type public.app_role as enum ('super_admin', 'admin', 'teacher', 'parent', 'student', 'user');

-- ============================================================================================
-- Tables
-- ============================================================================================
create table public.app_accounts (
  user_id uuid primary key,                                  -- the Supabase auth user id
  account_no bigint generated always as identity unique,      -- short Account ID shown to admins (e.g. 1007)
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  role public.app_role not null default 'user',
  status public.account_status not null default 'pending',
  preferred_lang text not null default 'sv' check (preferred_lang in ('th', 'sv', 'en')),
  requested_role public.app_role check (requested_role is null or requested_role in ('parent', 'teacher', 'user')),
  request_note text check (request_note is null or char_length(request_note) <= 300),
  decided_by uuid,
  decided_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index app_accounts_status on public.app_accounts (status);
create index app_accounts_role on public.app_accounts (role);

create table public.permissions (
  key text primary key check (key ~ '^[a-z]+\.[a-z]+$'),
  description text not null
);

create table public.admin_permissions (
  user_id uuid not null references public.app_accounts on delete cascade,
  permission text not null references public.permissions,
  granted_by uuid not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  role public.app_role not null check (role <> 'super_admin'),
  permissions text[] not null default '{}',
  note text check (note is null or char_length(note) <= 200),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid,
  used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid
);

create table public.account_audit (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target uuid,
  details jsonb not null default '{}',
  at timestamptz not null default now()
);
create index account_audit_at on public.account_audit (at desc);

create table private.system_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null,
  set_at timestamptz not null default now()
);

create table private.invite_attempts (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index invite_attempts_user on private.invite_attempts (user_id, at);

insert into public.permissions (key, description) values
  ('users.view', 'See accounts and their status'),
  ('users.create', 'Invite ordinary users'),
  ('users.edit', 'Edit accounts and change roles below Admin'),
  ('users.suspend', 'Suspend, re-activate or deactivate accounts below Admin'),
  ('users.delete', 'Delete accounts (reserved; deleting is not offered yet)'),
  ('users.approve', 'Approve or reject access requests'),
  ('admins.manage', 'Manage Admins (System Creator only; listed for completeness)'),
  ('teachers.manage', 'Invite and manage teachers'),
  ('students.manage', 'Invite and manage students'),
  ('families.manage', 'Invite and manage parent / family accounts'),
  ('classes.manage', 'Manage classes and members'),
  ('curriculum.manage', 'Manage subjects, courses and lessons'),
  ('reports.view', 'See usage reports'),
  ('security.manage', 'See the security log and security settings');

-- the security log can only grow: no UPDATE or DELETE, not even from SECURITY DEFINER functions
create function private.block_audit_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'account_audit_is_append_only' using errcode = '42501';
end $$;
create trigger account_audit_append_only before update or delete on public.account_audit
  for each row execute function private.block_audit_change();
create trigger account_audit_no_truncate before truncate on public.account_audit
  for each statement execute function private.block_audit_change();

-- ============================================================================================
-- Helpers
-- ============================================================================================
create function private.log(p_action text, p_target uuid, p_details jsonb default '{}')
returns void language sql set search_path = '' as $$
  insert into public.account_audit (actor, action, target, details) values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'))
$$;

create function public.is_system_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.system_owner o where o.user_id = auth.uid())
$$;

-- signed in, not a guest, account approved
create function public.is_approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select a.status = 'approved' from public.app_accounts a where a.user_id = auth.uid()), false)
     and not public.is_guest()
$$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_approved() and exists (select 1 from public.app_accounts a where a.user_id = auth.uid() and a.role = 'super_admin')
$$;

-- the System Creator has every permission; an approved Admin has the ones granted to them; nobody else has any
create function public.has_permission(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_super_admin()
      or (public.is_approved()
          and exists (select 1 from public.app_accounts a where a.user_id = auth.uid() and a.role = 'admin')
          and exists (select 1 from public.admin_permissions p where p.user_id = auth.uid() and p.permission = p_permission))
$$;

create function private.require_permission(p_permission text) returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not public.has_permission(p_permission) then raise exception 'not_allowed' using errcode = '42501'; end if;
  return auth.uid();
end $$;

-- the permission needed to invite or manage an account with this role
create function private.permission_for_role(p_role public.app_role) returns text
language sql immutable set search_path = '' as $$
  select case p_role when 'teacher' then 'teachers.manage' when 'student' then 'students.manage'
                     when 'parent' then 'families.manage' when 'user' then 'users.create' else 'admins.manage' end
$$;

-- an actor may act on a target account: never on themselves, never on the System Creator, Admins only by the System Creator
create function private.check_target(p_target uuid) returns public.app_accounts
language plpgsql stable set search_path = '' as $$
declare v public.app_accounts;
begin
  select * into v from public.app_accounts where user_id = p_target;
  if v.user_id is null then raise exception 'account_not_found'; end if;
  if p_target = auth.uid() then raise exception 'not_on_yourself' using errcode = '42501'; end if;
  if v.role = 'super_admin' then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v.role = 'admin' and not public.is_super_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  return v;
end $$;

create function private.clean_name(p_name text) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v) < 1 or char_length(v) > 40 then raise exception 'name_required'; end if;
  return v;
end $$;

create function private.clean_lang(p_lang text) returns text
language sql immutable set search_path = '' as $$
  select case when p_lang in ('th', 'sv', 'en') then p_lang else 'sv' end
$$;

-- ============================================================================================
-- System Creator (only from the SQL Editor: private functions cannot be called through the API)
-- ============================================================================================
create function private.set_system_owner(p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_old uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then raise exception 'no account with that e-mail: create the account in the app first'; end if;
  select user_id into v_old from private.system_owner;
  insert into public.app_accounts (user_id, display_name, role, status, decided_at)
    values (v_user, split_part(p_email, '@', 1), 'super_admin', 'approved', now())
    on conflict (user_id) do update set role = 'super_admin', status = 'approved', decided_at = now(), updated_at = now();
  if v_old is not null and v_old <> v_user then
    update public.app_accounts set role = 'admin', updated_at = now() where user_id = v_old;   -- the previous owner keeps an Admin account without permissions
  end if;
  insert into private.system_owner (singleton, user_id) values (true, v_user)
    on conflict (singleton) do update set user_id = excluded.user_id, set_at = now();
  insert into public.account_audit (actor, action, target, details)
    values (null, 'system_owner_set', v_user, jsonb_build_object('previous', v_old));
  return v_user;
end $$;

-- ============================================================================================
-- Own account
-- ============================================================================================
-- the signed-in person's own account, permissions and whether they may use the system
create function public.my_account() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null then jsonb_build_object('signed_in', false)
    when public.is_guest() then jsonb_build_object('signed_in', true, 'guest', true, 'approved', false)
    else coalesce((
      select jsonb_build_object('signed_in', true, 'guest', false, 'user_id', a.user_id, 'account_no', a.account_no, 'display_name', a.display_name,
        'role', a.role, 'status', a.status, 'preferred_lang', a.preferred_lang, 'approved', a.status = 'approved',
        'system_owner', public.is_system_owner(),
        'permissions', case when a.status <> 'approved' then '[]'::jsonb
                            when a.role = 'super_admin' then (select jsonb_agg(p.key order by p.key) from public.permissions p)
                            when a.role = 'admin' then coalesce((select jsonb_agg(ap.permission order by ap.permission) from public.admin_permissions ap where ap.user_id = a.user_id), '[]'::jsonb)
                            else '[]'::jsonb end)
      from public.app_accounts a where a.user_id = auth.uid()),
      jsonb_build_object('signed_in', true, 'guest', false, 'status', 'none', 'approved', false))
  end
$$;

-- "Create account" in the app: the account is created as PENDING and must be approved by an Admin.
-- A rejected person may ask again after 24 hours; a suspended or deactivated account cannot re-open itself.
create function public.request_access(p_display_name text, p_lang text, p_requested_role public.app_role, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v public.app_accounts; v_role public.app_role;
begin
  v_role := case when p_requested_role in ('parent', 'teacher', 'user') then p_requested_role else 'user' end;
  select * into v from public.app_accounts where user_id = v_uid for update;
  if v.user_id is null then
    insert into public.app_accounts (user_id, display_name, preferred_lang, requested_role, request_note)
      values (v_uid, private.clean_name(p_display_name), private.clean_lang(p_lang), v_role, nullif(btrim(left(coalesce(p_note, ''), 300)), ''));
    perform private.log('access_requested', v_uid, jsonb_build_object('requested_role', v_role));
    return jsonb_build_object('ok', true, 'status', 'pending');
  end if;
  if v.status = 'rejected' and v.decided_at < now() - interval '24 hours' then
    update public.app_accounts set status = 'pending', display_name = private.clean_name(p_display_name), preferred_lang = private.clean_lang(p_lang),
      requested_role = v_role, request_note = nullif(btrim(left(coalesce(p_note, ''), 300)), ''), updated_at = now() where user_id = v_uid;
    perform private.log('access_requested_again', v_uid, jsonb_build_object('requested_role', v_role));
    return jsonb_build_object('ok', true, 'status', 'pending');
  end if;
  return jsonb_build_object('ok', false, 'status', v.status, 'error', case v.status when 'rejected' then 'try_again_later' else 'already_exists' end);
end $$;

-- name and menu language: anyone for their own account (even while pending), Admins with users.edit for others
create function public.update_account(p_user uuid, p_display_name text, p_lang text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member();
begin
  if p_user <> v_uid then perform private.require_permission('users.edit'); perform private.check_target(p_user); end if;
  update public.app_accounts set display_name = private.clean_name(p_display_name), preferred_lang = private.clean_lang(p_lang), updated_at = now() where user_id = p_user;
  if not found then raise exception 'account_not_found'; end if;
  if p_user <> v_uid then perform private.log('account_edited', p_user); end if;
end $$;

-- called by the app after a sign-in; counts as "last login" (written to the log at most once per 10 minutes)
create function public.record_login() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_last timestamptz;
begin
  select last_seen_at into v_last from public.app_accounts where user_id = v_uid for update;
  if not found then return public.my_account(); end if;
  update public.app_accounts set last_seen_at = now() where user_id = v_uid;
  if v_last is null or v_last < now() - interval '10 minutes' then perform private.log('login', v_uid); end if;
  return public.my_account();
end $$;

-- ============================================================================================
-- Invitations (single use, expiring, only a hash of the token is stored)
-- ============================================================================================
create function public.create_invitation(p_role public.app_role, p_days int default 7, p_permissions text[] default '{}', p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_token text; v_id uuid; v_perms text[] := coalesce(p_permissions, '{}');
begin
  if p_role = 'super_admin' then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_role = 'admin' then
    if not public.is_super_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
    v_uid := auth.uid();
    if exists (select 1 from unnest(v_perms) x where x not in (select key from public.permissions) or x = 'admins.manage') then raise exception 'bad_permission'; end if;
  else
    v_uid := private.require_permission(private.permission_for_role(p_role));
    v_perms := '{}';
  end if;
  if p_days is null or p_days < 1 or p_days > 30 then raise exception 'days_1_to_30'; end if;
  v_token := encode(substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 16)
                 || substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 16), 'hex');
  insert into public.invitations (token_hash, role, permissions, note, created_by, expires_at)
    values (sha256(convert_to(v_token, 'UTF8')), p_role, v_perms, nullif(btrim(left(coalesce(p_note, ''), 200)), ''), v_uid, now() + make_interval(days => p_days))
    returning id into v_id;
  perform private.log('invitation_created', v_id, jsonb_build_object('role', p_role, 'days', p_days, 'permissions', v_perms));
  return jsonb_build_object('id', v_id, 'token', v_token, 'role', p_role, 'expires_at', now() + make_interval(days => p_days));
end $$;

create function public.revoke_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.invitations;
begin
  select * into v from public.invitations where id = p_invitation for update;
  if v.id is null then raise exception 'not_found'; end if;
  if v.created_by <> auth.uid() or not public.is_approved() then
    if v.role = 'admin' then
      if not public.is_super_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
    else perform private.require_permission(private.permission_for_role(v.role)); end if;
  end if;
  if v.used_at is not null or v.revoked_at is not null then raise exception 'not_open'; end if;
  update public.invitations set revoked_at = now(), revoked_by = auth.uid() where id = p_invitation;
  perform private.log('invitation_revoked', p_invitation);
end $$;

-- the invited person signs up (or in) and then calls this; the account is approved at once with the invited role.
-- 5 wrong tokens in 15 minutes → wait. A suspended or deactivated account cannot use an invitation.
create function public.accept_invitation(p_token text, p_display_name text, p_lang text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v public.invitations; v_acc public.app_accounts;
begin
  if (select count(*) from private.invite_attempts where user_id = v_uid and at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  select * into v from public.invitations where token_hash = sha256(convert_to(btrim(coalesce(p_token, '')), 'UTF8')) for update;
  if v.id is null or v.used_at is not null or v.revoked_at is not null or v.expires_at < now() then
    insert into private.invite_attempts (user_id) values (v_uid);
    return jsonb_build_object('ok', false, 'error', case when v.id is null then 'invalid' when v.used_at is not null then 'used' when v.revoked_at is not null then 'revoked' else 'expired' end);
  end if;
  select * into v_acc from public.app_accounts where user_id = v_uid for update;
  if v_acc.status in ('suspended', 'deactivated') then return jsonb_build_object('ok', false, 'error', 'account_blocked'); end if;
  if v_acc.role in ('super_admin', 'admin') then return jsonb_build_object('ok', false, 'error', 'already_admin'); end if;
  insert into public.app_accounts (user_id, display_name, role, status, preferred_lang, decided_by, decided_at)
    values (v_uid, private.clean_name(p_display_name), v.role, 'approved', private.clean_lang(p_lang), v.created_by, now())
    on conflict (user_id) do update set role = excluded.role, status = 'approved', display_name = excluded.display_name,
      preferred_lang = excluded.preferred_lang, decided_by = excluded.decided_by, decided_at = now(), updated_at = now();
  delete from public.admin_permissions where user_id = v_uid;
  if v.role = 'admin' then
    insert into public.admin_permissions (user_id, permission, granted_by) select v_uid, x, v.created_by from unnest(v.permissions) x;
  end if;
  update public.invitations set used_by = v_uid, used_at = now() where id = v.id;
  perform private.log('invitation_used', v_uid, jsonb_build_object('invitation', v.id, 'role', v.role));
  return jsonb_build_object('ok', true, 'role', v.role);
end $$;

-- ============================================================================================
-- Admin actions
-- ============================================================================================
-- approve (optionally with another role than requested) or reject a pending request
create function public.decide_account(p_user uuid, p_approve boolean, p_role public.app_role default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_permission('users.approve'); v public.app_accounts; v_role public.app_role;
begin
  v := private.check_target(p_user);
  if v.status <> 'pending' then raise exception 'not_pending'; end if;
  v_role := coalesce(p_role, v.requested_role, 'user');
  if p_approve then
    if v_role in ('super_admin', 'admin') then raise exception 'use_an_admin_invitation' using errcode = '42501'; end if;
    if not public.has_permission(private.permission_for_role(v_role)) then raise exception 'not_allowed' using errcode = '42501'; end if;
  end if;
  update public.app_accounts set status = case when p_approve then 'approved'::public.account_status else 'rejected'::public.account_status end,
    role = case when p_approve then v_role else role end, decided_by = v_uid, decided_at = now(), updated_at = now() where user_id = p_user;
  perform private.log(case when p_approve then 'account_approved' else 'account_rejected' end, p_user,
    jsonb_build_object('role', v_role, 'note', nullif(btrim(left(coalesce(p_note, ''), 200)), '')));
end $$;

-- suspend / re-activate / deactivate (an approved account only becomes "approved" again through this or an invitation)
create function public.set_account_status(p_user uuid, p_status public.account_status, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_permission('users.suspend'); v public.app_accounts;
begin
  v := private.check_target(p_user);
  if p_status not in ('approved', 'suspended', 'deactivated') then raise exception 'bad_status'; end if;
  if v.status = 'pending' and p_status = 'approved' then raise exception 'use_decide_account'; end if;
  update public.app_accounts set status = p_status, updated_at = now() where user_id = p_user;
  perform private.log('account_status_' || p_status::text, p_user, jsonb_build_object('from', v.status, 'note', nullif(btrim(left(coalesce(p_note, ''), 200)), '')));
end $$;

-- change role: below Admin with users.edit (and the permission for the new role); to or from Admin only by the System Creator
create function public.set_account_role(p_user uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_permission('users.edit'); v public.app_accounts;
begin
  v := private.check_target(p_user);
  if p_role = 'super_admin' then raise exception 'use_set_system_owner' using errcode = '42501'; end if;
  if p_role = 'admin' and not public.is_super_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_role <> 'admin' and not public.has_permission(private.permission_for_role(p_role)) then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.app_accounts set role = p_role, updated_at = now() where user_id = p_user;
  if p_role <> 'admin' then delete from public.admin_permissions where user_id = p_user; end if;
  perform private.log('account_role_changed', p_user, jsonb_build_object('from', v.role, 'to', p_role));
end $$;

-- the System Creator decides exactly which permissions an Admin has
create function public.set_admin_permissions(p_user uuid, p_permissions text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v public.app_accounts; v_perms text[] := coalesce(p_permissions, '{}');
begin
  if not public.is_super_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  v_uid := auth.uid();
  v := private.check_target(p_user);
  if v.role <> 'admin' then raise exception 'not_an_admin'; end if;
  if exists (select 1 from unnest(v_perms) x where x not in (select key from public.permissions) or x = 'admins.manage') then raise exception 'bad_permission'; end if;
  delete from public.admin_permissions where user_id = p_user;
  insert into public.admin_permissions (user_id, permission, granted_by) select distinct p_user, x, v_uid from unnest(v_perms) x;
  perform private.log('admin_permissions_set', p_user, jsonb_build_object('permissions', v_perms));
end $$;

-- ============================================================================================
-- Existing users: every adult already in a family keeps access (approved parent account)
-- ============================================================================================
insert into public.app_accounts (user_id, display_name, role, status, decided_at)
select distinct on (m.user_id) m.user_id, 'Parent', 'parent', 'approved', now()
from public.family_members m
on conflict (user_id) do nothing;
insert into public.account_audit (actor, action, target, details)
select null, 'account_created_from_family', a.user_id, '{}'::jsonb from public.app_accounts a;

-- ============================================================================================
-- Row level security and grants
-- ============================================================================================
alter table public.app_accounts enable row level security;
alter table public.permissions enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.invitations enable row level security;
alter table public.account_audit enable row level security;

create policy app_accounts_read on public.app_accounts for select to authenticated using (user_id = auth.uid() or public.has_permission('users.view'));
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy admin_permissions_read on public.admin_permissions for select to authenticated using (user_id = auth.uid() or public.has_permission('users.view'));
create policy invitations_read on public.invitations for select to authenticated using (created_by = auth.uid() or public.has_permission('users.view'));
create policy account_audit_read on public.account_audit for select to authenticated using (public.has_permission('security.manage'));

revoke all on public.app_accounts, public.permissions, public.admin_permissions, public.invitations, public.account_audit from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant select on public.app_accounts, public.permissions, public.admin_permissions, public.account_audit to authenticated;
-- the token hash never leaves the database
grant select (id, role, permissions, note, created_by, created_at, expires_at, used_by, used_at, revoked_at, revoked_by) on public.invitations to authenticated;

revoke all on function public.is_system_owner(), public.is_approved(), public.is_super_admin(), public.has_permission(text), public.my_account(),
  public.request_access(text, text, public.app_role, text), public.update_account(uuid, text, text), public.record_login(),
  public.create_invitation(public.app_role, int, text[], text), public.revoke_invitation(uuid), public.accept_invitation(text, text, text),
  public.decide_account(uuid, boolean, public.app_role, text), public.set_account_status(uuid, public.account_status, text),
  public.set_account_role(uuid, public.app_role), public.set_admin_permissions(uuid, text[]) from public, anon, authenticated;
grant execute on function public.is_system_owner(), public.is_approved(), public.is_super_admin(), public.has_permission(text), public.my_account(),
  public.request_access(text, text, public.app_role, text), public.update_account(uuid, text, text), public.record_login(),
  public.create_invitation(public.app_role, int, text[], text), public.revoke_invitation(uuid), public.accept_invitation(text, text, text),
  public.decide_account(uuid, boolean, public.app_role, text), public.set_account_status(uuid, public.account_status, text),
  public.set_account_role(uuid, public.app_role), public.set_admin_permissions(uuid, text[]) to authenticated;
