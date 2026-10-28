import { noteName } from "../notation";
import { box, burst, HUD_HEIGHT, noteFill, type View } from "./common";

/** A typing line spaced by time: each key's character rides higher for higher notes. */
export const drawRibbon: View = (g, W, H, s) => {
  const { chart, T, lookahead, colors: c, fonts } = s;
  g.fillStyle = c.stage;
  g.fillRect(0, 0, W, H);
  if (!chart.keys.length) return;
  const caretX = Math.max(64, W * 0.18);
  const baseY = HUD_HEIGHT + (H - HUD_HEIGHT) * 0.48;
  const pps = (W - caretX - 12) / (lookahead * 1.3);
  const mid = chart.keys[Math.floor(chart.keys.length / 2)];
  const lift = (key: number) => Math.max(-72, Math.min(72, (key - mid) * 3.4));

  const lineY = baseY + 92;
  g.strokeStyle = c.line;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, lineY);
  g.lineTo(W, lineY);
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.font = `400 11px ${fonts.ui}`;
  chart.bars.forEach((b, i) => {
    const x = caretX + (b - T) * pps;
    if (x < 0 || x > W) return;
    g.fillStyle = c.muted;
    g.fillRect(x, lineY - 5, 1, 10);
    g.fillText(`bar ${i + 1}`, x, lineY + 18);
  });

  g.fillStyle = c.accent;
  g.globalAlpha = 0.1;
  g.fillRect(caretX - 18, baseY - 110, 36, 200);
  g.globalAlpha = 1;
  g.fillRect(caretX - 1, baseY - 110, 2, 200);

  g.textBaseline = "middle";
  for (const n of chart.notes) {
    const x = caretX + (n.t - T) * pps;
    if (x > W + 30) break;
    const tail = n.hold ? n.dur * pps : 0;
    if (x + tail < -30) continue;
    const y = baseY - lift(n.key);
    const fill = noteFill(c, n);
    if (n.hold) {
      g.globalAlpha = n.holding ? 0.9 : n.state === "miss" ? 0.3 : 0.4;
      g.fillStyle = n.holding ? c.accent : fill;
      const from = n.holding ? caretX : x;
      box(g, from, y + 16, Math.max(0, x + tail - from), 4, 2);
      g.fill();
      g.globalAlpha = 1;
    }
    const ahead = n.t - T;
    const soon = n.state === "pending" && ahead < 0.7;
    g.globalAlpha = n.state === "pending" ? (soon ? 1 : 0.5) : n.state === "hit" && !n.holding ? Math.max(0.35, 1 - (T - n.hitAt)) : 0.9;
    g.fillStyle = fill;
    g.font = `700 ${soon ? 34 : 30}px ${fonts.ui}`;
    g.fillText(n.label, x, y);
    if (n.state === "miss") g.fillRect(x - 10, y, 20, 2);
    if (n.state === "pending" && ahead < lookahead) {
      g.globalAlpha = 0.8;
      g.fillStyle = c.muted;
      g.font = `400 10px ${fonts.ui}`;
      g.fillText(noteName(n.midi), x, y - 26);
    }
    g.globalAlpha = 1;
    burst(g, c, n, T, caretX, y, 20);
  }
};
