import { NextResponse, NextRequest } from "next/server";
import { badRequest, getAuth, serverError, unauthorized } from "@/lib/api";
import { getSong } from "@/lib/music/songs";

const PERIODS = ["daily", "weekly", "monthly", "all"];
const SPEEDS = [50, 75, 100];

// GET /api/music/leaderboard?song=fur-elise&part=piano&speed=100&period=weekly
// Best score per player. Private profiles are never listed (see music_leaderboard() in the schema).
export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { searchParams } = new URL(req.url);
  const song = getSong(searchParams.get("song") ?? "");
  const part = song?.parts.find((p) => p.id === searchParams.get("part"));
  const speed = Number(searchParams.get("speed") ?? 100);
  const period = searchParams.get("period") || "all";
  if (!song || !part) return badRequest("Unknown piece or part");
  if (!SPEEDS.includes(speed)) return badRequest("Invalid speed");
  if (!PERIODS.includes(period)) return badRequest("Invalid period");

  const { data, error } = await auth.supabase.rpc("music_leaderboard", {
    p_song_id: song.id, p_part_id: part.id, p_speed: speed, p_period: period,
  });
  if (error) return serverError(error, "Failed to load leaderboard");
  return NextResponse.json({
    items: (data ?? []).map((r, i) => ({ rank: i + 1, ...r, isMe: r.user_id === auth.userId })),
  });
}
