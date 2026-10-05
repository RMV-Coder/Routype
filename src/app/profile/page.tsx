"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PeopleYouMayKnow } from "@/components/social/people-you-may-know";
import { ordinal } from "@/components/typing/typing-results";

type Profile = {
  id: number; name: string | null; email: string; image: string | null; bio: string | null; is_private: boolean; xp: number;
  creation_time: string; level: { level: number; current: number; next: number };
};
type Stats = { tests: number; best_wpm: number | null; avg_wpm_last10: number | null; pieces: number; achievements: number };
type Result = { id: number; mode: string; mode_value: number | null; wpm: number; accuracy: number; placement: number | null; created_at: string };
type Best = { mode: string; mode_value: number | null; wpm: number; tests: number; avg_accuracy: number };

const modeLabel = (mode: string, value: number | null) =>
  mode === "time" ? `time ${value}s` : mode === "words" ? `${value} words` : mode === "sudden-death" ? `sudden death ${value}` : mode;

export default function ProfilePage() {
  const [data, setData] = useState<{ profile: Profile; stats: Stats } | null>(null);
  const [scores, setScores] = useState<{ recent: Result[]; bests: Best[] } | null>(null);

  useEffect(() => {
    fetch("/api/profile").then(async (r) => r.ok && setData(await r.json()));
    fetch("/api/typing/scores").then(async (r) => r.ok && setScores(await r.json()));
  }, []);

  if (!data) return <Skeleton className="mx-auto h-48 w-full max-w-5xl" />;
  const { profile, stats } = data;
  const { level, current, next } = profile.level;

  return (
    <div className="mx-auto w-full max-w-5xl grid gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6">
          <Avatar className="size-24">
            {profile.image && <AvatarImage src={profile.image} alt="" />}
            <AvatarFallback className="text-3xl">{(profile.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 gap-2 min-w-60">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.name ?? "Unnamed writer"}</h1>
              {profile.is_private && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> private profile</span>}
            </div>
            <p className="text-muted-foreground">{profile.bio || "No bio yet."}</p>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-primary">Level {level}</span>
              <Progress value={((profile.xp - current) / (next - current)) * 100} className="max-w-56" />
              <span className="text-muted-foreground">{profile.xp} / {next} xp</span>
            </div>
          </div>
          <Link href="/settings"><Button variant="outline"><Settings /> Edit profile</Button></Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {([
          ["Tests", stats.tests],
          ["Best WPM", stats.best_wpm != null ? Math.round(stats.best_wpm) : "—"],
          ["Avg WPM (last 10)", stats.avg_wpm_last10 != null ? Math.round(stats.avg_wpm_last10) : "—"],
          ["Pieces published", stats.pieces],
          ["Achievements", stats.achievements],
        ] as const).map(([label, value]) => (
          <Card key={label} className="p-4 gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-2xl font-bold">{value}</span>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal bests</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {scores?.bests.length === 0 && <p className="text-muted-foreground">No results yet. <Link className="underline" href="/typearena">Take a test</Link>.</p>}
            {scores?.bests.map((b) => (
              <div key={`${b.mode}-${b.mode_value}`} className="flex justify-between">
                <span>{modeLabel(b.mode, b.mode_value)}</span>
                <span className="tabular-nums"><b>{Math.round(b.wpm)}</b> wpm · {b.tests} tests · {Math.round(b.avg_accuracy)}% avg acc</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent results</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {scores?.recent.length === 0 && <p className="text-muted-foreground">Nothing yet.</p>}
            {scores?.recent.slice(0, 10).map((r) => (
              <div key={r.id} className="flex justify-between">
                <span>{modeLabel(r.mode, r.mode_value)}{r.placement ? ` · ${ordinal(r.placement)}` : ""}</span>
                <span className="tabular-nums text-muted-foreground">
                  <b className="text-foreground">{Math.round(r.wpm)}</b> wpm · {Math.round(r.accuracy)}% · {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <PeopleYouMayKnow />
    </div>
  );
}
