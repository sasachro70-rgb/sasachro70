-- Rollback for 0003_accounts_access_control.sql. Removes ONLY what 0003 created; 0001 and 0002 (families, profiles,
-- rooms, points, rewards, learning) are not touched and keep working.
-- Warning: this deletes the accounts, invitations and the security log created since 0003. Export them first
-- (Supabase → Table Editor → app_accounts / account_audit → Export to CSV) if you may need them.
-- Kept outside supabase/migrations/ on purpose: run it by hand in the SQL Editor only if you decide to undo 0003.
begin;
-- 1. policies (they use the helper functions)
drop policy if exists app_accounts_read on public.app_accounts;
drop policy if exists permissions_read on public.permissions;
drop policy if exists admin_permissions_read on public.admin_permissions;
drop policy if exists invitations_read on public.invitations;
drop policy if exists account_audit_read on public.account_audit;
-- 2. functions (some use the table row types)
drop function if exists public.set_admin_permissions(uuid, text[]);
drop function if exists public.set_account_role(uuid, public.app_role);
drop function if exists public.set_account_status(uuid, public.account_status, text);
drop function if exists public.decide_account(uuid, boolean, public.app_role, text);
drop function if exists public.accept_invitation(text, text, text);
drop function if exists public.revoke_invitation(uuid);
drop function if exists public.create_invitation(public.app_role, int, text[], text);
drop function if exists public.record_login();
drop function if exists public.update_account(uuid, text, text);
drop function if exists public.request_access(text, text, public.app_role, text);
drop function if exists public.my_account();
drop function if exists private.set_system_owner(text);
drop function if exists private.clean_lang(text);
drop function if exists private.clean_name(text);
drop function if exists private.check_target(uuid);
drop function if exists private.permission_for_role(public.app_role);
drop function if exists private.require_permission(text);
drop function if exists public.has_permission(text);
drop function if exists public.is_super_admin();
drop function if exists public.is_approved();
drop function if exists public.is_system_owner();
drop function if exists private.log(text, uuid, jsonb);
-- 3. tables (the security log's triggers go with it), then the trigger function and the types
drop table if exists private.invite_attempts;
drop table if exists private.system_owner;
drop table if exists public.account_audit;          -- its triggers go with it
drop table if exists public.invitations;
drop table if exists public.admin_permissions;
drop table if exists public.permissions;
drop table if exists public.app_accounts;
drop function if exists private.block_audit_change();
drop type if exists public.app_role;
drop type if exists public.account_status;
commit;
