import { KEY_OF } from "../keymap";
import { noteName } from "../notation";
import { box, burst, HUD_HEIGHT, noteFill, type View } from "./common";

/** One lane per key the part uses; notes fall onto the keycaps. */
export const drawFalling: View = (g, W, H, s) => {
  const { chart, T, lookahead, colors: c, fonts } = s;
  const keys = chart.keys;
  g.fillStyle = c.stage;
  g.fillRect(0, 0, W, H);
  if (!keys.length) return;
  const laneW = W / keys.length;
  const capH = 56;
  const hitY = H - capH - 10;
  const pps = (hitY - HUD_HEIGHT) / lookahead;
  const lane = new Map(keys.map((k, i) => [k, i]));

  keys.forEach((k, i) => {
    g.fillStyle = KEY_OF.get(k)?.shift ? c.laneSharp : c.lane;
    g.fillRect(i * laneW + 1, 0, laneW - 2, hitY);
  });
  g.strokeStyle = c.line;
  g.lineWidth = 1;
  for (const b of chart.bars) {
    const y = hitY - (b - T) * pps;
    if (y < 0 || y > hitY) continue;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }

  g.textAlign = "center";
  g.textBaseline = "middle";
  const headH = 18;
  for (const n of chart.notes) {
    if (n.t - T > lookahead) break;
    if (n.t + (n.hold ? n.dur : 0) < T - 0.4) continue;
    const x = lane.get(n.key)! * laneW + 3;
    const w = laneW - 6;
    const y = hitY - (n.t - T) * pps;
    if (n.hold && !(n.state === "hit" && !n.holding)) {
      const yEnd = hitY - (n.t + n.dur - T) * pps;
      const yStart = n.holding ? hitY : y;
      g.globalAlpha = n.state === "miss" ? 0.3 : n.holding ? 0.9 : 0.35;
      g.fillStyle = n.holding ? c.accent : noteFill(c, n);
      box(g, x + w * 0.32, yEnd, w * 0.36, Math.max(0, yStart - yEnd), 3);
      g.fill();
      g.globalAlpha = 1;
    }
    burst(g, c, n, T, x + w / 2, hitY, Math.min(laneW * 0.45, 22));
    if (n.state === "hit") continue;
    g.globalAlpha = n.state === "miss" ? Math.max(0, 1 - (T - n.t) * 2) : 1;
    g.fillStyle = noteFill(c, n);
    box(g, x, y - headH, w, headH, 4);
    g.fill();
    if (laneW >= 18) {
      g.fillStyle = c.stage;
      g.font = `700 ${Math.min(15, laneW * 0.5)}px ${fonts.ui}`;
      g.fillText(n.label, x + w / 2, y - headH / 2 + 1);
    }
    g.globalAlpha = 1;
  }

  g.fillStyle = c.accent;
  g.fillRect(0, hitY - 1, W, 3);
  keys.forEach((k, i) => {
    const x = i * laneW + 3;
    const w = laneW - 6;
    const down = s.pressed.has(k);
    box(g, x, hitY + 8, w, capH - 6, 6);
    g.fillStyle = down ? c.accent : c.keycap;
    g.fill();
    g.strokeStyle = c.line;
    g.stroke();
    g.fillStyle = down ? c.accentInk : c.ink;
    g.font = `700 ${Math.min(18, laneW * 0.55)}px ${fonts.ui}`;
    g.fillText(KEY_OF.get(k)?.label ?? "?", x + w / 2, hitY + 26);
    if (laneW >= 30) {
      g.fillStyle = down ? c.accentInk : c.muted;
      g.font = `400 10px ${fonts.ui}`;
      g.fillText(noteName(k - chart.transpose), x + w / 2, hitY + 44);
    }
  });
};
