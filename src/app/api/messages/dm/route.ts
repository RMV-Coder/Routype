import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { pool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
type RoomRow = RowDataPacket & { id: number };

// POST /api/messages/dm { otherUserId, initialMessage? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { otherUserId, initialMessage } = await req.json();
  if (!otherUserId) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // find or create a DM room with both members
    const [rooms] = await connection.query<RoomRow[]>(
      `SELECT r.id
       FROM message_room r
       JOIN message_room_member m1 ON m1.room_id = r.id AND m1.user_id = ?
       JOIN message_room_member m2 ON m2.room_id = r.id AND m2.user_id = ?
       WHERE r.room_type = 'dm'
       LIMIT 1`,
      [session.user.id, otherUserId]
    );
    let roomId: number;
    if (rooms.length) {
      roomId = rooms[0].id;
    } else {
      const [r] = await connection.query<ResultSetHeader>(
        `INSERT INTO message_room (room_type, title, created_by) VALUES ('dm', NULL, ?)`,
        [session.user.id]
      );
      roomId = r.insertId;
      await connection.query(
        `INSERT INTO message_room_member (room_id, user_id, role) VALUES (?, ?, 'member'), (?, ?, 'member')`,
        [roomId, session.user.id, roomId, otherUserId]
      );
    }

    if (initialMessage && String(initialMessage).trim().length) {
      const [msg] = await connection.query<ResultSetHeader>(
        `INSERT INTO message (room_id, sender_id, text_content) VALUES (?, ?, ?)`,
        [roomId, session.user.id, String(initialMessage)]
      );
      const messageId = msg.insertId;
      await connection.commit();
      return NextResponse.json({ success: true, roomId, messageId });
    }

    await connection.commit();
    return NextResponse.json({ success: true, roomId });
  } catch (e) {
    await connection.rollback();
    console.error(e);
    return NextResponse.json({ error: "Failed to create DM" }, { status: 500 });
  } finally {
    connection.release();
  }
}


