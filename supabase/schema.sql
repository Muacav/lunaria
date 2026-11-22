-- Lunaria cloud sync schema (Supabase free tier).
-- Run once in the Supabase SQL editor, or apply as a migration.

-- Her full data. Row level security means only the signed-in owner can read
-- or write her row; the public anon key alone gives no access.
create table if not exists public.cycle_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cycle_data enable row level security;

drop policy if exists "owner reads and writes own cycle data" on public.cycle_data;
create policy "owner reads and writes own cycle data" on public.cycle_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The partner link. Holds only the curated snapshot her phone builds
-- (period dates, usual lengths, and today's mood/symptoms if she allows it).
create table if not exists public.partner_shares (
  token text primary key check (char_length(token) >= 24),
  owner uuid not null unique references auth.users (id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.partner_shares enable row level security;

drop policy if exists "owner manages own partner link" on public.partner_shares;
create policy "owner manages own partner link" on public.partner_shares
  for all to authenticated
  using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);

-- The partner reads through this function only: it returns one snapshot for
-- an exact token and nothing else, so links cannot be listed or guessed.
create or replace function public.get_partner_view(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('snapshot', s.snapshot, 'updated_at', s.updated_at)
  from public.partner_shares s
  where s.token = p_token;
$$;

revoke all on function public.get_partner_view(text) from public, anon, authenticated;
grant execute on function public.get_partner_view(text) to anon, authenticated;

-- Lets a signed-in user delete their own account. Their cycle_data and
-- partner link rows go with it (on delete cascade).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
