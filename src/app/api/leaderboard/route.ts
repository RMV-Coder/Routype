import { NextResponse, NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { badRequest, getUserId, serverError, unauthorized } from "@/lib/api";
import { isGameMode } from "@/lib/game/modes";

const PERIODS: Record<string, string> = {
  daily: "AND s.created_at >= NOW() - INTERVAL 1 DAY",
  weekly: "AND s.created_at >= NOW() - INTERVAL 7 DAY",
  monthly: "AND s.created_at >= NOW() - INTERVAL 30 DAY",
  all: "",
};

// GET /api/leaderboard?mode=time&value=30&period=weekly
// Best result per writer. Private profiles are never listed.
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "time";
  const rawValue = searchParams.get("value");
  const value = rawValue ? parseInt(rawValue, 10) || null : null;
  const period = searchParams.get("period") || "all";
  if (!isGameMode(mode) || mode === "zen") return badRequest("Invalid mode");
  if (!(period in PERIODS)) return badRequest("Invalid period");

  try {
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT ranked.user_id, u.name, u.image, u.xp, ranked.wpm, ranked.accuracy, ranked.created_at
       FROM (
         SELECT s.user_id, s.wpm, s.accuracy, s.created_at,
                ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.wpm DESC, s.accuracy DESC, s.created_at ASC) AS rn
         FROM typing_score s
         WHERE s.mode = ? AND s.mode_value <=> ? ${PERIODS[period]}
       ) ranked
       JOIN user u ON u.id = ranked.user_id
       WHERE ranked.rn = 1 AND u.is_private = 0
       ORDER BY ranked.wpm DESC, ranked.accuracy DESC, ranked.created_at ASC
       LIMIT 50`,
      [mode, value],
    );
    return NextResponse.json({
      items: items.map((r, i) => ({ rank: i + 1, ...r, isMe: Number(r.user_id) === userId })),
    });
  } catch (error) {
    return serverError(error, "Failed to load leaderboard");
  }
}
