import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { pool } from "@/lib/db";

type RoomRow = {
  id: number;
  kind: 'dm' | 'group';
  title: string | null;
  group_title: string | null;
  other_user_id: number | null;
  other_user_name: string | null;
  other_user_image: string | null;
  g_img1: string | null;
  g_img2: string | null;
  last_ts: string | null;
  last_id: number | null;
};

type ApiRoom = {
  id: number;
  title: string;
  kind: 'dm' | 'group';
  image: string | string[] | null;
  otherUserId: number | null;
  lastTs: string | null;
  lastId: number | null;
};

type Cursor = { cursorTs: string | null; cursorId: number | null };

// GET /api/messages/rooms?limit=15&cursorTs=ISO&cursorId=number
// Returns most recently active rooms for the authenticated user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10), 50);
  const cursorTs = searchParams.get("cursorTs");
  const cursorId = parseInt(searchParams.get("cursorId") || "0", 10) || 0;

  // Order by last message timestamp desc, then message id desc for tie-breaker
  const connection = await pool.getConnection();
  try {
    const me = session.user.id;
    const params: Array<string | number> = [me, me, me, me];
    let whereCursor = "";
    if (cursorTs) {
      whereCursor = "AND (lm.last_ts < ? OR (lm.last_ts = ? AND lm.last_id < ?))";
      params.push(cursorTs, cursorTs, cursorId);
    }
    params.push(limit + 1);

    const [rowsRaw] = await connection.query(
      `
      WITH latest AS (
        SELECT m.room_id,
               MAX(m.created_at) AS last_ts,
               MAX(m.id)        AS last_id
        FROM message m
        GROUP BY m.room_id
      )
      SELECT r.id,
             r.room_type AS kind,
             r.title     AS title,
             r.title     AS group_title,
             other_user.id    AS other_user_id,
             other_user.name  AS other_user_name,
             other_user.image AS other_user_image,
             (SELECT u.image FROM message_room_member gm JOIN user u ON u.id = gm.user_id
               WHERE gm.room_id = r.id AND gm.user_id <> ? ORDER BY gm.joined_at LIMIT 1)          AS g_img1,
             (SELECT u.image FROM message_room_member gm JOIN user u ON u.id = gm.user_id
               WHERE gm.room_id = r.id AND gm.user_id <> ? ORDER BY gm.joined_at LIMIT 1 OFFSET 1) AS g_img2,
             lm.last_ts AS last_ts,
             lm.last_id AS last_id
      FROM message_room r
      INNER JOIN message_room_member mm ON mm.room_id = r.id AND mm.user_id = ?
      LEFT JOIN latest lm ON lm.room_id = r.id
      -- For DMs, find the other participant
      LEFT JOIN (
        SELECT mrm.room_id, u.id, u.name, u.image
        FROM message_room_member mrm
        INNER JOIN user u ON u.id = mrm.user_id
      ) other_user ON other_user.room_id = r.id AND r.room_type = 'dm' AND other_user.id <> ?
      WHERE 1=1
      ${whereCursor}
      ORDER BY lm.last_ts IS NULL, lm.last_ts DESC, lm.last_id DESC, r.id DESC
      LIMIT ?
      `,
      params
    );

    const rows = rowsRaw as unknown as RoomRow[];
    const rooms: ApiRoom[] = rows.map((r) => ({
      id: r.id,
      title: r.kind === 'dm' ? (r.other_user_name ?? r.title ?? 'Direct Message') : (r.group_title ?? r.title ?? 'Group'),
      kind: r.kind,
      image: r.kind === 'dm' ? (r.other_user_image || null) : [r.g_img1, r.g_img2].filter(Boolean) as string[] | null,
      otherUserId: r.kind === 'dm' ? r.other_user_id : null,
      lastTs: r.last_ts,
      lastId: r.last_id,
    }));

    let nextCursor: Cursor | null = null;
    if (rooms.length > limit) {
      const last = rooms[limit - 1];
      nextCursor = { cursorTs: last.lastTs, cursorId: last.lastId };
    }

    return NextResponse.json({
      items: rooms.slice(0, limit),
      nextCursor,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load rooms" }, { status: 500 });
  } finally {
    connection.release();
  }
}


