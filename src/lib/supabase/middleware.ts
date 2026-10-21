import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Paths that are reachable without signing in. */
const PUBLIC_PATHS = ["/auth", "/terms-of-service", "/privacy-policy"];

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * signed-out visitors to /auth/signin. API routes answer 401 themselves.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the token.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;

  const { pathname, search } = request.nextUrl;
  const isPublic = pathname.startsWith("/api") || PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname + search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}
