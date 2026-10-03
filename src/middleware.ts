import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/favicon.ico', '/_next', '/api/auth', '/api/v1/health']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

function securityHeaders(response: NextResponse): NextResponse {
  const h = response.headers
  h.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} https://*.supabase.co wss://*.supabase.co`,
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  )
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('X-Frame-Options', 'DENY')
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  h.delete('X-Powered-By')
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const response = NextResponse.next({ request })

  if (isPublicPath(pathname)) {
    return securityHeaders(response)
  }

  const supabase = createSupabaseMiddlewareClient(request, response)

  const { data: { session } } = await supabase.auth.getSession()

  const isApiRoute = pathname.startsWith('/api/')

  if (!session) {
    if (isApiRoute) {
      return securityHeaders(
        NextResponse.json(
          { error: { code: 'UNAUTHENTICATED', message: 'Sessão inválida' } },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        ),
      )
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return securityHeaders(NextResponse.redirect(url))
  }

  // Require AAL2 (MFA verified)
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const aal2Valid = aalData?.currentLevel === 'aal2'

  if (!aal2Valid) {
    if (isApiRoute) {
      return securityHeaders(
        NextResponse.json(
          { error: { code: 'UNAUTHENTICATED', message: 'Verificação em duas etapas necessária' } },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        ),
      )
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('mfa_required', '1')
    return securityHeaders(NextResponse.redirect(url))
  }

  // Block anyone who is not the owner
  const ownerEmail = process.env.OWNER_EMAIL
  if (!ownerEmail || session.user.email !== ownerEmail) {
    await supabase.auth.signOut()
    if (isApiRoute) {
      return securityHeaders(
        NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        ),
      )
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('unauthorized', '1')
    return securityHeaders(NextResponse.redirect(url))
  }

  return securityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
