import { NextResponse, NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { badRequest, getUserId, notFound, parseId, serverError, unauthorized } from "@/lib/api";
import type { Entry, Journal, Visibility } from "@/lib/definitions";

type Params = { params: Promise<{ id: string }> };

async function loadOwnedJournal(id: number, userId: number) {
  const [rows] = await pool.query<(Journal & RowDataPacket)[]>(
    `SELECT id, user_id, title, description, visibility, created_at FROM journal WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  return rows[0] ?? null;
}

// GET /api/journals/:id -> journal with all of its entries (owner only)
export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid journal id");
  try {
    const journal = await loadOwnedJournal(id, userId);
    if (!journal) return notFound("Journal not found");
    const [entries] = await pool.query<(Entry & RowDataPacket)[]>(
      `SELECT id, journal_id, title, kind, content, visibility, allow_typing, status, scheduled_at, published_at, created_at, updated_at
       FROM entry WHERE journal_id = ? ORDER BY COALESCE(published_at, created_at) DESC`,
      [id],
    );
    return NextResponse.json({ journal, entries: entries.map((e) => ({ ...e, allow_typing: !!e.allow_typing })) });
  } catch (error) {
    return serverError(error, "Failed to load journal");
  }
}

// PATCH /api/journals/:id { title?, description?, visibility? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid journal id");
  const body = await req.json().catch(() => ({}));
  const visibilities: Visibility[] = ["public", "friends", "private"];
  if (body.visibility !== undefined && !visibilities.includes(body.visibility)) return badRequest("Invalid visibility");
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) return badRequest("Title is required");
  try {
    const journal = await loadOwnedJournal(id, userId);
    if (!journal) return notFound("Journal not found");
    await pool.query(
      `UPDATE journal SET title = ?, description = ?, visibility = ? WHERE id = ?`,
      [body.title?.trim() ?? journal.title, body.description ?? journal.description, body.visibility ?? journal.visibility, id],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "Failed to update journal");
  }
}

// DELETE /api/journals/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid journal id");
  try {
    const [result] = await pool.query(`DELETE FROM journal WHERE id = ? AND user_id = ?`, [id, userId]);
    if ((result as { affectedRows: number }).affectedRows === 0) return notFound("Journal not found");
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "Failed to delete journal");
  }
}
