/**
 * Achievement catalogue. Unlocks are stored in `user_achievement`; the definitions
 * (names, descriptions, XP rewards and unlock rules) live here so they can evolve
 * without migrations.
 */
export type AchievementCategory = "typing" | "racing" | "writing";

export interface ProgressSnapshot {
  // the result that was just submitted (absent when evaluating after publishing)
  last?: {
    mode: string;
    modeValue: number | null;
    wpm: number;
    accuracy: number;
    charsCorrect: number;
    placement: number | null;
  };
  testsCompleted: number;
  racesCompleted: number;
  racesWon: number;
  piecesTyped: number;     // community pieces this user typed
  piecesPublished: number;
  poemsPublished: number;
  piecesShared: number;    // published pieces allowed in TypeArena
  timesTypedByOthers: number;
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  xp: number;
  unlocked: (p: ProgressSnapshot) => boolean;
}

const fast = (wpm: number) => (p: ProgressSnapshot) =>
  !!p.last && p.last.mode !== "zen" && p.last.wpm >= wpm && p.last.accuracy >= 85;

export const ACHIEVEMENTS: Achievement[] = [
  // typing
  { code: "first_steps", name: "First Steps", description: "Complete your first typing test.", category: "typing", xp: 25, unlocked: (p) => p.testsCompleted >= 1 },
  { code: "warming_up", name: "Warming Up", description: "Complete 10 typing tests.", category: "typing", xp: 50, unlocked: (p) => p.testsCompleted >= 10 },
  { code: "dedicated", name: "Dedicated", description: "Complete 100 typing tests.", category: "typing", xp: 250, unlocked: (p) => p.testsCompleted >= 100 },
  { code: "speed_40", name: "Steady Hands", description: "Reach 40 WPM with at least 85% accuracy.", category: "typing", xp: 25, unlocked: fast(40) },
  { code: "speed_60", name: "Quick Quill", description: "Reach 60 WPM with at least 85% accuracy.", category: "typing", xp: 50, unlocked: fast(60) },
  { code: "speed_80", name: "Swift Scribe", description: "Reach 80 WPM with at least 85% accuracy.", category: "typing", xp: 100, unlocked: fast(80) },
  { code: "speed_100", name: "Lightning Letters", description: "Reach 100 WPM with at least 85% accuracy.", category: "typing", xp: 200, unlocked: fast(100) },
  { code: "speed_120", name: "Keyboard Virtuoso", description: "Reach 120 WPM with at least 85% accuracy.", category: "typing", xp: 400, unlocked: fast(120) },
  { code: "perfectionist", name: "Perfectionist", description: "Finish a test of 100+ characters with 100% accuracy.", category: "typing", xp: 100, unlocked: (p) => !!p.last && p.last.accuracy >= 100 && p.last.charsCorrect >= 100 },
  { code: "marathon", name: "Marathon", description: "Complete a 120-second time test.", category: "typing", xp: 50, unlocked: (p) => !!p.last && p.last.mode === "time" && (p.last.modeValue ?? 0) >= 120 },
  { code: "survivor", name: "Survivor", description: "Finish a sudden death run of 50+ words without a single mistake.", category: "typing", xp: 150, unlocked: (p) => !!p.last && p.last.mode === "sudden-death" && (p.last.modeValue ?? 0) >= 50 && p.last.accuracy >= 100 },
  { code: "bookworm", name: "Bookworm", description: "Type a piece written by another writer.", category: "typing", xp: 25, unlocked: (p) => p.piecesTyped >= 1 },
  { code: "anthologist", name: "Anthologist", description: "Type 25 community pieces.", category: "typing", xp: 150, unlocked: (p) => p.piecesTyped >= 25 },
  // racing
  { code: "first_race", name: "Off the Line", description: "Finish your first multiplayer race.", category: "racing", xp: 50, unlocked: (p) => p.racesCompleted >= 1 },
  { code: "champion", name: "Champion", description: "Win a multiplayer race.", category: "racing", xp: 100, unlocked: (p) => p.racesWon >= 1 },
  { code: "unstoppable", name: "Unstoppable", description: "Win 10 multiplayer races.", category: "racing", xp: 300, unlocked: (p) => p.racesWon >= 10 },
  { code: "social_racer", name: "Social Racer", description: "Finish 25 multiplayer races.", category: "racing", xp: 150, unlocked: (p) => p.racesCompleted >= 25 },
  // writing
  { code: "first_ink", name: "First Ink", description: "Publish your first piece.", category: "writing", xp: 50, unlocked: (p) => p.piecesPublished >= 1 },
  { code: "prolific", name: "Prolific", description: "Publish 25 pieces.", category: "writing", xp: 250, unlocked: (p) => p.piecesPublished >= 25 },
  { code: "poet", name: "Poet", description: "Publish 5 poems.", category: "writing", xp: 100, unlocked: (p) => p.poemsPublished >= 5 },
  { code: "generous_muse", name: "Generous Muse", description: "Allow one of your published pieces to be used in TypeArena.", category: "writing", xp: 50, unlocked: (p) => p.piecesShared >= 1 },
  { code: "echo", name: "Echo", description: "Another writer typed one of your pieces.", category: "writing", xp: 75, unlocked: (p) => p.timesTypedByOthers >= 1 },
  { code: "chorus", name: "Chorus", description: "Your pieces were typed 50 times by other writers.", category: "writing", xp: 300, unlocked: (p) => p.timesTypedByOthers >= 50 },
];

export const ACHIEVEMENTS_BY_CODE = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));

/** XP for a single typing result. Zen sessions do not award XP. */
export function xpForResult(mode: string, wpm: number, accuracy: number, durationSeconds: number, placement: number | null): number {
  if (mode === "zen") return 0;
  const base = wpm * (accuracy / 100) * (Math.min(Math.max(durationSeconds, 10), 180) / 60) * 2;
  const podium = placement === 1 ? 50 : placement === 2 ? 25 : placement === 3 ? 10 : 0;
  return Math.max(1, Math.round(base)) + podium;
}

export function levelForXp(xp: number): { level: number; current: number; next: number } {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  return { level, current: 100 * (level - 1) ** 2, next: 100 * level ** 2 };
}
