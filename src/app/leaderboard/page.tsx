"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Medal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RANKED_MODES } from "@/lib/game/modes";
import { levelForXp } from "@/lib/game/achievements";
import { letterGrade } from "@/lib/music/judge";
import { getSong, SONG_GROUPS, SONGS } from "@/lib/music/songs";
import { cn } from "@/lib/utils";

type Row = { rank: number; user_id: string; name: string | null; image: string | null; xp: number; accuracy: number; created_at: string; isMe: boolean };
type TypingRow = Row & { wpm: number };
type MusicRow = Row & { score: number; max_combo: number };
const PERIODS = [["daily", "Today"], ["weekly", "This week"], ["monthly", "This month"], ["all", "All time"]] as const;
const SPEEDS = [50, 75, 100] as const;

export default function LeaderboardPage() {
  return (
    <Suspense>
      <Leaderboards />
    </Suspense>
  );
}

function Leaderboards() {
  const params = useSearchParams();
  const linkedSong = getSong(params.get("song") ?? "");
  const [board, setBoard] = useState<"typing" | "concert-hall">(params.get("board") === "concert-hall" ? "concert-hall" : "typing");
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>("weekly");
  return (
    <div className="mx-auto w-full max-w-4xl grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboards</h1>
        <p className="text-sm text-muted-foreground">Best result per writer. Private profiles are not listed.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Pill active={board === "typing"} onClick={() => setBoard("typing")}>TypeArena</Pill>
        <Pill active={board === "concert-hall"} onClick={() => setBoard("concert-hall")}>Concert Hall</Pill>
      </div>
      {board === "typing" ? (
        <TypingBoard period={period} periods={<Periods period={period} onChange={setPeriod} />} />
      ) : (
        <MusicBoard
          period={period}
          periods={<Periods period={period} onChange={setPeriod} />}
          initialSong={linkedSong?.id}
          initialPart={linkedSong?.parts.find((p) => p.id === params.get("part"))?.id}
          initialSpeed={SPEEDS.find((s) => s === Number(params.get("speed")))}
        />
      )}
    </div>
  );
}

function TypingBoard({ period, periods }: { period: string; periods: React.ReactNode }) {
  const [board, setBoard] = useState(1); // index into RANKED_MODES (Time 30s)
  const [rows, setRows] = useState<TypingRow[] | null>(null);

  useEffect(() => {
    const { mode, value } = RANKED_MODES[board];
    const params = new URLSearchParams({ mode, period });
    if (value) params.set("value", String(value));
    setRows(null);
    fetch(`/api/leaderboard?${params}`).then(async (res) => setRows(res.ok ? (await res.json()).items : []));
  }, [board, period]);

  return (
    <>
      <div className="flex flex-wrap gap-2 text-sm">
        {RANKED_MODES.map((m, i) => (
          <Pill key={m.label} active={board === i} onClick={() => setBoard(i)}>{m.label}</Pill>
        ))}
      </div>
      {periods}
      <Board rows={rows} who="Writer" columns={[["WPM", (r) => Math.round(r.wpm)], ["Accuracy", (r) => `${Math.round(r.accuracy)}%`]]} />
    </>
  );
}

function MusicBoard({ period, periods, initialSong, initialPart, initialSpeed }: {
  period: string;
  periods: React.ReactNode;
  initialSong?: string;
  initialPart?: string;
  initialSpeed?: number;
}) {
  const [songId, setSongId] = useState(initialSong ?? SONGS[0].id);
  const song = getSong(songId) ?? SONGS[0];
  const [partId, setPartId] = useState(initialPart ?? song.parts[0].id);
  const [speed, setSpeed] = useState(initialSpeed ?? 100);
  const [rows, setRows] = useState<MusicRow[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ song: songId, part: partId, speed: String(speed), period });
    setRows(null);
    fetch(`/api/music/leaderboard?${params}`).then(async (res) => setRows(res.ok ? (await res.json()).items : []));
  }, [songId, partId, speed, period]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          aria-label="Piece"
          className="rounded-md border bg-background px-2 py-1"
          value={songId}
          onChange={(e) => { setSongId(e.target.value); setPartId(getSong(e.target.value)!.parts[0].id); }}
        >
          {SONG_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {SONGS.filter((s) => s.group === group.id).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </optgroup>
          ))}
        </select>
        {song.parts.length > 1 && (
          <select aria-label="Part" className="rounded-md border bg-background px-2 py-1" value={partId} onChange={(e) => setPartId(e.target.value)}>
            {song.parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <span className="mx-1 h-5 w-px bg-border" />
        {SPEEDS.map((s) => <Pill key={s} active={speed === s} onClick={() => setSpeed(s)}>{s}%</Pill>)}
      </div>
      {periods}
      <Board
        rows={rows}
        who="Player"
        columns={[
          ["Score", (r) => r.score.toLocaleString()],
          ["Accuracy", (r) => `${r.accuracy.toFixed(1)}%`],
          ["Grade", (r) => letterGrade(r.accuracy)],
        ]}
      />
    </>
  );
}

function Periods({ period, onChange }: { period: string; onChange: (p: (typeof PERIODS)[number][0]) => void }) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {PERIODS.map(([p, label]) => <Pill key={p} active={period === p} onClick={() => onChange(p)}>{label}</Pill>)}
    </div>
  );
}

function Board<R extends Row>({ rows, who, columns }: { rows: R[] | null; who: string; columns: [string, (r: R) => React.ReactNode][] }) {
  const span = columns.length + 3;
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2 w-12">#</th>
              <th className="px-4 py-2">{who}</th>
              {columns.map(([label]) => <th key={label} className="px-4 py-2 text-right">{label}</th>)}
              <th className="px-4 py-2 text-right hidden sm:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={span} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={span} className="px-4 py-6 text-center text-muted-foreground">No results yet. Go set the first record!</td></tr>}
            {rows?.map((r) => (
              <tr key={r.user_id} className={cn("border-b last:border-0", r.isMe && "bg-primary/5 font-medium")}>
                <td className="px-4 py-2">
                  {r.rank <= 3 ? <Medal className={cn("size-5", ["text-amber-500", "text-slate-400", "text-orange-700"][r.rank - 1])} /> : r.rank}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      {r.image && <AvatarImage src={r.image} alt="" />}
                      <AvatarFallback>{(r.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{r.name ?? "Anonymous writer"}{r.isMe && " (you)"}</span>
                    <span className="text-xs text-muted-foreground">lv {levelForXp(r.xp).level}</span>
                  </div>
                </td>
                {columns.map(([label, value], i) => (
                  <td key={label} className={cn("px-4 py-2 text-right tabular-nums", i === 0 && "font-semibold")}>{value(r)}</td>
                ))}
                <td className="px-4 py-2 text-right text-muted-foreground hidden sm:table-cell">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1", active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  );
}
