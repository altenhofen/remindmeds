import { z } from 'zod'

export const displayNameSchema = z.string().trim().min(1, 'Name is required.')

const optionalText = z.string().trim().nullable().optional()

export const medicationWizardSchema = z.object({
  name: z.string().trim().min(1, 'Medication name is required.'),
  dosage: optionalText,
  form: optionalText,
  notes: optionalText,
  local_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'A valid local time is required.'),
  timezone: z.string().trim().min(1, 'Timezone is required.'),
  dose_amount: z.number().finite().positive('Dose amount must be positive.'),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'Select at least one valid weekday.')
    .refine((days) => new Set(days).size === days.length, 'Weekdays must be unique.'),
  inventory: z.number().finite().nullable().optional(),
})

export type DisplayName = z.infer<typeof displayNameSchema>
export type MedicationWizardData = z.infer<typeof medicationWizardSchema>
