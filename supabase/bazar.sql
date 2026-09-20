-- Komunitný hobby bazár pre Záhradu s nápadom
-- Produkčná schéma: bezplatná inzercia iba pre súkromné osoby.

create table if not exists public.zahrada_bazar_ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  listing_type text not null,
  item_condition text not null default 'used',
  price numeric(10,2),
  price_mode text not null default 'fixed',
  region text not null,
  location text not null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  images jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  private_person_confirmed boolean not null default false,
  commercial_activity boolean not null default false,
  terms_accepted_at timestamptz not null default now(),
  moderation_note text,
  moderated_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zahrada_bazar_title_len check (char_length(btrim(title)) between 5 and 120),
  constraint zahrada_bazar_description_len check (char_length(btrim(description)) between 20 and 5000),
  constraint zahrada_bazar_category_check check (category in (
    'Rastliny a sadenice','Semená','Náradie','Materiál','Záhradná technika',
    'Nábytok a dekorácie','Dielňa a hobby','Iné zo záhrady a dielne'
  )),
  constraint zahrada_bazar_listing_type_check check (listing_type in ('sell','give','exchange','wanted')),
  constraint zahrada_bazar_condition_check check (item_condition in ('used','unused','repair','not_applicable')),
  constraint zahrada_bazar_price_mode_check check (price_mode in ('fixed','negotiable','free','exchange','not_listed')),
  constraint zahrada_bazar_price_check check (price is null or price >= 0),
  constraint zahrada_bazar_region_check check (region in (
    'Bratislavský kraj','Trnavský kraj','Trenčiansky kraj','Nitriansky kraj',
    'Žilinský kraj','Banskobystrický kraj','Prešovský kraj','Košický kraj','Celé Slovensko'
  )),
  constraint zahrada_bazar_location_len check (char_length(btrim(location)) between 2 and 100),
  constraint zahrada_bazar_contact_name_len check (char_length(btrim(contact_name)) between 2 and 80),
  constraint zahrada_bazar_contact_required check (
    nullif(btrim(coalesce(contact_email,'')),'') is not null
    or nullif(btrim(coalesce(contact_phone,'')),'') is not null
  ),
  constraint zahrada_bazar_images_check check (jsonb_typeof(images)='array' and jsonb_array_length(images) <= 6),
  constraint zahrada_bazar_status_check check (status in ('pending','published','rejected','closed')),
  constraint zahrada_bazar_private_only check (private_person_confirmed = true and commercial_activity = false)
);

create index if not exists zahrada_bazar_ads_public_idx on public.zahrada_bazar_ads(status, expires_at, published_at desc);
create index if not exists zahrada_bazar_ads_user_idx on public.zahrada_bazar_ads(user_id, created_at desc);
create index if not exists zahrada_bazar_ads_category_idx on public.zahrada_bazar_ads(category, region);

create table if not exists public.zahrada_bazar_reports (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.zahrada_bazar_ads(id) on delete cascade,
  reason text not null,
  detail text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint zahrada_bazar_report_reason_check check (reason in ('commercial','spam','prohibited','misleading','sold','other')),
  constraint zahrada_bazar_report_detail_len check (char_length(detail) <= 1200),
  constraint zahrada_bazar_report_status_check check (status in ('new','resolved'))
);
create index if not exists zahrada_bazar_reports_status_idx on public.zahrada_bazar_reports(status, created_at desc);
create index if not exists zahrada_bazar_reports_ad_id_idx on public.zahrada_bazar_reports(ad_id);

create or replace function public.zahrada_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists zahrada_bazar_ads_touch_updated_at on public.zahrada_bazar_ads;
create trigger zahrada_bazar_ads_touch_updated_at
before update on public.zahrada_bazar_ads
for each row execute function public.zahrada_touch_updated_at();

create or replace function public.zahrada_bazar_limit_active_ads()
returns trigger
language plpgsql
set search_path = ''
as $$
declare active_count integer;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Inzerát môže vytvoriť iba prihlásený vlastník.';
  end if;

  select count(*) into active_count
  from public.zahrada_bazar_ads
  where user_id = auth.uid() and status in ('pending','published');

  if active_count >= 5 then
    raise exception 'Na jednu osobu je povolených najviac 5 aktívnych alebo čakajúcich inzerátov.';
  end if;
  return new;
end;
$$;

drop trigger if exists zahrada_bazar_limit_active_ads on public.zahrada_bazar_ads;
create trigger zahrada_bazar_limit_active_ads
before insert on public.zahrada_bazar_ads
for each row execute function public.zahrada_bazar_limit_active_ads();

alter table public.zahrada_bazar_ads enable row level security;
alter table public.zahrada_bazar_reports enable row level security;

revoke insert, update, delete on public.zahrada_bazar_ads from anon;
grant select on public.zahrada_bazar_ads to anon;
grant select, insert, update, delete on public.zahrada_bazar_ads to authenticated;

