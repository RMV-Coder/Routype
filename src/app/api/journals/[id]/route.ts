import { NextResponse, NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { badRequest, getAuth, notFound, parseId, serverError, unauthorized } from "@/lib/api";
import type { Journal, Visibility } from "@/lib/definitions";

type Params = { params: Promise<{ id: string }> };

async function loadOwnedJournal(supabase: SupabaseClient<Database>, id: number, userId: string): Promise<Journal | null> {
  const { data, error } = await supabase
    .from("journals")
    .select("id, user_id, title, description, visibility, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// GET /api/journals/:id -> journal with all of its entries (owner only)
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid journal id");
  try {
    const journal = await loadOwnedJournal(auth.supabase, id, auth.userId);
    if (!journal) return notFound("Journal not found");
    const { data: entries, error } = await auth.supabase
      .from("entries")
      .select("id, journal_id, title, kind, content, visibility, allow_typing, status, scheduled_at, published_at, created_at, updated_at")
      .eq("journal_id", id);
    if (error) throw error;
    // ORDER BY COALESCE(published_at, created_at) DESC
    const sorted = (entries ?? []).sort((a, b) =>
      new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime());
    return NextResponse.json({ journal, entries: sorted });
  } catch (error) {
    return serverError(error, "Failed to load journal");
  }
}

// PATCH /api/journals/:id { title?, description?, visibility? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid journal id");
  const body = await req.json().catch(() => ({}));
  const visibilities: Visibility[] = ["public", "friends", "private"];
  if (body.visibility !== undefined && !visibilities.includes(body.visibility)) return badRequest("Invalid visibility");
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) return badRequest("Title is required");
  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") return badRequest("Invalid description");
  try {
    const journal = await loadOwnedJournal(auth.supabase, id, auth.userId);
    if (!journal) return notFound("Journal not found");
    const { error } = await auth.supabase
      .from("journals")
      .update({
        title: body.title?.trim().slice(0, 255) ?? journal.title,
        description: body.description ?? journal.description,
        visibility: body.visibility ?? journal.visibility,
      })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "Failed to update journal");
  }
}

// DELETE /api/journals/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid journal id");
  const { data, error } = await auth.supabase.from("journals").delete().eq("id", id).eq("user_id", auth.userId).select("id");
  if (error) return serverError(error, "Failed to delete journal");
  if (!data?.length) return notFound("Journal not found");
  return NextResponse.json({ success: true });
}
