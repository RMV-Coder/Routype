import type { Chart } from "../types";
import { box, burst, HUD_HEIGHT, noteFill, type View } from "./common";

// Staff positions count diatonic steps from C-1, so lines and spaces are every other step.
const LETTER_OF_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const SHARP_PC = [false, true, false, true, false, false, true, false, true, false, true, false];
const staffStep = (midi: number) => (Math.floor(midi / 12) - 1) * 7 + LETTER_OF_PC[midi % 12];
const TREBLE = [30, 32, 34, 36, 38]; // E4 G4 B4 D5 F5
const BASS = [18, 20, 22, 24, 26]; // G2 B2 D3 F3 A3
const MIDDLE_C = 28;

interface SheetLayout {
  staves: number[][];
  gap: number;
  y: (step: number) => number;
}

/** Treble, bass or both, depending on the part's range; scaled to the stage height. */
function sheetLayout(chart: Chart, H: number): SheetLayout {
  const pitches = chart.notes.map((n) => n.midi);
  const lo = Math.min(...pitches);
  const hi = Math.max(...pitches);
  const staves = lo < 55 && hi > 64 ? [TREBLE, BASS] : lo >= 55 ? [TREBLE] : [BASS];
  const center = staves.length === 2 ? MIDDLE_C : staves[0][2];
  const gap = Math.max(8, Math.min(staves.length === 2 ? 15 : 18, (H - 130) / (staves.length === 2 ? 15 : 10)));
  const midY = HUD_HEIGHT + (H - HUD_HEIGHT) / 2;
  return { staves, gap, y: (step) => midY - (step - center) * (gap / 2) };
}

let cached: { chart: Chart; H: number; layout: SheetLayout } | null = null;

/** A scrolling staff: noteheads carry their keys and slide left onto the play line. */
export const drawSheet: View = (g, W, H, s) => {
  const { chart, T, lookahead, colors: c, fonts } = s;
  g.fillStyle = c.stage;
  g.fillRect(0, 0, W, H);
  if (!chart.notes.length) return;
  if (!cached || cached.chart !== chart || cached.H !== H) cached = { chart, H, layout: sheetLayout(chart, H) };
  const { gap, y, staves } = cached.layout;
  const x0 = Math.max(96, W * 0.2);
  const pps = (W - x0 - 16) / lookahead;
  const top = y(staves[0][4]);
  const bottom = y(staves[staves.length - 1][0]);

  g.strokeStyle = c.muted;
  g.lineWidth = 1;
  for (const staff of staves) {
    for (const step of staff) {
      g.beginPath();
      g.moveTo(8, y(step));
      g.lineTo(W - 8, y(step));
      g.stroke();
    }
  }
  g.fillStyle = c.ink;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.font = `${gap * 4.2}px ${fonts.music}`;
  for (const staff of staves) {
    if (staff === TREBLE) g.fillText("\u{1D11E}", 12, y(30) + gap * 0.9);
    else g.fillText("\u{1D122}", 12, y(24) + gap * 1.05);
  }

  g.textAlign = "center";
  g.font = `400 11px ${fonts.ui}`;
  chart.bars.forEach((b, i) => {
    const x = x0 + (b - T) * pps;
    if (x < 70 || x > W - 8) return;
    g.strokeStyle = c.muted;
    g.beginPath();
    g.moveTo(x, top);
    g.lineTo(x, bottom);
    g.stroke();
    g.fillStyle = c.muted;
    g.fillText(String(i + 1), x, top - 10);
  });

  g.fillStyle = c.accent;
  g.globalAlpha = 0.12;
  g.fillRect(x0 - 14, top - 24, 28, bottom - top + 48);
  g.globalAlpha = 1;
  g.fillRect(x0 - 1, top - 24, 2, bottom - top + 48);

  const rx = gap * 0.68;
  const ry = gap * 0.5;
  for (const n of chart.notes) {
    const x = x0 + (n.t - T) * pps;
    if (x > W + 20) break;
    if (x + (n.hold ? n.dur * pps : 0) < 60) continue;
    const step = staffStep(n.midi);
    const ny = y(step);
    g.strokeStyle = c.muted;
    for (const ls of ledgerSteps(step, staves)) {
      g.beginPath();
      g.moveTo(x - rx * 1.6, y(ls));
      g.lineTo(x + rx * 1.6, y(ls));
      g.stroke();
    }
    const fill = noteFill(c, n);
    if (n.hold) {
      g.globalAlpha = n.holding ? 0.55 : 0.22;
      g.fillStyle = fill;
      box(g, x, ny - ry * 0.55, n.dur * pps, ry * 1.1, ry * 0.5);
      g.fill();
      g.globalAlpha = 1;
    }
    g.globalAlpha = n.state === "hit" && !n.holding ? Math.max(0.25, 1 - (T - n.hitAt) * 1.5) : 1;
    g.fillStyle = fill;
    g.beginPath();
    g.ellipse(x, ny, rx, ry, -0.32, 0, Math.PI * 2);
    g.fill();
    if (SHARP_PC[n.midi % 12]) {
      g.font = `${gap * 1.5}px ${fonts.music}`;
      g.fillText("♯", x - rx - gap * 0.55, ny + gap * 0.45);
    }
    g.fillStyle = c.stage;
    g.font = `700 ${Math.max(9, gap * 0.82)}px ${fonts.ui}`;
    g.textBaseline = "middle";
    g.fillText(n.label, x, ny + 1);
    g.textBaseline = "alphabetic";
    g.globalAlpha = 1;
    burst(g, c, n, T, x0, ny, gap);
  }
};

/** Ledger lines a note needs: above the top staff, below the bottom one, and middle C between staves. */
function ledgerSteps(step: number, staves: number[][]): number[] {
  const out: number[] = [];
  const topLine = staves[0][4];
  const bottomLine = staves[staves.length - 1][0];
  for (let s = topLine + 2; s <= step; s += 2) out.push(s);
  for (let s = bottomLine - 2; s >= step; s -= 2) out.push(s);
  if (staves.length === 2 && step === MIDDLE_C) out.push(MIDDLE_C);
  return out;
}
