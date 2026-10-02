-- Aggregate page-view counter without visitor identifiers.
-- Deploy this migration to the Zahrada Supabase project before enabling the client call.

create table if not exists public.zahrada_pageview_totals (
  day date primary key,
  page_views bigint not null default 0 check (page_views >= 0)
);

alter table public.zahrada_pageview_totals enable row level security;
revoke all on table public.zahrada_pageview_totals from public, anon, authenticated;

create or replace function public.zahrada_count_pageview()
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  insert into public.zahrada_pageview_totals(day, page_views)
  values ((clock_timestamp() at time zone 'Europe/Bratislava')::date, 1)
  on conflict (day) do update
  set page_views = public.zahrada_pageview_totals.page_views + 1;
$function$;

create or replace function public.zahrada_pageview_summary(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare result jsonb;
begin
  if not private.is_zahrada_admin() then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'page_views', coalesce(sum(page_views),0),
    'daily', coalesce(jsonb_agg(jsonb_build_object('day',day,'page_views',page_views) order by day),'[]'::jsonb)
  ) into result
  from public.zahrada_pageview_totals
  where day >= ((clock_timestamp() at time zone 'Europe/Bratislava')::date - greatest(1,least(coalesce(p_days,30),365)) + 1);
  return result;
end;
$function$;

revoke all on function public.zahrada_count_pageview() from public, anon, authenticated;
revoke all on function public.zahrada_pageview_summary(integer) from public, anon, authenticated;
grant execute on function public.zahrada_count_pageview() to anon, authenticated;
grant execute on function public.zahrada_pageview_summary(integer) to authenticated;
