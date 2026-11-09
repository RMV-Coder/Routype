import type { StageColors } from "./common";

export interface RollTrack {
  color: string;
  notes: { midi: number; t: number; dur: number }[];
}

/** The ensemble as a piano roll, one colour per part; `t` is the playback position in seconds. */
export function drawRoll(g: CanvasRenderingContext2D, W: number, H: number, c: StageColors, tracks: RollTrack[], t: number, total: number) {
  g.fillStyle = c.lane;
  g.fillRect(0, 0, W, H);
  const all = tracks.flatMap((tr) => tr.notes);
  if (!all.length) return;
  const lo = Math.min(...all.map((e) => e.midi)) - 2;
  const hi = Math.max(...all.map((e) => e.midi)) + 2;
  const rowH = Math.max(2, (H - 16) / (hi - lo + 1));
  const px = (W - 16) / Math.max(1, total);
  for (const tr of tracks) {
    g.fillStyle = tr.color;
    for (const e of tr.notes) {
      g.globalAlpha = e.t <= t ? 1 : 0.4;
      g.fillRect(8 + e.t * px, 8 + (hi - e.midi) * rowH, Math.max(2, e.dur * px - 1), Math.max(2, rowH - 1));
    }
  }
  g.globalAlpha = 1;
  if (t > 0) {
    g.fillStyle = c.accent;
    g.fillRect(8 + t * px, 0, 2, H);
  }
}
