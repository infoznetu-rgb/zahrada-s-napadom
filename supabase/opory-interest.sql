create table if not exists public.zahrada_opory_interest (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 5 and 200),
  size text not null check (size in ('60 cm','100 cm','iný rozmer','neviem')),
  plant text not null check (plant in ('hortenzia','pivónia','iná rastlina')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  fingerprint text not null
);

create index if not exists zahrada_opory_interest_created_idx on public.zahrada_opory_interest (created_at desc);
create index if not exists zahrada_opory_interest_rate_idx on public.zahrada_opory_interest (fingerprint,created_at desc);
alter table public.zahrada_opory_interest enable row level security;
revoke all on public.zahrada_opory_interest from anon, authenticated;
grant select, update, delete on public.zahrada_opory_interest to authenticated;
grant select, insert, update, delete on public.zahrada_opory_interest to service_role;

create policy "opory admin reads interests" on public.zahrada_opory_interest
  for select to authenticated using (private.is_zahrada_admin());
create policy "opory admin updates interests" on public.zahrada_opory_interest
  for update to authenticated using (private.is_zahrada_admin()) with check (private.is_zahrada_admin());
create policy "opory admin deletes interests" on public.zahrada_opory_interest
  for delete to authenticated using (private.is_zahrada_admin());

select cron.schedule('zahrada-opory-interest-retention','25 3 * * *',
  $$delete from public.zahrada_opory_interest where created_at < now() - interval '365 days'$$);
