-- ThaiElevate, part 5 (Phase H): homework, hand-in, teacher review and feedback, student comments,
-- and protected course content (the teaching material that must never be public).
-- Builds on 0001–0004. Purely additive: no existing table, policy or function is changed.
--
-- Who may read teaching material (public.can_read_teaching()):
--   * an approved account with role teacher, admin or super_admin (or classes.manage),
--   * a device signed in as a student (student_login) whose student and class are not archived.
--   Everybody else – anonymous visitors, guests, parents, pending or suspended accounts – gets nothing.
--
-- Tables
--   public.course_content     protected lessons (for example the BOOK 42 course) as one JSON document per course,
--                             with a version; written only by the System Creator / Admins with classes.manage
--   public.assignments        homework for one class: title, instructions, optional lesson link, due date, max score, resubmit rule
--   public.submissions        every hand-in is a new version (1, 2, 3 …): text answer and/or one file in Storage;
--                             status submitted / returned (correction asked) / approved; score and reviewer
--   public.homework_messages  the conversation per student and assignment: teacher feedback (author_kind 'teacher') and
--                             student comments ('student'); append-only – nobody can edit or delete, not even the teacher
-- Storage
--   bucket "submissions" (private, 10 MB, pdf / images / audio / docx / txt). A student uploads only under
--   "<own student id>/…"; a student reads only their own files; a teacher reads files of students in their classes.
--   Storage policies are only created when the storage schema exists (on Supabase; not in the test database).
-- Rules: clients never write tables; every change goes through the functions below, which re-check rights on every call.
-- Rollback: supabase/rollback/0005_rollback.sql.

-- ============================================================================================
-- Tables
-- ============================================================================================
create table public.course_content (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  doc jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  instructions text not null default '' check (char_length(instructions) <= 4000),
  course_key text check (course_key is null or char_length(course_key) <= 40),
  lesson_id text check (lesson_id is null or char_length(lesson_id) <= 60),
  due_at timestamptz,
  max_score int not null default 10 check (max_score between 0 and 1000),
  allow_resubmit boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index assignments_class on public.assignments (class_id, created_at desc);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments on delete restrict,
  student_id uuid not null references public.students on delete restrict,
  version int not null check (version between 1 and 50),
  status text not null default 'submitted' check (status in ('submitted', 'returned', 'approved')),
  answer text not null default '' check (char_length(answer) <= 8000),
  file_path text check (file_path is null or char_length(file_path) <= 300),
  file_name text check (file_name is null or char_length(file_name) <= 160),
  file_type text check (file_type is null or char_length(file_type) <= 100),
  submitted_at timestamptz not null default now(),
  late boolean not null default false,
  score int,
  reviewed_at timestamptz,
  reviewed_by uuid,
  unique (assignment_id, student_id, version)
);
create index submissions_student on public.submissions (student_id, assignment_id, version desc);

create table public.homework_messages (
  id bigint generated always as identity primary key,
  assignment_id uuid not null references public.assignments on delete restrict,
  student_id uuid not null references public.students on delete restrict,
  submission_version int,
  author_kind text not null check (author_kind in ('teacher', 'student')),
  author_user uuid,
  author_name text not null check (char_length(author_name) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index homework_messages_thread on public.homework_messages (assignment_id, student_id, id);

-- messages and old submission versions are history: nobody changes them afterwards
create function private.block_history_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'history_is_read_only' using errcode = '42501';
end $$;
create trigger homework_messages_read_only before update or delete on public.homework_messages
  for each row execute function private.block_history_change();
create trigger homework_messages_no_truncate before truncate on public.homework_messages
  for each statement execute function private.block_history_change();

-- ============================================================================================
-- Helpers
-- ============================================================================================
-- the student id of this device, or null (never raises)
create function public.my_student_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.student_sessions ss join public.students s on s.id = ss.student_id join public.classes c on c.id = s.class_id
  where ss.user_id = auth.uid() and s.archived_at is null and c.archived_at is null
$$;

-- approved teacher / admin / System Creator
create function public.is_teaching_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_permission('classes.manage')
      or (public.is_approved() and exists (select 1 from public.app_accounts a where a.user_id = auth.uid() and a.role in ('teacher', 'admin', 'super_admin')))
$$;

create function public.can_read_teaching() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (public.is_teaching_staff() or public.my_student_id() is not null)
$$;

-- who is asking, for the app: { ok, kind: 'staff' | 'student' | null, ... }
create function public.teaching_access() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_sid uuid := public.my_student_id(); v_name text; v_class text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if public.is_teaching_staff() then
    return jsonb_build_object('ok', true, 'kind', 'staff', 'name', (select a.display_name from public.app_accounts a where a.user_id = auth.uid()));
  end if;
  if v_sid is not null then
    select s.display_name, c.name into v_name, v_class from public.students s join public.classes c on c.id = s.class_id where s.id = v_sid;
    return jsonb_build_object('ok', true, 'kind', 'student', 'student_id', v_sid, 'name', v_name, 'class_name', v_class);
  end if;
  return jsonb_build_object('ok', false, 'reason', 'no_teaching_access');
end $$;

create function private.require_teaching() returns void
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not public.can_read_teaching() then raise exception 'no_teaching_access' using errcode = '42501'; end if;
end $$;

create function private.clean_text(p text, p_max int) returns text
language sql immutable set search_path = '' as $$
  select left(btrim(coalesce(p, '')), p_max)
$$;

-- a teacher's name for messages
create function private.staff_name() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select left(a.display_name, 60) from public.app_accounts a where a.user_id = auth.uid()), 'Lärare')
$$;

