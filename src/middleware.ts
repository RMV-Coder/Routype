import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages require a session; API routes check auth themselves and return 401.
export function middleware(req: NextRequest) {
  const hasSession =
    req.cookies.has("next-auth.session-token") || req.cookies.has("__Secure-next-auth.session-token");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.search = "";
    if (req.nextUrl.pathname !== "/") url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo_routype.svg|terms-of-service|privacy-policy|auth).*)"],
};
