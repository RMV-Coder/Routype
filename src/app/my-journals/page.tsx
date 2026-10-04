"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JournalCreateDialog } from "@/components/writing/journal-create-dialog";
import { VisibilityBadge } from "@/components/writing/badges";
import type { Journal } from "@/lib/definitions";

export default function MyJournalsPage() {
  const [journals, setJournals] = useState<Journal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/journals")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load journals");
        setJournals((await res.json()).items);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My journals</h1>
          <p className="text-sm text-muted-foreground">Your diaries, poetry books, blogs and drafts.</p>
        </div>
        <JournalCreateDialog />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {journals === null && !error && [0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        {journals?.map((j) => (
          <Link key={j.id} href={`/my-journals/${j.id}`}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="size-4" /> {j.title}</CardTitle>
                <CardDescription className="line-clamp-2">{j.description || "No description"}</CardDescription>
                <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <VisibilityBadge visibility={j.visibility} />
                  <span>{j.entry_count ?? 0} pieces</span>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      {journals?.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          You don&apos;t have any journals yet. Create one to start writing.
        </Card>
      )}
    </div>
  );
}
