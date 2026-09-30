create table if not exists public.zahrada_live_presence (
  visitor_id text primary key check (char_length(visitor_id) between 1 and 80),
  section text not null check (section in (
    'Úvodná stránka','Záhrada','Dielňa a projekty','Blog','Záhradný radar',
    'Pomôcky','Bazár','Kalendár','Moja záhrada','Česká verzia','Poľská verzia','Ďalší obsah'
  )),
  last_seen_at timestamptz not null default clock_timestamp()
);

alter table public.zahrada_live_presence enable row level security;
revoke all on table public.zahrada_live_presence from public, anon, authenticated;
create index if not exists zahrada_live_presence_last_seen_idx
  on public.zahrada_live_presence (last_seen_at desc);

comment on table public.zahrada_live_presence is
  'Ephemeral anonymous live presence for the Zahrada website; rows older than two minutes are purged.';

create or replace function public.zahrada_live_touch(p_visitor_id text, p_section text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  safe_section text;
begin
  if p_visitor_id is null or p_visitor_id !~ '^[A-Za-z0-9_-]{1,80}$' then
    return;
  end if;

  safe_section := case
    when p_section = any(array[
      'Úvodná stránka','Záhrada','Dielňa a projekty','Blog','Záhradný radar',
      'Pomôcky','Bazár','Kalendár','Moja záhrada','Česká verzia','Poľská verzia','Ďalší obsah'
    ]) then p_section
    else 'Ďalší obsah'
  end;

  delete from public.zahrada_live_presence
  where last_seen_at < clock_timestamp() - interval '2 minutes';

  if not exists (
    select 1 from public.zahrada_live_presence where visitor_id = p_visitor_id
  ) and (select count(*) from public.zahrada_live_presence) >= 500 then
    return;
  end if;

  insert into public.zahrada_live_presence(visitor_id, section, last_seen_at)
  values (p_visitor_id, safe_section, clock_timestamp())
  on conflict (visitor_id) do update
  set section = excluded.section,
      last_seen_at = excluded.last_seen_at;
end;
$function$;

create or replace function public.zahrada_live_leave(p_visitor_id text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if p_visitor_id is null or p_visitor_id !~ '^[A-Za-z0-9_-]{1,80}$' then
    return;
  end if;
  delete from public.zahrada_live_presence where visitor_id = p_visitor_id;
end;
$function$;

create or replace function public.zahrada_live_list()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  result jsonb;
begin
  if not private.is_zahrada_admin() then
    raise exception 'not allowed';
  end if;

  delete from public.zahrada_live_presence
  where last_seen_at < clock_timestamp() - interval '2 minutes';

  with active as (
    select
      row_number() over (order by last_seen_at desc) as row_num,
      section,
      greatest(0, floor(extract(epoch from (clock_timestamp() - last_seen_at)))::integer) as seen_seconds
    from public.zahrada_live_presence
    where last_seen_at >= clock_timestamp() - interval '75 seconds'
    order by last_seen_at desc
    limit 200
  )
  select jsonb_build_object(
    'online_count', (select count(*) from active),
    'visitors', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'label', 'Návštevník ' || row_num,
        'section', section,
        'seen_seconds', seen_seconds
      ) order by row_num) from active),
      '[]'::jsonb
    )
  ) into result;

  return result;
end;
$function$;

revoke all on function public.zahrada_live_touch(text, text) from public, anon, authenticated;
revoke all on function public.zahrada_live_leave(text) from public, anon, authenticated;
revoke all on function public.zahrada_live_list() from public, anon, authenticated;
grant execute on function public.zahrada_live_touch(text, text) to anon, authenticated;
grant execute on function public.zahrada_live_leave(text) to anon, authenticated;
grant execute on function public.zahrada_live_list() to authenticated;

do $cleanup$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'zahrada-live-presence-cleanup'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'zahrada-live-presence-cleanup',
    '* * * * *',
    $command$delete from public.zahrada_live_presence where last_seen_at < now() - interval '2 minutes';$command$
  );
end
$cleanup$;