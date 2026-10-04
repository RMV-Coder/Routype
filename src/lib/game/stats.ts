import type { KeyEvent, MetricPoint, WordRender } from "@/lib/definitions";

export interface TypingStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  charsCorrect: number;
  charsIncorrect: number;
  durationSeconds: number;
}

/** Per-second buckets of typed characters and errors, used by the results chart. */
export function aggregateMetrics(events: KeyEvent[]): MetricPoint[] {
  const map = new Map<number, { chars: number; errors: number }>();
  for (const ev of events) {
    if (ev.kind !== "char") continue;
    const sec = Math.floor(ev.t / 1000);
    const bucket = map.get(sec) ?? { chars: 0, errors: 0 };
    bucket.chars += 1;
    if (ev.correct === false) bucket.errors += 1;
    map.set(sec, bucket);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([second, { chars, errors }]) => ({ second: second + 1, chars, errors, rawWPM: (chars / 5) * 60 }));
}

/** Number of correctly typed characters in the words the player has reached (spaces between words included). */
export function correctChars(words: WordRender[], activeWi: number): number {
  let total = 0;
  for (let wi = 0; wi <= activeWi && wi < words.length; wi++) {
    const w = words[wi];
    total += w.slots.filter((s) => s === "correct").length;
    if (w.committed && w.extras.length === 0 && w.slots.every((s) => s === "correct")) total += 1; // the space
  }
  return total;
}

export function computeStats(words: WordRender[], activeWi: number, events: KeyEvent[], elapsedMs: number): TypingStats {
  const minutes = Math.max(elapsedMs, 1) / 60000;
  const keystrokes = events.filter((e) => e.kind === "char" || e.kind === "space");
  const errors = events.filter((e) => e.kind === "char" && e.correct === false).length;
  const good = correctChars(words, activeWi);
  const metrics = aggregateMetrics(events);
  const samples = metrics.map((m) => m.rawWPM);
  const mean = samples.reduce((a, b) => a + b, 0) / (samples.length || 1);
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length || 1);
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  return {
    wpm: round1(good / 5 / minutes),
    rawWpm: round1(keystrokes.length / 5 / minutes),
    accuracy: keystrokes.length ? round1(((keystrokes.length - errors) / keystrokes.length) * 100) : 100,
    consistency: round1(Math.max(0, 100 - cv * 100)),
    charsCorrect: good,
    charsIncorrect: errors,
    durationSeconds: Math.round(elapsedMs / 1000),
  };
}

/** Index of the caret in `words.join(" ")`, used to broadcast ghost carets. */
export function globalCaretIndex(words: WordRender[], activeWi: number): number {
  let index = 0;
  for (let wi = 0; wi < activeWi && wi < words.length; wi++) index += words[wi].expected.length + 1;
  const w = words[activeWi];
  return w ? index + Math.min(w.caretIndex, w.expected.length) : index;
}

/** Inverse of `globalCaretIndex`: maps a global index back to (word, char). */
export function locateIndex(words: { expected: string }[], index: number): { wi: number; ci: number } {
  let remaining = Math.max(0, index);
  for (let wi = 0; wi < words.length; wi++) {
    const len = words[wi].expected.length;
    if (remaining <= len) return { wi, ci: remaining };
    remaining -= len + 1;
  }
  const last = words.length - 1;
  return { wi: Math.max(0, last), ci: last >= 0 ? words[last].expected.length : 0 };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
