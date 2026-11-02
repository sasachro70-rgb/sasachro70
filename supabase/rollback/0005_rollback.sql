-- Rollback of 0005_homework_protected_content.sql. Removes only what 0005 created; 0001–0004 keep working.
-- Export assignments, submissions, homework_messages and course_content first if you need them.
-- Files in the Storage bucket "submissions" are not deleted by this script (remove them in the Dashboard if wanted).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') and exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'objects') then
    execute 'drop policy if exists te_submissions_insert on storage.objects';
    execute 'drop policy if exists te_submissions_read on storage.objects';
  end if;
end $$;
drop function if exists public.student_comment(uuid, text), public.student_submit(uuid, text, text, text, text), public.student_thread(uuid), public.student_assignments(),
  public.teacher_comment(uuid, uuid, text), public.review_submission(uuid, text, int, text), public.teacher_thread(uuid, uuid), public.teacher_submissions(uuid),
  public.teacher_assignments(uuid), public.set_assignment_archived(uuid, boolean), public.update_assignment(uuid, text, text, timestamptz, int, boolean),
  public.create_assignment(uuid, text, text, timestamptz, text, text, int, boolean), public.save_course_content(text, text, jsonb), public.list_course_content(),
  public.get_course_content(text), public.can_upload_submission_file(text), public.can_read_submission_file(text), public.teaching_access(),
  public.can_read_teaching(), public.is_teaching_staff(), public.my_student_id();
drop function if exists private.thread(uuid, uuid), private.staff_name(), private.clean_text(text, int), private.require_teaching();
drop table if exists public.homework_messages, public.submissions, public.assignments, public.course_content;
drop function if exists private.block_history_change();
