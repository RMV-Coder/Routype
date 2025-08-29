"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { TypeArenaMatch } from "@/hooks/use-typearena";

export function TypeArenaStats({ match }: { match: TypeArenaMatch }) {
    const rows = useMemo(() => {
        return Object.values(match.participants).map((p) => ({
            id: p.id,
            name: p.name || p.id,
            wpm: Math.round(p.wpm || 0),
            accuracy: Math.round(p.accuracy || 0),
            progress: Math.round(p.progress || 0),
            finishedAt: p.finishedAt || null,
        }));
    }, [match.participants]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-sm mb-3">Match: {match.id}</div>
                <div className="space-y-2">
                    {rows.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-sm">
                            <div className="flex-1">{r.name}</div>
                            <div className="w-24 text-right">WPM: {r.wpm}</div>
                            <div className="w-28 text-right">Accuracy: {r.accuracy}%</div>
                            <div className="w-24 text-right">Done: {r.progress}%</div>
                        </div>
                    ))}
                </div>
                <Separator className="my-3" />
                <div className="text-sm">Winner: {match.winnerId || "—"}</div>
            </CardContent>
        </Card>
    );
}


