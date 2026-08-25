'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { ok: true } | { ok: false; error: string }

function numberField(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function saveRefillSetting(formData: FormData): Promise<ActionResult> {
  const medicationId = String(formData.get('medication_id') ?? '')
  const threshold = numberField(formData.get('reorder_threshold'))
  const refillAmount = Math.max(1, numberField(formData.get('refill_amount'), threshold))
  const days = numberField(formData.get('notify_after_days'))
  if (![threshold, refillAmount, days].every(Number.isInteger) || threshold < 0 || refillAmount < 0 || days < 0 || days > 365) {
    return { ok: false, error: 'Enter whole numbers between 0 and 365.' }
  }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, error: 'You must be signed in to save refill settings.' }
  const { error } = await supabase.from('refill_settings').upsert({
    user_id: auth.user.id,
    medication_id: medicationId,
    reorder_threshold: threshold,
    refill_amount: refillAmount,
    enabled: formData.get('enabled') === 'on',
    notify_after_days: days,
  }, { onConflict: 'user_id,medication_id' })
  if (error) return { ok: false, error: 'We couldn’t save this refill setting. Please try again.' }
  revalidatePath('/refills')
  return { ok: true }
}
