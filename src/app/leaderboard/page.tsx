"use client";

import { useEffect, useState } from "react";
import { Medal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RANKED_MODES } from "@/lib/game/modes";
import { levelForXp } from "@/lib/game/achievements";
import { cn } from "@/lib/utils";

type Row = { rank: number; user_id: number; name: string | null; image: string | null; xp: number; wpm: number; accuracy: number; created_at: string; isMe: boolean };
const PERIODS = [["daily", "Today"], ["weekly", "This week"], ["monthly", "This month"], ["all", "All time"]] as const;

export default function LeaderboardPage() {
  const [board, setBoard] = useState(1); // index into RANKED_MODES (Time 30s)
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>("weekly");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const { mode, value } = RANKED_MODES[board];
    const params = new URLSearchParams({ mode, period });
    if (value) params.set("value", String(value));
    setRows(null);
    fetch(`/api/leaderboard?${params}`).then(async (res) => setRows(res.ok ? (await res.json()).items : []));
  }, [board, period]);

  return (
    <div className="mx-auto w-full max-w-4xl grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboards</h1>
        <p className="text-sm text-muted-foreground">Best result per writer. Private profiles are not listed.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {RANKED_MODES.map((m, i) => (
          <Pill key={m.label} active={board === i} onClick={() => setBoard(i)}>{m.label}</Pill>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {PERIODS.map(([p, label]) => <Pill key={p} active={period === p} onClick={() => setPeriod(p)}>{label}</Pill>)}
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 w-12">#</th>
                <th className="px-4 py-2">Writer</th>
                <th className="px-4 py-2 text-right">WPM</th>
                <th className="px-4 py-2 text-right">Accuracy</th>
                <th className="px-4 py-2 text-right hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No results yet. Go set the first record!</td></tr>}
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
                      <span>{r.name ?? `Writer #${r.user_id}`}{r.isMe && " (you)"}</span>
                      <span className="text-xs text-muted-foreground">lv {levelForXp(r.xp).level}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold">{Math.round(r.wpm)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{Math.round(r.accuracy)}%</td>
                  <td className="px-4 py-2 text-right text-muted-foreground hidden sm:table-cell">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
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