revoke select, update, delete on public.zahrada_bazar_reports from anon;
grant insert on public.zahrada_bazar_reports to anon;
grant insert, select, update, delete on public.zahrada_bazar_reports to authenticated;

drop policy if exists "bazar anon reads active ads" on public.zahrada_bazar_ads;
drop policy if exists "bazar authenticated reads permitted ads" on public.zahrada_bazar_ads;
drop policy if exists "bazar authenticated inserts permitted ads" on public.zahrada_bazar_ads;
drop policy if exists "bazar authenticated updates permitted ads" on public.zahrada_bazar_ads;
drop policy if exists "bazar authenticated deletes permitted ads" on public.zahrada_bazar_ads;

create policy "bazar anon reads active ads"
on public.zahrada_bazar_ads
for select to anon
using (status='published' and expires_at is not null and expires_at > now());

create policy "bazar authenticated reads permitted ads"
on public.zahrada_bazar_ads
for select to authenticated
using (
  (status='published' and expires_at is not null and expires_at > now())
  or user_id=(select auth.uid())
  or private.is_zahrada_admin()
);

create policy "bazar authenticated inserts permitted ads"
on public.zahrada_bazar_ads
for insert to authenticated
with check (
  private.is_zahrada_admin()
  or (
    user_id=(select auth.uid())
    and status='pending'
    and private_person_confirmed=true
    and commercial_activity=false
  )
);

create policy "bazar authenticated updates permitted ads"
on public.zahrada_bazar_ads
for update to authenticated
using (private.is_zahrada_admin() or user_id=(select auth.uid()))
with check (
  private.is_zahrada_admin()
  or (
    user_id=(select auth.uid())
    and status in ('pending','closed')
    and private_person_confirmed=true
    and commercial_activity=false
  )
);

create policy "bazar authenticated deletes permitted ads"
on public.zahrada_bazar_ads
for delete to authenticated
using (private.is_zahrada_admin() or user_id=(select auth.uid()));

drop policy if exists "bazar public creates reports" on public.zahrada_bazar_reports;
drop policy if exists "bazar admins read reports" on public.zahrada_bazar_reports;
drop policy if exists "bazar admins update reports" on public.zahrada_bazar_reports;
drop policy if exists "bazar admins delete reports" on public.zahrada_bazar_reports;

create policy "bazar public creates reports"
on public.zahrada_bazar_reports
for insert to anon, authenticated
with check (
  status='new' and resolved_at is null
  and exists (
    select 1 from public.zahrada_bazar_ads a
    where a.id=ad_id and a.status='published' and a.expires_at > now()
  )
);

create policy "bazar admins read reports"
on public.zahrada_bazar_reports
for select to authenticated using (private.is_zahrada_admin());

create policy "bazar admins update reports"
on public.zahrada_bazar_reports
for update to authenticated
using (private.is_zahrada_admin()) with check (private.is_zahrada_admin());

create policy "bazar admins delete reports"
on public.zahrada_bazar_reports
for delete to authenticated using (private.is_zahrada_admin());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('zahrada-bazar','zahrada-bazar',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=true,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "bazar owners list own images" on storage.objects;
drop policy if exists "bazar owners upload own images" on storage.objects;
drop policy if exists "bazar owners update own images" on storage.objects;
drop policy if exists "bazar owners delete own images" on storage.objects;
drop policy if exists "bazar admins manage images select" on storage.objects;
drop policy if exists "bazar admins manage images insert" on storage.objects;
drop policy if exists "bazar admins manage images update" on storage.objects;
drop policy if exists "bazar admins manage images delete" on storage.objects;

create policy "bazar owners list own images" on storage.objects
for select to authenticated
using (bucket_id='zahrada-bazar' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy "bazar owners upload own images" on storage.objects
for insert to authenticated
with check (bucket_id='zahrada-bazar' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy "bazar owners update own images" on storage.objects
for update to authenticated
using (bucket_id='zahrada-bazar' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='zahrada-bazar' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy "bazar owners delete own images" on storage.objects
for delete to authenticated
using (bucket_id='zahrada-bazar' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy "bazar admins manage images select" on storage.objects
for select to authenticated using (bucket_id='zahrada-bazar' and private.is_zahrada_admin());

create policy "bazar admins manage images insert" on storage.objects
for insert to authenticated with check (bucket_id='zahrada-bazar' and private.is_zahrada_admin());

create policy "bazar admins manage images update" on storage.objects
for update to authenticated
using (bucket_id='zahrada-bazar' and private.is_zahrada_admin())
with check (bucket_id='zahrada-bazar' and private.is_zahrada_admin());

create policy "bazar admins manage images delete" on storage.objects
for delete to authenticated using (bucket_id='zahrada-bazar' and private.is_zahrada_admin());
