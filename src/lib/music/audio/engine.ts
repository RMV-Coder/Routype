import type { InstrumentId } from "../types";
import { SAMPLE_SETS } from "./sample-sets";
import { SampledInstrument } from "./sampler";
import { SYNTH, type Voice } from "./synth";

/**
 * One audio graph per page: instruments -> bus (dry + a hall reverb) -> compressor -> speakers.
 * Instruments with recordings play them once loaded; until then (or if loading fails) the synth plays.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private bus: GainNode | null = null;
  private master: GainNode | null = null;
  private readonly sampled = new Map<InstrumentId, SampledInstrument>();

  ensure(): AudioContext {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const ctx = new AudioContext({ latencyHint: "interactive" });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const bus = ctx.createGain();
    const reverb = ctx.createConvolver();
    reverb.buffer = hall(ctx, 2.6, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.24;
    bus.connect(master);
    bus.connect(reverb);
    reverb.connect(wet);
    wet.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    Object.assign(this, { ctx, bus, master });
    return ctx;
  }

  get now(): number {
    return this.ensure().currentTime;
  }

  /**
   * Loads an instrument's recordings for the given pitches (all of them when omitted).
   * Resolves true once they play, false if it has none or they failed to load.
   */
  load(instrument: InstrumentId, pitches?: number[]): Promise<boolean> {
    const set = SAMPLE_SETS[instrument];
    if (!set) return Promise.resolve(false);
    let s = this.sampled.get(instrument);
    if (!s) {
      s = new SampledInstrument(set);
      this.sampled.set(instrument, s);
    }
    return s.load(pitches);
  }

  noteOn(instrument: InstrumentId, midi: number, when?: number, velocity = 0.8): Voice {
    const ctx = this.ensure();
    const t = Math.max(when ?? ctx.currentTime, ctx.currentTime);
    const recorded = this.sampled.get(instrument);
    if (recorded?.ready) return recorded.play(ctx, this.bus!, midi, t, velocity);
    return SYNTH[instrument](ctx, this.bus!, midi, t, velocity);
  }

  /** Metronome tick; the first beat of a bar is higher. */
  click(when: number, accent: boolean) {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(accent ? 0.16 : 0.09, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(when);
    osc.stop(when + 0.06);
  }

  close() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

/** A decaying noise impulse response: a cheap concert-hall tail. */
function hall(ctx: BaseAudioContext, seconds: number, decay: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