-- may this signed-in user read this Storage object of the submissions bucket? ("<student id>/<file>")
create function public.can_read_submission_file(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_sid uuid;
begin
  begin v_sid := split_part(coalesce(p_name, ''), '/', 1)::uuid; exception when others then return false; end;
  return coalesce(v_sid = public.my_student_id(), false)
      or coalesce(public.can_teach((select s.class_id from public.students s where s.id = v_sid)), false);
end $$;

create function public.can_upload_submission_file(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_sid uuid := public.my_student_id();
begin
  return coalesce(v_sid is not null and split_part(coalesce(p_name, ''), '/', 1) = v_sid::text and p_name !~ '\.\.' and char_length(p_name) <= 300, false);
end $$;

-- ============================================================================================
-- Protected course content
-- ============================================================================================
create function public.get_course_content(p_id text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.course_content;
begin
  perform private.require_teaching();
  select * into v from public.course_content where id = p_id;
  if v.id is null then return null; end if;
  return jsonb_build_object('id', v.id, 'title', v.title, 'version', v.version, 'updated_at', v.updated_at, 'doc', v.doc);
end $$;

-- the list of protected courses (id, title, version) for this reader
create function public.list_course_content() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_teaching();
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'version', version, 'updated_at', updated_at) order by id) from public.course_content), '[]');
end $$;

