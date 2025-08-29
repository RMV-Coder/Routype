"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTypeArena } from "@/hooks/use-typearena";

export default function TypeArenaLobbyPage() {
    const [state, actions] = useTypeArena();
    const [text, setText] = useState("");
    const [matchIdInput, setMatchIdInput] = useState("");

    const matchId = state.match?.id;

    const handleCreate = async () => {
        await actions.create(text || undefined);
    };
    const handleJoin = async () => {
        if (!matchIdInput.trim()) return;
        await actions.join(matchIdInput.trim());
    };

    return (
        <div className="mx-auto max-w-2xl p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>TypeArena Lobby</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Custom text (optional)</label>
                        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Leave blank for default" />
                        <Button onClick={handleCreate}>Create Match</Button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Join by Match ID</label>
                        <div className="flex gap-2">
                            <Input value={matchIdInput} onChange={(e) => setMatchIdInput(e.target.value)} placeholder="match id" />
                            <Button variant="secondary" onClick={handleJoin}>Join</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {state.match && (
                <Card>
                    <CardHeader>
                        <CardTitle>Match: {state.match.id}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-sm text-muted-foreground">Status: {state.match.status}</div>
                        <div className="space-y-1">
                            <div className="font-medium">Players</div>
                            {Object.values(state.match.participants).map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-sm">
                                    <span>{p.name || p.id}</span>
                                    <span>{p.ready ? "Ready" : "Not ready"}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => actions.setReady(state.match!.id, true)}>Ready</Button>
                            <Button variant="secondary" onClick={() => actions.setReady(state.match!.id, false)}>Unready</Button>
                            <Button variant="outline" onClick={() => actions.leave(state.match!.id)}>Leave</Button>
                            <Link href={`/typearena/${state.match.id}`} className="ml-auto">
                                <Button variant="default">Go to Game</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


