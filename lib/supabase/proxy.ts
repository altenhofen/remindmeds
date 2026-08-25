import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = [
  '/',
  '/medications',
  '/schedule',
  '/inventory',
  '/history',
  '/refills',
  '/settings',
  '/help',
] as const

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(`${route}/`)),
  )
}

function isSafeNextPath(pathname: string, search: string) {
  return pathname.startsWith('/') && !pathname.startsWith('//')
    ? `${pathname}${search}`
    : '/'
}

function isPublicAuthRoute(pathname: string) {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/') ||
    pathname === '/api/auth' ||
    pathname.startsWith('/api/auth/')
  )
}

function preserveResponse(response: NextResponse, target: NextResponse) {
  response.headers.forEach((value, key) => target.headers.set(key, value))
  response.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options)
  })
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          const headers = new Headers(response.headers)
          response = NextResponse.next({ request })
          headers.forEach((value, key) => response.headers.set(key, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims && isProtectedRoute(request.nextUrl.pathname) && !isPublicAuthRoute(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = `?next=${encodeURIComponent(
      isSafeNextPath(request.nextUrl.pathname, request.nextUrl.search),
    )}`
    const redirect = NextResponse.redirect(loginUrl)
    preserveResponse(response, redirect)
    response = redirect
  }

  return response
}
