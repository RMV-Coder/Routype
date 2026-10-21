import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, getAuth, notFound, serverError, unauthorized } from "@/lib/api";
import { levelForXp } from "@/lib/game/achievements";

// GET /api/profile -> the signed-in user's profile, level and headline stats
export async function GET() {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  try {
    const [{ data: profile, error }, { data: stats, error: statsError }, { data: { user } }] = await Promise.all([
      auth.supabase.from("profiles").select("id, name, image, bio, is_private, xp, created_at").eq("id", auth.userId).maybeSingle(),
      auth.supabase.rpc("my_profile_stats").single(),
      auth.supabase.auth.getUser(),
    ]);
    if (error) throw error;
    if (statsError) throw statsError;
    if (!profile) return notFound("User not found");
    return NextResponse.json({
      profile: { ...profile, email: user?.email ?? null, creation_time: profile.created_at, level: levelForXp(profile.xp) },
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
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid profile");
  const { name, bio, isPrivate } = parsed.data;
  const changes: { name?: string; bio?: string | null; is_private?: boolean } = {};
  if (name !== undefined) changes.name = name;
  if (bio !== undefined) changes.bio = bio || null;
  if (isPrivate !== undefined) changes.is_private = isPrivate;
  if (!Object.keys(changes).length) return badRequest("Nothing to update");
  const { error } = await auth.supabase.from("profiles").update(changes).eq("id", auth.userId);
  if (error) return serverError(error, "Failed to update profile");
  return NextResponse.json({ success: true });
}
