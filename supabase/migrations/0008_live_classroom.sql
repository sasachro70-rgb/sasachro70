-- Pasathai, part 8 (Phase G): Classroom and live lessons.
-- Builds on 0001–0005 (classes, students, homework). Additive only: new tables and functions, nothing existing changes.
--
-- What it adds
--   * public.class_announcements – short notices from the teacher to the class.
--   * public.class_schedule      – planned lessons (date, time, length, title, optionally a course lesson).
--   * public.live_sessions       – a live lesson: which lesson, which step is shown, paused/ended, the exercise on screen,
--                                  the sentence the teacher played. At most one open live lesson per class.
--                                  Holds nothing secret, so students may read their own class's row (needed for Realtime).
--   * public.live_exercise_keys  – the right answer of each exercise shown live. Only the database reads it (students never).
--   * public.live_messages       – questions, comments, answers and the teacher's private notes during a live lesson.
--   * public.live_presence       – when a student's device last followed the lesson (participation).
--
-- Who may do what (checked here, not in the page)
--   * The class's teacher (or an admin with classes.manage): start, control and end live lessons, write notes, answer questions,
--     post announcements and schedule. Teacher notes are never shown to students.
--   * Students of that class (Student Mode): read the class dashboard, follow the open live lesson, ask questions, write comments
--     and answer the exercise on screen (one answer per exercise, checked against the key here; changeable until the answer is shown).
--     A student sees comments, their own questions, questions the teacher answered, and their own answers – not other students' answers.
--   * Realtime: live_sessions is added to the "supabase_realtime" publication when it exists, so devices are told at once that
--     something changed and then ask the functions below for what they may see. Without Realtime, pages poll every few seconds.
-- Rollback: supabase/rollback/0008_rollback.sql.

create table public.class_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  author_id uuid not null,
  author_name text not null,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index class_announcements_class on public.class_announcements (class_id, created_at desc);

