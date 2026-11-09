import { KEY_OF, pitchesForBase } from "../keymap";
import { WINDOWS } from "../judge";
import { noteName } from "../notation";
import type { ChartNote } from "../types";
import { box, HUD_HEIGHT, type View } from "./common";

const ROWS = [
  { keys: "1234567890", offset: 0 },
  { keys: "qwertyuiop", offset: 0.5 },
  { keys: "asdfghjkl", offset: 0.8 },
  { keys: "zxcvbnm", offset: 1.3 },
];
/** Seconds an outline takes to close in on its key. */
export const KEYS_APPROACH = 1.3;
const KEY_RADIUS = 8;

function keyGrid(W: number, H: number) {
  const u = Math.max(26, Math.min((W - 32) / 10.6, (H - 150) / 4.4));
  const left = (W - 10.5 * u) / 2;
  const top = HUD_HEIGHT + 6 + Math.max(0, (H - 150 - 4.4 * u) / 2);
  const pos = new Map<string, { x: number; y: number }>();
  ROWS.forEach((row, r) => [...row.keys].forEach((ch, i) => pos.set(ch, { x: left + (row.offset + i) * u, y: top + r * u * 1.08 })));
  return { u, pos, shift: { x: left, y: top + 3 * u * 1.08, w: 1.2 * u - 6 } };
}

/**
 * An on-screen keyboard. Each upcoming note is a copy of its keycap's outline that
 * shrinks onto the key and lines up with the key's edge at the perfect moment.
 */
export const drawKeys: View = (g, W, H, s) => {
  const { chart, T, colors: c, fonts } = s;
  const grid = keyGrid(W, H);
  const used = new Set(chart.keys);
  const size = grid.u - 6;
  g.fillStyle = c.stage;
  g.fillRect(0, 0, W, H);

  let shiftSoon = false;
  const rings: { base: string; ahead: number; shift: boolean }[] = [];
  const flashes = new Map<string, ChartNote>();
  const holds = new Map<string, ChartNote>();
  for (const n of chart.notes) {
    const ahead = n.t - T;
    if (ahead > KEYS_APPROACH) break;
    const base = KEY_OF.get(n.key)?.base;
    if (!base) continue;
    if (n.state === "pending" && ahead > -0.15) {
      rings.push({ base, ahead, shift: n.shift });
      if (n.shift && ahead < 0.8) shiftSoon = true;
    }
    if (n.state === "hit" && T - n.hitAt < 0.3) flashes.set(base, n);
    if (n.holding) holds.set(base, n);
  }

  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const [ch, p] of grid.pos) {
    const pitches = pitchesForBase(ch);
    const white = pitches?.white ?? null;
    const sharp = pitches?.sharp ?? null;
    const inPart = (white != null && used.has(white)) || (sharp != null && used.has(sharp));
    const down = (white != null && s.pressed.has(white)) || (sharp != null && s.pressed.has(sharp));
    const flash = flashes.get(ch);
    g.globalAlpha = inPart ? 1 : 0.35;
    box(g, p.x + 3, p.y + 3, size, size, KEY_RADIUS);
    g.fillStyle = down ? c.accent : flash ? c[flash.grade as "perfect" | "great" | "good"] : c.keycap;
    g.fill();
    g.strokeStyle = c.line;
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = down || flash ? c.accentInk : c.ink;
    g.font = `700 ${Math.round(size * 0.36)}px ${fonts.ui}`;
    g.fillText(ch, p.x + 3 + size / 2, p.y + 3 + size * 0.42);
    if (white != null && size > 34) {
      g.fillStyle = down || flash ? c.accentInk : c.muted;
      g.font = `400 ${Math.round(size * 0.2)}px ${fonts.ui}`;
      g.fillText(noteName(white - chart.transpose), p.x + 3 + size / 2, p.y + 3 + size * 0.78);
    }
    g.globalAlpha = 1;
    const hold = holds.get(ch);
    if (hold) {
      // a long note traces the key's outline while it is held
      const frac = Math.min(1, (T - hold.t) / hold.dur);
      const side = size + 10;
      const radius = KEY_RADIUS + 5;
      const perimeter = 4 * (side - 2 * radius) + 2 * Math.PI * radius;
      g.strokeStyle = c.accent;
      g.lineWidth = 4;
      g.setLineDash([perimeter * frac, perimeter]);
      box(g, p.x - 2, p.y - 2, side, side, radius);
      g.stroke();
      g.setLineDash([]);
    }
  }

  const sh = grid.shift;
  box(g, sh.x + 3, sh.y + 3, sh.w, size, KEY_RADIUS);
  g.fillStyle = shiftSoon ? c.accent : c.keycap;
  g.fill();
  g.strokeStyle = c.line;
  g.stroke();
  g.fillStyle = shiftSoon ? c.accentInk : c.muted;
  g.font = `700 ${Math.round(size * 0.24)}px ${fonts.ui}`;
  g.fillText("shift", sh.x + 3 + sh.w / 2, sh.y + 3 + size / 2);

  for (const r of rings) {
    const p = grid.pos.get(r.base);
    if (!p) continue;
    const frac = Math.max(0, r.ahead) / KEYS_APPROACH;
    const half = size / 2 + frac * grid.u * 0.9;
    const cx = p.x + 3 + size / 2;
    const cy = p.y + 3 + size / 2;
    const onTime = Math.abs(r.ahead) <= WINDOWS.perfect;
    g.globalAlpha = onTime ? 1 : 0.25 + 0.75 * (1 - frac);
    g.strokeStyle = onTime || r.shift ? c.accent : c.ink;
    g.lineWidth = onTime ? 5 : 3;
    g.setLineDash(r.shift && !onTime ? [6, 4] : []);
    box(g, cx - half, cy - half, half * 2, half * 2, KEY_RADIUS * (half / (size / 2)));
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
  }

  const next = chart.notes.filter((n) => n.state === "pending" && n.t >= T - 0.15).slice(0, 10);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = c.muted;
  g.font = `400 13px ${fonts.ui}`;
  g.fillText("next", 16, H - 22);
  g.fillStyle = c.ink;
  g.font = `700 18px ${fonts.ui}`;
  g.fillText(next.map((n) => n.label).join(" "), 62, H - 22);
};
