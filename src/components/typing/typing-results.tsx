"use client";

import Link from "next/link";
import { Trophy, Sparkles } from "lucide-react";
import { TypingMetricsLineChart } from "./typing-metrics-chart";
import type { TypingResult } from "./typing-test";

export interface UnlockedAchievement {
  code: string;
  name: string;
  description: string;
  xp: number;
}

export function TypingResults({
  result,
  xp,
  unlocked = [],
  placement,
  saving,
  children,
}: {
  result: TypingResult;
  xp?: number | null;
  unlocked?: UnlockedAchievement[];
  placement?: number | null;
  saving?: boolean;
  children?: React.ReactNode;
}) {
  const stats: [string, string][] = [
    ["raw", `${Math.round(result.rawWpm)}`],
    ["consistency", `${Math.round(result.consistency)}%`],
    ["characters", `${result.charsCorrect}/${result.charsIncorrect}`],
    ["time", `${result.durationSeconds}s`],
  ];
  return (
    <div className="grid gap-6">
      {result.failed && (
        <p className="text-destructive font-medium">Sudden death! One mistake ended the run.</p>
      )}
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        {placement != null && (
          <Stat label="place" value={ordinal(placement)} big />
        )}
        <Stat label="wpm" value={`${Math.round(result.wpm)}`} big />
        <Stat label="acc" value={`${Math.round(result.accuracy)}%`} big />
        {stats.map(([label, value]) => <Stat key={label} label={label} value={value} />)}
        <Stat label="xp" value={saving ? "…" : xp != null ? `+${xp}` : "—"} />
      </div>
      {result.metrics.length > 1 && <TypingMetricsLineChart data={result.metrics} />}
      {unlocked.length > 0 && (
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-amber-500" /> Achievements unlocked
          </div>
          <div className="flex flex-wrap gap-2">
            {unlocked.map((a) => (
              <Link
                key={a.code}
                href="/achievements"
                className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
                title={a.description}
              >
                <Trophy className="size-4 text-amber-500" />
                <span>{a.name}</span>
                <span className="text-xs text-muted-foreground">+{a.xp} xp</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="grid">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={big ? "text-5xl font-bold text-primary leading-none" : "text-xl font-semibold"}>{value}</span>
    </div>
  );
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
