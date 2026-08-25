-- Cover the refill settings medication foreign key reported by the performance advisor.
create index if not exists refill_settings_medication_id_idx
  on public.refill_settings (medication_id);
