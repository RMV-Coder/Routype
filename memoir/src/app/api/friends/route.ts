import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { pool } from "@/lib/db";

// POST /api/friends { userId }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    // prevent self and dedupe
    if (Number(userId) === Number(session.user.id)) {
      return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
    }
    const [exists] = await connection.query(
      `SELECT id FROM friendship WHERE 
        (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
       LIMIT 1`,
      [session.user.id, userId, userId, session.user.id]
    );
    if ((exists as any[]).length) {
      return NextResponse.json({ success: true, message: "Already requested or friends" });
    }
    await connection.query(
      `INSERT INTO friendship (user_id, friend_id, status) VALUES (?, ?, 'pending')`,
      [session.user.id, userId]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  } finally {
    connection.release();
  }
}


