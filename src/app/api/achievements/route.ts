import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getUserId, serverError, unauthorized } from "@/lib/api";
import { ACHIEVEMENTS } from "@/lib/game/achievements";

// GET /api/achievements -> every achievement with the signed-in user's unlock status
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const [rows] = await pool.query<(RowDataPacket & { achievement_code: string; unlocked_at: string })[]>(
      `SELECT achievement_code, unlocked_at FROM user_achievement WHERE user_id = ?`, [userId]);
    const unlocked = new Map(rows.map((r) => [r.achievement_code, r.unlocked_at]));
    return NextResponse.json({
      items: ACHIEVEMENTS.map(({ code, name, description, category, xp }) => ({
        code, name, description, category, xp, unlockedAt: unlocked.get(code) ?? null,
      })),
    });
  } catch (error) {
    return serverError(error, "Failed to load achievements");
  }
}
