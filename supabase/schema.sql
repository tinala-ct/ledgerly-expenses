-- Run this in Supabase Dashboard > SQL Editor. Each user can only access their own records.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  spent_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_spent_on_idx on public.expenses (user_id, spent_on desc);
alter table public.expenses enable row level security;

create policy "Users read own expenses" on public.expenses for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add own expenses" on public.expenses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own expenses" on public.expenses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own expenses" on public.expenses for delete to authenticated using ((select auth.uid()) = user_id);

-- Optional icon categories. Run this added section once to sync custom icons between devices.
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  emoji text not null check (char_length(emoji) between 1 and 12),
  color text not null default '#7b8ec8',
  created_at timestamptz not null default now()
);
create index if not exists expense_categories_user_created_idx on public.expense_categories (user_id, created_at);
alter table public.expense_categories enable row level security;
create policy "Users read own icon categories" on public.expense_categories for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add own icon categories" on public.expense_categories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users delete own icon categories" on public.expense_categories for delete to authenticated using ((select auth.uid()) = user_id);

-- Shared-family-fund top-ups. Outstanding debt is calculated in the app as
-- total expenses minus total top-ups whenever expenses are higher.
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
