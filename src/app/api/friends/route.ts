import { NextRequest, NextResponse } from "next/server";
import { badRequest, getAuth, serverError, unauthorized, parseUserId } from "@/lib/api";

// POST /api/friends { userId }
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { userId } = await req.json().catch(() => ({}));
  const friendId = parseUserId(userId);
  if (!friendId) return badRequest("Invalid userId");
  if (friendId === auth.userId) return badRequest("Cannot friend yourself");

  // One row per pair (unique index on the unordered pair), so a duplicate means
  // the request already exists in one direction or the other.
  const { error } = await auth.supabase
    .from("friendships")
    .insert({ user_id: auth.userId, friend_id: friendId, status: "pending" });
  if (error?.code === "23505") return NextResponse.json({ success: true, message: "Already requested or friends" });
  if (error?.code === "23503") return badRequest("Invalid userId");
  if (error) return serverError(error, "Failed to send request");
  return NextResponse.json({ success: true });
}
