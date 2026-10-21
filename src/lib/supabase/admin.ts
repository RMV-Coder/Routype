import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL } from "./env";

let admin: SupabaseClient<Database> | null = null;

/**
 * Service-role client that BYPASSES row level security. Only for server-side
 * work users must not do for themselves (granting XP and achievements).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  admin ??= createClient<Database>(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