create table public.class_schedule (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  starts_at timestamptz not null,
  minutes int not null default 45 check (minutes between 5 and 480),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  course_id text check (course_id is null or course_id ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  lesson_id text check (lesson_id is null or char_length(lesson_id) <= 80),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index class_schedule_class on public.class_schedule (class_id, starts_at);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  teacher_id uuid not null,
  teacher_name text not null,
  course_id text not null check (course_id ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  lesson_id text not null check (char_length(lesson_id) between 1 and 80),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  status text not null default 'live' check (status in ('live', 'paused', 'ended')),
  step int not null default 0 check (step >= 0),
  steps int not null default 1 check (steps between 1 and 200),
  exercise jsonb,                 -- the question on screen (without its answer) or null
  exercise_seq int not null default 0,
  revealed boolean not null default false,
  audio_text text check (audio_text is null or char_length(audio_text) <= 400),
  audio_seq int not null default 0,
  rev bigint not null default 1,  -- goes up on every change (devices compare it)
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index live_sessions_one_open on public.live_sessions (class_id) where status <> 'ended';
create index live_sessions_class on public.live_sessions (class_id, started_at desc);

create table public.live_exercise_keys (
  session_id uuid not null references public.live_sessions on delete cascade,
  seq int not null,
  answer text not null check (char_length(answer) <= 200),
  primary key (session_id, seq)
);

create table public.live_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions on delete cascade,
  kind text not null check (kind in ('question', 'comment', 'note', 'answer')),
  author_kind text not null check (author_kind in ('teacher', 'student')),
  student_id uuid references public.students on delete cascade,
  author_name text not null,
  body text check (body is null or char_length(body) <= 1000),
  ex_seq int,
  choice text check (choice is null or char_length(choice) <= 200),
  ok boolean,
  reply text check (reply is null or char_length(reply) <= 1000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  check ((author_kind = 'student') = (student_id is not null)),
  check (kind <> 'note' or author_kind = 'teacher'),
  check (kind <> 'answer' or (author_kind = 'student' and ex_seq is not null and choice is not null))
);
create index live_messages_session on public.live_messages (session_id, created_at);
create unique index live_messages_one_answer on public.live_messages (session_id, ex_seq, student_id) where kind = 'answer';

create table public.live_presence (
  session_id uuid not null references public.live_sessions on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (session_id, student_id)
);

-- ============================================================================================
-- Helpers
-- ============================================================================================
create function private.live_require_teacher(p_session uuid) returns public.live_sessions
language plpgsql stable security definer set search_path = '' as $$
declare s public.live_sessions;
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select * into s from public.live_sessions where id = p_session;
  if s.id is null or not public.can_teach(s.class_id) then raise exception 'not_allowed' using errcode = '42501'; end if;
  return s;
end $$;

create function private.live_bump(p_session uuid) returns void
language sql security definer set search_path = '' as $$
  update public.live_sessions set rev = rev + 1, updated_at = now() where id = p_session
$$;

-- the public shape of a session (no keys)
create function private.live_row(s public.live_sessions) returns jsonb
language sql stable set search_path = '' as $$
  select case when s.id is null then null else jsonb_build_object('id', s.id, 'class_id', s.class_id, 'teacher_name', s.teacher_name, 'course_id', s.course_id,
    'lesson_id', s.lesson_id, 'title', s.title, 'status', s.status, 'step', s.step, 'steps', s.steps, 'exercise', s.exercise, 'exercise_seq', s.exercise_seq,
    'revealed', s.revealed, 'audio_text', s.audio_text, 'audio_seq', s.audio_seq, 'rev', s.rev, 'started_at', s.started_at, 'updated_at', s.updated_at,
    'ended_at', s.ended_at) end
$$;

-- whether a student's device is in the class's open session right now (seen in the last 40 seconds)
create function private.live_here(p_session uuid, p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.live_presence p where p.session_id = p_session and p.student_id = p_student and p.last_seen > now() - interval '40 seconds')
$$;

-- ============================================================================================
-- Teacher: announcements and schedule
-- ============================================================================================
create function public.class_announce(p_class uuid, p_body text, p_pinned boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.require_teacher_of(p_class);
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'empty'; end if;
  insert into public.class_announcements (class_id, author_id, author_name, body, pinned)
    values (p_class, auth.uid(), private.staff_name(), private.clean_text(p_body, 1000), coalesce(p_pinned, false)) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create function public.class_announcement_archive(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_class uuid;
begin
  select class_id into v_class from public.class_announcements where id = p_id;
  if v_class is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v_class);
  update public.class_announcements set archived_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create function public.class_schedule_add(p_class uuid, p_starts timestamptz, p_minutes int, p_title text, p_course text default null, p_lesson text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.require_teacher_of(p_class);
  if p_starts is null then raise exception 'no_time'; end if;
  if char_length(btrim(coalesce(p_title, ''))) < 1 then raise exception 'empty'; end if;
  if (select count(*) from public.class_schedule where class_id = p_class and starts_at > now()) >= 200 then raise exception 'too_many'; end if;
  insert into public.class_schedule (class_id, starts_at, minutes, title, course_id, lesson_id, note, created_by)
    values (p_class, p_starts, coalesce(p_minutes, 45), private.clean_text(p_title, 120), nullif(p_course, ''), nullif(p_lesson, ''), nullif(private.clean_text(p_note, 500), ''), auth.uid())
    returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create function public.class_schedule_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_class uuid;
begin
  select class_id into v_class from public.class_schedule where id = p_id;
  if v_class is null then raise exception 'not_found'; end if;
  perform private.require_teacher_of(v_class);
  delete from public.class_schedule where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- the class page for the teacher: announcements, schedule, the open live lesson, recent live lessons
create function public.teacher_classroom(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_teacher_of(p_class);
  return jsonb_build_object(
    'announcements', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'body', a.body, 'pinned', a.pinned, 'author_name', a.author_name, 'created_at', a.created_at)
        order by a.pinned desc, a.created_at desc) from public.class_announcements a where a.class_id = p_class and a.archived_at is null), '[]'),
    'schedule', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'starts_at', x.starts_at, 'minutes', x.minutes, 'title', x.title, 'course_id', x.course_id,
        'lesson_id', x.lesson_id, 'note', x.note) order by x.starts_at)
      from public.class_schedule x where x.class_id = p_class and x.starts_at + make_interval(mins => x.minutes) > now() - interval '12 hours'), '[]'),
    'live', (select private.live_row(s) from public.live_sessions s where s.class_id = p_class and s.status <> 'ended'),
    'recent', coalesce((select jsonb_agg(r order by r->>'started_at' desc) from (select jsonb_build_object('id', s.id, 'title', s.title, 'started_at', s.started_at, 'ended_at', s.ended_at,
        'students', (select count(*) from public.live_presence p where p.session_id = s.id)) r
      from public.live_sessions s where s.class_id = p_class and s.status = 'ended' order by s.started_at desc limit 10) q), '[]'));
end $$;

