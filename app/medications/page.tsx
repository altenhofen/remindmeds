"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Check, ChevronLeft, ChevronRight, Clock3, Edit3, Pill, Plus, X } from "lucide-react";
import { createMedication, updateMedication, archiveMedication } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { RouteShell } from "@/app/components/route-shell";
import { cn } from "@/lib/utils";
import { medicationWizardSchema } from "@/lib/validation/medication";

type Medication = { id: string; name: string; dosage: string | null; form: string | null; notes: string | null };
type Schedule = { id: string; medication_id: string; local_time: string; timezone: string; dose_amount: number; days_of_week: number[]; archived_at: string | null };
type FormState = { name: string; dosage: string; form: string; notes: string; local_time: string; timezone: string; dose_amount: string; weekdays: number[]; inventory: string };
const blank: FormState = { name: "", dosage: "", form: "", notes: "", local_time: "08:00", timezone: "UTC", dose_amount: "1", weekdays: [0, 1, 2, 3, 4, 5, 6], inventory: "" };
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const steps = ["Medication", "Schedule", "Details", "Review"];

export default function MedicationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [form, setForm] = useState<FormState>(blank);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data } = await supabase.auth.getUser(); const current = data.user;
    setUser(current ? { id: current.id } : null); if (!current) { setLoading(false); return; }
    const [m, s] = await Promise.all([
      supabase.from("medications").select("*").is("archived_at", null).order("name"),
      supabase.from("medication_schedules").select("*").is("archived_at", null),
    ]);
    if (m.error || s.error) setError("We couldn't load your medications. Please try again.");
    else { setMedications((m.data ?? []) as Medication[]); setSchedules((s.data ?? []) as Schedule[]); }
    setLoading(false);
  }, [supabase]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const update = (key: keyof FormState, value: string | number[]) => setForm((current) => ({ ...current, [key]: value }));
  const openWizard = useCallback((medication?: Medication) => {
    setEditing(medication ?? null); setSuccess(false); setError(null); setFieldErrors({}); setStep(0);
    if (medication) { const schedule = schedules.find((item) => item.medication_id === medication.id); setForm({ ...blank, name: medication.name, dosage: medication.dosage ?? "", form: medication.form ?? "", notes: medication.notes ?? "", local_time: schedule?.local_time?.slice(0, 5) ?? "08:00", timezone: schedule?.timezone ?? "UTC", dose_amount: String(schedule?.dose_amount ?? 1), weekdays: schedule?.days_of_week ?? blank.weekdays }); }
    else setForm(blank);
    setFormOpen(true);
  }, [schedules]);
  const closeWizard = () => { setEditing(null); setForm(blank); setFormOpen(false); setSuccess(false); setFieldErrors({}); };
  const validateStep = () => {
    const errors: Record<string, string> = {};
    if (step === 0 && !form.name.trim()) errors.name = "Enter a medication name.";
    if (step === 1) { const result = medicationWizardSchema.pick({ local_time: true, timezone: true, dose_amount: true, weekdays: true }).safeParse({ local_time: form.local_time, timezone: form.timezone, dose_amount: Number(form.dose_amount), weekdays: form.weekdays }); if (!result.success) result.error.issues.forEach((issue) => { errors[issue.path[0] as string] = issue.message; }); }
    setFieldErrors(errors); return Object.keys(errors).length === 0;
  };
  const next = () => { if (validateStep()) setStep((current) => Math.min(current + 1, 3)); };
  const submit = async () => {
    if (!user || !validateStep()) return;
    const result = medicationWizardSchema.safeParse({ ...form, dosage: form.dosage.trim() || null, form: form.form.trim() || null, notes: form.notes.trim() || null, dose_amount: Number(form.dose_amount), inventory: form.inventory ? Number(form.inventory) : null });
    if (!result.success) { setFieldErrors({ form: "Please check the details in each step." }); return; }
    setSaving(true); setError(null);
    const input = result.data;
    const saved = editing ? await updateMedication(editing.id, input) : await createMedication(input);
    if (!saved.ok) setError("We couldn't save that medication. Please review the details and try again."); else { await load(); setSuccess(true); }
    setSaving(false);
  };
  const archive = async (medication: Medication) => { setError(null); setSaving(true); const result = await archiveMedication(medication.id); if (!result.ok) setError("We couldn't archive that medication."); else await load(); setSaving(false); };

  if (loading) return <RouteShell title="Medications" eyebrow="Manage your plan" description="Keep your daily routine clear and up to date."><div className="loading-state" aria-busy="true">Loading medications…</div></RouteShell>;
  return <RouteShell title="Medications" eyebrow="Manage your plan" description="Keep your daily routine clear and up to date."><main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-10">
    <Link href="/" className="back-link">← <span>Today</span></Link>
    <div className="page-heading"><div><p className="eyebrow">Manage your plan</p><h1>Medications</h1><p className="subheading">Keep your daily routine clear and up to date.</p></div>{user && <button onClick={() => openWizard()} className="primary-button"><Plus size={18} /> Add medication</button>}</div>
    {!user && <section className="empty-card"><div className="icon-tile"><Pill size={22} /></div><h2>Sign in to manage medications</h2><p>Save your medication plan and keep every dose in one place.</p><Link href="/login" className="primary-button">Sign in</Link></section>}
    {user && error && <p role="alert" className="alert-card">{error}</p>}
    {user && medications.length === 0 && <section className="empty-card"><div className="icon-tile"><Pill size={22} /></div><h2>No medications yet</h2><p>Add your first medication to build a plan for today.</p><button onClick={() => openWizard()} className="secondary-button"><Plus size={17} /> Add medication</button></section>}
    {user && medications.length > 0 && <div className="medication-list">{medications.map((medication) => { const schedule = schedules.find((item) => item.medication_id === medication.id); return <article key={medication.id} className="medication-card"><div className="medication-icon"><Pill size={21} /></div><div className="medication-details"><h2>{medication.name}</h2><p className="muted">{medication.dosage || "Medication"}{medication.form ? ` · ${medication.form}` : ""}</p>{schedule && <div className="schedule-detail"><Clock3 size={15} /> {schedule.dose_amount} dose at {schedule.local_time.slice(0, 5)} <span aria-hidden="true">·</span> {schedule.days_of_week.map((day) => days[day]).join(", ")}</div>}{medication.notes && <p className="notes">{medication.notes}</p>}</div><div className="card-actions"><button aria-label={`Edit ${medication.name}`} onClick={() => openWizard(medication)} className="icon-button"><Edit3 size={17} /></button><button aria-label={`Archive ${medication.name}`} disabled={saving} onClick={() => void archive(medication)} className="icon-button"><Archive size={17} /></button></div></article>; })}</div>}
    {user && formOpen && <div className="fixed inset-0 z-20 overflow-y-auto bg-[var(--surface)]/90 p-4 backdrop-blur-sm sm:p-8"><section className="mx-auto max-w-2xl rounded-3xl border border-[var(--divider)] bg-white p-6 shadow-xl sm:p-10" aria-label="Medication setup wizard"><div className="mb-8 flex items-start justify-between"><div><p className="eyebrow">{editing ? "Update details" : "New routine"}</p><h2>{success ? "You're all set" : editing ? "Edit medication" : "Build your routine"}</h2></div><button type="button" onClick={closeWizard} aria-label="Close wizard" className="icon-button"><X size={19} /></button></div>{success ? <div className="space-y-6 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mint-100)] text-[var(--teal-700)]"><Check size={30} /></div><p className="subheading">Your medication is ready for today.</p><Link href="/" className="primary-button inline-flex">Go to Today</Link></div> : <><div className="mb-9" aria-label={`Step ${step + 1} of ${steps.length}`}><div className="mb-3 flex justify-between text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]"><span>Step {step + 1} of {steps.length}</span><span>{steps[step]}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--teal-100)]"><div className="h-full rounded-full bg-[var(--teal-700)] transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></div><div className="min-h-[250px]">{step === 0 && <div className="wizard-copy"><h3>What are you taking?</h3><p>Start with the basics. You can always update these details later.</p><Field label="Medication name" value={form.name} onChange={(value) => update("name", value)} error={fieldErrors.name} autoFocus /><Field label="Dosage (optional)" value={form.dosage} onChange={(value) => update("dosage", value)} placeholder="e.g. 10 mg" /><Field label="Form (optional)" value={form.form} onChange={(value) => update("form", value)} placeholder="e.g. tablet" /></div>}{step === 1 && <div className="wizard-copy"><h3>When do you take it?</h3><p>Choose a time and the days this routine applies.</p><div className="form-grid"><Field label="Local time" type="time" value={form.local_time} onChange={(value) => update("local_time", value)} error={fieldErrors.local_time} /><Field label="Timezone" value={form.timezone} onChange={(value) => update("timezone", value)} error={fieldErrors.timezone} /></div><Field label="Dose amount" type="number" value={form.dose_amount} onChange={(value) => update("dose_amount", value)} error={fieldErrors.dose_amount} /><fieldset><legend>Days of the week</legend><div className="flex flex-wrap gap-2">{days.map((day, index) => <button type="button" key={day} onClick={() => update("weekdays", form.weekdays.includes(index) ? form.weekdays.filter((item) => item !== index) : [...form.weekdays, index].sort())} className={cn("rounded-xl border px-3 py-2 text-sm", form.weekdays.includes(index) ? "border-[var(--teal-700)] bg-[var(--teal-100)] text-[var(--teal-700)]" : "border-[var(--divider)] text-[var(--ink-muted)]")}>{day}</button>)}</div></fieldset>{fieldErrors.weekdays && <p className="field-error">{fieldErrors.weekdays}</p>}</div>}{step === 2 && <div className="wizard-copy"><h3>Anything else to remember?</h3><p>These details are optional, but can make your plan easier to follow.</p><Field label="Initial inventory (optional)" type="number" value={form.inventory} onChange={(value) => update("inventory", value)} placeholder="e.g. 30" /><label>Notes (optional)<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={4} placeholder="Add a note for yourself" /></label></div>}{step === 3 && <div className="wizard-copy"><h3>Review your routine</h3><p>Everything look right? Save it when you’re ready.</p><dl className="review-list"><div><dt>Medication</dt><dd>{form.name} {form.dosage && `· ${form.dosage}`} {form.form && `· ${form.form}`}</dd></div><div><dt>Schedule</dt><dd>{form.dose_amount} dose at {form.local_time} ({form.timezone})</dd></div><div><dt>Days</dt><dd>{form.weekdays.map((day) => days[day]).join(", ")}</dd></div>{form.inventory && <div><dt>Initial inventory</dt><dd>{form.inventory}</dd></div>}{form.notes && <div><dt>Notes</dt><dd>{form.notes}</dd></div>}</dl>{fieldErrors.form && <p className="field-error">{fieldErrors.form}</p>}</div>}</div><div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--divider)] pt-6"><button type="button" onClick={() => step === 0 ? closeWizard() : setStep((current) => current - 1)} className="secondary-button"><ChevronLeft size={17} /> {step === 0 ? "Cancel" : "Back"}</button>{step < 3 ? <button type="button" onClick={next} className="primary-button">Continue <ChevronRight size={17} /></button> : <button type="button" onClick={() => void submit()} disabled={saving} className="primary-button">{saving ? "Saving…" : editing ? "Save changes" : "Save medication"}</button>}</div></>}</section></div>}
  </main></RouteShell>;
}

function Field({ label, value, onChange, error, type = "text", placeholder, autoFocus }: { label: string; value: string; onChange: (value: string) => void; error?: string; type?: string; placeholder?: string; autoFocus?: boolean }) {
  return <label>{label}<input autoFocus={autoFocus} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{error && <span className="field-error">{error}</span>}</label>;
}
