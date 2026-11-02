-- Rollback for 0004_classes_students.sql. Removes ONLY what 0004 created and restores the original create_family()
-- (anyone with a permanent account may create a family again). 0001–0003 keep working.
-- Warning: deletes classes, students, their saved progress and activity. Export them first if you may need them.
begin;
drop policy if exists classes_read on public.classes;
drop policy if exists students_read on public.students;
drop policy if exists student_progress_read on public.student_progress;
drop policy if exists student_activity_read on public.student_activity;
drop function if exists public.student_record_activity(text, text, text, text, text, int, int, int);
drop function if exists public.student_save_progress(jsonb, int);
drop function if exists public.student_me();
drop function if exists public.student_logout();
drop function if exists public.student_login(text, int, text);
drop function if exists public.set_class_archived(uuid, boolean);
drop function if exists public.rename_class(uuid, text);
drop function if exists public.set_student_archived(uuid, boolean);
drop function if exists public.rename_student(uuid, text);
drop function if exists public.reset_student_pin(uuid);
drop function if exists public.add_students(uuid, int, text[]);
drop function if exists public.create_class(text, int, text[]);
drop function if exists private.current_student();
drop function if exists private.add_students(uuid, int, text[]);
drop function if exists private.clean_student_name(text, int);
drop function if exists private.new_pin();
drop function if exists private.new_class_code();
drop function if exists private.require_teacher_of(uuid);
drop function if exists public.can_teach(uuid);
drop function if exists public.can_create_classes();
drop table if exists private.student_login_attempts;
drop table if exists public.student_activity;
drop table if exists public.student_progress;
drop table if exists public.student_sessions;
drop table if exists public.students;
drop table if exists public.classes;
create or replace function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_member(); v_id uuid;
begin
  insert into public.families (name, created_by) values (btrim(p_name), v_uid) returning id into v_id;
  insert into public.family_members (family_id, user_id, role, added_by) values (v_id, v_uid, 'owner', v_uid);
  perform private.audit(v_id, 'family_created', v_id);
  return v_id;
end $$;
commit;