-- ============================================================================================
-- Teacher: live lesson
-- ============================================================================================
create function public.live_start(p_class uuid, p_course text, p_lesson text, p_title text, p_steps int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_open public.live_sessions; v_id uuid;
begin
  perform private.require_teacher_of(p_class);
  if (select archived_at from public.classes where id = p_class) is not null then raise exception 'class_archived'; end if;
  select * into v_open from public.live_sessions where class_id = p_class and status <> 'ended';
  if v_open.id is not null then return jsonb_build_object('ok', true, 'id', v_open.id, 'already_open', true); end if;
  insert into public.live_sessions (class_id, teacher_id, teacher_name, course_id, lesson_id, title, steps)
    values (p_class, auth.uid(), private.staff_name(), p_course, p_lesson, private.clean_text(p_title, 160), greatest(1, least(200, coalesce(p_steps, 1))))
    returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- one control action: step | pause | resume | end | exercise | reveal | clear | audio
create function public.live_control(p_session uuid, p_action text, p_step int default null, p_exercise jsonb default null, p_answer text default null, p_audio text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.live_sessions := private.live_require_teacher(p_session); v_seq int;
begin
  if s.status = 'ended' then raise exception 'ended'; end if;
  if p_action = 'step' then
    if p_step is null or p_step < 0 or p_step >= s.steps then raise exception 'bad_step'; end if;
    update public.live_sessions set step = p_step where id = s.id;
  elsif p_action = 'pause' then update public.live_sessions set status = 'paused' where id = s.id;
  elsif p_action = 'resume' then update public.live_sessions set status = 'live' where id = s.id;
  elsif p_action = 'end' then
    update public.live_sessions set status = 'ended', ended_at = now(), exercise = null where id = s.id;
  elsif p_action = 'exercise' then
    if p_exercise is null or jsonb_typeof(p_exercise) <> 'object' or octet_length(p_exercise::text) > 8000 then raise exception 'bad_exercise'; end if;
    if p_answer is null or char_length(p_answer) < 1 or char_length(p_answer) > 200 then raise exception 'bad_answer'; end if;
    v_seq := s.exercise_seq + 1;
    insert into public.live_exercise_keys (session_id, seq, answer) values (s.id, v_seq, p_answer);
    update public.live_sessions set exercise = (p_exercise - 'answer') || jsonb_build_object('seq', v_seq), exercise_seq = v_seq, revealed = false where id = s.id;
  elsif p_action = 'reveal' then
    if s.exercise is null then raise exception 'no_exercise'; end if;
    update public.live_sessions set revealed = true,
      exercise = exercise || jsonb_build_object('answer', (select k.answer from public.live_exercise_keys k where k.session_id = s.id and k.seq = s.exercise_seq))
      where id = s.id;
  elsif p_action = 'clear' then update public.live_sessions set exercise = null, revealed = false where id = s.id;
  elsif p_action = 'audio' then
    if p_audio is null or char_length(btrim(p_audio)) < 1 or char_length(p_audio) > 400 then raise exception 'bad_audio'; end if;
    update public.live_sessions set audio_text = p_audio, audio_seq = audio_seq + 1 where id = s.id;
  else raise exception 'bad_action';
  end if;
  perform private.live_bump(s.id);
  return jsonb_build_object('ok', true, 'session', (select private.live_row(x) from public.live_sessions x where x.id = s.id));
end $$;

-- everything the teacher sees: the session, all messages (incl. notes), who is here, answers to the current exercise
create function public.live_teacher_state(p_session uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.live_sessions := private.live_require_teacher(p_session);
begin
  return jsonb_build_object('session', private.live_row(s),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'author_kind', m.author_kind, 'student_id', m.student_id, 'author_name', m.author_name,
        'body', m.body, 'reply', m.reply, 'replied_at', m.replied_at, 'created_at', m.created_at) order by m.created_at)
      from public.live_messages m where m.session_id = s.id and m.kind <> 'answer'), '[]'),
    'students', coalesce((select jsonb_agg(jsonb_build_object('id', st.id, 'no', st.student_no, 'name', st.display_name,
        'here', private.live_here(s.id, st.id),
        'joined', exists (select 1 from public.live_presence p where p.session_id = s.id and p.student_id = st.id),
        'answers', (select count(*) from public.live_messages m where m.session_id = s.id and m.student_id = st.id and m.kind = 'answer'),
        'right', (select count(*) from public.live_messages m where m.session_id = s.id and m.student_id = st.id and m.kind = 'answer' and m.ok),
        'posts', (select count(*) from public.live_messages m where m.session_id = s.id and m.student_id = st.id and m.kind in ('question', 'comment')),
        'current', (select jsonb_build_object('choice', m.choice, 'ok', m.ok) from public.live_messages m where m.session_id = s.id and m.student_id = st.id and m.kind = 'answer' and m.ex_seq = s.exercise_seq))
      order by st.student_no) from public.students st where st.class_id = s.class_id and st.archived_at is null), '[]'),
    'key', (select k.answer from public.live_exercise_keys k where k.session_id = s.id and k.seq = s.exercise_seq));
