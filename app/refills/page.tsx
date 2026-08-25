import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { RouteShell } from '@/app/components/route-shell'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { saveRefillSetting as saveRefillAction } from './actions'
 
async function saveRefillSetting(formData: FormData): Promise<void> {
  'use server'
  await saveRefillAction(formData)
}


type Medication = { id: string; name: string; dosage: string | null; form: string | null }
type Event = { medication_id: string; quantity_change: number | string }
type Refill = { medication_id: string; reorder_threshold: number | string; refill_amount: number | string; enabled: boolean; notify_after_days: number | string }

export default async function RefillsPage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return <RouteShell title="Refills" eyebrow="Stay prepared" description="Keep refill reminders in one place."><main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-10"><section className="empty-card"><div className="icon-tile"><ClipboardList size={22} /></div><h2>Sign in to manage refills</h2><p>Refill settings are private to your account.</p><Link href="/login" className="primary-button">Sign in</Link></section></main></RouteShell>
  const [medicationsResult, eventsResult, settingsResult] = await Promise.all([
    supabase.from('medications').select('id,name,dosage,form').eq('user_id', auth.user.id).is('archived_at', null).order('name'),
    supabase.from('inventory_events').select('medication_id,quantity_change').eq('user_id', auth.user.id),
    supabase.from('refill_settings').select('medication_id,reorder_threshold,refill_amount,enabled,notify_after_days').eq('user_id', auth.user.id),
  ])
  const error = medicationsResult.error || eventsResult.error || settingsResult.error
  const medications = (medicationsResult.data ?? []) as Medication[]
  const settings = (settingsResult.data ?? []) as Refill[]
  const settingByMedication: Record<string, Refill> = {}
  settings.forEach((setting) => { settingByMedication[setting.medication_id] = setting })
  const totals: Record<string, number> = {}
  ;((eventsResult.data ?? []) as Event[]).forEach((event) => { totals[event.medication_id] = (totals[event.medication_id] ?? 0) + Number(event.quantity_change) })
  return <RouteShell title="Refills" eyebrow="Stay prepared" description="Keep refill reminders in one place."><main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-10"><div className="page-heading"><div><p className="eyebrow">Supply planning</p><h1>Refills</h1><p className="subheading">Set thresholds and see which medications need attention.</p></div><Link href="/medications" className="primary-button"><Plus size={18} /> Add medication</Link></div>{error && <p role="alert" className="alert-card">We couldn’t load your refill settings. Please try again.</p>}{!error && medications.length === 0 && <section className="empty-card"><div className="icon-tile"><ClipboardList size={22} /></div><h2>No medications to configure</h2><p>Add a medication before setting refill notifications.</p><Link href="/medications" className="primary-button">Add medication</Link></section>}<div className="space-y-4">{!error && medications.map((medication) => { const setting = settingByMedication[medication.id]; const threshold = Number(setting?.reorder_threshold ?? 0); const days = Number(setting?.notify_after_days ?? 0); const quantity = totals[medication.id] ?? 0; const enabled = setting?.enabled ?? false; const daysId = `days-${medication.id}`; const thresholdId = `threshold-${medication.id}`; return <form key={medication.id} action={saveRefillSetting} className="surface-card grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-start"><input type="hidden" name="medication_id" value={medication.id} /><div><h2 className="text-lg font-semibold">{medication.name}</h2><p className="muted-text">{[medication.dosage, medication.form].filter(Boolean).join(' · ') || 'Medication'}</p><p className={cn('mt-4 text-sm font-medium', quantity <= threshold && threshold > 0 ? 'text-amber-700' : 'text-slate-600')}>Current stock: {quantity}</p></div><div className="grid min-w-64 gap-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="enabled" defaultChecked={enabled} /> Notify me</label><div className="grid gap-1 text-sm"><span>Notify when refill is due</span><div className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1"><button type="button" data-stepper-button="decrement" data-stepper-target={daysId} aria-label="Decrease days until refill notification" className="bg-transparent px-2 text-lg font-semibold text-teal-700">−</button><output id={`${daysId}-output`} htmlFor={daysId} aria-live="polite" className="font-semibold">{days}</output><button type="button" data-stepper-button="increment" data-stepper-target={daysId} aria-label="Increase days until refill notification" className="bg-transparent px-2 text-lg font-semibold text-teal-700">+</button></div><input id={daysId} type="hidden" name="notify_after_days" value={days} /><span id={`${daysId}-description`} className="muted-text">0 days means notify today, when attention is due.</span></div><div className="grid gap-1 text-sm"><span>Low-stock threshold</span><div className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1"><button type="button" data-stepper-button="decrement" data-stepper-target={thresholdId} aria-label="Decrease low-stock threshold" className="bg-transparent px-2 text-lg font-semibold text-teal-700">−</button><output id={`${thresholdId}-output`} htmlFor={thresholdId} aria-live="polite" className="font-semibold">{threshold}</output><button type="button" data-stepper-button="increment" data-stepper-target={thresholdId} aria-label="Increase low-stock threshold" className="bg-transparent px-2 text-lg font-semibold text-teal-700">+</button></div><input id={thresholdId} type="hidden" name="reorder_threshold" value={threshold} /></div><input type="hidden" name="refill_amount" value={Number(setting?.refill_amount ?? threshold)} /><button type="submit" className="secondary-button">Save notification</button></div></form> })}</div><script dangerouslySetInnerHTML={{ __html: `document.addEventListener('click',function(event){var button=event.target.closest('[data-stepper-button]');if(!button)return;var input=document.getElementById(button.dataset.stepperTarget);var output=document.getElementById(button.dataset.stepperTarget+'-output');if(!input||!output)return;var value=Number(input.value)||0;var max=button.dataset.stepperTarget.indexOf('days-')===0?365:Infinity;value=Math.max(0,Math.min(max,value+(button.dataset.stepperButton==='increment'?1:-1)));input.value=String(value);output.textContent=String(value)})` }} /></main></RouteShell>
}
