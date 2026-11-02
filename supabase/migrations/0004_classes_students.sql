-- Family Game Hub, part 4: classrooms. Teachers create classes; students sign in with class code + student number + PIN
-- (no e-mail) and their progress is saved on the server so they can continue on any device.
-- Builds on 0001–0003. Additive, with ONE approved change to an existing function:
--   * public.create_family() now only works for the System Creator ("family creation closed"). Existing families,
--     members, profiles, points, rewards and progress are not touched.
--
-- Tables
--   public.classes            a class: name, 6-character code, teacher, archived
--   public.students           a student in a class: number (1, 2, 3 …), name, PIN (salted + iterated hash), archived
--   public.student_sessions   which signed-in device (an anonymous Supabase user) is which student
--   public.student_progress   the student's learning document (same format as learning_state), with a revision number
--   public.student_activity   every finished lesson / exercise round (idempotent key), for "continue" and the teacher
--   private.student_login_attempts   rate limit for PIN guessing
-- Rules: clients only SELECT through RLS; teachers see only their own classes; students never read tables directly
-- (only through student_* functions, which find the student from the signed-in device); PINs never leave the database
-- after creation (shown once to the teacher; a reset makes a new one and signs the student out everywhere).
-- Rollback: supabase/rollback/0004_rollback.sql (also restores the original create_family).

-- ============================================================================================
-- Family creation: System Creator only (approved change)
-- ============================================================================================
create or replace function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_id uuid;
begin
  if not public.is_super_admin() then raise exception 'family_creation_closed' using errcode = '42501'; end if;
  insert into public.families (name, created_by) values (btrim(p_name), v_uid) returning id into v_id;
  insert into public.family_members (family_id, user_id, role, added_by) values (v_id, v_uid, 'owner', v_uid);
  perform private.audit(v_id, 'family_created', v_id);
  return v_id;
end $$;

-- ============================================================================================
-- Tables
-- ============================================================================================
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  code text not null unique check (code ~ '^[2-9A-HJ-NP-Z]{6}$'),
  teacher_id uuid not null references public.app_accounts (user_id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index classes_teacher on public.classes (teacher_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  student_no int not null check (student_no between 1 and 999),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  pin_salt text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  last_active_at timestamptz,
  archived_at timestamptz,
  unique (class_id, student_no)
);

create table public.student_sessions (
  user_id uuid primary key,                       -- the anonymous Supabase user of one device
  student_id uuid not null references public.students on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index student_sessions_student on public.student_sessions (student_id);

create table public.student_progress (
  student_id uuid primary key references public.students on delete cascade,
  data jsonb not null default '{}',
  rev int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.student_activity (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students on delete cascade,
  class_id uuid not null references public.classes,
  key text not null check (char_length(key) between 3 and 120),
  area text not null check (char_length(area) <= 20),
  kind text not null check (char_length(kind) <= 20),
  title text not null check (char_length(title) <= 120),
  unit text check (unit is null or char_length(unit) <= 120),
  score int not null default 0,
  max int not null default 0,
  pct int not null default 0 check (pct between 0 and 100),
  ms int not null default 0,
  at timestamptz not null default now(),
  unique (student_id, key)
);
create index student_activity_class on public.student_activity (class_id, at desc);

create table private.student_login_attempts (
  class_id uuid,
  student_no int,
  user_id uuid,
  at timestamptz not null default now()
);
create index student_login_attempts_lookup on private.student_login_attempts (class_id, student_no, at);
create index student_login_attempts_user on private.student_login_attempts (user_id, at);

-- ============================================================================================
-- Helpers
-- ============================================================================================
-- may create classes: approved teacher, System Creator, or an Admin with classes.manage
create function public.can_create_classes() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_permission('classes.manage')
      or (public.is_approved() and exists (select 1 from public.app_accounts a where a.user_id = auth.uid() and a.role = 'teacher'))
$$;

-- may see and manage this class: its own (approved) teacher, or classes.manage
create function public.can_teach(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_permission('classes.manage')
      or (public.is_approved() and exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = auth.uid()))
$$;

create function private.require_teacher_of(p_class uuid) returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not public.can_teach(p_class) then raise exception 'not_allowed' using errcode = '42501'; end if;
  return auth.uid();
end $$;

-- 6 characters from 32 letters/digits (no 0, O, 1, I), unique among classes
create function private.new_class_code() returns text
language plpgsql volatile set search_path = '' as $$
declare alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; b bytea; out text;
begin
  loop
    b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex'); out := '';
    for i in 0..5 loop out := out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.classes where code = out);
  end loop;
  return out;
end $$;

-- 4 digits without bias (two random bytes, values ≥ 60000 are drawn again)
create function private.new_pin() returns text
language plpgsql volatile set search_path = '' as $$
declare b bytea; v int;
begin
  loop
    b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v := get_byte(b, 0) * 256 + get_byte(b, 1);
    exit when v < 60000;
  end loop;
  return lpad((v % 10000)::text, 4, '0');
end $$;

create function private.clean_student_name(p_name text, p_no int) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 40), ''), 'Elev ' || p_no)
$$;

