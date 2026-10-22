import { NextRequest, NextResponse } from "next/server";
import { badRequest, getAuth, parseUserId, serverError, unauthorized } from "@/lib/api";

// POST /api/messages/dm { otherUserId, initialMessage? }
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { otherUserId, initialMessage } = await req.json().catch(() => ({}));
  const other = parseUserId(otherUserId);
  if (!other || other === auth.userId) return badRequest("Invalid payload");

  // Find or create the DM room (atomic, see get_or_create_dm in the schema).
  const { data: roomId, error } = await auth.supabase.rpc("get_or_create_dm", { p_other: other });
  if (error?.code === "22023") return badRequest("Invalid payload");
  if (error) return serverError(error, "Failed to create DM");

  const text = typeof initialMessage === "string" ? initialMessage.trim() : "";
  if (text) {
    const { data: messageId, error: sendError } = await auth.supabase.rpc("send_message", { p_room_id: roomId, p_text: text });
    if (sendError) return serverError(sendError, "Failed to create DM");
    return NextResponse.json({ success: true, roomId, messageId });
  }
  return NextResponse.json({ success: true, roomId });
}
