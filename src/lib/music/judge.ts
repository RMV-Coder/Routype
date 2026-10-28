import type { Chart, ChartNote, HitGrade } from "./types";

/** Timing windows in seconds either side of a note. */
export const WINDOWS = { perfect: 0.045, great: 0.09, good: 0.14 } as const;
const POINTS: Record<HitGrade, number> = { perfect: 100, great: 70, good: 40 };
const WEIGHT: Record<HitGrade, number> = { perfect: 1, great: 0.75, good: 0.5 };
const HOLD_POINTS = 60;

export interface JudgeStats {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  /** Keys pressed with no note to play. */
  stray: number;
  combo: number;
  maxCombo: number;
  score: number;
  holds: number;
  holdsKept: number;
}

export type LetterGrade = "S" | "A" | "B" | "C" | "D";

/** Scores one player's part as it is played. */
export class Judge {
  readonly stats: JudgeStats = { perfect: 0, great: 0, good: 0, miss: 0, stray: 0, combo: 0, maxCombo: 0, score: 0, holds: 0, holdsKept: 0 };
  private readonly active = new Map<number, ChartNote>();
  private readonly chart: Chart;
  private cursor = 0;

  constructor(chart: Chart) {
    this.chart = chart;
  }

  /** A key went down at song time T. Returns the note it played, or null for a stray key. */
  press(key: number, T: number): ChartNote | null {
    const notes = this.chart.notes;
    while (this.cursor < notes.length && notes[this.cursor].state !== "pending" && notes[this.cursor].t < T - 1) this.cursor++;
    let best: ChartNote | null = null;
    for (let i = this.cursor; i < notes.length; i++) {
      const n = notes[i];
      if (n.t - T > WINDOWS.good) break;
      if (n.state !== "pending" || n.key !== key || Math.abs(n.t - T) > WINDOWS.good) continue;
      if (!best || Math.abs(n.t - T) < Math.abs(best.t - T)) best = n;
    }
    const s = this.stats;
    if (!best) {
      s.stray += 1;
      s.combo = 0;
      return null;
    }
    const delta = T - best.t;
    const a = Math.abs(delta);
    const grade: HitGrade = a <= WINDOWS.perfect ? "perfect" : a <= WINDOWS.great ? "great" : "good";
    Object.assign(best, { state: "hit", grade, delta, hitAt: T });
    s[grade] += 1;
    s.score += Math.round(POINTS[grade] * (1 + Math.min(s.combo, 100) / 100));
    s.combo += 1;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    if (best.hold) {
      best.holding = true;
      s.holds += 1;
      this.active.set(key, best);
    }
    return best;
  }

  /** A key came up: scores how much of a long note was held. */
  release(key: number, T: number) {
    const n = this.active.get(key);
    if (!n) return;
    this.active.delete(key);
    this.finishHold(n, T >= n.t + n.dur - 0.12 ? 1 : (T - n.t) / n.dur);
  }

  /** Advances time: notes past their window become misses, finished holds are completed. */
  update(T: number): ChartNote[] {
    const missed: ChartNote[] = [];
    for (let i = this.cursor; i < this.chart.notes.length; i++) {
      const n = this.chart.notes[i];
      if (n.t > T) break;
      if (n.state === "pending" && T - n.t > WINDOWS.good) {
        Object.assign(n, { state: "miss", grade: "miss" });
        this.stats.miss += 1;
        this.stats.combo = 0;
        missed.push(n);
      }
    }
    for (const [key, n] of this.active) {
      if (T >= n.t + n.dur) {
        this.active.delete(key);
        this.finishHold(n, 1);
      }
    }
    return missed;
  }

  accuracy(): number {
    return accuracyOf(this.stats);
  }

  grade(): LetterGrade {
    return letterGrade(this.accuracy());
  }

  private finishHold(n: ChartNote, frac: number) {
    n.holding = false;
    n.heldFrac = Math.max(0, Math.min(1, frac));
    this.stats.score += Math.round(HOLD_POINTS * n.heldFrac);
    if (n.heldFrac >= 1) this.stats.holdsKept += 1;
  }
}

/** Timing accuracy in percent: a perfect counts fully, a great 75%, a good 50%, a miss nothing. */
export function accuracyOf(s: Pick<JudgeStats, "perfect" | "great" | "good" | "miss">): number {
  const judged = s.perfect + s.great + s.good + s.miss;
  if (!judged) return 100;
  return (100 * (s.perfect * WEIGHT.perfect + s.great * WEIGHT.great + s.good * WEIGHT.good)) / judged;
}

/** The best score a chart allows: every note perfect on an unbroken combo and every long note held. */
export function maxScore(chart: Chart): number {
  return chart.notes.reduce(
    (sum, n, i) => sum + Math.round(POINTS.perfect * (1 + Math.min(i, 100) / 100)) + (n.hold ? HOLD_POINTS : 0),
    0,
  );
}

export function letterGrade(accuracy: number): LetterGrade {
  return accuracy >= 95 ? "S" : accuracy >= 90 ? "A" : accuracy >= 80 ? "B" : accuracy >= 70 ? "C" : "D";
}

/** XP for a finished performance: notes played well, scaled by speed. */
export function xpForPerformance(hits: number, accuracy: number, speedPercent: number): number {
  return Math.max(1, Math.round(hits * (accuracy / 100) * 0.5 * (speedPercent / 100)));
}
