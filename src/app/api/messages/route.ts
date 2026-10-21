import { NextRequest, NextResponse } from "next/server";
import { badRequest, getAuth, parseId, parseUserId, serverError, unauthorized } from "@/lib/api";

// POST /api/messages: { roomId, ciphertexts: [{ recipientId, cipher, nonce, version }], textFallback? }
type Ciphertext = { recipientId: string; cipher: string; nonce?: string | null; version?: number };

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const { roomId, ciphertexts, textFallback, e2eeNonce } = body as {
    roomId: number;
    ciphertexts: Ciphertext[];
    textFallback?: string | null;
    e2eeNonce?: string | null;
  };
  const room = parseId(String(roomId));
  const payloads = (Array.isArray(ciphertexts) ? ciphertexts : [])
    .filter((c) => parseUserId(c?.recipientId) && typeof c?.cipher === "string" && c.cipher)
    .map((c) => ({ recipientId: parseUserId(c.recipientId), cipher: c.cipher, nonce: c.nonce ?? null, version: c.version ?? 1 }));
  const hasText = typeof textFallback === "string" && textFallback.trim().length > 0;
  if (!room || (!payloads.length && !hasText)) return badRequest("Invalid payload");

  // send_message runs as the user: the insert policies require room membership.
  const { data, error } = await auth.supabase.rpc("send_message", {
    p_room_id: room,
    p_text: hasText ? textFallback : undefined,
    p_e2ee_nonce: typeof e2eeNonce === "string" ? e2eeNonce : undefined,
    p_ciphertexts: payloads,
  });
  if (error?.code === "42501") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (error) return serverError(error, "Failed to send message");
  return NextResponse.json({ success: true, id: data });
}

type MessageRow = { id: number; sender_id: string; text_content: string | null; created_at: string; sender: { name: string | null } | null };

// GET /api/messages?roomId=1 -> the latest 50 messages of a room the user belongs to
export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const roomId = parseId(new URL(req.url).searchParams.get("roomId"));
  if (!roomId) return badRequest("Invalid roomId");

  const { data: room, error: roomError } = await auth.supabase.from("message_rooms").select("id").eq("id", roomId).maybeSingle();
  if (roomError) return serverError(roomError, "Failed to load messages");
  if (!room) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await auth.supabase
    .from("messages")
    .select("id, sender_id, text_content, created_at, sender:profiles!messages_sender_id_fkey(name)")
    .eq("room_id", roomId)
    .order("id", { ascending: false })
    .limit(50);
  if (error) return serverError(error, "Failed to load messages");
  const rows: MessageRow[] = (data ?? []).reverse();
  return NextResponse.json({
    items: rows.map((r) => ({
      id: String(r.id),
      message: r.text_content ?? "",
      ts: new Date(r.created_at).getTime(),
      user: { id: r.sender_id, name: r.sender?.name ?? null },
    })),
  });
}
