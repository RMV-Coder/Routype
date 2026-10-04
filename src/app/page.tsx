"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Feather, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownView, LINE_BREAK_KINDS } from "@/components/writing/markdown-view";
import { KindBadge, TypingBadge } from "@/components/writing/badges";
import { PIECE_KINDS, PIECE_KIND_LABELS, type EntryWithAuthor, type PieceKind } from "@/lib/definitions";
import { cn } from "@/lib/utils";

const PREVIEW_CHARS = 600;

export default function HomeFeed() {
  const [kind, setKind] = useState<PieceKind | "all">("all");
  const [items, setItems] = useState<EntryWithAuthor[] | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (reset: boolean, before?: number | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "15" });
      if (kind !== "all") params.set("kind", kind);
      if (!reset && before) params.set("before", String(before));
      const res = await fetch(`/api/entries?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setItems((prev) => (reset ? json.items : [...(prev ?? []), ...json.items]));
      setNextBefore(json.nextBefore);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => { load(true); }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Echoes</h1>
          <p className="text-sm text-muted-foreground">Stories, poems, riddles and thoughts shared by writers on Routype.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/my-journals"><Button><Feather /> Write</Button></Link>
          <Link href="/typearena"><Button variant="outline"><Keyboard /> Type</Button></Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["all", ...PIECE_KINDS.filter((k) => k !== "diary")] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn("rounded-full border px-3 py-1", kind === k ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {k === "all" ? "All" : PIECE_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {items === null && [0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
      {items?.map((e) => (
        <Card key={e.id}>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{e.author_name ?? "A writer"}</span>
              <span className="text-muted-foreground">· {new Date(e.published_at ?? e.created_at).toLocaleDateString()}</span>
              <KindBadge kind={e.kind} />
              {e.allow_typing && <TypingBadge />}
            </div>
            <Link href={`/entries/${e.id}`} className="grid gap-2">
              {e.title && <h2 className="text-xl font-semibold hover:underline">{e.title}</h2>}
              <div className="relative max-h-64 overflow-hidden">
                <MarkdownView
                  content={e.content.length > PREVIEW_CHARS ? `${e.content.slice(0, PREVIEW_CHARS)}…` : e.content}
                  preserveLineBreaks={LINE_BREAK_KINDS.has(e.kind)}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card" />
              </div>
            </Link>
            {e.allow_typing && (
              <Link href={`/typearena?piece=${e.id}`} className="text-sm text-primary hover:underline">Type this piece →</Link>
            )}
          </CardContent>
        </Card>
      ))}
      {items?.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          Nothing here yet. Be the first to <Link className="underline" href="/my-journals">publish a piece</Link>.
        </Card>
      )}
      {nextBefore && (
        <Button variant="outline" onClick={() => load(false, nextBefore)} disabled={loading}>{loading ? "Loading…" : "Load more"}</Button>
      )}
    </div>
  );
}
