import { NextResponse, NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool, withTransaction } from "@/lib/db";
import { PUBLIC_PIECE_SQL, badRequest, getUserId, serverError, unauthorized } from "@/lib/api";
import { ENTRY_WITH_AUTHOR_SQL, entryInputSchema, publishDueEntries, serializeEntry, type EntryRow } from "@/lib/entries";
import { PIECE_KINDS, type PieceKind } from "@/lib/definitions";
import { evaluateAchievements } from "@/lib/game/progress";

// GET /api/entries?kind=poetry&limit=20&before=<id>
// Public feed of published pieces from public journals and public profiles.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 50);
  const before = parseInt(searchParams.get("before") || "0", 10) || 0;

  const where = [PUBLIC_PIECE_SQL];
  const params: (string | number)[] = [];
  if (kind && PIECE_KINDS.includes(kind as PieceKind)) {
    where.push("e.kind = ?");
    params.push(kind);
  }
  if (before) {
    where.push("e.id < ?");
    params.push(before);
  }
  params.push(limit + 1);
  try {
    await publishDueEntries();
    const [rows] = await pool.query<EntryRow[]>(
      `${ENTRY_WITH_AUTHOR_SQL} WHERE ${where.join(" AND ")} ORDER BY e.id DESC LIMIT ?`,
      params,
    );
    const items = rows.slice(0, limit).map(serializeEntry);
    return NextResponse.json({ items, nextBefore: rows.length > limit ? items[items.length - 1].id : null });
  } catch (error) {
    return serverError(error, "Failed to load feed");
  }
}

// POST /api/entries { journalId, title?, kind, content, visibility, allowTyping, status, scheduledAt? }
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const parsed = entryInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid entry");
  const input = parsed.data;
  if (input.status === "scheduled" && !input.scheduledAt) return badRequest("Pick a date to schedule this piece");

  try {
    const result = await withTransaction(async (conn) => {
      const [journals] = await conn.query<RowDataPacket[]>(`SELECT id FROM journal WHERE id = ? AND user_id = ?`, [input.journalId, userId]);
      if (!journals.length) return null;
      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO entry (journal_id, title, kind, content, visibility, allow_typing, status, scheduled_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.journalId, input.title || null, input.kind, input.content, input.visibility, input.allowTyping ? 1 : 0,
          input.status, input.status === "scheduled" ? new Date(input.scheduledAt!) : null,
          input.status === "published" ? new Date() : null,
        ],
      );
      const unlocked = input.status === "published" ? await evaluateAchievements(conn, userId) : [];
      return { id: res.insertId, unlocked };
    });
    if (!result) return badRequest("Journal not found");
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return serverError(error, "Failed to save entry");
  }
}
