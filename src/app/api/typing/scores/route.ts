import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool, withTransaction } from "@/lib/db";
import { badRequest, getUserId, serverError, unauthorized } from "@/lib/api";
import { xpForResult } from "@/lib/game/achievements";
import { evaluateAchievements } from "@/lib/game/progress";

const scoreSchema = z.object({
  mode: z.enum(["time", "words", "piece", "sudden-death", "zen", "race"]),
  modeValue: z.number().int().positive().nullish(),
  wpm: z.number().min(0).max(350), // anything faster is not a human
  rawWpm: z.number().min(0).max(400),
  accuracy: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100).nullish(),
  charsCorrect: z.number().int().min(0),
  charsIncorrect: z.number().int().min(0),
  durationSeconds: z.number().int().min(1).max(3600),
  entryId: z.number().int().positive().nullish(),
  matchId: z.string().max(32).nullish(),
  placement: z.number().int().positive().nullish(),
});

// POST /api/typing/scores -> saves a result, grants XP and returns new achievements
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const parsed = scoreSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid result");
  const s = parsed.data;
  if (s.mode === "zen") return NextResponse.json({ success: true, xp: 0, unlocked: [] });

  try {
    const result = await withTransaction(async (conn) => {
      await conn.query(
        `INSERT INTO typing_score
           (user_id, mode, mode_value, wpm, raw_wpm, accuracy, consistency, chars_correct, chars_incorrect,
            duration_seconds, entry_id, match_id, placement)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, s.mode, s.modeValue ?? null, s.wpm, s.rawWpm, s.accuracy, s.consistency ?? null, s.charsCorrect,
          s.charsIncorrect, s.durationSeconds, s.entryId ?? null, s.matchId ?? null, s.placement ?? null],
      );
      const xp = xpForResult(s.mode, s.wpm, s.accuracy, s.durationSeconds, s.placement ?? null);
      const unlocked = await evaluateAchievements(conn, userId, {
        mode: s.mode, modeValue: s.modeValue ?? null, wpm: s.wpm, accuracy: s.accuracy,
        charsCorrect: s.charsCorrect, placement: s.placement ?? null,
      }, xp);

      // The author of a typed piece may have earned "Echo"/"Chorus".
      if (s.entryId) {
        const [authors] = await conn.query<(RowDataPacket & { user_id: number })[]>(
          `SELECT j.user_id FROM entry e JOIN journal j ON j.id = e.journal_id WHERE e.id = ?`, [s.entryId]);
        const authorId = authors[0]?.user_id;
        if (authorId && authorId !== userId) await evaluateAchievements(conn, authorId);
      }
      return { xp, unlocked };
    });
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return serverError(error, "Failed to save result");
  }
}

// GET /api/typing/scores -> the signed-in user's recent results and personal bests
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const [recent] = await pool.query<RowDataPacket[]>(
      `SELECT id, mode, mode_value, wpm, raw_wpm, accuracy, consistency, duration_seconds, entry_id, match_id, placement, created_at
       FROM typing_score WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 20`,
      [userId],
    );
    const [bests] = await pool.query<RowDataPacket[]>(
      `SELECT mode, mode_value, MAX(wpm) AS wpm, COUNT(*) AS tests, ROUND(AVG(accuracy), 1) AS avg_accuracy
       FROM typing_score WHERE user_id = ? GROUP BY mode, mode_value ORDER BY mode, mode_value`,
      [userId],
    );
    return NextResponse.json({ recent, bests });
  } catch (error) {
    return serverError(error, "Failed to load results");
  }
}
