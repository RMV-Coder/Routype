import { releaseVoice, type Voice } from "./synth";

/** A recorded note: its pitch, and the stretch (in seconds) that repeats while it is held past the end of the recording. */
export type SampleNote = [midi: number, loopStart: number, loopEnd: number];

export interface SampleSet {
  /** Folder under /public with one recording per note, named <midi>.mp3. */
  base: string;
  /** The recorded pitches; any other pitch plays from the nearest one, retuned. */
  notes: SampleNote[];
  /** The recordings are played straight, so vibrato is added on top. */
  vibratoCents: number;
  level: number;
  credit: string;
}

interface Loaded {
  buffer: AudioBuffer;
  /** Silence the decoder left before the note (some browsers keep the MP3 encoder delay). */
  lead: number;
  loop: [number, number];
}

const nearest = (notes: SampleNote[], midi: number) =>
  notes.reduce((a, b) => (Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a));

let decoder: BaseAudioContext | null = null;
/** Decodes without starting the page's AudioContext, which browsers only allow after a click or key press. */
function decode(data: ArrayBuffer): Promise<AudioBuffer> {
  decoder ??= new OfflineAudioContext(1, 1, 44100);
  return decoder.decodeAudioData(data);
}

function leadingSilence(buffer: AudioBuffer): number {
  const d = buffer.getChannelData(0);
  const limit = Math.min(d.length, Math.round(buffer.sampleRate * 0.1));
  for (let i = 0; i < limit; i++) if (Math.abs(d[i]) > 1e-4) return i / buffer.sampleRate;
  return 0;
}

/** Plays an instrument from recordings of single notes, fetched as the pieces need them. */
export class SampledInstrument {
  private readonly set: SampleSet;
  private readonly loaded = new Map<number, Loaded>();
  private readonly fetches = new Map<number, Promise<void>>();
  private failed = false;

  constructor(set: SampleSet) {
    this.set = set;
  }

  /** True once recordings have loaded and none has failed; until then the synth plays. */
  get ready(): boolean {
    return !this.failed && this.loaded.size > 0;
  }

  /** Fetches the recordings nearest to `pitches` (every one when omitted). Resolves false, for good, if any fails. */
  load(pitches?: number[]): Promise<boolean> {
    const notes = pitches ? [...new Set(pitches.map((p) => nearest(this.set.notes, p)))] : this.set.notes;
    return Promise.all(notes.map((n) => this.fetchNote(n))).then(
      () => !this.failed,
      (err) => {
        this.failed = true;
        console.warn("Recorded notes are unavailable; the synthesizer plays instead.", err);
        return false;
      },
    );
  }

  private fetchNote([midi, loopStart, loopEnd]: SampleNote): Promise<void> {
    let pending = this.fetches.get(midi);
    if (!pending) {
      pending = fetch(`${this.set.base}/${midi}.mp3`)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} for ${midi}.mp3`);
          return res.arrayBuffer();
        })
        .then(decode)
        .then((buffer) => {
          this.loaded.set(midi, { buffer, lead: leadingSilence(buffer), loop: [loopStart, loopEnd] });
        });
      this.fetches.set(midi, pending);
    }
    return pending;
  }

  play(ctx: BaseAudioContext, dest: AudioNode, midi: number, t: number, vel: number): Voice {
    let from = -1;
    for (const m of this.loaded.keys()) if (from < 0 || Math.abs(m - midi) < Math.abs(from - midi)) from = m;
    const note = this.loaded.get(from)!;
    const src = ctx.createBufferSource();
    src.buffer = note.buffer;
    src.loop = true;
    src.loopStart = note.lead + note.loop[0];
    src.loopEnd = note.lead + note.loop[1];
    src.detune.value = (midi - from) * 100;
    const vib = ctx.createOscillator();
    const depth = ctx.createGain();
    vib.frequency.value = 5.4;
    depth.gain.setValueAtTime(0, t + 0.15);
    depth.gain.linearRampToValueAtTime(this.set.vibratoCents, t + 0.5);
    vib.connect(depth);
    depth.connect(src.detune);
    const env = ctx.createGain();
    const rel = ctx.createGain();
    // the recording carries the bow's own attack; this only avoids a click
    env.gain.setValueAtTime(0, t);
    env.gain.setTargetAtTime(this.set.level * vel, t, 0.004);
    src.connect(env);
    env.connect(rel);
    rel.connect(dest);
    src.start(t, note.lead);
    vib.start(t);
    return { stop: (when, tail = 0.3) => releaseVoice(rel, [src, vib], Math.max(when, t + 0.03), tail) };
  }
}
