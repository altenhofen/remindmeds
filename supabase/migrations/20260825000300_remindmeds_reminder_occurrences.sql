-- Durable reminder occurrences and delivery outbox.
-- Occurrences preserve the local civil-time intent used to derive scheduled_for;
-- clients can read them but cannot mutate the expected reminder semantics.

create table if not exists public.schedule_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schedule_id uuid not null,
  medication_id uuid not null,
  local_date date not null,
  local_time time not null,
  timezone text not null check (btrim(timezone) <> ''),
  scheduled_for timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, schedule_id, local_date, local_time, timezone),
  unique (user_id, id),
  constraint schedule_occurrences_owner_schedule_fk
    foreign key (user_id, schedule_id)
    references public.medication_schedules (user_id, id) on delete cascade,
  constraint schedule_occurrences_owner_medication_fk
    foreign key (user_id, medication_id)
    references public.medications (user_id, id) on delete cascade
);

create table if not exists public.reminder_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurrence_id uuid not null,
  channel text not null check (btrim(channel) <> ''),
  kind text not null check (btrim(kind) <> ''),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  unique (user_id, occurrence_id, channel, kind),
  unique (user_id, id),
  constraint reminder_outbox_owner_occurrence_fk
    foreign key (user_id, occurrence_id)
    references public.schedule_occurrences (user_id, id) on delete cascade
);

create index if not exists schedule_occurrences_user_scheduled_for_idx
  on public.schedule_occurrences (user_id, scheduled_for);
create index if not exists schedule_occurrences_schedule_local_date_idx
  on public.schedule_occurrences (schedule_id, local_date);
create index if not exists reminder_outbox_pending_idx
  on public.reminder_outbox (status, available_at);
create index if not exists reminder_outbox_user_created_at_idx
  on public.reminder_outbox (user_id, created_at);

alter table public.schedule_occurrences enable row level security;
alter table public.reminder_outbox enable row level security;

drop policy if exists schedule_occurrences_select on public.schedule_occurrences;
create policy schedule_occurrences_select on public.schedule_occurrences
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists reminder_outbox_select on public.reminder_outbox;
create policy reminder_outbox_select on public.reminder_outbox
  for select to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.schedule_occurrences, public.reminder_outbox to authenticated;
