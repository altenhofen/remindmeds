"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, History, LayoutGrid, LogOut, Menu, Package, Pill, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
const navigation = [
  ["Today", "/", LayoutGrid], ["Medications", "/medications", Pill], ["Schedule", "/schedule", CalendarDays],
  ["Inventory", "/inventory", Package], ["History", "/history", History], ["Refills", "/refills", ClipboardList], ["Settings", "/settings", Settings],
] as const;

export function RouteShell({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children?: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = navigation.map(([label, href, Icon]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", href === pathname ? "bg-[var(--teal-100)] text-[var(--teal-700)]" : "text-[var(--ink-muted)] hover:bg-[var(--surface)]")}><Icon size={19} />{label}</Link>);
  return <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
    <header className="flex h-16 items-center justify-between border-b border-[var(--divider)] bg-white px-5 lg:hidden"><Link href="/" className="flex items-center gap-2 font-semibold"><img src="/icon.svg" alt="" aria-hidden="true" className="h-9 w-9 rounded-xl" />RemindMeds</Link><button aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 text-[var(--ink-muted)]">{menuOpen ? <X /> : <Menu />}</button></header>
    <div className="flex min-h-[calc(100vh-4rem)] lg:min-h-screen"><aside className={cn(menuOpen ? "block" : "hidden", "absolute inset-x-0 top-16 z-10 border-b border-[var(--divider)] bg-white p-4 shadow-md lg:relative lg:top-0 lg:block lg:w-[264px] lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6 lg:shadow-none")}><div className="mb-10 hidden items-center gap-2 lg:flex"><img src="/icon.svg" alt="" aria-hidden="true" className="h-9 w-9 rounded-xl" /><span className="font-semibold">RemindMeds</span></div><nav aria-label="Main navigation" className="space-y-1">{links}</nav><form action="/auth/signout" method="post" className="mt-4 border-t border-[var(--divider)] pt-4"><button type="submit" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface)]"><LogOut size={19} />Sign out</button></form></aside>
      <main className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-12 lg:py-10"><header className="mb-8"><p className="mb-2 text-sm font-medium text-[var(--teal-700)]">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight sm:text-[40px]">{title}</h1><p className="mt-2 text-[var(--ink-muted)]">{description}</p></header>{children}</main>
    </div>
  </div>;
}
