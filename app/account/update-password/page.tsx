import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

async function updatePassword(formData: FormData) {
  "use server"
  const password = String(formData.get("password") ?? "")
  if (password.length < 6) redirect("/account/update-password?error=invalid")
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect("/login")
  const { error } = await supabase.auth.updateUser({ password })
  redirect(error ? "/account/update-password?error=failed" : "/")
}

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/login")
  return <main className="min-h-screen flex items-center justify-center bg-[#f8f7f2] px-6"><div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5"><h1 className="text-3xl font-semibold text-[#252a22]">Choose a new password</h1><form action={updatePassword} className="mt-8 space-y-5"><label className="block text-sm font-medium text-[#343b31]">New password<input name="password" type="password" required minLength={6} autoComplete="new-password" className="mt-2 block w-full rounded-xl border border-[#d8ddd2] px-4 py-3" /></label>{params.error && <p role="alert" className="text-sm text-red-700">That password could not be updated.</p>}<button className="w-full rounded-xl bg-[#637957] px-4 py-3 font-medium text-white">Update password</button></form></div></main>
}
