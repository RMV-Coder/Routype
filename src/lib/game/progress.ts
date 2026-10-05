// Server-side only: imported from API routes.
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { ACHIEVEMENTS, type ProgressSnapshot } from "./achievements";

export interface UnlockedAchievement {
  code: string;
  name: string;
  description: string;
  xp: number;
}

type CountRow = RowDataPacket & { n: number };

async function count(conn: PoolConnection, sql: string, params: unknown[]): Promise<number> {
  const [rows] = await conn.query<CountRow[]>(sql, params);
  return Number(rows[0]?.n ?? 0);
}

/** Gathers the counters used by achievement rules for one user. */
export async function loadProgress(conn: PoolConnection, userId: number): Promise<Omit<ProgressSnapshot, "last">> {
  const [testsCompleted, racesCompleted, racesWon, piecesTyped, piecesPublished, poemsPublished, piecesShared, timesTypedByOthers] =
    await Promise.all([
      count(conn, `SELECT COUNT(*) n FROM typing_score WHERE user_id = ? AND mode <> 'zen'`, [userId]),
      count(conn, `SELECT COUNT(*) n FROM typing_score WHERE user_id = ? AND match_id IS NOT NULL`, [userId]),
      count(conn, `SELECT COUNT(*) n FROM typing_score WHERE user_id = ? AND match_id IS NOT NULL AND placement = 1`, [userId]),
      count(conn,
        `SELECT COUNT(*) n FROM typing_score s JOIN entry e ON e.id = s.entry_id JOIN journal j ON j.id = e.journal_id
         WHERE s.user_id = ? AND j.user_id <> ?`, [userId, userId]),
      count(conn, `SELECT COUNT(*) n FROM entry e JOIN journal j ON j.id = e.journal_id WHERE j.user_id = ? AND e.status = 'published'`, [userId]),
      count(conn, `SELECT COUNT(*) n FROM entry e JOIN journal j ON j.id = e.journal_id WHERE j.user_id = ? AND e.status = 'published' AND e.kind = 'poetry'`, [userId]),
      count(conn, `SELECT COUNT(*) n FROM entry e JOIN journal j ON j.id = e.journal_id WHERE j.user_id = ? AND e.status = 'published' AND e.allow_typing = 1`, [userId]),
      count(conn,
        `SELECT COUNT(*) n FROM typing_score s JOIN entry e ON e.id = s.entry_id JOIN journal j ON j.id = e.journal_id
         WHERE j.user_id = ? AND s.user_id <> ?`, [userId, userId]),
    ]);
  return { testsCompleted, racesCompleted, racesWon, piecesTyped, piecesPublished, poemsPublished, piecesShared, timesTypedByOthers };
}

/**
 * Evaluates every achievement for `userId`, stores new unlocks, grants their XP
 * (plus `extraXp`) and returns what was newly unlocked.
 */
export async function evaluateAchievements(
  conn: PoolConnection,
  userId: number,
  last?: ProgressSnapshot["last"],
  extraXp = 0,
): Promise<UnlockedAchievement[]> {
  const progress: ProgressSnapshot = { ...(await loadProgress(conn, userId)), last };
  const [rows] = await conn.query<(RowDataPacket & { achievement_code: string })[]>(
    `SELECT achievement_code FROM user_achievement WHERE user_id = ?`, [userId]);
  const owned = new Set(rows.map((r) => r.achievement_code));

  const unlocked = ACHIEVEMENTS.filter((a) => !owned.has(a.code) && a.unlocked(progress));
  if (unlocked.length) {
    await conn.query(
      `INSERT IGNORE INTO user_achievement (user_id, achievement_code) VALUES ${unlocked.map(() => "(?, ?)").join(", ")}`,
      unlocked.flatMap((a) => [userId, a.code]),
    );
  }
  const xp = extraXp + unlocked.reduce((sum, a) => sum + a.xp, 0);
  if (xp > 0) await conn.query(`UPDATE user SET xp = xp + ? WHERE id = ?`, [xp, userId]);
  return unlocked.map(({ code, name, description, xp }) => ({ code, name, description, xp }));
}
