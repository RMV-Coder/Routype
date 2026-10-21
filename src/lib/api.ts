import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * The request's Supabase client (acting as the signed-in user, so row level
 * security applies to every query) and that user's id, or null when anonymous.
 */
export async function getAuth(): Promise<{ supabase: SupabaseClient<Database>; userId: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? { supabase, userId } : null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export function notFound(error = "Not found") {
  return NextResponse.json({ error }, { status: 404 });
}

export function serverError(error: unknown, message = "Database error") {
  console.error(message, error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function parseId(value: string | null | undefined): number | null {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUserId(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value.toLowerCase() : null;
}
