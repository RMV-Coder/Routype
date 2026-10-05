import type { PieceKind } from "@/lib/definitions";

/**
 * TypeArena game modes.
 * - time:         type as many words as you can before the clock runs out
 * - words:        type a fixed number of words as fast as you can
 * - piece:        type a piece written by the community (poems, haiku, riddles, ...)
 * - sudden-death: one mistake and the run is over
 * - zen:          free typing with no target, no clock and no score
 * - race:         multiplayer race on a shared text with ghost carets (see /typearena/[matchId])
 */
export type GameModeId = "time" | "words" | "piece" | "sudden-death" | "zen" | "race";

export interface GameModeInfo {
  id: GameModeId;
  label: string;
  description: string;
  /** Selectable values (seconds for `time`, word count for the others). */
  values?: number[];
  defaultValue?: number;
  /** Whether results are saved and ranked on the leaderboard. */
  ranked: boolean;
}

export const GAME_MODES: Record<Exclude<GameModeId, "race">, GameModeInfo> = {
  time: {
    id: "time",
    label: "Time",
    description: "Type as many words as you can before the clock runs out.",
    values: [15, 30, 60, 120],
    defaultValue: 30,
    ranked: true,
  },
  words: {
    id: "words",
    label: "Words",
    description: "Type a fixed number of words as fast as you can.",
    values: [10, 25, 50, 100],
    defaultValue: 25,
    ranked: true,
  },
  piece: {
    id: "piece",
    label: "Pieces",
    description: "Type a poem, story or riddle shared by another writer.",
    ranked: true,
  },
  "sudden-death": {
    id: "sudden-death",
    label: "Sudden death",
    description: "One mistake and the run is over.",
    values: [25, 50, 100],
    defaultValue: 50,
    ranked: true,
  },
  zen: {
    id: "zen",
    label: "Zen",
    description: "Free typing. No target, no clock, no score. Press Shift+Enter to finish.",
    ranked: false,
  },
};

export const RANKED_MODES: { mode: GameModeId; value: number | null; label: string }[] = [
  { mode: "time", value: 15, label: "Time 15s" },
  { mode: "time", value: 30, label: "Time 30s" },
  { mode: "time", value: 60, label: "Time 60s" },
  { mode: "time", value: 120, label: "Time 120s" },
  { mode: "words", value: 10, label: "10 words" },
  { mode: "words", value: 25, label: "25 words" },
  { mode: "words", value: 50, label: "50 words" },
  { mode: "words", value: 100, label: "100 words" },
  { mode: "sudden-death", value: 50, label: "Sudden death 50" },
  { mode: "piece", value: null, label: "Pieces" },
  { mode: "race", value: null, label: "Races" },
];

export type PieceFilter = PieceKind | "any";

export function isGameMode(value: unknown): value is GameModeId {
  return typeof value === "string" && ["time", "words", "piece", "sudden-death", "zen", "race"].includes(value);
}