-- System Creator / Admin with classes.manage: create or replace a protected course
create function public.save_course_content(p_id text, p_title text, p_doc jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_version int;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not public.has_permission('classes.manage') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_doc is null or jsonb_typeof(p_doc) <> 'object' or coalesce(jsonb_typeof(p_doc -> 'lessons'), '') <> 'array' then raise exception 'bad_document'; end if;
  if octet_length(p_doc::text) > 2000000 then raise exception 'document_too_large'; end if;
  insert into public.course_content (id, title, doc, updated_by) values (p_id, private.clean_text(p_title, 120), p_doc, auth.uid())
    on conflict (id) do update set title = excluded.title, doc = excluded.doc, version = public.course_content.version + 1, updated_at = now(), updated_by = auth.uid()
    returning version into v_version;
  return jsonb_build_object('ok', true, 'id', p_id, 'version', v_version);
end $$;

-- ============================================================================================
-- Homework: teacher
-- ============================================================================================
create function public.create_assignment(p_class uuid, p_title text, p_instructions text, p_due timestamptz default null,
  p_course text default null, p_lesson text default null, p_max_score int default 10, p_allow_resubmit boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.require_teacher_of(p_class);
  if exists (select 1 from public.classes where id = p_class and archived_at is not null) then raise exception 'class_archived'; end if;
  if char_length(private.clean_text(p_title, 120)) < 1 then raise exception 'title_required'; end if;
  insert into public.assignments (class_id, title, instructions, due_at, course_key, lesson_id, max_score, allow_resubmit, created_by)
    values (p_class, private.clean_text(p_title, 120), private.clean_text(p_instructions, 4000), p_due, nullif(private.clean_text(p_course, 40), ''),
            nullif(private.clean_text(p_lesson, 60), ''), greatest(0, least(coalesce(p_max_score, 10), 1000)), coalesce(p_allow_resubmit, true), auth.uid())
    returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create function public.update_assignment(p_id uuid, p_title text, p_instructions text, p_due timestamptz, p_max_score int, p_allow_resubmit boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.assignments;
begin
  select * into v from public.assignments where id = p_id;
  if v.id is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v.class_id);
  if char_length(private.clean_text(p_title, 120)) < 1 then raise exception 'title_required'; end if;
  update public.assignments set title = private.clean_text(p_title, 120), instructions = private.clean_text(p_instructions, 4000), due_at = p_due,
    max_score = greatest(0, least(coalesce(p_max_score, max_score), 1000)), allow_resubmit = coalesce(p_allow_resubmit, allow_resubmit) where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create function public.set_assignment_archived(p_id uuid, p_archived boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.assignments;
begin
  select * into v from public.assignments where id = p_id;
  if v.id is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v.class_id);
  update public.assignments set archived_at = case when p_archived then now() else null end where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- the class's assignments with counts: students, waiting for review, returned, approved, not handed in, late
create function public.teacher_assignments(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_teacher_of(p_class);
  return coalesce((
    select jsonb_agg(x order by x->>'created_at' desc) from (
      select jsonb_build_object('id', a.id, 'title', a.title, 'instructions', a.instructions, 'due_at', a.due_at, 'course_key', a.course_key,
        'lesson_id', a.lesson_id, 'max_score', a.max_score, 'allow_resubmit', a.allow_resubmit, 'created_at', a.created_at, 'archived_at', a.archived_at,
        'students', (select count(*) from public.students s where s.class_id = a.class_id and s.archived_at is null),
        'pending', count(l.*) filter (where l.status = 'submitted'),
        'returned', count(l.*) filter (where l.status = 'returned'),
        'approved', count(l.*) filter (where l.status = 'approved'),
        'late', count(l.*) filter (where l.late)) as x
      from public.assignments a
      left join lateral (select distinct on (sb.student_id) sb.* from public.submissions sb where sb.assignment_id = a.id order by sb.student_id, sb.version desc) l on true
      where a.class_id = p_class
      group by a.id
    ) q), '[]');
end $$;

-- one assignment: every active student of the class with their latest submission (or none)
create function public.teacher_submissions(p_assignment uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.assignments;
begin
  select * into v from public.assignments where id = p_assignment;
  if v.id is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v.class_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object('student_id', s.id, 'student_no', s.student_no, 'name', s.display_name,
      'submission', case when l.id is null then null else jsonb_build_object('id', l.id, 'version', l.version, 'status', l.status, 'late', l.late,
        'submitted_at', l.submitted_at, 'score', l.score, 'reviewed_at', l.reviewed_at, 'has_file', l.file_path is not null) end,
      'messages', (select count(*) from public.homework_messages m where m.assignment_id = v.id and m.student_id = s.id)) order by s.student_no)
    from public.students s
    left join lateral (select * from public.submissions sb where sb.assignment_id = v.id and sb.student_id = s.id order by sb.version desc limit 1) l on true
    where s.class_id = v.class_id and s.archived_at is null), '[]');
end $$;

-- the whole thread of one student: every version and every message
create function private.thread(p_assignment uuid, p_student uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'submissions', coalesce((select jsonb_agg(jsonb_build_object('id', sb.id, 'version', sb.version, 'status', sb.status, 'answer', sb.answer,
        'file_path', sb.file_path, 'file_name', sb.file_name, 'file_type', sb.file_type, 'submitted_at', sb.submitted_at, 'late', sb.late,
        'score', sb.score, 'reviewed_at', sb.reviewed_at) order by sb.version)
      from public.submissions sb where sb.assignment_id = p_assignment and sb.student_id = p_student), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.author_kind, 'name', m.author_name, 'body', m.body,
        'version', m.submission_version, 'at', m.created_at) order by m.id)
      from public.homework_messages m where m.assignment_id = p_assignment and m.student_id = p_student), '[]'))
$$;

create function public.teacher_thread(p_assignment uuid, p_student uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.assignments;
begin
  select * into v from public.assignments where id = p_assignment;
  if v.id is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v.class_id);
  if not exists (select 1 from public.students s where s.id = p_student and s.class_id = v.class_id) then raise exception 'not_found'; end if;
  return jsonb_build_object('assignment', jsonb_build_object('id', v.id, 'title', v.title, 'instructions', v.instructions, 'due_at', v.due_at, 'max_score', v.max_score),
    'student', (select jsonb_build_object('id', s.id, 'student_no', s.student_no, 'name', s.display_name) from public.students s where s.id = p_student))
    || private.thread(p_assignment, p_student);
