import type { InstrumentId, PlayedNote } from "../types";
import type { Voice } from "./synth";

/** What the performer needs from the audio engine (an AudioEngine, or a stand-in in tests). */
export interface Instrumentalist {
  readonly now: number;
  noteOn(instrument: InstrumentId, midi: number, when?: number, velocity?: number): Voice;
}

/** Bowed instruments play one connected line: a new note takes over from the one still sounding. */
const LEGATO = new Set<InstrumentId>(["violin", "cello"]);
const CHORD_GAP = 0.04; // notes closer together than this are a chord, not a handover
const HANDOVER = 0.02;
const HANDOVER_TAIL = 0.22;
const RELEASE_TAIL = 0.35;

interface Sounding {
  voice: Voice;
  startedAt: number;
  minEnd: number;
  stopAt: number;
  played: PlayedNote | null;
}

/**
 * Plays the player's own part. A note that matches the score sounds until its
 * written end even after a quick tap, holding the key keeps it sounding, and on
 * a bowed instrument each new note takes over from the previous one.
 * `played` records what was heard, for the ensemble playback.
 */
export class Performer {
  readonly played: PlayedNote[] = [];
  private readonly held = new Map<string, Sounding>();
  private readonly sounding = new Set<Sounding>();
  private readonly engine: Instrumentalist;
  private readonly instrument: InstrumentId;
  private readonly audioTimeOf: (songTime: number) => number;

  constructor(engine: Instrumentalist, instrument: InstrumentId, audioTimeOf: (songTime: number) => number) {
    this.engine = engine;
    this.instrument = instrument;
    this.audioTimeOf = audioTimeOf;
  }

  /** `writtenEnd` is the song time the matched note is written to end; null for wrong keys and long notes. */
  down(code: string, midi: number, T: number, writtenEnd: number | null, record = true) {
    const now = this.engine.now;
    if (LEGATO.has(this.instrument)) {
      for (const s of this.sounding) if (now - s.startedAt > CHORD_GAP) this.stop(s, now + HANDOVER, HANDOVER_TAIL);
    }
    const s: Sounding = {
      voice: this.engine.noteOn(this.instrument, midi, now, 0.85),
      startedAt: now,
      minEnd: Math.max(now + 0.15, writtenEnd == null ? 0 : this.audioTimeOf(writtenEnd)),
      stopAt: Infinity,
      played: record ? { midi, t: Math.max(0, T), dur: 0.25, vel: 0.85 } : null,
    };
    if (s.played) this.played.push(s.played);
    this.held.set(code, s);
    this.sounding.add(s);
  }

  up(code: string) {
    const s = this.held.get(code);
    if (!s) return;
    this.held.delete(code);
    this.stop(s, Math.max(this.engine.now, s.minEnd), RELEASE_TAIL);
  }

  releaseAll() {
    for (const code of [...this.held.keys()]) this.up(code);
  }

  private stop(s: Sounding, at: number, tail: number) {
    if (at >= s.stopAt) return;
    s.stopAt = at;
    s.voice.stop(at, tail);
    if (s.played) s.played.dur = Math.max(0.06, at - s.startedAt);
    const now = this.engine.now;
    for (const x of this.sounding) if (x.stopAt + 0.5 < now) this.sounding.delete(x);
  }
}

/** The same handover for recorded or stand-in lines: a note ends where the next one begins. */
export function connectLine(notes: PlayedNote[], instrument: InstrumentId): PlayedNote[] {
  if (!LEGATO.has(instrument)) return notes;
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  return sorted.map((n, i) => {
    const next = sorted.slice(i + 1).find((x) => x.t - n.t > CHORD_GAP);
    if (!next || next.t >= n.t + n.dur) return n;
    return { ...n, dur: next.t - n.t + HANDOVER, tail: HANDOVER_TAIL };
  });
}

export interface Track {
  instrument: InstrumentId;
  notes: PlayedNote[];
}

/** Plays recorded or simulated parts together from `startAt` (an AudioContext time), scheduling a little ahead. */
export function playback(engine: Instrumentalist, tracks: Track[], startAt: number): { stop: () => void } {
  const queue = tracks
    .flatMap((tr) => connectLine(tr.notes, tr.instrument).map((n) => ({ ...n, instrument: tr.instrument })))
    .sort((a, b) => a.t - b.t);
  let i = 0;
  const timer = window.setInterval(() => {
    const horizon = engine.now + 0.35;
    while (i < queue.length && startAt + queue[i].t < horizon) {
      const n = queue[i++];
      const at = startAt + n.t;
      engine.noteOn(n.instrument, n.midi, at, n.vel).stop(at + Math.max(0.08, n.dur), n.tail);
    }
    if (i >= queue.length) window.clearInterval(timer);
  }, 60);
  return { stop: () => window.clearInterval(timer) };
}
