import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(req: NextRequest) {
  return updateSession(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo_routype.svg|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
