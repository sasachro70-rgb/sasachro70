-- Rollback of 0007_thai_cloud_voice.sql. Removes the usage table and the quota function.
-- The Storage bucket "tts-cache" and its files are kept (delete them in Supabase → Storage if you no longer want them).
drop function if exists public.tts_take_quota(text, integer, integer, integer);
drop table if exists public.tts_usage;
