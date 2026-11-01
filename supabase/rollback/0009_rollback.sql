-- Rollback of 0009_teacher_permissions.sql: teachers lose their extra rights; the three functions get their earlier versions back.
drop function if exists public.set_teacher_permissions(uuid, text[]);
delete from public.admin_permissions ap using public.app_accounts a where a.user_id = ap.user_id and a.role <> 'admin';
create or replace function public.has_permission(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_super_admin()
      or (public.is_approved()
          and exists (select 1 from public.app_accounts a where a.user_id = auth.uid() and a.role = 'admin')
          and exists (select 1 from public.admin_permissions p where p.user_id = auth.uid() and p.permission = p_permission))
$$;
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
                            else '[]'::jsonb end)
      from public.app_accounts a where a.user_id = auth.uid()),
      jsonb_build_object('signed_in', true, 'guest', false, 'status', 'none', 'approved', false))
  end
$$;
create or replace function public.can_edit_course(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_permission('classes.manage')
      or (public.is_teaching_staff()
          and p_id like 't-%'
          and coalesce((select c.owner_id = auth.uid() from public.course_content c where c.id = p_id), true))
$$;
drop table if exists public.teacher_grantable;
