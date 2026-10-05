import { NextResponse, NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { badRequest, getUserId, serverError, unauthorized } from "@/lib/api";
import type { Journal, Visibility } from "@/lib/definitions";

const VISIBILITIES: Visibility[] = ["public", "friends", "private"];

// POST /api/journals { title, description?, visibility? }
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { title, description, visibility } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || !title.trim()) return badRequest("Title is required");
  if (visibility && !VISIBILITIES.includes(visibility)) return badRequest("Invalid visibility");

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO journal (user_id, title, description, visibility) VALUES (?, ?, ?, ?)`,
      [userId, title.trim().slice(0, 255), description || null, visibility || "public"],
    );
    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 });
  } catch (error) {
    return serverError(error, "Failed to create journal");
  }
}

// GET /api/journals -> the signed-in user's journals
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const [items] = await pool.query<(Journal & RowDataPacket)[]>(
      `SELECT j.id, j.user_id, j.title, j.description, j.visibility, j.created_at, COUNT(e.id) AS entry_count
       FROM journal j
       LEFT JOIN entry e ON e.journal_id = j.id
       WHERE j.user_id = ?
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [userId],
    );
    return NextResponse.json({ items });
  } catch (error) {
    return serverError(error, "Failed to load journals");
  }
}
