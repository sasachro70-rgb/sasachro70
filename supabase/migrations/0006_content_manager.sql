-- Pasathai, part 6 (Phase F): Teacher Content Manager – drafts, publishing, version history, lesson media.
-- Builds on 0001–0005. Additive: two new columns on public.course_content (owner_id, published_by); nothing else changes.
--
-- Rules
--   * Approved teachers create their own courses (id starting with "t-") and edit only their own; the System Creator and Admins with
--     classes.manage can edit every course (including protected ones such as "book42").
--   * Teachers work in a DRAFT (public.course_drafts, one per course and teacher). Students never see drafts.
--   * Publishing copies the draft into public.course_content (version + 1) and stores the previous published document in
--     public.course_versions (append-only). An old version can be brought back as a draft, never published automatically.
--   * Lesson media (audio, images) go to the private Storage bucket "course-media" under "<course id>/…":
--     upload = may edit that course; read = public.can_read_teaching() (staff and signed-in students).
-- Rollback: supabase/rollback/0006_rollback.sql.

alter table public.course_content add column owner_id uuid;
alter table public.course_content add column published_by uuid;

create table public.course_drafts (
  course_id text not null check (course_id ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  owner_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  doc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (course_id, owner_id)
);

create table public.course_versions (
  id bigint generated always as identity primary key,
  course_id text not null,
  version int not null,
  title text not null,
  doc jsonb not null,
  published_by uuid,
  published_at timestamptz not null default now()
);
create index course_versions_course on public.course_versions (course_id, version desc);
create trigger course_versions_read_only before update or delete on public.course_versions
  for each row execute function private.block_history_change();
create trigger course_versions_no_truncate before truncate on public.course_versions
  for each statement execute function private.block_history_change();

-- ============================================================================================
-- Helpers
-- ============================================================================================
create function public.can_edit_course(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_permission('classes.manage')
      or (public.is_teaching_staff()
          and p_id like 't-%'
          and coalesce((select c.owner_id = auth.uid() from public.course_content c where c.id = p_id), true))
$$;

create function private.require_edit(p_id text) returns void
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_id is null or p_id !~ '^[a-z0-9][a-z0-9_-]{1,39}$' then raise exception 'bad_course_id'; end if;
  if not public.can_edit_course(p_id) then raise exception 'not_allowed' using errcode = '42501'; end if;
end $$;

-- a course document must have lessons, each with id, level, title and the arrays the app reads
create function private.check_course_doc(p_doc jsonb) returns void
language plpgsql immutable set search_path = '' as $$
declare l jsonb; v_ids text[] := '{}';
begin
  if p_doc is null or jsonb_typeof(p_doc) <> 'object' or coalesce(jsonb_typeof(p_doc -> 'lessons'), '') <> 'array' then raise exception 'bad_document'; end if;
  if octet_length(p_doc::text) > 2000000 then raise exception 'document_too_large'; end if;
  if jsonb_array_length(p_doc -> 'lessons') > 300 then raise exception 'too_many_lessons'; end if;
  for l in select * from jsonb_array_elements(p_doc -> 'lessons') loop
    if coalesce(jsonb_typeof(l -> 'id'), '') <> 'string' or char_length(l ->> 'id') not between 1 and 60 then raise exception 'lesson_without_id'; end if;
    if (l ->> 'id') = any (v_ids) then raise exception 'duplicate_lesson_id'; end if;
    v_ids := v_ids || (l ->> 'id');
    if coalesce(jsonb_typeof(l -> 'title'), '') <> 'object' then raise exception 'lesson_without_title'; end if;
    if coalesce(jsonb_typeof(l -> 'vocab'), '') <> 'array' or coalesce(jsonb_typeof(l -> 'dialogue'), '') <> 'array' or coalesce(jsonb_typeof(l -> 'exercises'), '') <> 'array' then raise exception 'lesson_incomplete'; end if;
  end loop;
end $$;

-- ============================================================================================
-- Functions
-- ============================================================================================
-- courses this teacher may edit, with draft information
create function public.teacher_courses() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_teaching_staff() then raise exception 'not_allowed' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x->>'id') from (
    select jsonb_build_object('id', c.id, 'title', c.title, 'version', c.version, 'updated_at', c.updated_at, 'mine', c.owner_id = auth.uid(),
      'lessons', jsonb_array_length(c.doc -> 'lessons'), 'draft_at', (select d.updated_at from public.course_drafts d where d.course_id = c.id and d.owner_id = auth.uid())) as x
    from public.course_content c where public.can_edit_course(c.id)
    union all
    select jsonb_build_object('id', d.course_id, 'title', d.title, 'version', 0, 'updated_at', null, 'mine', true,
      'lessons', jsonb_array_length(d.doc -> 'lessons'), 'draft_at', d.updated_at)
    from public.course_drafts d where d.owner_id = auth.uid() and not exists (select 1 from public.course_content c where c.id = d.course_id)) q), '[]');
end $$;

