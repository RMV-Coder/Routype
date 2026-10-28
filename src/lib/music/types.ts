/**
 * Concert Hall: pieces, parts and the playable chart built from one part.
 * Times are in seconds unless the name says beats.
 */
export type InstrumentId = "piano" | "violin" | "cello";

export interface Part {
  id: string;
  name: string;
  instrument: InstrumentId;
  /** Shown next to the name, e.g. "melody" or "enters bar 3". */
  role: string;
  /** NOTE[/beats] tokens; chords join with "+", rests are "r", "|" marks a bar and is ignored. */
  notes: string;
}

/** The tempo from `beat` on, in beats per minute. A piece lists at least one, starting at beat 0. */
export interface TempoChange {
  beat: number;
  bpm: number;
}

export type SongGroup = "piano-solo" | "duet" | "orchestra" | "fast";

export interface Song {
  id: string;
  title: string;
  composer: string;
  source: string;
  group: SongGroup;
  /** "Piano solo", "Duet", "Orchestra"… */
  format: string;
  /** The tempo marking printed on the score. */
  marking: string;
  tempo: TempoChange[];
  /** 4 = a beat is a quarter note, 8 = an eighth note. */
  beatUnit: 4 | 8;
  beatsPerBar: number;
  /** Beats before the first bar line (an anacrusis). */
  pickup: number;
  parts: Part[];
}

export type NoteState = "pending" | "hit" | "miss";
export type HitGrade = "perfect" | "great" | "good";

export interface ChartNote {
  id: number;
  t: number;
  dur: number;
  beat: number;
  /** The pitch that sounds. */
  midi: number;
  /** The layout key that plays it (the pitch moved by whole octaves to fit the keyboard). */
  key: number;
  label: string;
  shift: boolean;
  /** Long enough that the key must be held. */
  hold: boolean;
  state: NoteState;
  grade: HitGrade | "miss" | null;
  delta: number;
  hitAt: number;
  heldFrac: number;
  holding: boolean;
}

export interface Chart {
  notes: ChartNote[];
  /** Layout keys used by the part, low to high. */
  keys: number[];
  /** Semitones added to every pitch to reach its key. */
  transpose: number;
  instrument: InstrumentId;
  end: number;
  /** Bar line times, from bar 1 to the end. */
  bars: number[];
  totalBeats: number;
  /** Song time of a beat; beats before 0 continue at the opening tempo (the count-in). */
  timeAt: (beat: number) => number;
}

/** A note as it was (or would be) heard, for the ensemble playback. */
export interface PlayedNote {
  midi: number;
  t: number;
  dur: number;
  vel: number;
  /** Release time after `dur`; shorter when the next note takes over. */
  tail?: number;
}
