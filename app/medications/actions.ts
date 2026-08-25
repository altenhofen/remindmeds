'use server'

import { createClient } from '@/lib/supabase/server'

type MedicationInput = {
  name: string
  dosage?: string | null
  form?: string | null
  notes?: string | null
  local_time: string
  timezone: string
  dose_amount: number
  weekdays: number[]
  inventory?: number | null
}

type ActionResult = { ok: true } | { ok: false; error: string }

function validate(input: MedicationInput): string | null {
  if (!input || typeof input !== 'object') return 'Medication details are required.'
  if (typeof input.name !== 'string' || !input.name.trim()) return 'Medication name is required.'
  if (typeof input.local_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.local_time)) return 'A valid local time is required.'
  if (typeof input.timezone !== 'string' || !input.timezone.trim()) return 'Timezone is required.'
  if (!Number.isFinite(input.dose_amount) || input.dose_amount <= 0) return 'Dose amount must be positive.'
  if (!Array.isArray(input.weekdays) || input.weekdays.length === 0 || input.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return 'Select at least one valid weekday.'
  if (input.inventory != null && (!Number.isFinite(input.inventory))) return 'Initial inventory must be a number.'
  return null
}

async function authenticatedClient() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { error: 'You must be signed in.', supabase: null, user: null }
  return { error: null, supabase, user: data.user }
}

export async function createMedication(input: MedicationInput): Promise<ActionResult> {
  const invalid = validate(input)
  if (invalid) return { ok: false, error: invalid }
  const auth = await authenticatedClient()
  if (auth.error || !auth.supabase || !auth.user) return { ok: false, error: auth.error ?? 'You must be signed in.' }
  const values = { name: input.name.trim(), dosage: input.dosage?.trim() || null, form: input.form?.trim() || null, notes: input.notes?.trim() || null, user_id: auth.user.id }
  const { data: medication, error } = await auth.supabase.from('medications').insert(values).select('id').single()
  if (error || !medication) return { ok: false, error: error?.message ?? 'Could not create medication.' }
  const schedule = { user_id: auth.user.id, medication_id: medication.id, effective_from: new Date().toISOString().slice(0, 10), local_time: input.local_time, timezone: input.timezone.trim(), dose_amount: input.dose_amount, days_of_week: input.weekdays }
  const scheduleResult = await auth.supabase.from('medication_schedules').insert(schedule)
  if (scheduleResult.error) return { ok: false, error: scheduleResult.error.message }
  if (input.inventory != null && input.inventory !== 0) {
    const inventoryResult = await auth.supabase.from('inventory_events').insert({ user_id: auth.user.id, medication_id: medication.id, quantity_change: input.inventory, idempotency_key: crypto.randomUUID() })
    if (inventoryResult.error) return { ok: false, error: inventoryResult.error.message }
  }
  return { ok: true }
}

export async function updateMedication(id: string, input: MedicationInput): Promise<ActionResult> {
  const invalid = validate(input)
  if (!id || invalid) return { ok: false, error: invalid ?? 'Medication is required.' }
  const auth = await authenticatedClient()
  if (auth.error || !auth.supabase || !auth.user) return { ok: false, error: auth.error ?? 'You must be signed in.' }
  const result = await auth.supabase.from('medications').update({ name: input.name.trim(), dosage: input.dosage?.trim() || null, form: input.form?.trim() || null, notes: input.notes?.trim() || null }).eq('id', id).eq('user_id', auth.user.id)
  if (result.error) return { ok: false, error: result.error.message }
  const schedule = await auth.supabase.from('medication_schedules').update({ local_time: input.local_time, timezone: input.timezone.trim(), dose_amount: input.dose_amount, days_of_week: input.weekdays }).eq('medication_id', id).eq('user_id', auth.user.id).is('archived_at', null)
  if (schedule.error) return { ok: false, error: schedule.error.message }
  return { ok: true }
}

export async function archiveMedication(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Medication is required.' }
  const auth = await authenticatedClient()
  if (auth.error || !auth.supabase || !auth.user) return { ok: false, error: auth.error ?? 'You must be signed in.' }
  const archivedAt = new Date().toISOString()
  const medication = await auth.supabase.from('medications').update({ archived_at: archivedAt }).eq('id', id).eq('user_id', auth.user.id)
  if (medication.error) return { ok: false, error: medication.error.message }
  const schedules = await auth.supabase.from('medication_schedules').update({ archived_at: archivedAt }).eq('medication_id', id).eq('user_id', auth.user.id)
  if (schedules.error) return { ok: false, error: schedules.error.message }
  return { ok: true }
}
