-- Rollback of 0008_live_classroom.sql. Removes announcements, schedule and live lessons (export them first if you want to keep them).
do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_sessions') then
    execute 'alter publication supabase_realtime drop table public.live_sessions';
  end if;
end $$;
drop policy if exists live_sessions_read on public.live_sessions;
drop function if exists public.live_can_read(uuid);
drop function if exists public.live_student_answer(int, text), public.live_student_post(text, text), public.live_student_state(), public.student_classroom(),
  public.live_reply(uuid, text), public.live_teacher_post(uuid, text, text), public.live_teacher_state(uuid),
  public.live_control(uuid, text, int, jsonb, text, text), public.live_start(uuid, text, text, text, int), public.teacher_classroom(uuid),
  public.class_schedule_delete(uuid), public.class_schedule_add(uuid, timestamptz, int, text, text, text, text),
  public.class_announcement_archive(uuid), public.class_announce(uuid, text, boolean);
drop function if exists private.live_here(uuid, uuid), private.live_row(public.live_sessions), private.live_bump(uuid), private.live_require_teacher(uuid);
drop table if exists public.live_presence, public.live_messages, public.live_exercise_keys, public.live_sessions, public.class_schedule, public.class_announcements;
