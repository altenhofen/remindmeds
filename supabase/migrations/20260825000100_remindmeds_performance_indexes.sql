-- Cover composite owner foreign keys and the missing medication foreign-key index.
create index if not exists medication_schedules_user_id_medication_id_idx
  on public.medication_schedules (user_id, medication_id);

create index if not exists dose_events_user_id_schedule_id_idx
  on public.dose_events (user_id, schedule_id);

create index if not exists dose_events_user_id_medication_id_idx
  on public.dose_events (user_id, medication_id);

create index if not exists inventory_events_user_id_medication_id_idx
  on public.inventory_events (user_id, medication_id);

create index if not exists refill_settings_user_id_medication_id_idx
  on public.refill_settings (user_id, medication_id);

create index if not exists notification_preferences_user_id_medication_id_idx
  on public.notification_preferences (user_id, medication_id);

create index if not exists notification_preferences_medication_id_idx
  on public.notification_preferences (medication_id);