end $$;

-- teacher: a private note, or a comment to the whole class
create function public.live_teacher_post(p_session uuid, p_kind text, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.live_sessions := private.live_require_teacher(p_session);
begin
  if p_kind not in ('note', 'comment') then raise exception 'bad_kind'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'empty'; end if;
  insert into public.live_messages (session_id, kind, author_kind, author_name, body) values (s.id, p_kind, 'teacher', private.staff_name(), private.clean_text(p_body, 1000));
  if p_kind = 'comment' then perform private.live_bump(s.id); end if;
  return jsonb_build_object('ok', true);
end $$;

-- teacher answers a student's question; the question and answer then show for the whole class
create function public.live_reply(p_message uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session uuid;
begin
  select session_id into v_session from public.live_messages where id = p_message and kind = 'question';
  if v_session is null then raise exception 'not_found'; end if;
  perform private.live_require_teacher(v_session);
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'empty'; end if;
  update public.live_messages set reply = private.clean_text(p_body, 1000), replied_at = now() where id = p_message;
  perform private.live_bump(v_session);
  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================================
-- Student
-- ============================================================================================
-- the class dashboard for a student: class, teacher, announcements, schedule, the open live lesson
create function public.student_classroom() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.students := private.current_student(); c public.classes;
begin
  select * into c from public.classes where id = v.class_id;
  return jsonb_build_object('class_name', c.name, 'student_name', v.display_name, 'student_no', v.student_no,
    'teacher_name', (select a.display_name from public.app_accounts a where a.user_id = c.teacher_id),
    'announcements', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'body', a.body, 'pinned', a.pinned, 'author_name', a.author_name, 'created_at', a.created_at)
        order by a.pinned desc, a.created_at desc) from (select * from public.class_announcements where class_id = c.id and archived_at is null order by pinned desc, created_at desc limit 20) a), '[]'),
    'schedule', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'starts_at', x.starts_at, 'minutes', x.minutes, 'title', x.title, 'course_id', x.course_id,
        'lesson_id', x.lesson_id, 'note', x.note) order by x.starts_at)
      from (select * from public.class_schedule where class_id = c.id and starts_at + make_interval(mins => minutes) > now() - interval '12 hours' order by starts_at limit 30) x), '[]'),
    'live', (select private.live_row(s) from public.live_sessions s where s.class_id = c.id and s.status <> 'ended'));
end $$;

-- what a student sees of the open live lesson; also marks the student as here (participation)
create function public.live_student_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.students := private.current_student(); s public.live_sessions;
begin
  select * into s from public.live_sessions where class_id = v.class_id and status <> 'ended';
  if s.id is null then
    return jsonb_build_object('class_id', v.class_id, 'session', (select private.live_row(x) from public.live_sessions x where x.class_id = v.class_id order by x.started_at desc limit 1), 'messages', '[]'::jsonb, 'mine', null);
  end if;
  insert into public.live_presence (session_id, student_id) values (s.id, v.id)
    on conflict (session_id, student_id) do update set last_seen = now();
  update public.students set last_active_at = now() where id = v.id and (last_active_at is null or last_active_at < now() - interval '1 minute');
  return jsonb_build_object('class_id', v.class_id, 'session', private.live_row(s),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'author_kind', m.author_kind, 'author_name', m.author_name, 'mine', m.student_id = v.id,
        'body', m.body, 'reply', m.reply, 'created_at', m.created_at) order by m.created_at)
      from public.live_messages m where m.session_id = s.id
        and (m.kind = 'comment' or (m.kind = 'question' and (m.student_id = v.id or m.reply is not null)))), '[]'),
    'mine', (select jsonb_build_object('seq', m.ex_seq, 'choice', m.choice, 'ok', case when s.revealed then m.ok end)
      from public.live_messages m where m.session_id = s.id and m.student_id = v.id and m.kind = 'answer' and m.ex_seq = s.exercise_seq));
end $$;

