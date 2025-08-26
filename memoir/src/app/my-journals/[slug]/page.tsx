"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/custom/markdown-editor";
import { Card } from "@/components/ui/card";

function deslugify(slug: string): string {
	return slug
		.replace(/-/g, " ")
		.replace(/\s+/g, " ")
		.replace(/^\w|\s\w/g, (m) => m.toUpperCase());
}

export default function JournalPage() {
	const params = useParams<{ slug: string }>();
	const [showEditor, setShowEditor] = useState(false);
	const title = useMemo(() => deslugify(params.slug), [params.slug]);

	return (
		<div className="p-4 grid gap-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{title}</h1>
				<Button onClick={() => setShowEditor(true)}>Add Entry</Button>
			</div>
			{showEditor ? (
				<MarkdownEditor />
			) : (
				<Card className="p-4 text-sm text-muted-foreground">{`No entries yet. Click "Add Entry" to create one.`}</Card>
			)}
		</div>
	);
}

