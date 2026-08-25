import Link from "next/link";
import { Package, Plus, Settings2 } from "lucide-react";
import { RouteShell } from "@/app/components/route-shell";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

type Medication = { id: string; name: string; dosage: string | null; form: string | null };
type InventoryEvent = { medication_id: string; quantity_change: number | string };

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return <RouteShell title="Inventory" eyebrow="Keep track of supply" description="Monitor medication quantities and stay prepared."><main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-10"><section className="empty-card"><div className="icon-tile"><Package size={22} /></div><h2>Sign in to view inventory</h2><p>Your medication supply is private to your account.</p><Link href="/login" className="primary-button">Sign in</Link></section></main></RouteShell>;
  const [medicationsResult, eventsResult] = await Promise.all([
    supabase.from("medications").select("id,name,dosage,form").eq("user_id", user.id).is("archived_at", null).order("name"),
    supabase.from("inventory_events").select("medication_id,quantity_change").eq("user_id", user.id),
  ]);
  const error = medicationsResult.error || eventsResult.error;
  const medications = (medicationsResult.data ?? []) as Medication[];
  const totals = new Map<string, number>();
  ((eventsResult.data ?? []) as InventoryEvent[]).forEach((event) => totals.set(event.medication_id, (totals.get(event.medication_id) ?? 0) + Number(event.quantity_change)));
  return <RouteShell title="Inventory" eyebrow="Keep track of supply" description="Monitor medication quantities and stay prepared."><main className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-10"><div className="page-heading"><div><p className="eyebrow">Supply overview</p><h1>Inventory</h1><p className="subheading">Know what you have before you need it.</p></div><Link href="/medications" className="primary-button"><Plus size={18} /> Add medication</Link></div>{error && <p role="alert" className="alert-card">We couldn’t load your inventory. Please try again.</p>}{!error && medications.length === 0 && <section className="empty-card"><div className="icon-tile"><Package size={22} /></div><h2>No medications to track</h2><p>Add a medication to start tracking its supply.</p><Link href="/medications" className="secondary-button"><Plus size={17} /> Add medication</Link></section>}{medications.length > 0 && <div className="medication-list">{medications.map((medication) => { const quantity = Math.max(0, totals.get(medication.id) ?? 0); const status = quantity <= 0 ? "Out of stock" : quantity <= 7 ? "Low stock" : "On track"; const meter = Math.min(100, quantity * 10); return <article key={medication.id} className="medication-card"><div className="medication-icon"><Package size={21} /></div><div className="medication-details"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2>{medication.name}</h2><p className="muted">{medication.dosage || "Medication"}{medication.form ? ` · ${medication.form}` : ""}</p></div><span className={cn("rounded-full px-3 py-1 text-xs font-semibold", status === "On track" ? "bg-[var(--mint-100)] text-[var(--teal-700)]" : status === "Low stock" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")}>{status}</span></div><div className="mt-4 flex items-center justify-between text-sm"><span className="font-medium">{quantity} {quantity === 1 ? "unit" : "units"} remaining</span><Link href="/medications" className="inline-flex items-center gap-1 text-[var(--teal-700)]"><Settings2 size={15} /> Manage</Link></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--teal-100)]"><div className={cn("h-full rounded-full", status === "Out of stock" ? "bg-red-400" : status === "Low stock" ? "bg-amber-400" : "bg-[var(--teal-500)]")} style={{ width: `${meter}%` }} /></div></div></article>; })}</div>}</main></RouteShell>;
}
