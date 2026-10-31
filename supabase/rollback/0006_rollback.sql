-- Rollback of 0006_content_manager.sql. Removes drafts, version history, media rules and the two added columns.
-- Published courses in public.course_content stay. Export course_drafts / course_versions first if you need them.
-- Files in the Storage bucket "course-media" are not deleted.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') and exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'objects') then
    execute 'drop policy if exists te_media_insert on storage.objects';
    execute 'drop policy if exists te_media_read on storage.objects';
  end if;
end $$;
drop function if exists public.can_read_course_media(text), public.can_upload_course_media(text), public.restore_course_version(text, int), public.course_history(text),
  public.unpublish_course(text), public.publish_course_draft(text), public.delete_course_draft(text), public.save_course_draft(text, text, jsonb),
  public.get_course_draft(text), public.teacher_courses(), public.can_edit_course(text);
drop function if exists private.check_course_doc(jsonb), private.require_edit(text);
drop table if exists public.course_versions, public.course_drafts;
alter table public.course_content drop column if exists published_by, drop column if exists owner_id;
