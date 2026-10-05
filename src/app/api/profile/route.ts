import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { badRequest, getUserId, notFound, serverError, unauthorized } from "@/lib/api";
import { levelForXp } from "@/lib/game/achievements";

type ProfileRow = RowDataPacket & {
  id: number; name: string | null; email: string; image: string | null; bio: string | null;
  is_private: number; xp: number; creation_time: string;
};

// GET /api/profile -> the signed-in user's profile, level and headline stats
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const [rows] = await pool.query<ProfileRow[]>(
      `SELECT id, name, email, image, bio, is_private, xp, creation_time FROM user WHERE id = ?`, [userId]);
    const user = rows[0];
    if (!user) return notFound("User not found");
    const [[stats]] = await pool.query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM typing_score WHERE user_id = ? AND mode <> 'zen') AS tests,
         (SELECT MAX(wpm) FROM typing_score WHERE user_id = ?) AS best_wpm,
         (SELECT ROUND(AVG(wpm), 1) FROM (SELECT wpm FROM typing_score WHERE user_id = ? ORDER BY created_at DESC LIMIT 10) r) AS avg_wpm_last10,
         (SELECT COUNT(*) FROM entry e JOIN journal j ON j.id = e.journal_id WHERE j.user_id = ? AND e.status = 'published') AS pieces,
         (SELECT COUNT(*) FROM user_achievement WHERE user_id = ?) AS achievements`,
      [userId, userId, userId, userId, userId],
    );
    return NextResponse.json({
      profile: { ...user, is_private: !!user.is_private, level: levelForXp(user.xp) },
      stats,
    });
  } catch (error) {
    return serverError(error, "Failed to load profile");
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  isPrivate: z.boolean().optional(),
});

// PATCH /api/profile { name?, bio?, isPrivate? }
export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid profile");
  const { name, bio, isPrivate } = parsed.data;
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (name !== undefined) { sets.push("name = ?"); params.push(name); }
  if (bio !== undefined) { sets.push("bio = ?"); params.push(bio || null); }
  if (isPrivate !== undefined) { sets.push("is_private = ?"); params.push(isPrivate ? 1 : 0); }
  if (!sets.length) return badRequest("Nothing to update");
  try {
    await pool.query(`UPDATE user SET ${sets.join(", ")} WHERE id = ?`, [...params, userId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "Failed to update profile");
  }
}
