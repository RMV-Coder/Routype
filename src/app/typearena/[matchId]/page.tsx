"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, Crown, Feather, Flag, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TypingTest, type TypingProgress, type TypingResult } from "@/components/typing/typing-test";
import { TypingResults, ordinal, type UnlockedAchievement } from "@/components/typing/typing-results";
import { useTypeArena, type TypeArenaParticipant } from "@/hooks/use-typearena";
import type { GhostCaret } from "@/lib/definitions";

export default function TypeArenaRacePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [state, actions] = useTypeArena();
  const [joined, setJoined] = useState(false);
  const [result, setResult] = useState<TypingResult | null>(null);
  const [placement, setPlacement] = useState<number | null>(null);
  const [saved, setSaved] = useState<{ xp: number; unlocked: UnlockedAchievement[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const lastProgressSent = useRef(0);

  // Join once the socket is connected (and again after a reconnect)
  useEffect(() => {
    if (!matchId || !state.isConnected) return;
    actions.join(matchId).then((res) => setJoined(!!res?.ok));
  }, [matchId, state.isConnected, actions]);

  // Leave when navigating away
  useEffect(() => () => { if (matchId) actions.leave(matchId); }, [matchId, actions]);

  const match = state.match?.id === matchId ? state.match : undefined;
  const meId = state.me?.id;
  const me = meId ? match?.participants[meId] : undefined;
  const isHost = !!match && match.hostId === meId;
  const players = useMemo(() => Object.values(match?.participants ?? {}), [match?.participants]);
  const words = useMemo(() => (match?.text ? match.text.split(" ") : []), [match?.text]);
  const countdown = useCountdown(state.countdown);

  const ghosts: GhostCaret[] = useMemo(() => {
    if (!match) return [];
    return players
      .filter((p) => p.id !== meId && p.connected && match.caret[p.id])
      .map((p) => ({ id: p.id, name: p.name ?? "Writer", color: p.color, index: match.caret[p.id].index }));
  }, [match, players, meId]);

  const onProgress = (p: TypingProgress) => {
    if (!match) return;
    actions.sendCaret(match.id, p.caretIndex);
    const now = Date.now();
    if (now - lastProgressSent.current > 300) {
      lastProgressSent.current = now;
      actions.sendProgress(match.id, p.progress, p.wpm, p.accuracy);
    }
  };

  const onFinish = async (r: TypingResult) => {
    if (!match) return;
    setResult(r);
    const ack = await actions.finish(match.id, r.wpm, r.accuracy);
    const place = ack?.placement ?? null;
    setPlacement(place);
    const res = await fetch("/api/typing/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "race",
        modeValue: null,
        wpm: r.wpm,
        rawWpm: r.rawWpm,
        accuracy: r.accuracy,
        consistency: r.consistency,
        charsCorrect: r.charsCorrect,
        charsIncorrect: r.charsIncorrect,
        durationSeconds: Math.max(1, r.durationSeconds),
        entryId: match.piece?.id ?? null,
        matchId: match.id,
        placement: place,
      }),
    });
    if (res.ok) setSaved(await res.json());
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/typearena/${matchId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (!state.isConnected && !match) {
    return <Centered>{state.isReconnecting ? "Reconnecting to the arena…" : state.error ? `Can't reach the realtime server (${state.error}).` : "Connecting to the arena…"}</Centered>;
  }
  if (state.error && !match && joined === false) {
    const reason = state.error === "not_found" ? "This race doesn't exist anymore."
      : state.error === "already_started" ? "This race has already started."
      : state.error === "full" ? "This race is full." : state.error;
    return <Centered>{reason} <Link className="underline" href="/typearena">Back to TypeArena</Link></Centered>;
  }
  if (!match) return <Centered>Joining race…</Centered>;

  const standings = [...players].sort((a, b) =>
    (a.placement ?? 99) - (b.placement ?? 99) || b.progress - a.progress);

  return (
    <div className="mx-auto w-full max-w-5xl grid gap-6 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Race <span className="font-mono text-primary">{match.id}</span></h1>
        <Button size="sm" variant="outline" onClick={copyInvite}>{copied ? <Check /> : <Copy />} Invite link</Button>
        <span className="ml-auto text-sm text-muted-foreground capitalize">{match.status}</span>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Track</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {standings.map((p) => <TrackRow key={p.id} player={p} isMe={p.id === meId} isHost={p.id === match.hostId} status={match.status} />)}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2 grid gap-4">
          {match.status === "lobby" && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={me?.ready ? "secondary" : "default"}
                onClick={() => actions.setReady(match.id, !me?.ready)}
              >
                <Flag /> {me?.ready ? "Not ready" : "I'm ready"}
              </Button>
              {isHost && (
                <Button variant="outline" onClick={() => actions.start(match.id)}><Play /> Start now</Button>
              )}
              <span className="text-sm text-muted-foreground">
                The race starts when everyone is ready{players.length < 2 ? " — share the invite link to bring friends" : ""}.
              </span>
            </div>
          )}
          {match.status === "countdown" && (
            <div className="text-center text-6xl font-bold text-primary">{countdown ?? "…"}</div>
          )}
          {result ? (
            <TypingResults result={result} xp={saved?.xp} unlocked={saved?.unlocked} placement={placement} saving={!saved}>
              <Link href="/typearena"><Button>Back to TypeArena</Button></Link>
            </TypingResults>
          ) : match.status === "finished" ? (
            <div className="grid gap-3">
              <p className="text-lg">The race is over.</p>
              <Link href="/typearena"><Button>Back to TypeArena</Button></Link>
            </div>
          ) : (
            <TypingTest
              words={words}
              mode="race"
              disabled={match.status !== "running"}
              ghosts={ghosts}
              onProgress={onProgress}
              onFinish={onFinish}
              autoFocus={match.status === "running"}
            />
          )}
          {match.piece?.id && (
            <p className="text-sm text-muted-foreground">
              <Feather className="inline size-4" /> {match.piece.title ? <em>{match.piece.title}</em> : "Untitled piece"} by{" "}
              <span className="font-medium text-foreground">{match.piece.authorName ?? "a writer"}</span>
              {" · "}<Link className="underline" href={`/entries/${match.piece.id}`}>read it</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrackRow({ player, isMe, isHost, status }: { player: TypeArenaParticipant; isMe: boolean; isHost: boolean; status: string }) {
  return (
    <div className={`grid grid-cols-[10rem_1fr_5rem] items-center gap-3 text-sm ${player.connected ? "" : "opacity-50"}`}>
      <div className="flex items-center gap-2 truncate">
        <span className="size-3 shrink-0 rounded-full" style={{ background: player.color }} />
        <span className="truncate">{player.name}{isMe && " (you)"}</span>
        {isHost && <Crown className="size-3 shrink-0 text-amber-500" aria-label="host" />}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${player.progress}%`, background: player.color }} />
      </div>
      <div className="text-right tabular-nums">
        {status === "lobby"
          ? (player.ready ? "ready" : "waiting")
          : player.placement ? `${ordinal(player.placement)} · ${Math.round(player.wpm)}` : `${Math.round(player.wpm)} wpm`}
      </div>
    </div>
  );
}

function useCountdown(countdown?: { at: number; seconds: number }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!countdown) { setLeft(null); return; }
    const startedAt = Date.now();
    const tick = () => setLeft(Math.max(1, Math.ceil(countdown.seconds - (Date.now() - startedAt) / 1000)));
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [countdown]);
  return left;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center gap-1 text-muted-foreground">{children}</div>;
}
