-- Pasathai, part 7: natural Thai voice from the cloud (Google Cloud Text-to-Speech through the Supabase Edge Function "tts").
-- Builds on 0001–0006 but does not change them. Additive only.
--
-- What it adds
--   * public.tts_usage – how many characters were sent to Google per day, per caller (signed-in user id, or a hash of the
--     IP address for visitors without an account) and in total ("*"). Only the Edge Function (service_role) reads or writes it.
--   * public.tts_take_quota(who, chars, per_caller_limit, total_limit) – adds the characters if both limits allow it and
--     returns true; returns false (and adds nothing) when a limit would be passed. Only service_role may call it.
--   * Private Storage bucket "tts-cache" – each generated sentence is stored once as an mp3 and reused by everyone, so the
--     same sentence is never paid for twice. No browser policies: only the Edge Function (service_role) reads and writes it.
-- Nothing here gives browsers new rights. Rollback: supabase/rollback/0007_rollback.sql.

create table public.tts_usage (
  day date not null,
  who text not null check (char_length(who) between 1 and 80),
  chars integer not null default 0 check (chars >= 0),
  calls integer not null default 0 check (calls >= 0),
  primary key (day, who)
);
alter table public.tts_usage enable row level security;
-- no policies: anon and authenticated see nothing
revoke all on public.tts_usage from anon, authenticated;

create function public.tts_take_quota(p_who text, p_chars integer, p_limit integer, p_total integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'utc')::date; mine integer; total integer;
begin
  if p_who is null or p_chars is null or p_chars < 1 or p_chars > 5000 then return false; end if;
  insert into public.tts_usage (day, who) values (d, '*'), (d, p_who) on conflict do nothing;
  -- lock the total row so two calls at the same moment cannot both pass the limit
  select chars into total from public.tts_usage where day = d and who = '*' for update;
  select chars into mine from public.tts_usage where day = d and who = p_who for update;
  if total + p_chars > p_total or mine + p_chars > p_limit then return false; end if;
  update public.tts_usage set chars = chars + p_chars, calls = calls + 1 where day = d and who in ('*', p_who);
  return true;
end $$;
revoke all on function public.tts_take_quota(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.tts_take_quota(text, integer, integer, integer) to service_role;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') and exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('tts-cache', 'tts-cache', false, 2097152, array['audio/mpeg'])
      on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;
