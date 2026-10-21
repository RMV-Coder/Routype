import { NextResponse, NextRequest } from "next/server";
import { badRequest, getAuth, serverError, unauthorized } from "@/lib/api";
import { ENTRY_WITH_AUTHOR_VIEW, entryInputSchema, publishDueEntries, serializeEntry, type EntryRow } from "@/lib/entries";
import { isPieceKind } from "@/lib/definitions";
import { evaluateAchievements } from "@/lib/game/progress";

// GET /api/entries?kind=poetry&limit=20&before=<id>
// Public feed of published pieces from public journals and public profiles.
export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 50);
  const before = parseInt(searchParams.get("before") || "0", 10) || 0;

  try {
    await publishDueEntries(auth.supabase);
    let query = auth.supabase
      .from(ENTRY_WITH_AUTHOR_VIEW)
      .select("*")
      .eq("status", "published")
      .eq("visibility", "public")
      .eq("journal_visibility", "public")
      .eq("author_private", false);
    if (isPieceKind(kind)) query = query.eq("kind", kind);
    if (before) query = query.lt("id", before);
    const { data, error } = await query.order("id", { ascending: false }).limit(limit + 1);
    if (error) throw error;
    const rows = (data ?? []) as EntryRow[];
    const items = rows.slice(0, limit).map(serializeEntry);
    return NextResponse.json({ items, nextBefore: rows.length > limit ? items[items.length - 1].id : null });
  } catch (error) {
    return serverError(error, "Failed to load feed");
  }
}

// POST /api/entries { journalId, title?, kind, content, visibility, allowTyping, status, scheduledAt? }
export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return unauthorized();
  const parsed = entryInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid entry");
  const input = parsed.data;
  if (input.status === "scheduled" && !input.scheduledAt) return badRequest("Pick a date to schedule this piece");

  try {
    // RLS only lets users add entries to their own journals.
    const { data: journal, error: journalError } = await auth.supabase
      .from("journals").select("id").eq("id", input.journalId).eq("user_id", auth.userId).maybeSingle();
    if (journalError) throw journalError;
    if (!journal) return badRequest("Journal not found");

    const { data, error } = await auth.supabase
      .from("entries")
      .insert({
        journal_id: input.journalId,
        title: input.title || null,
        kind: input.kind,
        content: input.content,
        visibility: input.visibility,
        allow_typing: input.allowTyping,
        status: input.status,
        scheduled_at: input.status === "scheduled" ? new Date(input.scheduledAt!).toISOString() : null,
        published_at: input.status === "published" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw error;
    const unlocked = input.status === "published" ? await evaluateAchievements(auth.userId) : [];
    return NextResponse.json({ success: true, id: data.id, unlocked }, { status: 201 });
  } catch (error) {
    return serverError(error, "Failed to save entry");
  }
}
