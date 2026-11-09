const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** "C#4" -> 61. Middle C (C4) is 60. */
export function toMidi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note "${name}"`);
  return 12 * (Number(m[3]) + 1) + LETTER[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

/** 61 -> "C#4". */
export function noteName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export interface ParsedNote {
  beat: number;
  beats: number;
  midi: number;
}

/** Parses a part's NOTE[/beats] tokens into notes timed in beats. */
export function parsePart(src: string): { notes: ParsedNote[]; beats: number } {
  const notes: ParsedNote[] = [];
  let beat = 0;
  for (const token of src.split(/\s+/)) {
    if (!token || token === "|") continue;
    const [pitch, durText] = token.split("/");
    const beats = durText ? parseFloat(durText) : 1;
    if (!(beats > 0)) throw new Error(`Bad duration in "${token}"`);
    if (pitch !== "r") for (const p of pitch.split("+")) notes.push({ beat, beats, midi: toMidi(p) });
    beat += beats;
  }
  return { notes, beats: beat };
}
