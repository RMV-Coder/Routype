import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { PUBLIC_PIECE_SQL, getUserId, serverError, unauthorized } from "@/lib/api";
import { ENTRY_WITH_AUTHOR_SQL, publishDueEntries, type EntryRow } from "@/lib/entries";
import { PIECE_KINDS, type PieceKind } from "@/lib/definitions";
import { MIN_TYPING_WORDS, toTypingText, wordCount } from "@/lib/pieces";

// GET /api/typing/pieces?kind=poetry&exclude=12  -> a random piece
// GET /api/typing/pieces?id=42                     -> that specific piece
// Only published, public pieces whose author allowed them in TypeArena are returned.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const exclude = parseInt(searchParams.get("exclude") || "0", 10) || 0;
  const id = parseInt(searchParams.get("id") || "0", 10) || 0;

  const where = [PUBLIC_PIECE_SQL, "e.allow_typing = 1", "e.id <> ?"];
  const params: (string | number)[] = [exclude];
  if (id) {
    where.push("e.id = ?");
    params.push(id);
  } else if (kind && PIECE_KINDS.includes(kind as PieceKind)) {
    where.push("e.kind = ?");
    params.push(kind);
  }
  try {
    await publishDueEntries();
    // Sample a handful at random and keep the first one with enough typeable text.
    const [rows] = await pool.query<EntryRow[]>(
      `${ENTRY_WITH_AUTHOR_SQL} WHERE ${where.join(" AND ")} ORDER BY RAND() LIMIT 10`,
      params,
    );
    for (const row of rows) {
      const text = toTypingText(row.content);
      if (wordCount(text) < MIN_TYPING_WORDS) continue;
      return NextResponse.json({
        piece: {
          id: row.id,
          title: row.title,
          kind: row.kind,
          authorId: row.author_id,
          authorName: row.author_name,
          text,
        },
      });
    }
    return NextResponse.json({ piece: null });
  } catch (error) {
    return serverError(error, "Failed to load a piece");
  }
}
