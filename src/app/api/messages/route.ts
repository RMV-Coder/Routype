import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { pool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

// POST /api/messages: { roomId, ciphertexts: [{ recipientId, cipher, nonce, version }], textFallback? }
type Ciphertext = { recipientId: number; cipher: string; nonce?: string | null; version?: number };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { roomId, ciphertexts, textFallback, e2eeNonce } = body as {
    roomId: number;
    ciphertexts: Ciphertext[];
    textFallback?: string | null;
    e2eeNonce?: string | null;
  };
  const hasCiphertexts = Array.isArray(ciphertexts) && ciphertexts.length > 0;
  const hasText = typeof textFallback === "string" && textFallback.trim().length > 0;
  if (!Number(roomId) || (!hasCiphertexts && !hasText)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Ensure sender is a member of the room
    const [members] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM message_room_member WHERE room_id = ? AND user_id = ? LIMIT 1`,
      [roomId, session.user.id]
    );
    if (members.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [res] = await connection.query<ResultSetHeader>(
      `INSERT INTO message (room_id, sender_id, text_content, e2ee_nonce) VALUES (?, ?, ?, ?)`,
      [roomId, session.user.id, textFallback ?? null, e2eeNonce ?? null]
    );
    const messageId = res.insertId;

    const values: Array<number | string | null> = [];
    const placeholders: string[] = [];
    for (const c of hasCiphertexts ? ciphertexts : []) {
      if (!c?.recipientId || !c?.cipher) continue;
      placeholders.push("(?, ?, ?, ?, ?)");
      values.push(messageId, c.recipientId, c.cipher, c.nonce ?? null, c.version ?? 1);
    }
    if (placeholders.length) {
      await connection.query(
        `INSERT INTO message_encrypted_payload (message_id, recipient_id, cipher, nonce, version) VALUES ${placeholders.join(",")}`,
        values
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, id: messageId });
  } catch (e) {
    await connection.rollback();
    console.error(e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  } finally {
    connection.release();
  }
}



type MessageRow = RowDataPacket & { id: number; sender_id: number; sender_name: string | null; text_content: string | null; created_at: Date };

// GET /api/messages?roomId=1 -> the latest 50 messages of a room the user belongs to
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roomId = Number(new URL(req.url).searchParams.get("roomId"));
  if (!roomId) return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
  try {
    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM message_room_member WHERE room_id = ? AND user_id = ? LIMIT 1`,
      [roomId, session.user.id]
    );
    if (members.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const [rows] = await pool.query<MessageRow[]>(
      `SELECT * FROM (
         SELECT m.id, m.sender_id, u.name AS sender_name, m.text_content, m.created_at
         FROM message m JOIN user u ON u.id = m.sender_id
         WHERE m.room_id = ? ORDER BY m.id DESC LIMIT 50
       ) latest ORDER BY id ASC`,
      [roomId]
    );
    return NextResponse.json({
      items: rows.map((r) => ({
        id: String(r.id),
        message: r.text_content ?? "",
        ts: new Date(r.created_at).getTime(),
        user: { id: String(r.sender_id), name: r.sender_name },
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
