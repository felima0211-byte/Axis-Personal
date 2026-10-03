import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl
  const pub = ['/login', '/_next', '/brand', '/favicon', '/manifest', '/api/auth']
  if (!session && !pub.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