-- adds students (count or names) to a class and returns their numbers, names and PINs (the only time PINs are shown)
create function private.add_students(p_class uuid, p_count int, p_names text[]) returns jsonb
language plpgsql set search_path = '' as $$
declare v_next int; v_names text[]; v_n int; v_out jsonb := '[]'; v_pin text; v_salt text; v_no int; v_name text; v_active int;
begin
  v_names := array(select x from unnest(coalesce(p_names, '{}')) x where btrim(coalesce(x, '')) <> '');
  v_n := case when array_length(v_names, 1) is not null then array_length(v_names, 1) else coalesce(p_count, 0) end;
  if v_n < 1 or v_n > 100 then raise exception 'students_1_to_100'; end if;
  select count(*) into v_active from public.students where class_id = p_class and archived_at is null;
  if v_active + v_n > 100 then raise exception 'class_full_100'; end if;
  select coalesce(max(student_no), 0) + 1 into v_next from public.students where class_id = p_class;
  for i in 1..v_n loop
    v_no := v_next + i - 1;
    v_name := private.clean_student_name(case when array_length(v_names, 1) is not null then v_names[i] else null end, v_no);
    v_pin := private.new_pin();
    v_salt := encode(substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 16), 'hex');
    insert into public.students (class_id, student_no, display_name, pin_salt, pin_hash) values (p_class, v_no, v_name, v_salt, private.pin_hash(v_salt, v_pin));
    v_out := v_out || jsonb_build_object('student_no', v_no, 'name', v_name, 'pin', v_pin);
  end loop;
  return v_out;
end $$;

-- the student signed in on this device (anonymous user bound by student_login), or an error
create function private.current_student() returns public.students
language plpgsql stable security definer set search_path = '' as $$
declare v public.students;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select s.* into v from public.student_sessions ss join public.students s on s.id = ss.student_id join public.classes c on c.id = s.class_id
  where ss.user_id = auth.uid() and s.archived_at is null and c.archived_at is null;
  if v.id is null then raise exception 'not_a_student' using errcode = '42501'; end if;
  return v;
end $$;