-- my draft, or (when there is none) the published document as the starting point
create function public.get_course_draft(p_course text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare d public.course_drafts; c public.course_content;
begin
  perform private.require_edit(p_course);
  select * into d from public.course_drafts where course_id = p_course and owner_id = auth.uid();
  if d.course_id is not null then return jsonb_build_object('course_id', d.course_id, 'title', d.title, 'doc', d.doc, 'draft', true, 'updated_at', d.updated_at); end if;
  select * into c from public.course_content where id = p_course;
  if c.id is null then return null; end if;
  return jsonb_build_object('course_id', c.id, 'title', c.title, 'doc', c.doc, 'draft', false, 'version', c.version);
end $$;

create function public.save_course_draft(p_course text, p_title text, p_doc jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_edit(p_course);
  perform private.check_course_doc(p_doc);
  if char_length(btrim(coalesce(p_title, ''))) < 1 then raise exception 'title_required'; end if;
  insert into public.course_drafts (course_id, owner_id, title, doc) values (p_course, auth.uid(), left(btrim(p_title), 120), p_doc)
    on conflict (course_id, owner_id) do update set title = excluded.title, doc = excluded.doc, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create function public.delete_course_draft(p_course text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_edit(p_course);
  delete from public.course_drafts where course_id = p_course and owner_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- the teacher approves: the draft becomes the published course (students see it); the previous version is kept
create function public.publish_course_draft(p_course text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.course_drafts; c public.course_content; v_version int;
begin
  perform private.require_edit(p_course);
  select * into d from public.course_drafts where course_id = p_course and owner_id = auth.uid() for update;
  if d.course_id is null then raise exception 'no_draft'; end if;
  perform private.check_course_doc(d.doc);
  select * into c from public.course_content where id = p_course for update;
  if c.id is not null then
    insert into public.course_versions (course_id, version, title, doc, published_by) values (c.id, c.version, c.title, c.doc, c.published_by);
    update public.course_content set title = d.title, doc = d.doc, version = c.version + 1, updated_at = now(), updated_by = auth.uid(), published_by = auth.uid()
      where id = p_course returning version into v_version;
  else
    insert into public.course_content (id, title, doc, updated_by, owner_id, published_by) values (p_course, d.title, d.doc, auth.uid(), auth.uid(), auth.uid())
      returning version into v_version;
  end if;
  delete from public.course_drafts where course_id = p_course and owner_id = auth.uid();
  return jsonb_build_object('ok', true, 'version', v_version);
end $$;

-- take a course away from students (the content is kept as the teacher's draft and in the history)
create function public.unpublish_course(p_course text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.course_content;
begin
  perform private.require_edit(p_course);
  select * into c from public.course_content where id = p_course for update;
  if c.id is null then raise exception 'not_found'; end if;
  insert into public.course_versions (course_id, version, title, doc, published_by) values (c.id, c.version, c.title, c.doc, c.published_by);
  insert into public.course_drafts (course_id, owner_id, title, doc) values (c.id, auth.uid(), c.title, c.doc)
    on conflict (course_id, owner_id) do nothing;
  delete from public.course_content where id = p_course;
  return jsonb_build_object('ok', true);
end $$;

create function public.course_history(p_course text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_edit(p_course);
  return coalesce((select jsonb_agg(jsonb_build_object('version', v.version, 'title', v.title, 'published_at', v.published_at,
      'lessons', jsonb_array_length(v.doc -> 'lessons')) order by v.id desc) from public.course_versions v where v.course_id = p_course), '[]');
end $$;

-- an old version back as my draft (it is not published until the teacher publishes it)
create function public.restore_course_version(p_course text, p_version int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.course_versions;
begin
  perform private.require_edit(p_course);
  select * into v from public.course_versions where course_id = p_course and version = p_version order by id desc limit 1;
  if v.id is null then raise exception 'not_found'; end if;
  insert into public.course_drafts (course_id, owner_id, title, doc) values (p_course, auth.uid(), v.title, v.doc)
    on conflict (course_id, owner_id) do update set title = excluded.title, doc = excluded.doc, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- Storage helpers for the bucket "course-media" ("<course id>/<file>")
create function public.can_upload_course_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(char_length(p_name) <= 300 and p_name !~ '\.\.' and public.can_edit_course(split_part(p_name, '/', 1)), false)
$$;
create function public.can_read_course_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.can_read_teaching(), false)
$$;

-- ============================================================================================
-- RLS, grants
-- ============================================================================================
alter table public.course_drafts enable row level security;
alter table public.course_versions enable row level security;
revoke all on public.course_drafts, public.course_versions from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

revoke all on function public.can_edit_course(text), public.teacher_courses(), public.get_course_draft(text), public.save_course_draft(text, text, jsonb),
  public.delete_course_draft(text), public.publish_course_draft(text), public.unpublish_course(text), public.course_history(text),
  public.restore_course_version(text, int), public.can_upload_course_media(text), public.can_read_course_media(text) from public, anon, authenticated;
grant execute on function public.can_edit_course(text), public.teacher_courses(), public.get_course_draft(text), public.save_course_draft(text, text, jsonb),
  public.delete_course_draft(text), public.publish_course_draft(text), public.unpublish_course(text), public.course_history(text),
  public.restore_course_version(text, int), public.can_upload_course_media(text), public.can_read_course_media(text) to authenticated;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') and exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('course-media', 'course-media', false, 20971520,
        array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/x-m4a', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])
      on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
    execute 'create policy te_media_insert on storage.objects for insert to authenticated with check (bucket_id = ''course-media'' and public.can_upload_course_media(name))';
    execute 'create policy te_media_read on storage.objects for select to authenticated using (bucket_id = ''course-media'' and public.can_read_course_media(name))';
  end if;
end $$;
