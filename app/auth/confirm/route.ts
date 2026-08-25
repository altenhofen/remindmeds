import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const supportedTypes: Record<string, true> = { signup: true, email: true, recovery: true }

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) {
    try {
      const url = new URL(configured)
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin
    } catch {}
  }
  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get("type")
  const destination = type === "recovery" ? "/account/update-password" : "/"
  const origin = siteUrl()
  if (!origin || !type || !supportedTypes[type]) return new NextResponse("Invalid confirmation request", { status: 400 })
  const supabase = await createClient()
  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "signup" | "email" | "recovery" })
      : { error: new Error("Missing confirmation token") }
  return NextResponse.redirect(new URL(result.error ? "/login?error=confirmation" : destination, origin))
}
