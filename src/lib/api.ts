import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authOptions } from "@/lib/auth/config";
import { pool } from "@/lib/db";
import type { Visibility } from "@/lib/definitions";

/** Returns the signed-in user's id, or null when the request is anonymous. */
export async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  const id = Number(session?.user?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
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
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function areFriends(a: number, b: number): Promise<boolean> {
  if (a === b) return true;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM friendship
     WHERE status = 'accepted' AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
     LIMIT 1`,
    [a, b, b, a],
  );
  return rows.length > 0;
}

/**
 * Whether `viewerId` may read a piece. The most restrictive of the entry's and the
 * journal's visibility applies, a private profile hides everything from other
 * people, and drafts are only visible to their author.
 */
export async function canView(
  viewerId: number | null,
  piece: { author_id: number; author_private: number | boolean; entry_visibility: Visibility; journal_visibility: Visibility; status: string },
): Promise<boolean> {
  if (viewerId === piece.author_id) return true;
  if (piece.status !== "published" || piece.author_private) return false;
  const levels: Visibility[] = ["public", "friends", "private"];
  const effective = levels[Math.max(levels.indexOf(piece.entry_visibility), levels.indexOf(piece.journal_visibility))];
  if (effective === "public") return true;
  if (effective === "friends" && viewerId) return areFriends(viewerId, piece.author_id);
  return false;
}

/** SQL fragment for pieces anyone can read (alias `e` = entry, `j` = journal, `u` = author). */
export const PUBLIC_PIECE_SQL =
  "e.status = 'published' AND e.visibility = 'public' AND j.visibility = 'public' AND u.is_private = 0";
