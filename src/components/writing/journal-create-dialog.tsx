"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Visibility } from "@/lib/definitions";

export function JournalCreateDialog() {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [visibility, setVisibility] = useState<Visibility>("public");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const router = useRouter();

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || isSubmitting) return;
		setErrorMessage(null);
		setIsSubmitting(true);
		try {
			const res = await fetch("/api/journals", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: title.trim(), description: description.trim() || null, visibility }),
			});
			if (res.status === 401) {
				router.push("/auth/signin");
				return;
			}
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || "Failed to create journal");
			setOpen(false);
			router.push(`/my-journals/${data.id}`);
		} catch (err: unknown) {
			setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button><Plus /> New journal</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>New journal</DialogTitle>
					<DialogDescription>A journal is a collection of pieces: a diary, a poetry book, a blog, a novel…</DialogDescription>
				</DialogHeader>
				<form className="grid gap-3" onSubmit={onSubmit}>
					<label className="grid gap-1">
						<span className="text-sm">Title</span>
						<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Midnight haiku" required maxLength={255} />
					</label>
					<label className="grid gap-1">
						<span className="text-sm">Description (optional)</span>
						<Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this journal about?" rows={3} />
					</label>
					<label className="grid gap-1">
						<span className="text-sm">Who can read it</span>
						<select className="h-9 rounded-md border bg-background px-2 text-sm" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
							<option value="public">Public</option>
							<option value="friends">Friends only</option>
							<option value="private">Only me (private diary)</option>
						</select>
					</label>
					{errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
						<Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create"}</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
