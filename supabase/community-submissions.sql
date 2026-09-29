create table if not exists public.zahrada_community_submissions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  title text not null check (char_length(btrim(title)) between 5 and 100),
  body text not null check (char_length(btrim(body)) between 20 and 1500),
  media_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(media_urls) = 'array' and jsonb_array_length(media_urls) between 1 and 3),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rights_confirmed boolean not null default true check (rights_confirmed),
  publication_consent boolean not null default true check (publication_consent),
  fingerprint text,
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);
create index if not exists zahrada_community_submissions_status_created_idx on public.zahrada_community_submissions (status, created_at desc);
create index if not exists zahrada_community_submissions_fingerprint_created_idx on public.zahrada_community_submissions (fingerprint, created_at desc);
alter table public.zahrada_community_submissions enable row level security;
revoke all on table public.zahrada_community_submissions from public, anon, authenticated;
grant select on table public.zahrada_community_submissions to anon, authenticated;
grant update, delete on table public.zahrada_community_submissions to authenticated;
grant all on table public.zahrada_community_submissions to service_role;
create policy "Public reads approved community submissions" on public.zahrada_community_submissions for select to anon, authenticated using (status = 'approved' or private.is_zahrada_admin());
create policy "Admins update community submissions" on public.zahrada_community_submissions for update to authenticated using (private.is_zahrada_admin()) with check (private.is_zahrada_admin());
create policy "Admins delete community submissions" on public.zahrada_community_submissions for delete to authenticated using (private.is_zahrada_admin());