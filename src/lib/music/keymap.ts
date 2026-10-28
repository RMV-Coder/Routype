/**
 * The Concert Hall key layout (the Virtual Piano convention): the 36 white keys
 * from C2 to C7 run in keyboard reading order 1..0, q..p, a..l, z..m, and
 * Shift + key plays the sharp above. `t` is middle C.
 */
export const WHITE_KEYS = "1234567890qwertyuiopasdfghjklzxcvbnm";
export const LOWEST = 36; // C2
export const HIGHEST = 96; // C7

const SHIFTED_DIGIT: Record<string, string> = { 1: "!", 2: "@", 4: "$", 5: "%", 6: "^", 8: "*", 9: "(" };
const STEP = [0, 2, 4, 5, 7, 9, 11];
const HAS_SHARP = [true, true, false, true, true, true, false];

export interface LayoutKey {
  /** The character on the key. */
  base: string;
  shift: boolean;
  /** What the player reads: the letter, its capital, or the shifted symbol. */
  label: string;
}

/** midi -> layout key */
export const KEY_OF = new Map<number, LayoutKey>();
const MIDI_OF = new Map<string, number>();

[...WHITE_KEYS].forEach((base, i) => {
  const midi = LOWEST + 12 * Math.floor(i / 7) + STEP[i % 7];
  KEY_OF.set(midi, { base, shift: false, label: base });
  MIDI_OF.set(`${base}:0`, midi);
  if (HAS_SHARP[i % 7] && midi < HIGHEST) {
    KEY_OF.set(midi + 1, { base, shift: true, label: /\d/.test(base) ? SHIFTED_DIGIT[base] : base.toUpperCase() });
    MIDI_OF.set(`${base}:1`, midi + 1);
  }
});

/** The character a physical key (KeyboardEvent.code) carries in the layout, or null. */
export function baseForCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return null;
}

/** Physical key + Shift -> the pitch it plays. Shift on a key without a sharp plays the white key. */
export function midiForKey(code: string, shift: boolean): number | null {
  const base = baseForCode(code);
  if (base == null || !WHITE_KEYS.includes(base)) return null;
  return MIDI_OF.get(`${base}:${shift ? 1 : 0}`) ?? MIDI_OF.get(`${base}:0`) ?? null;
}

/** The white-key and sharp pitches a character plays (the sharp is null where there is none). */
export function pitchesForBase(base: string): { white: number; sharp: number | null } | null {
  const white = MIDI_OF.get(`${base}:0`);
  if (white == null) return null;
  return { white, sharp: MIDI_OF.get(`${base}:1`) ?? null };
}

/** Whole-octave shift that fits pitches into the layout's range (0 when they already fit). */
export function fitTranspose(pitches: number[]): number {
  if (!pitches.length) return 0;
  const lo = Math.min(...pitches);
  const hi = Math.max(...pitches);
  let shift = 0;
  while (lo + shift < LOWEST) shift += 12;
  while (hi + shift > HIGHEST && lo + shift - 12 >= LOWEST) shift -= 12;
  return shift;
}
