import { NextResponse, NextRequest } from "next/server";
import { pool, withTransaction } from "@/lib/db";
import { badRequest, canView, getUserId, notFound, parseId, serverError, unauthorized } from "@/lib/api";
import { ENTRY_WITH_AUTHOR_SQL, entryPatchSchema, publishDueEntries, serializeEntry, type EntryRow } from "@/lib/entries";
import { evaluateAchievements } from "@/lib/game/progress";

type Params = { params: Promise<{ id: string }> };

async function loadEntry(id: number): Promise<EntryRow | null> {
  const [rows] = await pool.query<EntryRow[]>(`${ENTRY_WITH_AUTHOR_SQL} WHERE e.id = ?`, [id]);
  return rows[0] ?? null;
}

// GET /api/entries/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid entry id");
  try {
    await publishDueEntries();
    const row = await loadEntry(id);
    const visible = row && await canView(userId, {
      author_id: row.author_id,
      author_private: row.author_private,
      entry_visibility: row.visibility,
      journal_visibility: row.journal_visibility,
      status: row.status,
    });
    if (!row || !visible) return notFound("Entry not found");
    return NextResponse.json({ entry: serializeEntry(row), isOwner: row.author_id === userId });
  } catch (error) {
    return serverError(error, "Failed to load entry");
  }
}

// PATCH /api/entries/:id (author only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid entry id");
  const parsed = entryPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid entry");
  const patch = parsed.data;
  try {
    const row = await loadEntry(id);
    if (!row || row.author_id !== userId) return notFound("Entry not found");
    const status = patch.status ?? row.status;
    if (status === "scheduled" && !(patch.scheduledAt ?? row.scheduled_at)) return badRequest("Pick a date to schedule this piece");
    const unlocked = await withTransaction(async (conn) => {
      await conn.query(
        `UPDATE entry SET title = ?, kind = ?, content = ?, visibility = ?, allow_typing = ?, status = ?, scheduled_at = ?,
                published_at = ?
         WHERE id = ?`,
        [
          patch.title !== undefined ? patch.title || null : row.title,
          patch.kind ?? row.kind,
          patch.content ?? row.content,
          patch.visibility ?? row.visibility,
          (patch.allowTyping ?? !!row.allow_typing) ? 1 : 0,
          status,
          status === "scheduled" ? new Date(patch.scheduledAt ?? row.scheduled_at!) : null,
          status === "published" ? (row.published_at ?? new Date()) : null,
          id,
        ],
      );
      return status === "published" ? evaluateAchievements(conn, userId) : [];
    });
    return NextResponse.json({ success: true, unlocked });
  } catch (error) {
    return serverError(error, "Failed to update entry");
  }
}

// DELETE /api/entries/:id (author only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid entry id");
  try {
    const [result] = await pool.query(
      `DELETE e FROM entry e JOIN journal j ON j.id = e.journal_id WHERE e.id = ? AND j.user_id = ?`, [id, userId]);
    if ((result as { affectedRows: number }).affectedRows === 0) return notFound("Entry not found");
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "Failed to delete entry");
  }
}
