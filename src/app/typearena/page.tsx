"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Feather, RotateCcw, SkipForward, Swords, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TypingTest, type TypingResult } from "@/components/typing/typing-test";
import { TypingResults, type UnlockedAchievement } from "@/components/typing/typing-results";
import { useTypeArena } from "@/hooks/use-typearena";
import { GAME_MODES, type PieceFilter } from "@/lib/game/modes";
import { randomWords } from "@/lib/game/words";
import { fetchPiece, type TypingPiece } from "@/lib/game/pieces-client";
import { PIECE_KINDS, PIECE_KIND_LABELS } from "@/lib/definitions";
import { cn } from "@/lib/utils";

type SoloMode = keyof typeof GAME_MODES;

export default function TypeArenaPage() {
  return (
    <Suspense>
      <TypeArena />
    </Suspense>
  );
}

function TypeArena() {
  const searchParams = useSearchParams();
  const requestedPiece = parseInt(searchParams.get("piece") || "0", 10) || 0;
  const [mode, setMode] = useState<SoloMode>(requestedPiece ? "piece" : "time");
  const [value, setValue] = useState<number>(GAME_MODES.time.defaultValue!);
  const [kind, setKind] = useState<PieceFilter>("any");
  const [round, setRound] = useState(0);
  const [piece, setPiece] = useState<TypingPiece | null>(null);
  const [pieceState, setPieceState] = useState<"idle" | "loading" | "empty">("idle");
  const [result, setResult] = useState<TypingResult | null>(null);
  const [saved, setSaved] = useState<{ xp: number; unlocked: UnlockedAchievement[] } | null>(null);
  const [saving, setSaving] = useState(false);

  const selectMode = (m: SoloMode) => {
    setMode(m);
    setValue(GAME_MODES[m].defaultValue ?? 0);
    restart();
  };

  const restart = useCallback(() => {
    setResult(null);
    setSaved(null);
    setRound((r) => r + 1);
  }, []);

  // Load a community piece when needed
  useEffect(() => {
    if (mode !== "piece") return;
    let cancelled = false;
    setPieceState("loading");
    // the first round honours ?piece=<id> (from "Type this piece"), later rounds pick at random
    const pick = round === 0 && requestedPiece ? fetchPiece("any", undefined, requestedPiece) : fetchPiece(kind, piece?.id);
    pick.then((p) => {
      if (cancelled) return;
      setPiece(p);
      setPieceState(p ? "idle" : "empty");
    });
    return () => { cancelled = true; };
    // a new round in piece mode means "next piece"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, kind, round]);

  const words = useMemo(() => {
    if (mode === "piece") return piece ? piece.text.split(" ") : [];
    if (mode === "time") return randomWords(Math.max(100, value * 4));
    if (mode === "words" || mode === "sudden-death") return randomWords(value);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, value, piece, round]);

  const handleFinish = async (r: TypingResult) => {
    setResult(r);
    if (r.durationSeconds < 1 || r.charsCorrect === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/typing/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          modeValue: mode === "piece" ? null : value,
          wpm: r.wpm,
          rawWpm: r.rawWpm,
          accuracy: r.accuracy,
          consistency: r.consistency,
          charsCorrect: r.charsCorrect,
          charsIncorrect: r.charsIncorrect,
          durationSeconds: Math.max(1, r.durationSeconds),
          entryId: mode === "piece" ? piece?.id : null,
        }),
      });
      if (res.ok) setSaved(await res.json());
    } finally {
      setSaving(false);
    }
  };

  const info = GAME_MODES[mode];

  return (
    <div className="mx-auto w-full max-w-5xl grid gap-6 py-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm">
        {(Object.keys(GAME_MODES) as SoloMode[]).map((m) => (
          <ModeButton key={m} active={mode === m} onClick={() => selectMode(m)}>{GAME_MODES[m].label}</ModeButton>
        ))}
        {info.values && <span className="mx-1 h-5 w-px bg-border" />}
        {info.values?.map((v) => (
          <ModeButton key={v} active={value === v} onClick={() => { setValue(v); restart(); }}>
            {mode === "time" ? `${v}s` : v}
          </ModeButton>
        ))}
        {mode === "piece" && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <select
              aria-label="Piece type"
              className="rounded-md border bg-background px-2 py-1"
              value={kind}
              onChange={(e) => { setKind(e.target.value as PieceFilter); restart(); }}
            >
              <option value="any">Any kind</option>
              {PIECE_KINDS.filter((k) => k !== "diary").map((k) => (
                <option key={k} value={k}>{PIECE_KIND_LABELS[k]}</option>
              ))}
            </select>
          </>
        )}
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">{info.description}</p>

      <Card>
        <CardContent className="pt-2">
          {mode === "zen" ? (
            <ZenPad key={round} />
          ) : result ? (
            <TypingResults result={result} xp={saved?.xp} unlocked={saved?.unlocked} saving={saving}>
              <Button onClick={restart}>
                {mode === "piece" ? <><SkipForward /> Next piece</> : <><RotateCcw /> Try again</>}
              </Button>
            </TypingResults>
          ) : mode === "piece" && pieceState !== "idle" ? (
            <div className="py-10 text-center text-muted-foreground">
              {pieceState === "loading" ? "Finding a piece…" : (
                <div className="grid gap-3 justify-items-center">
                  <p>No pieces of this kind have been shared yet.</p>
                  <Link href="/my-journals"><Button variant="outline"><Feather /> Write one and allow it in TypeArena</Button></Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <TypingTest
                words={words}
                mode={mode}
                durationSec={value}
                onFinish={handleFinish}
                onRestart={restart}
              />
              {mode === "piece" && piece && (
                <p className="text-sm text-muted-foreground">
                  <Feather className="inline size-4" /> {piece.title ? <em>{piece.title}</em> : "Untitled"} ·{" "}
                  {PIECE_KIND_LABELS[piece.kind as keyof typeof PIECE_KIND_LABELS] ?? piece.kind} by{" "}
                  <span className="font-medium text-foreground">{piece.authorName ?? "a writer"}</span>
                  {" · "}
                  <Link className="underline" href={`/entries/${piece.id}`}>read it</Link>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <MultiplayerCard />
    </div>
  );
}

function ModeButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-md px-3 py-1 transition-colors hover:text-foreground", active ? "bg-background text-primary font-semibold shadow-xs" : "text-muted-foreground")}
    >
      {children}
    </button>
  );
}

/** Free typing with a live word count; nothing is saved. */
function ZenPad() {
  const [text, setText] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [startedAt, finishedAt]);
  const minutes = startedAt ? ((finishedAt ?? now) - startedAt) / 60000 : 0;
  const wpm = minutes > 0 ? Math.round(text.length / 5 / minutes) : 0;
  return (
    <div className="grid gap-3">
      <Textarea
        autoFocus
        value={text}
        readOnly={!!finishedAt}
        onChange={(e) => {
          if (!startedAt) setStartedAt(Date.now());
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            setFinishedAt(Date.now());
          }
        }}
        placeholder="Let your thoughts flow…"
        className="min-h-56 text-xl leading-9"
      />
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
        <span>{wpm} wpm</span>
        {finishedAt && (
          <Button size="sm" variant="outline" onClick={() => { setText(""); setStartedAt(null); setFinishedAt(null); }}>
            <RotateCcw /> Again
          </Button>
        )}
        <span className="ml-auto">Want to keep it? Paste it into a journal entry.</span>
      </div>
    </div>
  );
}