end $$;

-- review the latest submission: score, approve or ask for a correction, optional comment (stored as teacher feedback)
create function public.review_submission(p_submission uuid, p_status text, p_score int, p_comment text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.submissions; a public.assignments; v_latest int;
begin
  select * into v from public.submissions where id = p_submission;
  if v.id is null then raise exception 'not_found'; end if;
  select * into a from public.assignments where id = v.assignment_id;
  perform private.require_teacher_of(a.class_id);
  if p_status not in ('approved', 'returned') then raise exception 'bad_status'; end if;
  select max(version) into v_latest from public.submissions where assignment_id = v.assignment_id and student_id = v.student_id;
  if v.version <> v_latest then raise exception 'not_latest_version'; end if;
  update public.submissions set status = p_status, score = case when p_score is null then null else greatest(0, least(p_score, a.max_score)) end,
    reviewed_at = now(), reviewed_by = auth.uid() where id = v.id;
  if char_length(btrim(coalesce(p_comment, ''))) > 0 then
    insert into public.homework_messages (assignment_id, student_id, submission_version, author_kind, author_user, author_name, body)
      values (v.assignment_id, v.student_id, v.version, 'teacher', auth.uid(), private.staff_name(), private.clean_text(p_comment, 4000));
  end if;
  return jsonb_build_object('ok', true);
end $$;

create function public.teacher_comment(p_assignment uuid, p_student uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.assignments;
begin
  select * into a from public.assignments where id = p_assignment;
  if a.id is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(a.class_id);
  if not exists (select 1 from public.students s where s.id = p_student and s.class_id = a.class_id) then raise exception 'not_found'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'empty'; end if;
  insert into public.homework_messages (assignment_id, student_id, submission_version, author_kind, author_user, author_name, body)
    values (a.id, p_student, (select max(version) from public.submissions where assignment_id = a.id and student_id = p_student), 'teacher', auth.uid(), private.staff_name(), private.clean_text(p_body, 4000));
  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================================
-- Homework: student (the device must be signed in as a student)
-- ============================================================================================
create function public.student_assignments() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.students := private.current_student();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'instructions', a.instructions, 'due_at', a.due_at, 'course_key', a.course_key,
      'lesson_id', a.lesson_id, 'max_score', a.max_score, 'allow_resubmit', a.allow_resubmit, 'created_at', a.created_at,
      'status', l.status, 'version', l.version, 'score', l.score, 'late', l.late, 'submitted_at', l.submitted_at,
      'teacher_messages', (select count(*) from public.homework_messages m where m.assignment_id = a.id and m.student_id = v.id and m.author_kind = 'teacher'))
      order by coalesce(a.due_at, a.created_at))
    from public.assignments a
    left join lateral (select * from public.submissions sb where sb.assignment_id = a.id and sb.student_id = v.id order by sb.version desc limit 1) l on true
    where a.class_id = v.class_id and a.archived_at is null), '[]');
end $$;

