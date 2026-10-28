import type { Chart, ChartNote } from "../types";

/** Stage colours, read from the CSS variables on the stage element so the views follow the theme. */
export interface StageColors {
  stage: string;
  lane: string;
  laneSharp: string;
  keycap: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  perfect: string;
  great: string;
  good: string;
  miss: string;
  /** One colour per part in the ensemble playback. */
  parts: string[];
}

export interface StageFonts {
  ui: string;
  /** A font with the clef and sharp glyphs. */
  music: string;
}

/** Everything a view draws from: one chart at song time T, so switching views mid-song works. */
export interface Stage {
  chart: Chart;
  /** Song time in seconds (negative during the count-in). */
  T: number;
  /** Seconds of music shown ahead of the play line. */
  lookahead: number;
  /** Layout keys held down. */
  pressed: ReadonlySet<number>;
  colors: StageColors;
  fonts: StageFonts;
}

export type View = (g: CanvasRenderingContext2D, W: number, H: number, s: Stage) => void;

/** Height of the score bar laid over the top of the stage; views keep their notes below it. */
export const HUD_HEIGHT = 64;

export function readStageColors(el: Element): StageColors {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    stage: v("--ch-stage"), lane: v("--ch-lane"), laneSharp: v("--ch-lane-sharp"), keycap: v("--ch-keycap"),
    ink: v("--ch-ink"), muted: v("--ch-muted"), line: v("--ch-line"), accent: v("--ch-accent"), accentInk: v("--ch-accent-ink"),
    perfect: v("--ch-perfect"), great: v("--ch-great"), good: v("--ch-good"), miss: v("--ch-miss"),
    parts: [v("--ch-p1"), v("--ch-p2"), v("--ch-p3"), v("--ch-p4")],
  };
}

export function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}

export function noteFill(c: StageColors, n: ChartNote): string {
  if (n.state === "miss") return c.miss;
  if (n.state === "hit") return n.holding ? c.accent : c[n.grade as "perfect" | "great" | "good"];
  return c.ink;
}

/** Expanding ring where a note was hit. */
export function burst(g: CanvasRenderingContext2D, c: StageColors, n: ChartNote, T: number, x: number, y: number, size: number) {
  const age = T - n.hitAt;
  if (n.state !== "hit" || age < 0 || age > 0.3) return;
  g.save();
  g.globalAlpha = 1 - age / 0.3;
  g.strokeStyle = c[n.grade as "perfect" | "great" | "good"];
  g.lineWidth = 3;
  g.beginPath();
  g.arc(x, y, size * (0.6 + age * 3), 0, Math.PI * 2);
  g.stroke();
  g.restore();
}