function MultiplayerCard() {
  const router = useRouter();
  const [state, actions] = useTypeArena();
  const [source, setSource] = useState<"piece" | "words" | "custom">("piece");
  const [kind, setKind] = useState<PieceFilter>("any");
  const [custom, setCustom] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      let text = "";
      let piece = null;
      if (source === "piece") {
        const p = await fetchPiece(kind);
        if (p) {
          text = p.text;
          piece = { id: p.id, title: p.title, authorName: p.authorName };
        } else {
          text = randomWords(40).join(" ");
        }
      } else if (source === "words") {
        text = randomWords(40).join(" ");
      } else {
        text = custom.replace(/\s+/g, " ").trim();
      }
      const res = await actions.create(text, piece);
      if (res?.match) router.push(`/typearena/${res.match.id}`);
      else setError(res?.error === "invalid_text" ? "The text needs at least three words." : "Could not create the race. Is the realtime server running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="size-5" /> Race with friends</CardTitle>
        <CardDescription>
          Create a room, share the code and race on the same text. You&apos;ll see everyone&apos;s ghost caret as you type.
          <span className={cn("ml-2 inline-block size-2 rounded-full", state.isConnected ? "bg-green-500" : "bg-muted-foreground/40")} />
          <span className="ml-1 text-xs">{state.isConnected ? "online" : state.isReconnecting ? "reconnecting…" : "offline"}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-3 content-start">
          <div className="flex flex-wrap gap-2 text-sm">
            <ModeButton active={source === "piece"} onClick={() => setSource("piece")}>Community piece</ModeButton>
            <ModeButton active={source === "words"} onClick={() => setSource("words")}>Random words</ModeButton>
            <ModeButton active={source === "custom"} onClick={() => setSource("custom")}>Custom text</ModeButton>
          </div>
          {source === "piece" && (
            <select
              aria-label="Piece type"
              className="rounded-md border bg-background px-2 py-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as PieceFilter)}
            >
              <option value="any">Any kind of piece</option>
              {PIECE_KINDS.filter((k) => k !== "diary").map((k) => (
                <option key={k} value={k}>{PIECE_KIND_LABELS[k]}</option>
              ))}
            </select>
          )}
          {source === "custom" && (
            <Textarea value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Paste the text to race on" rows={3} />
          )}
          <Button onClick={create} disabled={busy || !state.isConnected}><Swords /> Create race</Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <form
          className="grid gap-3 content-start"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) router.push(`/typearena/${encodeURIComponent(code.trim())}`);
          }}
        >
          <label className="grid gap-1 text-sm">
            <span>Join with a room code</span>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. lx3k9a2f" />
          </label>
          <Button type="submit" variant="secondary" disabled={!code.trim()}>Join race</Button>
        </form>
      </CardContent>
    </Card>
  );
}
