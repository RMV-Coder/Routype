import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, getAuth, serverError, unauthorized } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAchievements } from "@/lib/game/progress";
import { buildChart } from "@/lib/music/chart";
import { accuracyOf, maxScore, xpForPerformance } from "@/lib/music/judge";
import { getSong } from "@/lib/music/songs";

const count = z.number().int().min(0).max(100000);
const performanceSchema = z.object({
  songId: z.string().min(1).max(64),
  partId: z.string().min(1).max(64),
  speed: z.union([z.literal(50), z.literal(75), z.literal(100)]),
  score: count.max(10_000_000),
  maxCombo: count,
  perfect: count,
  great: count,
  good: count,
  miss: count,
  stray: count,
  holds: count,
  holdsKept: count,
});

// POST /api/music/scores -> checks a Concert Hall result against the piece's chart, saves it and grants XP
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const parsed = performanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid result");
  const p = parsed.data;
  const song = getSong(p.songId);
  const part = song?.parts.find((x) => x.id === p.partId);
  if (!song || !part) return badRequest("Unknown piece or part");

  // every note is judged exactly once, so the counts must add up to the chart
  const chart = buildChart(song, part, p.speed / 100);
  const hits = p.perfect + p.great + p.good;
  const longNotes = chart.notes.filter((n) => n.hold).length;
  if (hits + p.miss !== chart.notes.length || hits === 0) return badRequest("Result does not match the piece");
  if (p.maxCombo > hits || p.holds > longNotes || p.holdsKept > p.holds || p.score > maxScore(chart)) {
    return badRequest("Result does not match the piece");
  }
  const accuracy = accuracyOf(p);

  try {
    const { data: previous, error: previousError } = await auth.supabase
      .from("music_scores")
      .select("score")
      .eq("user_id", auth.userId)
      .eq("song_id", song.id)
      .eq("part_id", part.id)
      .eq("speed", p.speed)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previousError) throw previousError;

    // written with the service role: users cannot insert scores themselves (see music_scores in the schema)
    const { error } = await createAdminClient().from("music_scores").insert({
      user_id: auth.userId,
      song_id: song.id,
      part_id: part.id,
      speed: p.speed,
      score: p.score,
      accuracy,
      max_combo: p.maxCombo,
      perfect: p.perfect,
      great: p.great,
      good: p.good,
      miss: p.miss,
      stray: p.stray,
      holds_kept: p.holdsKept,
      duration_seconds: Math.min(3600, Math.max(1, Math.round(chart.end))),
    });
    if (error) throw error;
    const xp = xpForPerformance(hits, accuracy, p.speed);
    const unlocked = await evaluateAchievements(auth.userId, undefined, xp);
    return NextResponse.json({ success: true, xp, unlocked, best: !previous || p.score > previous.score }, { status: 201 });
  } catch (error) {
    return serverError(error, "Failed to save result");
  }
}

// GET /api/music/scores -> the signed-in user's best result on each part and speed
export async function GET() {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { data, error } = await auth.supabase.rpc("my_music_bests");
  if (error) return serverError(error, "Failed to load results");
  return NextResponse.json({ bests: data ?? [] });
}
