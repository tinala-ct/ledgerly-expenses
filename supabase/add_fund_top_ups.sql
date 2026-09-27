-- Run this file once in Supabase Dashboard > SQL Editor.
-- It adds shared-fund top-ups without changing existing expense rows.

create table if not exists public.fund_top_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  source text not null check (char_length(source) between 1 and 80),
  topped_up_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists fund_top_ups_user_date_idx
  on public.fund_top_ups (user_id, topped_up_on desc);

alter table public.fund_top_ups enable row level security;

revoke all on table public.fund_top_ups from anon, authenticated;
grant select, insert, update, delete on table public.fund_top_ups to authenticated;

drop policy if exists "Users read own fund top ups" on public.fund_top_ups;
drop policy if exists "Users insert own fund top ups" on public.fund_top_ups;
drop policy if exists "Users update own fund top ups" on public.fund_top_ups;
drop policy if exists "Users delete own fund top ups" on public.fund_top_ups;

create policy "Users read own fund top ups" on public.fund_top_ups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert own fund top ups" on public.fund_top_ups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own fund top ups" on public.fund_top_ups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete own fund top ups" on public.fund_top_ups
  for delete to authenticated using ((select auth.uid()) = user_id);