create function public.live_student_post(p_kind text, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.students := private.current_student(); s public.live_sessions; v_recent int;
begin
  if p_kind not in ('question', 'comment') then raise exception 'bad_kind'; end if;
  select * into s from public.live_sessions where class_id = v.class_id and status <> 'ended';
  if s.id is null then raise exception 'no_live_lesson'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 then raise exception 'empty'; end if;
  select count(*) into v_recent from public.live_messages where session_id = s.id and student_id = v.id and kind in ('question', 'comment') and created_at > now() - interval '5 minutes';
  if v_recent >= 15 then raise exception 'too_many_messages'; end if;
  insert into public.live_messages (session_id, kind, author_kind, student_id, author_name, body)
    values (s.id, p_kind, 'student', v.id, left(v.display_name, 60), private.clean_text(p_body, 500));
  perform private.live_bump(s.id);
  return jsonb_build_object('ok', true);
end $$;

-- answer the exercise on screen; can be changed until the teacher shows the answer
create function public.live_student_answer(p_seq int, p_choice text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.students := private.current_student(); s public.live_sessions; v_key text; v_ok boolean;
begin
  select * into s from public.live_sessions where class_id = v.class_id and status <> 'ended';
  if s.id is null then raise exception 'no_live_lesson'; end if;
  if s.status = 'paused' then raise exception 'paused'; end if;
  if s.exercise is null or p_seq is distinct from s.exercise_seq then raise exception 'not_current'; end if;
  if s.revealed then raise exception 'already_revealed'; end if;
  if p_choice is null or char_length(p_choice) < 1 or char_length(p_choice) > 200 then raise exception 'bad_choice'; end if;
  select answer into v_key from public.live_exercise_keys where session_id = s.id and seq = s.exercise_seq;
  v_ok := lower(regexp_replace(p_choice, '\s+', '', 'g')) = lower(regexp_replace(v_key, '\s+', '', 'g'));
  insert into public.live_messages (session_id, kind, author_kind, student_id, author_name, ex_seq, choice, ok)
    values (s.id, 'answer', 'student', v.id, left(v.display_name, 60), s.exercise_seq, p_choice, v_ok)
    on conflict (session_id, ex_seq, student_id) where kind = 'answer' do update set choice = excluded.choice, ok = excluded.ok, created_at = now();
  perform private.live_bump(s.id);
  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================================
-- Row level security, grants, Realtime
-- ============================================================================================
alter table public.class_announcements enable row level security;
alter table public.class_schedule enable row level security;
alter table public.live_sessions enable row level security;
alter table public.live_exercise_keys enable row level security;
alter table public.live_messages enable row level security;
alter table public.live_presence enable row level security;
-- direct reads only for the live_sessions row (no secrets in it): the class's teacher, and students of that class.
-- Everything else goes through the functions above. No direct writes anywhere.
create function public.live_can_read(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_teach(p_class) or exists (select 1 from public.students s where s.id = public.my_student_id() and s.class_id = p_class)
$$;
revoke all on function public.live_can_read(uuid) from public, anon;
grant execute on function public.live_can_read(uuid) to authenticated;
create policy live_sessions_read on public.live_sessions for select to authenticated using (public.live_can_read(class_id));
revoke all on public.class_announcements, public.class_schedule, public.live_exercise_keys, public.live_messages, public.live_presence from anon, authenticated;
revoke all on public.live_sessions from anon, authenticated;
grant select on public.live_sessions to authenticated;

revoke all on function private.live_require_teacher(uuid), private.live_bump(uuid), private.live_row(public.live_sessions), private.live_here(uuid, uuid) from public, anon, authenticated;
revoke all on function public.class_announce(uuid, text, boolean), public.class_announcement_archive(uuid),
  public.class_schedule_add(uuid, timestamptz, int, text, text, text, text), public.class_schedule_delete(uuid), public.teacher_classroom(uuid),
  public.live_start(uuid, text, text, text, int), public.live_control(uuid, text, int, jsonb, text, text), public.live_teacher_state(uuid),
  public.live_teacher_post(uuid, text, text), public.live_reply(uuid, text),
  public.student_classroom(), public.live_student_state(), public.live_student_post(text, text), public.live_student_answer(int, text)
  from public, anon, authenticated;
grant execute on function public.class_announce(uuid, text, boolean), public.class_announcement_archive(uuid),
  public.class_schedule_add(uuid, timestamptz, int, text, text, text, text), public.class_schedule_delete(uuid), public.teacher_classroom(uuid),
  public.live_start(uuid, text, text, text, int), public.live_control(uuid, text, int, jsonb, text, text), public.live_teacher_state(uuid),
  public.live_teacher_post(uuid, text, text), public.live_reply(uuid, text),
  public.student_classroom(), public.live_student_state(), public.live_student_post(text, text), public.live_student_answer(int, text)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.live_sessions';
  end if;
end $$;
