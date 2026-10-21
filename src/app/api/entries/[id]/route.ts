import { NextResponse, NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { badRequest, getAuth, notFound, parseId, serverError, unauthorized } from "@/lib/api";
import { ENTRY_WITH_AUTHOR_VIEW, entryPatchSchema, publishDueEntries, serializeEntry, type EntryRow } from "@/lib/entries";
import { evaluateAchievements } from "@/lib/game/progress";

type Params = { params: Promise<{ id: string }> };

/** Loads an entry the signed-in user may read (RLS applies visibility, privacy and draft rules). */
async function loadEntry(supabase: SupabaseClient<Database>, id: number): Promise<EntryRow | null> {
  const { data, error } = await supabase.from(ENTRY_WITH_AUTHOR_VIEW).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as EntryRow | null;
}

// GET /api/entries/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid entry id");
  try {
    await publishDueEntries(auth.supabase);
    const row = await loadEntry(auth.supabase, id);
    if (!row) return notFound("Entry not found");
    return NextResponse.json({ entry: serializeEntry(row), isOwner: row.author_id === auth.userId });
  } catch (error) {
    return serverError(error, "Failed to load entry");
  }
}

// PATCH /api/entries/:id (author only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid entry id");
  const parsed = entryPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid entry");
  const patch = parsed.data;
  try {
    const row = await loadEntry(auth.supabase, id);
    if (!row || row.author_id !== auth.userId) return notFound("Entry not found");
    const status = patch.status ?? row.status;
    const scheduledAt = patch.scheduledAt ?? row.scheduled_at;
    if (status === "scheduled" && !scheduledAt) return badRequest("Pick a date to schedule this piece");
    const { error } = await auth.supabase
      .from("entries")
      .update({
        title: patch.title !== undefined ? patch.title || null : row.title,
        kind: patch.kind ?? row.kind,
        content: patch.content ?? row.content,
        visibility: patch.visibility ?? row.visibility,
        allow_typing: patch.allowTyping ?? row.allow_typing,
        status,
        scheduled_at: status === "scheduled" ? new Date(scheduledAt!).toISOString() : null,
        published_at: status === "published" ? (row.published_at ?? new Date().toISOString()) : null,
      })
      .eq("id", id);
    if (error) throw error;
    const unlocked = status === "published" ? await evaluateAchievements(auth.userId) : [];
    return NextResponse.json({ success: true, unlocked });
  } catch (error) {
    return serverError(error, "Failed to update entry");
  }
}

// DELETE /api/entries/:id (author only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return badRequest("Invalid entry id");
  // RLS restricts deletes to the author's own entries.
  const { data, error } = await auth.supabase.from("entries").delete().eq("id", id).select("id");
  if (error) return serverError(error, "Failed to delete entry");
  if (!data?.length) return notFound("Entry not found");
  return NextResponse.json({ success: true });
}
