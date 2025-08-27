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
  if (!roomId || !Array.isArray(ciphertexts) || ciphertexts.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Ensure sender is a member of the room
    const [members] = await connection.query<RowDataPacket[]>(
      `SELECT 1 as exists FROM message_room_member WHERE room_id = ? AND user_id = ? LIMIT 1`,
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
    for (const c of ciphertexts) {
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


