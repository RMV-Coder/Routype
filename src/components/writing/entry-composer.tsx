"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PIECE_KINDS, PIECE_KIND_LABELS, type Entry, type EntryStatus, type PieceKind, type Visibility } from "@/lib/definitions";
import { MIN_TYPING_WORDS, toTypingText, wordCount } from "@/lib/pieces";
import { MarkdownEditor } from "./markdown-editor";
import { LINE_BREAK_KINDS } from "./markdown-view";

export interface UnlockedAchievement { code: string; name: string; xp: number }

const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: "Public — anyone on Routype",
  friends: "Friends only",
  private: "Only me (diary)",
};

/** Create or edit a piece: title, kind, visibility, TypeArena opt-in and publishing. */
export function EntryComposer({
  journalId,
  entry,
  onSaved,
  onCancel,
}: {
  journalId: number;
  entry?: Entry;
  onSaved: (result: { id: number; status: EntryStatus; unlocked: UnlockedAchievement[] }) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [kind, setKind] = useState<PieceKind>(entry?.kind ?? "thought");
  const [content, setContent] = useState(entry?.content ?? "");
  const [visibility, setVisibility] = useState<Visibility>(entry?.visibility ?? "public");
  const [allowTyping, setAllowTyping] = useState(entry?.allow_typing ?? false);
  const [scheduledAt, setScheduledAt] = useState(entry?.scheduled_at ? toLocalInput(entry.scheduled_at) : "");
  const [showSchedule, setShowSchedule] = useState(entry?.status === "scheduled");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typingWords = wordCount(toTypingText(content));
  const typingAllowed = visibility === "public";

  const save = async (status: EntryStatus) => {
    setError(null);
    if (!content.trim()) return setError("Write something first.");
    if (status === "scheduled" && !scheduledAt) {
      setShowSchedule(true);
      return setError("Pick a date and time to schedule this piece.");
    }
    setSaving(true);
    try {
      const body = {
        journalId,
        title: title.trim() || null,
        kind,
        content,
        visibility,
        allowTyping: typingAllowed && allowTyping,
        status,
        scheduledAt: status === "scheduled" ? new Date(scheduledAt).toISOString() : null,
      };
      const res = await fetch(entry ? `/api/entries/${entry.id}` : "/api/entries", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save");
      onSaved({ id: entry?.id ?? json.id, status, unlocked: json.unlocked ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="text-lg" />
        <select
          aria-label="Kind of piece"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={kind}
          onChange={(e) => {
            const next = e.target.value as PieceKind;
            setKind(next);
            if (next === "diary") setVisibility("private");
          }}
        >
          {PIECE_KINDS.map((k) => <option key={k} value={k}>{PIECE_KIND_LABELS[k]}</option>)}
        </select>
        <select
          aria-label="Who can read it"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
        >
          {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => <option key={v} value={v}>{VISIBILITY_LABELS[v]}</option>)}
        </select>
      </div>

      <MarkdownEditor value={content} onChange={setContent} preserveLineBreaks={LINE_BREAK_KINDS.has(kind)} />

      <label className={`flex items-start gap-3 rounded-md border p-3 text-sm ${typingAllowed ? "" : "opacity-60"}`}>
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={typingAllowed && allowTyping}
          disabled={!typingAllowed}
          onChange={(e) => setAllowTyping(e.target.checked)}
        />
        <span className="grid gap-1">
          <span className="flex items-center gap-2 font-medium"><Keyboard className="size-4" /> Allow this piece in TypeArena</span>
          <span className="text-muted-foreground">
            {typingAllowed
              ? `Other writers may type it in the Pieces mode and in races, credited to you. Formatting and math are stripped${typingWords < MIN_TYPING_WORDS ? ` — it needs at least ${MIN_TYPING_WORDS} words` : ` (${typingWords} words)`}.`
              : "Only public pieces can be used in TypeArena."}
          </span>
        </span>
      </label>

      {showSchedule && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <CalendarClock className="size-4" /> Publish on
          <Input type="datetime-local" className="w-auto" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>}
        <Button type="button" variant="outline" onClick={() => save("draft")} disabled={saving}>Save draft</Button>
        <div className="flex">
          <Button type="button" className="rounded-r-none" onClick={() => save(showSchedule ? "scheduled" : "published")} disabled={saving}>
            {saving ? "Saving…" : showSchedule ? "Schedule" : entry?.status === "published" ? "Update" : "Publish"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" className="rounded-l-none border-l border-primary-foreground/20" aria-label="More publishing options">
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setShowSchedule(false); save("published"); }}>Publish now</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSchedule(true)}>Schedule…</DropdownMenuItem>
              <DropdownMenuItem onClick={() => save("draft")}>Save as draft</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
