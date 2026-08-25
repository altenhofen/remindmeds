"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) {
    try {
      const url = new URL(configured)
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin
    } catch {}
  }
  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : null
}
const siteUrl = getSiteUrl()
const validEmail = (value: string) => /\S+@\S+\.\S+/.test(value)

export type AuthState = { error?: string; message?: string }

function safeNext(value: unknown) {
  const next = typeof value === "string" ? value : "/"
  return next.startsWith("/") && !next.startsWith("//") ? next : "/"
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = safeNext(formData.get("next"))
  if (!validEmail(email) || password.length < 6) return { error: "Enter a valid email and password (at least 6 characters)." }
  const { error } = await (await createClient()).auth.signInWithPassword({ email, password })
  if (error) return { error: "We couldn't sign you in with those details." }
  redirect(next)
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!validEmail(email) || password.length < 6) return { error: "Enter a valid email and a password of at least 6 characters." }
  if (!siteUrl) return { error: "Authentication is temporarily unavailable." }
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl}/auth/confirm` } })
  if (error) return { error: "We couldn't create your account. Please try again." }
  if (data.session) redirect("/")
  return { message: "Check your email for a confirmation link." }
}

export async function requestReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim()
  if (!validEmail(email)) return { error: "Enter a valid email address." }
  if (!siteUrl) return { error: "Authentication is temporarily unavailable." }
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/account/update-password` })
  if (error) return { error: "We couldn't send reset instructions. Please try again." }
  return { message: "If an account exists for that email, you'll receive reset instructions shortly." }
}
