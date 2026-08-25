'use server'

import { createClient } from '@/lib/supabase/server'

const notificationPermissions = ['unknown', 'granted', 'denied', 'unsupported'] as const
type NotificationPermission = (typeof notificationPermissions)[number]

type OnboardingProfile = {
  display_name: string
  onboarding_completed_at: string | null
  notification_permission: NotificationPermission
}

type ProfileResult =
  | { ok: true; profile: OnboardingProfile | null }
  | { ok: false; error: string }

type CompleteResult = { ok: true; profile: OnboardingProfile } | { ok: false; error: string }

type CompleteInput = {
  display_name: unknown
  notification_permission: unknown
}

function isNotificationPermission(value: unknown): value is NotificationPermission {
  return typeof value === 'string' && notificationPermissions.includes(value as NotificationPermission)
}

function validateInput(input: CompleteInput): { displayName: string; notificationPermission: NotificationPermission } | string {
  if (!input || typeof input !== 'object') return 'Onboarding details are required.'
  if (typeof input.display_name !== 'string') return 'Display name is required.'
  const displayName = input.display_name.trim()
  if (!displayName || displayName.length > 100) return 'Display name must be between 1 and 100 characters.'
  if (!isNotificationPermission(input.notification_permission)) return 'Notification permission is invalid.'
  return { displayName, notificationPermission: input.notification_permission }
}

export async function getOnboardingProfile(): Promise<ProfileResult> {
  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return { ok: false, error: 'You must be signed in.' }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('display_name, onboarding_completed_at, notification_permission')
    .eq('user_id', auth.user.id)
    .maybeSingle()
  if (error) return { ok: false, error: 'Could not load your onboarding profile.' }
  return { ok: true, profile: data as OnboardingProfile | null }
}

export async function completeOnboarding(input: CompleteInput): Promise<CompleteResult> {
  const validated = validateInput(input)
  if (typeof validated === 'string') return { ok: false, error: validated }

  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return { ok: false, error: 'You must be signed in.' }

  const completedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: auth.user.id,
      display_name: validated.displayName,
      notification_permission: validated.notificationPermission,
      onboarding_completed_at: completedAt,
      updated_at: completedAt,
    })
    .select('display_name, onboarding_completed_at, notification_permission')
    .single()
  if (error || !data) return { ok: false, error: 'Could not save your onboarding profile.' }
  return { ok: true, profile: data as OnboardingProfile }
}
