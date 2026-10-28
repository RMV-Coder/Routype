import type { View } from "./common";
import { drawFalling } from "./falling";
import { drawKeys, KEYS_APPROACH } from "./keys";
import { drawRibbon } from "./ribbon";
import { drawSheet } from "./sheet";

export type ViewId = "falling" | "sheet" | "ribbon" | "keys";

export const VIEWS: { id: ViewId; label: string; draw: View; lookahead: number }[] = [
  { id: "falling", label: "Falling", draw: drawFalling, lookahead: 1.8 },
  { id: "sheet", label: "Sheet", draw: drawSheet, lookahead: 3.2 },
  { id: "ribbon", label: "Ribbon", draw: drawRibbon, lookahead: 2.4 },
  { id: "keys", label: "Keys", draw: drawKeys, lookahead: KEYS_APPROACH },
];

export const isViewId = (v: unknown): v is ViewId => VIEWS.some((x) => x.id === v);

export { HUD_HEIGHT, readStageColors, type Stage, type StageColors, type StageFonts } from "./common";
export { drawRoll, type RollTrack } from "./roll";
