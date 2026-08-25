-- Add configurable notification timing to refill settings.
-- The default preserves existing rows and means notify today/when attention is due.
alter table public.refill_settings
  add column if not exists notify_after_days integer not null default 0
    check (notify_after_days between 0 and 365);
