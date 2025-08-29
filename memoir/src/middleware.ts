import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  // Check for session cookie (NextAuth.js creates this automatically)
  const sessionCookie = req.cookies.get('next-auth.session-token') || req.cookies.get('__Secure-next-auth.session-token'); // HTTPS version
  
  // const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isAuth = !!sessionCookie;
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');

  if (!isAuth && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/internal/helpers.ts|_next/static/runtime.ts|_next/internal|_next/static|_next/image|favicon.ico|logo_routype.svg|terms-of-service|privacy-policy|auth|sse).*)'],
};
