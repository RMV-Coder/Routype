"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useTypeArena } from "@/hooks/use-typearena";
import { TypeArenaStats } from "@/components/custom/typearena-stats";

export default function TypeArenaGamePage() {
    const params = useParams<{ matchId: string }>();
    const router = useRouter();
    const [state, actions] = useTypeArena();
    const [input, setInput] = useState("");
    const [caretIndex, setCaretIndex] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    const matchId = params.matchId;

    useEffect(() => {
        if (!matchId) return;
        actions.join(matchId);
        return () => {
            actions.leave(matchId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchId]);

    const target = state.match?.text ?? "";

    useEffect(() => {
        if (!state.match || state.match.status !== "running") return;
        const idx = input.length;
        setCaretIndex(idx);
        actions.sendCaret(state.match.id, idx);
        const correctUntil = longestCorrectPrefix(input, target);
        const progress = Math.round((correctUntil / Math.max(1, target.length)) * 100);
        actions.sendProgress(state.match.id, progress);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input]);

    const ghostCarets = useMemo(() => {
        const caret = state.match?.caret || {};
        const selfId = state.match ? Object.keys(state.match.participants).find((id) => id === id) : undefined;
        return Object.entries(caret);
    }, [state.match?.caret, state.match?.participants]);

    const everyone = Object.values(state.match?.participants || {});

    return (
        <div className="mx-auto max-w-3xl p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Match {matchId}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">Status: {state.match?.status}</div>
                    {state.countdown && (
                        <div className="text-sm">Starting in {state.countdown.seconds}s…</div>
                    )}
                    {state.ended && (
                        <div className="space-y-3">
                            <div className="text-sm">Winner: {state.ended.winnerId || "—"}</div>
                            {state.match && <TypeArenaStats match={state.match} />}
                        </div>
                    )}
                    <div className="border rounded p-4">
                        <div className="font-mono whitespace-pre-wrap select-none text-sm text-muted-foreground">
                            {target}
                        </div>
                        <div className="relative mt-2">
                            <Textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={state.match?.status !== "running"}
                                className="font-mono"
                                rows={6}
                            />
                            {/* Ghost caret indicators */}
                            {ghostCarets.map(([userId, pos]) => (
                                <div key={userId} className="text-xs text-muted-foreground mt-2">
                                    {userId}: caret at {pos.index}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {state.match?.status === "lobby" && (
                            <Button onClick={() => actions.setReady(matchId, true)}>Ready</Button>
                        )}
                        {state.match?.status === "finished" && (
                            <Button variant="secondary" onClick={() => router.push("/typearena")}>Back to Lobby</Button>
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="font-medium">Players</div>
                        {everyone.map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-sm">
                                <span>{p.name || p.id}</span>
                                <span>{p.progress}%</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function longestCorrectPrefix(input: string, target: string): number {
    let i = 0;
    const n = Math.min(input.length, target.length);
    while (i < n && input[i] === target[i]) i++;
    return i;
}


