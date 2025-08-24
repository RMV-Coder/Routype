// app/api/posts/route.ts
import { getServerSession } from "next-auth";
import { NextResponse, NextRequest } from "next/server";
import { authOptions } from "@/lib/auth/config";
import { ResultSetHeader, FieldPacket } from "mysql2";
import { pool } from "@/lib/db";
import { Journal } from "@/lib/definitions"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, visibility } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const connection = await pool.getConnection();
    const [result]: [ResultSetHeader, FieldPacket[]] = await connection.query(
      `INSERT INTO journal (user_id, title, description, visibility)
       VALUES (?, ?, ?, ?)`,
      [
        session.user.id,
        title,
        description || null,
        visibility || 'public'
      ]
    ) as [ResultSetHeader, FieldPacket[]];
    connection.release();

    return NextResponse.json({ success: true, id: result.insertId}, {status:201});
  } catch (error) {
    console.error("Error saving post:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const connection = await pool.getConnection();
    const [data]: [Journal[], FieldPacket[]] = await connection.query(
      `SELECT id, title, description, visibility, created_at
        FROM journal
        WHERE user_id = ?
        ORDER BY created_at DESC`,
      [ session.user.id ]
    ) as [Journal[], FieldPacket[]];
    connection.release();

    return NextResponse.json({ success: true, ...data}, {status:200});
  } catch (error) {
    console.error("Error saving post:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
