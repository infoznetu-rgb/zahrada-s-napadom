-- Bezpečný import Excel dávok cez administráciu bazára.
-- Importované riadky sa zverejnia bez push upozornenia a bez verejného odkazu na zdroj.

create unique index if not exists zahrada_bazar_ads_import_fingerprint_uidx
on public.zahrada_bazar_ads ((import_source_data->>'source_fingerprint'))
where nullif(btrim(import_source_data->>'source_fingerprint'),'') is not null;

drop policy if exists "bazar authenticated inserts permitted ads" on public.zahrada_bazar_ads;
create policy "bazar authenticated inserts permitted ads"
on public.zahrada_bazar_ads
for insert to authenticated
with check (
  private.is_zahrada_admin()
  or (
    user_id=(select auth.uid())
    and status='pending'
    and seller_type in ('private','business')
    and imported=false
    and import_source is null
    and import_source_data='{}'::jsonb
  )
);

drop policy if exists "bazar authenticated updates permitted ads" on public.zahrada_bazar_ads;
create policy "bazar authenticated updates permitted ads"
on public.zahrada_bazar_ads
for update to authenticated
using (private.is_zahrada_admin() or user_id=(select auth.uid()))
with check (
  private.is_zahrada_admin()
  or (
    user_id=(select auth.uid())
    and status in ('pending','closed')
    and seller_type in ('private','business')
    and imported=false
    and import_source is null
    and import_source_data='{}'::jsonb
  )
);

create or replace function public.enqueue_zahrada_push()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'net'
as $$
declare
  newly_published boolean := false;
  event_id uuid;
begin
  if tg_op = 'INSERT' then
    newly_published := new.status = 'published';
  elsif tg_op = 'UPDATE' then
    newly_published := new.status = 'published' and old.status is distinct from 'published';
  end if;

  if not newly_published then
    return new;
  end if;

  if tg_table_name = 'zahrada_posts' then
    if coalesce(new.content_type,'project') <> 'blog' then
      return new;
    end if;

    insert into public.zahrada_push_events(event_type,title,body,url,tag)
    values (
      'blog',
      'Nový blog · Záhrada s nápadom',
      left(coalesce(new.title,'Nový článok'),170),
      'prispevok.html?slug=' || new.slug,
      'blog-' || new.id::text
    )
    returning id into event_id;

  elsif tg_table_name = 'zahrada_bazar_ads' then
    if coalesce(new.import_source,'') like 'admin-xlsx:%'
       or coalesce(new.import_source,'') like 'test_inzercia_%' then
      return new;
    end if;

    insert into public.zahrada_push_events(event_type,title,body,url,tag)
    values (
      'bazar',
      'Novinka v komunitnom bazári',
      left(coalesce(new.title,'Nový inzerát'),170),
      'inzerat.html?id=' || new.id::text,
      'bazar-' || new.id::text
    )
    returning id into event_id;
  else
    return new;
  end if;

  perform net.http_post(
    url := 'https://bkyappgttwjxakkwycub.supabase.co/functions/v1/push-dispatch',
    body := jsonb_build_object('event_id',event_id),
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json'),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke execute on function public.enqueue_zahrada_push() from public, anon, authenticated;
