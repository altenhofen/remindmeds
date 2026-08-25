import { AuthForm } from "./form"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/"
  return <><AuthForm mode="signin" next={next} />{params.error === "confirmation" && <p role="alert" className="auth-notice">That confirmation link is invalid or expired.</p>}</>
}
