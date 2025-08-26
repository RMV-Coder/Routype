"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

export function JournalCreateCard() {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState<string>("");
	const [cover, setCover] = useState<File | null>(null);
	const [isPaid, setIsPaid] = useState(false); // placeholder gating flag
	const router = useRouter();

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;
		const slug = slugify(title);
		// TODO: Persist journal here if needed; for now just navigate
		setOpen(false);
		router.push(`/my-journals/${encodeURIComponent(slug)}`);
	};

	return (
		<Card className="p-4">
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button variant="outline">Create Journal</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>New Journal</DialogTitle>
					</DialogHeader>
					<form className="grid gap-3" onSubmit={onSubmit}>
						<label className="grid gap-1">
							<span className="text-sm">Title</span>
							<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My awesome journal" required />
						</label>
						<label className="grid gap-1">
							<span className="text-sm">Description (optional)</span>
							<Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" rows={3} />
						</label>
						<label className="grid gap-1">
							<span className="text-sm">Tags (comma separated, optional)</span>
							<Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="travel, photography" />
						</label>
						<Separator />
						<label className="grid gap-1">
							<span className="text-sm">Cover image (optional, paid)</span>
							<Input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} disabled={!isPaid} />
							{!isPaid ? <span className="text-xs text-muted-foreground">Upgrade to enable cover images</span> : null}
						</label>
						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
							<Button type="submit">Create</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

