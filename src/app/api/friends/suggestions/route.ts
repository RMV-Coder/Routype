import { NextRequest, NextResponse } from "next/server";
import { getAuth, serverError, unauthorized } from "@/lib/api";

type SuggestionRow = {
  id: string;
  name: string | null;
  image: string | null;
  mutual_friends: number;
  co_reads: number;
  score: number;
};

// GET /api/friends/suggestions?limit=12
export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "12", 10) || 12, 1), 50);

  const { data, error } = await auth.supabase.rpc("friend_suggestions", { p_limit: limit });
  if (error) return serverError(error, "Failed to load suggestions");
  const rows: SuggestionRow[] = data ?? [];
  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    image: r.image,
    score: Number(r.score),
    mutualFriends: Number(r.mutual_friends),
    coReads: Number(r.co_reads),
  }));
  return NextResponse.json({ items });
}
