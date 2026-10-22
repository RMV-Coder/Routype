import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, getAuth, serverError, unauthorized } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const parsed = scoreSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid result");
  const s = parsed.data;
  if (s.mode === "zen") return NextResponse.json({ success: true, xp: 0, unlocked: [] });

  try {
    const { error } = await auth.supabase.from("typing_scores").insert({
      user_id: auth.userId,
      mode: s.mode,
      mode_value: s.modeValue ?? null,
      wpm: s.wpm,
      raw_wpm: s.rawWpm,
      accuracy: s.accuracy,
      consistency: s.consistency ?? null,
      chars_correct: s.charsCorrect,
      chars_incorrect: s.charsIncorrect,
      duration_seconds: s.durationSeconds,
      entry_id: s.entryId ?? null,
      match_id: s.matchId ?? null,
      placement: s.placement ?? null,
    });
    if (error) throw error;
    const xp = xpForResult(s.mode, s.wpm, s.accuracy, s.durationSeconds, s.placement ?? null);
    const unlocked = await evaluateAchievements(auth.userId, {
      mode: s.mode, modeValue: s.modeValue ?? null, wpm: s.wpm, accuracy: s.accuracy,
      charsCorrect: s.charsCorrect, placement: s.placement ?? null,
    }, xp);

    // The author of a typed piece may have earned "Echo"/"Chorus". The typist may
    // not be able to see who that is, so look it up with the service role.
    if (s.entryId) {
      const { data: piece } = await createAdminClient()
        .from("entries").select("journals(user_id)").eq("id", s.entryId).maybeSingle();
      const authorId = piece?.journals.user_id;
      if (authorId && authorId !== auth.userId) await evaluateAchievements(authorId);
    }
    return NextResponse.json({ success: true, xp, unlocked }, { status: 201 });
  } catch (error) {
    return serverError(error, "Failed to save result");
  }
}

// GET /api/typing/scores -> the signed-in user's recent results and personal bests
export async function GET() {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const [recent, bests] = await Promise.all([
    auth.supabase
      .from("typing_scores")
      .select("id, mode, mode_value, wpm, raw_wpm, accuracy, consistency, duration_seconds, entry_id, match_id, placement, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(20),
    auth.supabase.rpc("my_typing_bests"),
  ]);
  if (recent.error || bests.error) return serverError(recent.error ?? bests.error, "Failed to load results");
  return NextResponse.json({ recent: recent.data, bests: bests.data });
}
