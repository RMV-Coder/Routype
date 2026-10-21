import { NextRequest, NextResponse } from "next/server";
import { getAuth, serverError, unauthorized } from "@/lib/api";

type RoomRow = {
  id: number;
  kind: 'dm' | 'group';
  title: string | null;
  other_user_id: string | null;
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
  otherUserId: string | null;
  lastTs: string | null;
  lastId: number | null;
};

type Cursor = { cursorTs: string | null; cursorId: number | null };

// GET /api/messages/rooms?limit=15&cursorTs=ISO&cursorId=number
// Returns most recently active rooms for the authenticated user
export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "15", 10) || 15, 1), 50);
  const cursorTs = searchParams.get("cursorTs");
  const cursorId = parseInt(searchParams.get("cursorId") || "0", 10) || 0;
  const validCursor = cursorTs && !Number.isNaN(Date.parse(cursorTs));

  // Ordered by last message timestamp desc, then message id desc; returns limit + 1 rows.
  const { data, error } = await auth.supabase.rpc("my_rooms", {
    p_limit: limit,
    p_cursor_ts: validCursor ? cursorTs : undefined,
    p_cursor_id: validCursor ? cursorId : undefined,
  });
  if (error) return serverError(error, "Failed to load rooms");

  const rows: RoomRow[] = data ?? [];
  const rooms: ApiRoom[] = rows.map((r) => ({
    id: r.id,
    title: r.kind === 'dm' ? (r.other_user_name ?? r.title ?? 'Direct Message') : (r.title ?? 'Group'),
    kind: r.kind,
    image: r.kind === 'dm' ? (r.other_user_image || null) : [r.g_img1, r.g_img2].filter((img) => img !== null),
    otherUserId: r.kind === 'dm' ? r.other_user_id : null,
    lastTs: r.last_ts,
    lastId: r.last_id,
  }));

  let nextCursor: Cursor | null = null;
  if (rooms.length > limit) {
    const last = rooms[limit - 1];
    nextCursor = { cursorTs: last.lastTs, cursorId: last.lastId };
  }

  return NextResponse.json({ items: rooms.slice(0, limit), nextCursor });
}
