import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  await (await createClient()).auth.signOut({ scope: "local" })
  return NextResponse.redirect(new URL("/login", request.url))
}
