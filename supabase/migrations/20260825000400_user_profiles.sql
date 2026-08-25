-- Persist onboarding profile data for authenticated users.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (btrim(display_name) <> '' and char_length(display_name) <= 100),
  onboarding_completed_at timestamptz,
  notification_permission text not null default 'unknown'
    check (notification_permission in ('unknown', 'granted', 'denied', 'unsupported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_onboarding_completed_at_idx
  on public.user_profiles (onboarding_completed_at);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select on public.user_profiles;
drop policy if exists user_profiles_insert on public.user_profiles;
drop policy if exists user_profiles_update on public.user_profiles;

create policy user_profiles_select on public.user_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy user_profiles_insert on public.user_profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy user_profiles_update on public.user_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_profiles to authenticated;
