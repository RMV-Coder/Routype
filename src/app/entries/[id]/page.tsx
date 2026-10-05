"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Keyboard, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownView, LINE_BREAK_KINDS } from "@/components/writing/markdown-view";
import { EntryComposer } from "@/components/writing/entry-composer";
import { KindBadge, StatusBadge, TypingBadge, VisibilityBadge } from "@/components/writing/badges";
import { announceAchievements } from "@/components/layout/achievement-toasts";
import type { EntryWithAuthor } from "@/lib/definitions";

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<EntryWithAuthor | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/entries/${id}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error || "Failed to load piece");
    setEntry(json.entry);
    setIsOwner(json.isOwner);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    if (!entry || !confirm("Delete this piece? This cannot be undone.")) return;
    const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    if (res.ok) router.push(`/my-journals/${entry.journal_id}`);
  };

  if (error) return <Card className="mx-auto max-w-3xl p-8 text-center text-muted-foreground">{error}</Card>;
  if (!entry) return <Skeleton className="mx-auto h-64 w-full max-w-3xl" />;

  if (editing) {
    return (
      <Card className="mx-auto w-full max-w-4xl">
        <CardContent>
          <EntryComposer
            journalId={entry.journal_id}
            entry={entry}
            onCancel={() => setEditing(false)}
            onSaved={({ unlocked }) => {
              announceAchievements(unlocked);
              setEditing(false);
              load();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <article className="mx-auto w-full max-w-3xl grid gap-6 py-4">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={entry.kind} />
          <VisibilityBadge visibility={entry.visibility} />
          <StatusBadge status={entry.status} scheduledAt={entry.scheduled_at} />
          {entry.allow_typing && <TypingBadge />}
        </div>
        {entry.title && <h1 className="text-3xl font-bold">{entry.title}</h1>}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Avatar className="size-7">
            {entry.author_image && <AvatarImage src={entry.author_image} alt="" />}
            <AvatarFallback>{(entry.author_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-foreground">{entry.author_name ?? "A writer"}</span>
          <span>in {isOwner ? <Link className="underline" href={`/my-journals/${entry.journal_id}`}>{entry.journal_title}</Link> : entry.journal_title}</span>
          <span>· {new Date(entry.published_at ?? entry.created_at).toLocaleDateString()}</span>
          <div className="ml-auto flex gap-2">
            {entry.allow_typing && entry.status === "published" && (
              <Link href={`/typearena?piece=${entry.id}`}><Button size="sm" variant="outline"><Keyboard /> Type this piece</Button></Link>
            )}
            {isOwner && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
                <Button size="icon" variant="ghost" className="size-8" onClick={remove} aria-label="Delete piece"><Trash2 /></Button>
              </>
            )}
          </div>
        </div>
      </header>
      <MarkdownView content={entry.content} preserveLineBreaks={LINE_BREAK_KINDS.has(entry.kind)} className="text-lg" />
    </article>
  );
}
