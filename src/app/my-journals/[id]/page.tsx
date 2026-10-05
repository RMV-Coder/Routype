"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EntryComposer } from "@/components/writing/entry-composer";
import { KindBadge, StatusBadge, TypingBadge, VisibilityBadge } from "@/components/writing/badges";
import { announceAchievements } from "@/components/layout/achievement-toasts";
import { toTypingText } from "@/lib/pieces";
import type { Entry, Journal } from "@/lib/definitions";

export default function JournalPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const [journal, setJournal] = useState<Journal | null>(null);
	const [entries, setEntries] = useState<Entry[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [composing, setComposing] = useState(false);

	const load = useCallback(async () => {
		const res = await fetch(`/api/journals/${id}`);
		const json = await res.json().catch(() => ({}));
		if (!res.ok) return setError(json.error || "Failed to load journal");
		setJournal(json.journal);
		setEntries(json.entries);
	}, [id]);

	useEffect(() => { load(); }, [load]);

	const deleteJournal = async () => {
		if (!journal || !confirm(`Delete "${journal.title}" and all of its pieces? This cannot be undone.`)) return;
		const res = await fetch(`/api/journals/${id}`, { method: "DELETE" });
		if (res.ok) router.push("/my-journals");
	};

	if (error) return <p className="text-destructive">{error}</p>;
	if (!journal) return <Skeleton className="h-40 w-full max-w-5xl mx-auto" />;

	return (
		<div className="mx-auto w-full max-w-5xl grid gap-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="grid gap-1">
					<h1 className="text-2xl font-bold">{journal.title}</h1>
					{journal.description && <p className="text-muted-foreground">{journal.description}</p>}
					<div><VisibilityBadge visibility={journal.visibility} /></div>
				</div>
				<div className="flex gap-2">
					{!composing && <Button onClick={() => setComposing(true)}><Plus /> New piece</Button>}
					<Button variant="ghost" size="icon" onClick={deleteJournal} aria-label="Delete journal"><Trash2 /></Button>
				</div>
			</div>

			{composing && (
				<Card>
					<CardContent>
						<EntryComposer
							journalId={journal.id}
							onCancel={() => setComposing(false)}
							onSaved={({ id: entryId, status, unlocked }) => {
								announceAchievements(unlocked);
								setComposing(false);
								if (status === "published") router.push(`/entries/${entryId}`);
								else load();
							}}
						/>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-3">
				{entries.map((e) => (
					<Link key={e.id} href={`/entries/${e.id}`}>
						<Card className="transition-colors hover:border-primary/50">
							<CardContent className="grid gap-2">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-semibold">{e.title || "Untitled"}</span>
									<KindBadge kind={e.kind} />
									<VisibilityBadge visibility={e.visibility} />
									<StatusBadge status={e.status} scheduledAt={e.scheduled_at} />
									{e.allow_typing && <TypingBadge />}
									<span className="ml-auto text-xs text-muted-foreground">
										{new Date(e.published_at ?? e.created_at).toLocaleDateString()}
									</span>
								</div>
								<p className="line-clamp-2 text-sm text-muted-foreground">{toTypingText(e.content).slice(0, 240)}</p>
							</CardContent>
						</Card>
					</Link>
				))}
				{entries.length === 0 && !composing && (
					<Card className="p-8 text-center text-sm text-muted-foreground">No pieces yet. Click &quot;New piece&quot; to write one.</Card>
				)}
			</div>
		</div>
	);
}
