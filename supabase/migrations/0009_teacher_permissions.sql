-- Pasathai, part 9: extra rights for teachers, given in the Admin Panel.
-- Builds on 0003 (accounts and permissions), 0004 (classes) and 0006 (course content). Additive; no data is changed.
--
-- Until now only Admins could hold permissions. Now an approved Teacher can also be given these two (and only these two):
--   * classes.manage    – every class: its students (names, PINs, adding, archiving), homework and live lessons;
--                         also editing every course in the Content Manager (as before for Admins).
--   * curriculum.manage – edit every course in the Content Manager (including protected ones such as BOOK 42),
--                         without access to other teachers' classes. (Admins with this permission get the same.)
-- Who may give them: the System Creator, or an Admin with teachers.manage who holds that permission himself/herself.
-- Every change is written to the security log. Changing a teacher's role removes the extra rights (as for Admins).
-- Rollback: supabase/rollback/0009_rollback.sql.

create table public.teacher_grantable (key text primary key references public.permissions);
insert into public.teacher_grantable (key) values ('classes.manage'), ('curriculum.manage');
alter table public.teacher_grantable enable row level security;
create policy teacher_grantable_read on public.teacher_grantable for select to authenticated using (true);
revoke all on public.teacher_grantable from anon, authenticated;
grant select on public.teacher_grantable to authenticated;

-- permission check: Admins as before; Teachers only for the permissions listed above
create or replace function public.has_permission(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_super_admin()
      or (public.is_approved()
          and exists (select 1 from public.admin_permissions p where p.user_id = auth.uid() and p.permission = p_permission)
          and exists (select 1 from public.app_accounts a where a.user_id = auth.uid()
                        and (a.role = 'admin' or (a.role = 'teacher' and exists (select 1 from public.teacher_grantable g where g.key = p_permission)))))
$$;

-- the app's view of the signed-in account now lists a teacher's extra rights too
create or replace function public.my_account() returns jsonb
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
                            when a.role = 'teacher' then coalesce((select jsonb_agg(ap.permission order by ap.permission) from public.admin_permissions ap
                                                                   join public.teacher_grantable g on g.key = ap.permission where ap.user_id = a.user_id), '[]'::jsonb)
                            else '[]'::jsonb end)
      from public.app_accounts a where a.user_id = auth.uid()),
      jsonb_build_object('signed_in', true, 'guest', false, 'status', 'none', 'approved', false))
  end
$$;

-- curriculum.manage now also opens every course in the Content Manager
create or replace function public.can_edit_course(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_permission('classes.manage') or public.has_permission('curriculum.manage')
      or (public.is_teaching_staff()
          and p_id like 't-%'
          and coalesce((select c.owner_id = auth.uid() from public.course_content c where c.id = p_id), true))
$$;

-- give or take a teacher's extra rights (the whole list is replaced)
create function public.set_teacher_permissions(p_user uuid, p_permissions text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.app_accounts; v_perms text[] := coalesce(p_permissions, '{}'); v_old text[];
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not (public.is_super_admin() or public.has_permission('teachers.manage')) then raise exception 'not_allowed' using errcode = '42501'; end if;
  select * into v from public.app_accounts where user_id = p_user;
  if v.user_id is null then raise exception 'not_found'; end if;
  if v.role <> 'teacher' then raise exception 'not_a_teacher'; end if;
  if exists (select 1 from unnest(v_perms) x where x not in (select key from public.teacher_grantable)) then raise exception 'bad_permission'; end if;
  select coalesce(array_agg(permission order by permission), '{}') into v_old from public.admin_permissions where user_id = p_user;
  -- an Admin can only give or take rights he/she holds
  if not public.is_super_admin() and exists (
      select 1 from ((select unnest(v_perms) except select unnest(v_old)) union (select unnest(v_old) except select unnest(v_perms))) d(k)
      where not public.has_permission(d.k)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  delete from public.admin_permissions where user_id = p_user;
  insert into public.admin_permissions (user_id, permission, granted_by) select distinct p_user, x, auth.uid() from unnest(v_perms) x;
  perform private.log('teacher_permissions_set', p_user, jsonb_build_object('from', v_old, 'to', v_perms));
end $$;
revoke all on function public.set_teacher_permissions(uuid, text[]) from public, anon, authenticated;
grant execute on function public.set_teacher_permissions(uuid, text[]) to authenticated;
