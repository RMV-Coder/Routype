import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { PIECE_KINDS, type EntryWithAuthor, type Visibility } from "@/lib/definitions";

export const entryInputSchema = z.object({
  journalId: z.number().int().positive(),
  title: z.string().trim().max(255).nullish(),
  kind: z.enum(PIECE_KINDS).default("thought"),
  content: z.string().min(1, "Content is required").max(5_000_000),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
  allowTyping: z.boolean().default(false),
  status: z.enum(["draft", "published", "scheduled"]).default("draft"),
  scheduledAt: z.string().datetime({ offset: true }).nullish(),
});

export const entryPatchSchema = entryInputSchema.omit({ journalId: true }).partial();

/** A row of the `entries_with_author` view (entry + journal + author). */
export type EntryRow = EntryWithAuthor & { author_private: boolean; journal_visibility: Visibility };

export const ENTRY_WITH_AUTHOR_VIEW = "entries_with_author";

export function serializeEntry(row: EntryRow): EntryWithAuthor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { author_private, journal_visibility, ...rest } = row;
  return rest;
}

/** Publishes scheduled pieces whose time has come (run lazily before reading feeds). */
export async function publishDueEntries(supabase: SupabaseClient<Database>): Promise<void> {
  const { error } = await supabase.rpc("publish_due_entries");
  if (error) throw error;
}
