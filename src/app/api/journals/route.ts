import { NextResponse, NextRequest } from "next/server";
import { badRequest, getAuth, serverError, unauthorized } from "@/lib/api";
import type { Visibility } from "@/lib/definitions";

const VISIBILITIES: Visibility[] = ["public", "friends", "private"];

// POST /api/journals { title, description?, visibility? }
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();

  const { title, description, visibility } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || !title.trim()) return badRequest("Title is required");
  if (visibility && !VISIBILITIES.includes(visibility)) return badRequest("Invalid visibility");

  const { data, error } = await auth.supabase
    .from("journals")
    .insert({
      user_id: auth.userId,
      title: title.trim().slice(0, 255),
      description: typeof description === "string" && description ? description : null,
      visibility: visibility || "public",
    })
    .select("id")
    .single();
  if (error) return serverError(error, "Failed to create journal");
  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}

// GET /api/journals -> the signed-in user's journals
export async function GET() {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { data, error } = await auth.supabase
    .from("journals")
    .select("id, user_id, title, description, visibility, created_at, entries(count)")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });
  if (error) return serverError(error, "Failed to load journals");
  const items = (data ?? []).map(({ entries, ...journal }) => ({
    ...journal,
    entry_count: (entries as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
  return NextResponse.json({ items });
}
