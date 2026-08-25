"use client"

import Link from "next/link"
import { useActionState } from "react"
import { signIn, signUp, requestReset, type AuthState } from "./actions"

type Mode = "signin" | "signup" | "reset"

export function AuthForm({ mode, next = "/" }: { mode: Mode; next?: string }) {
  const action = mode === "signin" ? signIn : mode === "signup" ? signUp : requestReset
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {})
  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"
  const description = mode === "reset" ? "We'll send instructions if an account exists." : "Keep your medication routine on track."

  return (
    <main className="auth-shell">
      <aside className="auth-aside" aria-label="RemindMeds introduction">
        <Link href="/" className="auth-brand"><img src="/icon.svg" alt="" aria-hidden="true" className="auth-brand-mark" /><span>RemindMeds</span></Link>
        <div className="auth-aside-copy"><p className="eyebrow">Your routine, made simple</p><h2>Feel steady about every dose.</h2><p>RemindMeds keeps your medication plan clear, private, and easy to follow.</p></div>
        <p className="auth-privacy">Your medication data stays private and secure.</p>
      </aside>
      <section className="auth-main" aria-labelledby="auth-title">
        <div className="auth-card">
          <Link href="/" className="auth-mobile-brand"><img src="/icon.svg" alt="" aria-hidden="true" className="auth-brand-mark" /><span>RemindMeds</span></Link>
          <p className="eyebrow">{mode === "reset" ? "Account access" : mode === "signup" ? "Get started" : "Welcome back"}</p>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-description">{description}</p>
          <form action={formAction} className="auth-form">
            {mode === "signin" && <input type="hidden" name="next" value={next} />}
            <label>Email<input name="email" type="email" required autoComplete="email" /></label>
            {mode !== "reset" && <label>Password<input name="password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>}
            {state.error && <p role="alert" className="auth-error">{state.error}</p>}
            {state.message && <p role="status" className="auth-message">{state.message}</p>}
            <button type="submit" disabled={pending} className="primary-button auth-submit">{pending ? "Please wait…" : title}</button>
          </form>
          <div className="auth-links">
            {mode === "signin" && <Link href="/login/forgot-password">Forgot your password?</Link>}
            {mode === "signin" && <span>New to RemindMeds? <Link href="/login/signup">Create an account</Link></span>}
            {mode !== "signin" && <span>Already have an account? <Link href="/login">Sign in</Link></span>}
          </div>
        </div>
      </section>
    </main>
  )
}
