// Server-side only: imported from API routes.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACHIEVEMENTS, type ProgressSnapshot } from "./achievements";

export interface UnlockedAchievement {
  code: string;
  name: string;
  description: string;
  xp: number;
}

/**
 * Evaluates every achievement for `userId`, stores new unlocks, grants their XP
 * (plus `extraXp`) and returns what was newly unlocked.
 *
 * Runs with the service role: users cannot grant themselves XP or achievements
 * (see achievement_progress / grant_progress in the schema).
 */
export async function evaluateAchievements(
  userId: string,
  last?: ProgressSnapshot["last"],
  extraXp = 0,
): Promise<UnlockedAchievement[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("achievement_progress", { p_user_id: userId }).single();
  if (error) throw error;

  const progress: ProgressSnapshot = {
    testsCompleted: Number(data.tests_completed),
    racesCompleted: Number(data.races_completed),
    racesWon: Number(data.races_won),
    piecesTyped: Number(data.pieces_typed),
    piecesPublished: Number(data.pieces_published),
    poemsPublished: Number(data.poems_published),
    piecesShared: Number(data.pieces_shared),
    timesTypedByOthers: Number(data.times_typed_by_others),
    last,
  };
  const owned = new Set(data.owned ?? []);
  const candidates = ACHIEVEMENTS.filter((a) => !owned.has(a.code) && a.unlocked(progress));
  if (!candidates.length && extraXp <= 0) return [];

  const { data: granted, error: grantError } = await admin.rpc("grant_progress", {
    p_user_id: userId,
    p_codes: candidates.map((a) => a.code),
    p_code_xp: candidates.map((a) => a.xp),
    p_extra_xp: extraXp,
  });
  if (grantError) throw grantError;

  const newCodes = new Set(granted ?? []);
  return candidates
    .filter((a) => newCodes.has(a.code))
    .map(({ code, name, description, xp }) => ({ code, name, description, xp }));
}
