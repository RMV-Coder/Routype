import { NextResponse, NextRequest } from "next/server";
import { badRequest, getAuth, serverError, unauthorized } from "@/lib/api";
import { isGameMode } from "@/lib/game/modes";

const PERIODS = ["daily", "weekly", "monthly", "all"];

type LeaderboardRow = { user_id: string; name: string | null; image: string | null; xp: number; wpm: number; accuracy: number; created_at: string };

// GET /api/leaderboard?mode=time&value=30&period=weekly
// Best result per writer. Private profiles are never listed (see leaderboard() in the schema).
export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "time";
  const rawValue = searchParams.get("value");
  const value = rawValue ? parseInt(rawValue, 10) || undefined : undefined;
  const period = searchParams.get("period") || "all";
  if (!isGameMode(mode) || mode === "zen") return badRequest("Invalid mode");
  if (!PERIODS.includes(period)) return badRequest("Invalid period");

  const { data, error } = await auth.supabase.rpc("leaderboard", { p_mode: mode, p_mode_value: value, p_period: period });
  if (error) return serverError(error, "Failed to load leaderboard");
  const rows: LeaderboardRow[] = data ?? [];
  return NextResponse.json({
    items: rows.map((r, i) => ({ rank: i + 1, ...r, isMe: r.user_id === auth.userId })),
  });
}
