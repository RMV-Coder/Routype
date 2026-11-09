import { fitTranspose, KEY_OF } from "./keymap";
import { parsePart } from "./notation";
import type { Chart, ChartNote, Part, PlayedNote, Song, TempoChange } from "./types";

/** Notes at least this long must be held. */
export const HOLD_MIN_SECONDS = 0.9;

/** Song time of a beat under a tempo map, played at `speed` (1 = as written). */
export function tempoClock(tempo: TempoChange[], speed: number): (beat: number) => number {
  const changes = [...tempo].sort((a, b) => a.beat - b.beat);
  const spb = (i: number) => 60 / changes[i].bpm / speed;
  const startsAt: number[] = [0];
  for (let i = 1; i < changes.length; i++) startsAt.push(startsAt[i - 1] + (changes[i].beat - changes[i - 1].beat) * spb(i - 1));
  return (beat) => {
    let i = changes.length - 1;
    while (i > 0 && changes[i].beat > beat) i--;
    return startsAt[i] + (beat - changes[i].beat) * spb(i);
  };
}

/** Turns one part into a timed chart: one entry per key press, at the chosen speed. */
export function buildChart(song: Song, part: Part, speed: number): Chart {
  const { notes, beats } = parsePart(part.notes);
  const timeAt = tempoClock(song.tempo, speed);
  const transpose = fitTranspose(notes.map((n) => n.midi));
  const chart: ChartNote[] = notes
    .map((n, i) => {
      const key = n.midi + transpose;
      const k = KEY_OF.get(key);
      const t = timeAt(n.beat);
      const dur = timeAt(n.beat + n.beats) - t;
      return {
        id: i, t, dur, beat: n.beat, midi: n.midi, key,
        label: k ? k.label : "?", shift: k ? k.shift : false, hold: dur >= HOLD_MIN_SECONDS,
        state: "pending" as const, grade: null, delta: 0, hitAt: 0, heldFrac: 0, holding: false,
      };
    })
    .sort((a, b) => a.t - b.t || a.key - b.key);
  const bars: number[] = [];
  for (let b = song.pickup; b <= beats + 1e-6; b += song.beatsPerBar) bars.push(timeAt(b));
  return {
    notes: chart,
    keys: [...new Set(chart.map((n) => n.key))].sort((a, b) => a - b),
    transpose,
    instrument: part.instrument,
    end: timeAt(beats),
    bars,
    totalBeats: beats,
    timeAt,
  };
}

/** A stand-in bandmate: plays the chart with small human timing errors and the odd dropped note. */
export function simulatePart(chart: Chart, seed = 7): PlayedNote[] {
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const jitter = () => (rand() + rand() + rand() - 1.5) * 0.03;
  return chart.notes
    .filter(() => rand() > 0.02)
    .map((n) => ({ midi: n.midi, t: Math.max(0, n.t + jitter()), dur: n.dur * 0.92, vel: 0.65 + rand() * 0.25 }));
}

/** A flawless take of the chart, as the player's own instrument would sound it. */
export function perfectTake(chart: Chart): PlayedNote[] {
  return chart.notes.map((n) => ({ midi: n.midi, t: n.t, dur: n.dur, vel: 0.85 }));
}
