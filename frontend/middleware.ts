import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Define which routes require authentication
const protectedRoutes = ['/dashboard', '/api/datasets', '/api/experiments', '/api/models', '/api/orgs']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the current route is protected (starts with any of the prefixes)
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute) {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      // If it's an API route, return 401
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // If it's a page route, redirect to login
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const secretKey = process.env.JWT_SECRET
      if (!secretKey) throw new Error('JWT_SECRET is not defined')
      
      const key = new TextEncoder().encode(secretKey)
      // Verify token
      await jwtVerify(token, key)
      
      // Token is valid, allow request
      return NextResponse.next()
    } catch (error) {
      // Token is invalid or expired
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
      }
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Not a protected route, let it pass
  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