-- ============================================================================================
-- Teacher functions
-- ============================================================================================
create function public.create_class(p_name text, p_count int default 0, p_names text[] default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_students jsonb;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not public.can_create_classes() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then raise exception 'name_required'; end if;
  v_code := private.new_class_code();
  insert into public.classes (name, code, teacher_id) values (btrim(p_name), v_code, auth.uid()) returning id into v_id;
  v_students := private.add_students(v_id, p_count, p_names);
  perform private.log('class_created', v_id, jsonb_build_object('students', jsonb_array_length(v_students)));
  return jsonb_build_object('class_id', v_id, 'code', v_code, 'name', btrim(p_name), 'students', v_students);
end $$;

create function public.add_students(p_class uuid, p_count int default 0, p_names text[] default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform private.require_teacher_of(p_class);
  if exists (select 1 from public.classes where id = p_class and archived_at is not null) then raise exception 'class_archived'; end if;
  v := private.add_students(p_class, p_count, p_names);
  perform private.log('students_added', p_class, jsonb_build_object('count', jsonb_array_length(v)));
  return v;
end $$;

-- a new PIN; the student is signed out on every device
create function public.reset_student_pin(p_student uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.students; v_pin text := private.new_pin(); v_salt text;
begin
  select * into v from public.students where id = p_student for update;
  if v.id is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v.class_id);
  v_salt := encode(substring(decode(replace(gen_random_uuid()::text, '-', ''), 'hex') from 1 for 16), 'hex');
  update public.students set pin_salt = v_salt, pin_hash = private.pin_hash(v_salt, v_pin) where id = p_student;
  delete from public.student_sessions where student_id = p_student;
  perform private.log('student_pin_reset', p_student);
  return jsonb_build_object('student_no', v.student_no, 'name', v.display_name, 'pin', v_pin);
end $$;

create function public.rename_student(p_student uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.students;
begin
  select * into v from public.students where id = p_student;
  if v.id is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v.class_id);
  update public.students set display_name = private.clean_student_name(p_name, v.student_no) where id = p_student;
end $$;

-- archive (or bring back) a student; archived students cannot sign in; nothing is deleted
create function public.set_student_archived(p_student uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.students;
begin
  select * into v from public.students where id = p_student for update;
  if v.id is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v.class_id);
  update public.students set archived_at = case when p_archived then now() else null end where id = p_student;
  if p_archived then delete from public.student_sessions where student_id = p_student; end if;
  perform private.log(case when p_archived then 'student_archived' else 'student_restored' end, p_student);
end $$;

create function public.rename_class(p_class uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_teacher_of(p_class);
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then raise exception 'name_required'; end if;
  update public.classes set name = btrim(p_name) where id = p_class;
end $$;

create function public.set_class_archived(p_class uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_teacher_of(p_class);
  update public.classes set archived_at = case when p_archived then now() else null end where id = p_class;
  if p_archived then delete from public.student_sessions ss using public.students s where s.id = ss.student_id and s.class_id = p_class; end if;
  perform private.log(case when p_archived then 'class_archived' else 'class_restored' end, p_class);
end $$;

-- ============================================================================================
-- Student functions (the device must be signed in anonymously first)
-- ============================================================================================
-- class code + student number + PIN. 5 wrong PINs for one student in 15 minutes, or 20 wrong tries from one device,
-- lock further tries for 15 minutes. Every wrong answer looks the same, so codes and numbers cannot be probed.
create function public.student_login(p_code text, p_student_no int, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_class public.classes; v public.students;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not public.is_guest() then return jsonb_build_object('ok', false, 'error', 'use_student_device_session'); end if;
  if (select count(*) from private.student_login_attempts where user_id = v_uid and at > now() - interval '15 minutes') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  select * into v_class from public.classes where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) and archived_at is null;
  if v_class.id is not null and (select count(*) from private.student_login_attempts
        where class_id = v_class.id and student_no = p_student_no and at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  select * into v from public.students where class_id = v_class.id and student_no = p_student_no and archived_at is null;
  if v.id is null or v.pin_hash <> private.pin_hash(v.pin_salt, btrim(coalesce(p_pin, ''))) then
    insert into private.student_login_attempts (class_id, student_no, user_id) values (v_class.id, p_student_no, v_uid);
    return jsonb_build_object('ok', false, 'error', 'wrong');
  end if;
  insert into public.student_sessions (user_id, student_id) values (v_uid, v.id)
    on conflict (user_id) do update set student_id = excluded.student_id, created_at = now(), last_seen_at = now();
  update public.students set last_active_at = now() where id = v.id;
  perform private.log('student_login', v.id);
  return jsonb_build_object('ok', true) || public.student_me();
end $$;

create function public.student_logout() returns void
language sql security definer set search_path = '' as $$
  delete from public.student_sessions where user_id = auth.uid()
$$;

-- everything the student's device needs: who, which class, saved progress (with revision) and the latest activities
create function public.student_me() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.students := private.current_student(); v_class public.classes; v_p public.student_progress;
begin
  select * into v_class from public.classes where id = v.class_id;
  select * into v_p from public.student_progress where student_id = v.id;
  update public.student_sessions set last_seen_at = now() where user_id = auth.uid();
  return jsonb_build_object('student_id', v.id, 'student_no', v.student_no, 'name', v.display_name,
    'class_id', v_class.id, 'class_name', v_class.name, 'class_code', v_class.code,
    'progress', coalesce(v_p.data, '{}'::jsonb), 'rev', coalesce(v_p.rev, 0),
    'recent', coalesce((select jsonb_agg(x order by x.at desc) from (select key, area, kind, title, unit, score, max, pct, ms, at
                        from public.student_activity where student_id = v.id order by at desc limit 20) x), '[]'::jsonb));
end $$;

-- saves the learning document; a stale revision gets the server copy back so the device can merge and try again
create function public.student_save_progress(p_data jsonb, p_rev int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.students := private.current_student(); v_cur public.student_progress;
begin
  if jsonb_typeof(p_data) <> 'object' then raise exception 'bad_request'; end if;
  if octet_length(p_data::text) > 512000 then raise exception 'too_large'; end if;
  select * into v_cur from public.student_progress where student_id = v.id for update;
  if v_cur.student_id is not null and coalesce(p_rev, -1) <> v_cur.rev then
    return jsonb_build_object('ok', false, 'error', 'stale', 'rev', v_cur.rev, 'data', v_cur.data);
  end if;
  insert into public.student_progress (student_id, data, rev) values (v.id, p_data, 1)
    on conflict (student_id) do update set data = excluded.data, rev = public.student_progress.rev + 1, updated_at = now();
  update public.students set last_active_at = now() where id = v.id;
  return jsonb_build_object('ok', true, 'rev', coalesce(v_cur.rev, 0) + 1);
end $$;

-- one finished lesson or round; the same key is stored once; numbers are clamped by the server
create function public.student_record_activity(p_key text, p_area text, p_kind text, p_title text, p_unit text, p_score int, p_max int, p_ms int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.students := private.current_student(); v_max int := greatest(0, least(coalesce(p_max, 0), 1000)); v_score int; v_rows int;
begin
  if char_length(coalesce(p_key, '')) not between 3 and 120 then raise exception 'bad_request'; end if;
  v_score := greatest(0, least(coalesce(p_score, 0), v_max));
  insert into public.student_activity (student_id, class_id, key, area, kind, title, unit, score, max, pct, ms)
    values (v.id, v.class_id, p_key, left(coalesce(p_area, 'other'), 20), left(coalesce(p_kind, 'other'), 20), left(coalesce(p_title, ''), 120),
            nullif(left(coalesce(p_unit, ''), 120), ''), v_score, v_max, case when v_max > 0 then round(100.0 * v_score / v_max)::int else 0 end,
            greatest(0, least(coalesce(p_ms, 0), 4 * 3600 * 1000)))
    on conflict (student_id, key) do nothing;
  get diagnostics v_rows = row_count;
  update public.students set last_active_at = now() where id = v.id;
  return jsonb_build_object('ok', true, 'duplicate', v_rows = 0);
end $$;

-- ============================================================================================
-- Row level security and grants
-- ============================================================================================
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.student_sessions enable row level security;
alter table public.student_progress enable row level security;
alter table public.student_activity enable row level security;

create policy classes_read on public.classes for select to authenticated using (public.can_teach(id));
create policy students_read on public.students for select to authenticated using (public.can_teach(class_id));
create policy student_progress_read on public.student_progress for select to authenticated
  using (public.can_teach((select s.class_id from public.students s where s.id = student_id)));
create policy student_activity_read on public.student_activity for select to authenticated using (public.can_teach(class_id));
-- student_sessions: no policy, nobody reads it from the app

revoke all on public.classes, public.students, public.student_sessions, public.student_progress, public.student_activity from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant select on public.classes, public.student_progress, public.student_activity to authenticated;
-- the PIN salt and hash never leave the database
grant select (id, class_id, student_no, display_name, created_at, last_active_at, archived_at) on public.students to authenticated;

revoke all on function public.can_create_classes(), public.can_teach(uuid), public.create_class(text, int, text[]), public.add_students(uuid, int, text[]),
  public.reset_student_pin(uuid), public.rename_student(uuid, text), public.set_student_archived(uuid, boolean), public.rename_class(uuid, text),
  public.set_class_archived(uuid, boolean), public.student_login(text, int, text), public.student_logout(), public.student_me(),
  public.student_save_progress(jsonb, int), public.student_record_activity(text, text, text, text, text, int, int, int) from public, anon, authenticated;
grant execute on function public.can_create_classes(), public.can_teach(uuid), public.create_class(text, int, text[]), public.add_students(uuid, int, text[]),
  public.reset_student_pin(uuid), public.rename_student(uuid, text), public.set_student_archived(uuid, boolean), public.rename_class(uuid, text),
  public.set_class_archived(uuid, boolean), public.student_login(text, int, text), public.student_logout(), public.student_me(),
  public.student_save_progress(jsonb, int), public.student_record_activity(text, text, text, text, text, int, int, int) to authenticated;
