import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { PIECE_KINDS, type EntryWithAuthor } from "@/lib/definitions";

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

export type EntryRow = EntryWithAuthor & RowDataPacket & { author_private: number; journal_visibility: "public" | "friends" | "private" };

/** SELECT list + joins for an entry with its author and journal (alias e / j / u). */
export const ENTRY_WITH_AUTHOR_SQL = `
  SELECT e.id, e.journal_id, e.title, e.kind, e.content, e.visibility, e.allow_typing, e.status,
         e.scheduled_at, e.published_at, e.created_at, e.updated_at,
         j.title AS journal_title, j.visibility AS journal_visibility,
         u.id AS author_id, u.name AS author_name, u.image AS author_image, u.is_private AS author_private
  FROM entry e
  JOIN journal j ON j.id = e.journal_id
  JOIN user u ON u.id = j.user_id`;

export function serializeEntry(row: EntryRow): EntryWithAuthor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { author_private, journal_visibility, ...rest } = row;
  return { ...rest, allow_typing: !!row.allow_typing } as EntryWithAuthor;
}

/** Publishes scheduled pieces whose time has come (run lazily before reading feeds). */
export async function publishDueEntries(): Promise<void> {
  await pool.query(
    `UPDATE entry SET status = 'published', published_at = scheduled_at
     WHERE status = 'scheduled' AND scheduled_at <= NOW()`,
  );
}
