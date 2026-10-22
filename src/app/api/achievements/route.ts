import { NextResponse } from "next/server";
import { getAuth, serverError, unauthorized } from "@/lib/api";
import { ACHIEVEMENTS } from "@/lib/game/achievements";

// GET /api/achievements -> every achievement with the signed-in user's unlock status
export async function GET() {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { data, error } = await auth.supabase
    .from("user_achievements")
    .select("achievement_code, unlocked_at")
    .eq("user_id", auth.userId);
  if (error) return serverError(error, "Failed to load achievements");
  const unlocked = new Map((data ?? []).map((r) => [r.achievement_code as string, r.unlocked_at as string]));
  return NextResponse.json({
    items: ACHIEVEMENTS.map(({ code, name, description, category, xp }) => ({
      code, name, description, category, xp, unlockedAt: unlocked.get(code) ?? null,
    })),
  });
}