create function public.student_thread(p_assignment uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.students := private.current_student(); a public.assignments;
begin
  select * into a from public.assignments where id = p_assignment and class_id = v.class_id and archived_at is null;
  if a.id is null then raise exception 'not_found'; end if;
  return jsonb_build_object('assignment', jsonb_build_object('id', a.id, 'title', a.title, 'instructions', a.instructions, 'due_at', a.due_at,
      'max_score', a.max_score, 'allow_resubmit', a.allow_resubmit, 'course_key', a.course_key, 'lesson_id', a.lesson_id))
    || private.thread(a.id, v.id);
end $$;

-- hand in (a new version). Allowed: the first time; again when the teacher asked for a correction; again before review when
-- the assignment allows resubmitting. Never after approval. A file must already be uploaded under "<own student id>/".
create function public.student_submit(p_assignment uuid, p_answer text, p_file_path text default null, p_file_name text default null, p_file_type text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.students := private.current_student(); a public.assignments; l public.submissions; v_version int;
begin
  select * into a from public.assignments where id = p_assignment and class_id = v.class_id and archived_at is null;
  if a.id is null then raise exception 'not_found'; end if;
  if char_length(btrim(coalesce(p_answer, ''))) = 0 and p_file_path is null then raise exception 'empty'; end if;
  if p_file_path is not null and (split_part(p_file_path, '/', 1) <> v.id::text or p_file_path ~ '\.\.' or char_length(p_file_path) > 300) then raise exception 'bad_file_path'; end if;
  perform 1 from public.students where id = v.id for update;   -- one hand-in at a time per student
  select * into l from public.submissions where assignment_id = a.id and student_id = v.id order by version desc limit 1;
  if l.id is not null then
    if l.status = 'approved' then raise exception 'already_approved'; end if;
    if l.status = 'submitted' and not a.allow_resubmit then raise exception 'waiting_for_review'; end if;
    if l.version >= 50 then raise exception 'too_many_versions'; end if;
  end if;
  v_version := coalesce(l.version, 0) + 1;
  insert into public.submissions (assignment_id, student_id, version, answer, file_path, file_name, file_type, late)
    values (a.id, v.id, v_version, private.clean_text(p_answer, 8000), p_file_path, left(p_file_name, 160), left(p_file_type, 100), a.due_at is not null and now() > a.due_at);
  update public.students set last_active_at = now() where id = v.id;
  return jsonb_build_object('ok', true, 'version', v_version);
end $$;

create function public.student_comment(p_assignment uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.students := private.current_student(); a public.assignments; v_recent int;
begin
  select * into a from public.assignments where id = p_assignment and class_id = v.class_id and archived_at is null;
  if a.id is null then raise exception 'not_found'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'empty'; end if;
  select count(*) into v_recent from public.homework_messages where student_id = v.id and author_kind = 'student' and created_at > now() - interval '10 minutes';
  if v_recent >= 20 then raise exception 'too_many_messages'; end if;
  insert into public.homework_messages (assignment_id, student_id, submission_version, author_kind, author_name, body)
    values (a.id, v.id, (select max(version) from public.submissions where assignment_id = a.id and student_id = v.id), 'student', left(v.display_name, 60), private.clean_text(p_body, 2000));
  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================================
-- Row level security, grants
-- ============================================================================================
alter table public.course_content enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.homework_messages enable row level security;
-- no policies: nobody reads these tables directly; everything goes through the functions above

revoke all on public.course_content, public.assignments, public.submissions, public.homework_messages from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

revoke all on function public.my_student_id(), public.is_teaching_staff(), public.can_read_teaching(), public.teaching_access(),
  public.can_read_submission_file(text), public.can_upload_submission_file(text),
  public.get_course_content(text), public.list_course_content(), public.save_course_content(text, text, jsonb),
  public.create_assignment(uuid, text, text, timestamptz, text, text, int, boolean), public.update_assignment(uuid, text, text, timestamptz, int, boolean),
  public.set_assignment_archived(uuid, boolean), public.teacher_assignments(uuid), public.teacher_submissions(uuid), public.teacher_thread(uuid, uuid),
  public.review_submission(uuid, text, int, text), public.teacher_comment(uuid, uuid, text),
  public.student_assignments(), public.student_thread(uuid), public.student_submit(uuid, text, text, text, text), public.student_comment(uuid, text)
  from public, anon, authenticated;
grant execute on function public.my_student_id(), public.is_teaching_staff(), public.can_read_teaching(), public.teaching_access(),
  public.can_read_submission_file(text), public.can_upload_submission_file(text),
  public.get_course_content(text), public.list_course_content(), public.save_course_content(text, text, jsonb),
  public.create_assignment(uuid, text, text, timestamptz, text, text, int, boolean), public.update_assignment(uuid, text, text, timestamptz, int, boolean),
  public.set_assignment_archived(uuid, boolean), public.teacher_assignments(uuid), public.teacher_submissions(uuid), public.teacher_thread(uuid, uuid),
  public.review_submission(uuid, text, int, text), public.teacher_comment(uuid, uuid, text),
  public.student_assignments(), public.student_thread(uuid), public.student_submit(uuid, text, text, text, text), public.student_comment(uuid, text)
  to authenticated;

-- ============================================================================================
-- Storage (Supabase only): private bucket for hand-ins
-- ============================================================================================
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') and exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('submissions', 'submissions', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav', 'audio/x-m4a',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
      on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
    execute 'create policy te_submissions_insert on storage.objects for insert to authenticated with check (bucket_id = ''submissions'' and public.can_upload_submission_file(name))';
    execute 'create policy te_submissions_read on storage.objects for select to authenticated using (bucket_id = ''submissions'' and public.can_read_submission_file(name))';
    -- no update or delete policy: a handed-in file stays as it was (a new version uploads a new file)
  end if;
end $$;
