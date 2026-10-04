import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { pool } from "@/lib/db";

type Suggestion = {
  id: number;
  name: string | null;
  image: string | null;
  score: number;
  mutualFriends: number;
  coReads: number;
};

type SuggestionRow = {
  id: number;
  name: string | null;
  image: string | null;
  mutual_friends: number;
  co_reads: number;
  score: number;
};

// GET /api/friends/suggestions?limit=12
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);

  const connection = await pool.getConnection();
  try {
    // mutual friends (accepted)
    const [rowsRaw] = await connection.query(
      `
      WITH my_friends AS (
        SELECT CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END AS friend_id
        FROM friendship f
        WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
      ),
      others AS (
        SELECT u.id, u.name, u.image
        FROM user u
        WHERE u.id <> ?
          AND u.id NOT IN (SELECT friend_id FROM my_friends)
      ),
      mutual_counts AS (
        SELECT o.id AS other_id, COUNT(*) AS mutuals
        FROM others o
        JOIN friendship f ON (f.status = 'accepted') AND (f.user_id = o.id OR f.friend_id = o.id)
        JOIN my_friends mf ON (mf.friend_id = CASE WHEN f.user_id = o.id THEN f.friend_id ELSE f.user_id END)
        GROUP BY o.id
      ),
      co_reads AS (
        SELECT o.id AS other_id, COUNT(DISTINCT jrs.journal_id) AS co_reads
        FROM others o
        JOIN journal_read_state jrs ON jrs.user_id = o.id
        WHERE jrs.journal_id IN (
          SELECT journal_id FROM journal_read_state WHERE user_id = ?
        )
        GROUP BY o.id
      )
      SELECT o.id, o.name, o.image,
             COALESCE(mc.mutuals, 0) AS mutual_friends,
             COALESCE(cr.co_reads, 0) AS co_reads,
             (COALESCE(mc.mutuals, 0) * 3 + COALESCE(cr.co_reads, 0) * 2) AS score
      FROM others o
      LEFT JOIN mutual_counts mc ON mc.other_id = o.id
      LEFT JOIN co_reads cr ON cr.other_id = o.id
      ORDER BY score DESC, o.id ASC
      LIMIT ?
      `,
      [session.user.id, session.user.id, session.user.id, session.user.id, session.user.id, limit]
    );

    const rows = rowsRaw as unknown as SuggestionRow[];
    const items: Suggestion[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.image,
      score: r.score,
      mutualFriends: r.mutual_friends,
      coReads: r.co_reads,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load suggestions" }, { status: 500 });
  } finally {
    connection.release();
  }
}


