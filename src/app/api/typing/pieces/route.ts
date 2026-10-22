import { NextResponse, NextRequest } from "next/server";
import { getAuth, serverError, unauthorized } from "@/lib/api";
import { publishDueEntries, type EntryRow } from "@/lib/entries";
import { isPieceKind } from "@/lib/definitions";
import { MIN_TYPING_WORDS, toTypingText, wordCount } from "@/lib/pieces";

// GET /api/typing/pieces?kind=poetry&exclude=12  -> a random piece
// GET /api/typing/pieces?id=42                     -> that specific piece
// Only published, public pieces whose author allowed them in TypeArena are returned.
export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const exclude = parseInt(searchParams.get("exclude") || "0", 10) || undefined;
  const id = parseInt(searchParams.get("id") || "0", 10) || undefined;
  try {
    await publishDueEntries(auth.supabase);
    // Sample a handful at random and keep the first one with enough typeable text.
    const { data, error } = await auth.supabase.rpc("random_typing_pieces", {
      p_kind: isPieceKind(kind) ? kind : undefined,
      p_exclude: exclude,
      p_id: id,
    });
    if (error) throw error;
    for (const row of (data ?? []) as EntryRow[]) {
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
