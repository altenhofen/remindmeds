-- RemindMeds public schema
-- User-owned medication, schedule, event, inventory, refill, and notification data.

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  dosage text,
  form text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  effective_from date not null,
  effective_until date,
  local_time time not null,
  timezone text not null check (btrim(timezone) <> ''),
  dose_amount numeric not null check (dose_amount > 0),
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}'::smallint[]
    check (cardinality(days_of_week) > 0 and days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_until is null or effective_until >= effective_from)
);

create table if not exists public.dose_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  schedule_id uuid,
  scheduled_for timestamptz not null,
  taken_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'taken', 'skipped', 'missed')),
  idempotency_key text not null check (btrim(idempotency_key) <> ''),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  quantity_change numeric not null check (quantity_change <> 0),
  occurred_at timestamptz not null default now(),
  idempotency_key text not null check (btrim(idempotency_key) <> ''),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.refill_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  reorder_threshold numeric not null check (reorder_threshold >= 0),
  refill_amount numeric not null check (refill_amount > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, medication_id)
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid references public.medications (id) on delete cascade,
  dose_reminders_enabled boolean not null default true,
  refill_reminders_enabled boolean not null default true,
  reminder_lead_minutes integer not null default 0 check (reminder_lead_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, medication_id)
);
alter table public.medication_schedules add constraint medication_schedules_user_id_id_key unique (user_id, id);
alter table public.dose_events add constraint dose_events_owner_schedule_fk
  foreign key (user_id, schedule_id) references public.medication_schedules (user_id, id) on delete restrict;
alter table public.medications add constraint medications_user_id_id_key unique (user_id, id);
alter table public.medication_schedules add constraint medication_schedules_owner_medication_fk
  foreign key (user_id, medication_id) references public.medications (user_id, id) on delete cascade;
alter table public.dose_events add constraint dose_events_owner_medication_fk
  foreign key (user_id, medication_id) references public.medications (user_id, id) on delete cascade;
alter table public.inventory_events add constraint inventory_events_owner_medication_fk
  foreign key (user_id, medication_id) references public.medications (user_id, id) on delete cascade;
alter table public.refill_settings add constraint refill_settings_owner_medication_fk
  foreign key (user_id, medication_id) references public.medications (user_id, id) on delete cascade;
alter table public.notification_preferences add constraint notification_preferences_owner_medication_fk
  foreign key (user_id, medication_id) references public.medications (user_id, id) on delete cascade;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null check (btrim(endpoint) <> ''),
  p256dh text not null check (btrim(p256dh) <> ''),
  auth text not null check (btrim(auth) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists medications_user_id_idx on public.medications (user_id);
create index if not exists medication_schedules_user_id_idx on public.medication_schedules (user_id);
create index if not exists medication_schedules_medication_id_idx on public.medication_schedules (medication_id);
create index if not exists dose_events_user_id_scheduled_for_idx on public.dose_events (user_id, scheduled_for);
create index if not exists dose_events_medication_id_idx on public.dose_events (medication_id);
create index if not exists inventory_events_user_id_occurred_at_idx on public.inventory_events (user_id, occurred_at);
create index if not exists inventory_events_medication_id_idx on public.inventory_events (medication_id);
create index if not exists refill_settings_user_id_idx on public.refill_settings (user_id);
create index if not exists notification_preferences_user_id_idx on public.notification_preferences (user_id);

alter table public.medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.dose_events enable row level security;
alter table public.inventory_events enable row level security;
alter table public.refill_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['medications','medication_schedules','refill_settings','notification_preferences','push_subscriptions'] loop
    execute format('drop policy if exists %I_select on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_insert on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_update on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_delete on public.%I', tbl, tbl);
    execute format('create policy %I_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', tbl, tbl);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', tbl, tbl);
    execute format('create policy %I_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', tbl, tbl);
    execute format('create policy %I_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', tbl, tbl);
  end loop;
end $$;

create policy dose_events_select on public.dose_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy dose_events_insert on public.dose_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy inventory_events_select on public.inventory_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy inventory_events_insert on public.inventory_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on
  public.medications, public.medication_schedules, public.refill_settings,
  public.notification_preferences, public.push_subscriptions to authenticated;
grant select, insert on public.dose_events, public.inventory_events to authenticated;
