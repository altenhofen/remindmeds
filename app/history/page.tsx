import Link from "next/link";
import { CalendarDays, History as HistoryIcon, Pill } from "lucide-react";
import { RouteShell } from "@/app/components/route-shell";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

type DoseEvent = { id: string; medication_id: string; scheduled_for: string; status: string; created_at?: string };
type Medication = { id: string; name: string; dosage: string | null };

const statusStyles: Record<string, string> = { taken: "bg-[var(--mint-100)] text-[var(--teal-700)]", skipped: "bg-amber-50 text-amber-700", missed: "bg-red-50 text-red-700", scheduled: "bg-slate-100 text-slate-700" };
function label(status: string) { return status.charAt(0).toUpperCase() + status.slice(1); }

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <RouteShell title="History" eyebrow="Your record" description="Review your medication doses."><Empty signedOut /></RouteShell>;
  const [eventsResult, medsResult] = await Promise.all([
    supabase.from("dose_events").select("id, medication_id, scheduled_for, status, created_at").eq("user_id", auth.user.id).order("scheduled_for", { ascending: false }).limit(100),
    supabase.from("medications").select("id, name, dosage").eq("user_id", auth.user.id),
  ]);
  const error = eventsResult.error || medsResult.error;
  const meds = new Map(((medsResult.data ?? []) as Medication[]).map((med) => [med.id, med]));
  return <RouteShell title="History" eyebrow="Your record" description="Review your medication doses."><main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-10"><div className="mb-6 flex items-center justify-between"><Link href="/" className="back-link">← <span>Today</span></Link><CalendarDays size={21} className="text-[var(--ink-muted)]" /></div>{error ? <p role="alert" className="alert-card">We couldn’t load your dose history. Please try again later.</p> : (eventsResult.data?.length ?? 0) === 0 ? <Empty /> : <div className="space-y-3">{(eventsResult.data as DoseEvent[]).map((event) => { const med = meds.get(event.medication_id); return <article key={event.id} className="flex items-center gap-4 rounded-2xl border border-[var(--divider)] bg-white p-4"><div className="icon-tile"><Pill size={19} /></div><div className="min-w-0 flex-1"><h2 className="font-semibold">{med?.name ?? "Medication"}</h2><p className="muted">{med?.dosage || "Dose"} · {new Date(event.scheduled_for).toLocaleString()}</p></div><span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyles[event.status] ?? statusStyles.scheduled)}>{label(event.status)}</span></article>; })}</div>}</main></RouteShell>;
}
function Empty({ signedOut = false }: { signedOut?: boolean }) { return <section className="empty-card"><div className="icon-tile"><HistoryIcon size={22} /></div><h2>{signedOut ? "Sign in to view your history" : "No dose history yet"}</h2><p>{signedOut ? "Your dose record is private to your account." : "Recorded doses will appear here as you use your plan."}</p>{signedOut && <Link href="/login" className="primary-button">Sign in</Link>}</section>; }
