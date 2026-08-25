import Link from "next/link";
import { CalendarDays, Clock3, Pill } from "lucide-react";
import { RouteShell } from "@/app/components/route-shell";
import { createClient } from "@/lib/supabase/server";

type Medication = { id: string; name: string; dosage: string | null; form: string | null };
type Schedule = {
  id: string;
  medication_id: string;
  local_time: string;
  timezone: string;
  dose_amount: number;
  days_of_week: number[] | null;
  archived_at: string | null;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return <RouteShell title="Schedule" eyebrow="Plan your routine" description="See when your medications are due."><ScheduleMessage title="Sign in to view your schedule" body="Your medication routine is private to your account." link="/login" label="Sign in" /></RouteShell>;
  }

  const [scheduleResult, medicationResult] = await Promise.all([
    supabase.from("medication_schedules").select("id, medication_id, local_time, timezone, dose_amount, days_of_week, archived_at").eq("user_id", user.user.id).is("archived_at", null).order("local_time"),
    supabase.from("medications").select("id, name, dosage, form").eq("user_id", user.user.id).is("archived_at", null).order("name"),
  ]);
  const failed = scheduleResult.error || medicationResult.error;
  const schedules = (scheduleResult.data ?? []) as Schedule[];
  const medications = (medicationResult.data ?? []) as Medication[];
  const medicationById = new Map(medications.map((medication) => [medication.id, medication]));

  return <RouteShell title="Schedule" eyebrow="Plan your routine" description="See when your medications are due."><main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-10">
    <Link href="/" className="back-link">← <span>Today</span></Link>
    <div className="page-heading"><div><p className="eyebrow">Plan your routine</p><h1>Schedule</h1><p className="subheading">See when your medications are due.</p></div><Link href="/" className="secondary-button">Today</Link></div>
    {failed ? <p role="alert" className="alert-card">We couldn’t load your schedule right now. Please try again.</p> : schedules.length === 0 ? <ScheduleMessage title="No active schedules yet" body="Add a medication and set its timing to build your daily routine." link="/medications" label="Add medication" /> : <div className="space-y-4">{schedules.map((schedule) => {
      const medication = medicationById.get(schedule.medication_id);
      if (!medication) return null;
      const days = (schedule.days_of_week ?? []).filter((day) => day >= 0 && day < 7);
      return <article key={schedule.id} className="rounded-2xl border border-[var(--divider)] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-4"><div className="icon-tile shrink-0"><Pill size={22} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{medication.name}</h2><p className="muted">{medication.dosage || "Medication"}{medication.form ? ` · ${medication.form}` : ""}</p></div><div className="flex items-center gap-2 text-lg font-semibold text-[var(--teal-700)]"><Clock3 size={18} />{formatTime(schedule.local_time)}</div></div><div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--ink-muted)]"><span className="font-medium">{schedule.dose_amount} {schedule.dose_amount === 1 ? "dose" : "doses"}</span><span aria-hidden="true">·</span><span>{schedule.timezone}</span><span aria-hidden="true">·</span>{days.length ? <div className="flex flex-wrap gap-1">{days.map((day) => <span key={day} className="rounded-full bg-[var(--teal-100)] px-2 py-0.5 text-xs font-medium text-[var(--teal-700)]">{weekdays[day]}</span>)}</div> : <span>No weekdays selected</span>}</div></div></div></article>;
    })}</div>}
  </main></RouteShell>;
}

function formatTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ScheduleMessage({ title, body, link, label }: { title: string; body: string; link: string; label: string }) {
  return <section className="empty-card"><div className="icon-tile"><CalendarDays size={22} /></div><h2>{title}</h2><p>{body}</p><Link href={link} className="primary-button">{label}</Link></section>;
}
