import type { InstrumentId } from "../types";

/** A sounding note; stop() releases it (calling again with an earlier time moves the release earlier). */
export interface Voice {
  stop(when: number, tail?: number): void;
}

export type VoiceFactory = (ctx: BaseAudioContext, dest: AudioNode, midi: number, t: number, vel: number) => Voice;

export const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Envelope + release stage shared by every voice. */
function shell(ctx: BaseAudioContext, dest: AudioNode) {
  const env = ctx.createGain();
  const rel = ctx.createGain();
  env.gain.value = 0;
  env.connect(rel);
  rel.connect(dest);
  return { env, rel };
}

export function releaseVoice(rel: GainNode, sources: AudioScheduledSourceNode[], when: number, tail: number) {
  rel.gain.cancelScheduledValues(when);
  rel.gain.setValueAtTime(1, when);
  rel.gain.setTargetAtTime(0, when, tail / 5);
  for (const s of sources) {
    try { s.stop(when + tail + 0.1); } catch { /* already stopped */ }
  }
}

const piano: VoiceFactory = (ctx, dest, midi, t, vel) => {
  const f = freq(midi);
  const { env, rel } = shell(ctx, dest);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  const ring = clamp(3.4 * Math.pow(0.62, Math.log2(f / 130)), 0.5, 4.5);
  lp.frequency.setValueAtTime(clamp(f * 16, 1200, 14000), t);
  lp.frequency.exponentialRampToValueAtTime(clamp(f * 3, 500, 6000), t + ring * 0.5);
  lp.connect(env);
  const oscs: OscillatorNode[] = [];
  const partials: [number, number, OscillatorType][] = [[1, 1, "triangle"], [2, 0.42, "sine"], [3, 0.2, "sine"], [4, 0.11, "sine"], [6, 0.04, "sine"]];
  for (const [n, amp, type] of partials) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f * n * Math.sqrt(1 + 0.00035 * n * n);
    g.gain.setValueAtTime(amp, t);
    g.gain.setTargetAtTime(0, t, ring / (2 + n));
    o.connect(g);
    g.connect(lp);
    o.start(t);
    o.stop(t + ring * 1.4);
    oscs.push(o);
  }
  const peak = 0.34 * vel * clamp(260 / f, 0.45, 1.25);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.004);
  env.gain.setTargetAtTime(peak * 0.25, t + 0.004, ring / 3);
  return { stop: (when, tail = 0.3) => releaseVoice(rel, oscs, Math.max(when, t + 0.03), tail) };
};

interface BowedPreset {
  cutoff: number;
  attack: number;
  noise: number;
  /** Vibrato depth as a fraction of the pitch. */
  vibrato: number;
  level: number;
  /** The wooden body's resonances: [Hz, gain dB, Q]. */
  body: [number, number, number][];
}

/** The violin was tuned against a recording of a real violin (one oscillator, an 80 ms swell, bow hiss, body resonances). */
export const BOWED: Record<"violin" | "cello", BowedPreset> = {
  violin: {
    cutoff: 7500, attack: 0.12, noise: 0.028, vibrato: 0.0065, level: 0.07,
    body: [[280, 3, 2.5], [480, 2, 2.5], [680, -5, 2], [1000, 9, 2], [1650, 5, 2.5], [2300, 14, 2.5], [3800, -4, 1]],
  },
  cello: {
    cutoff: 4000, attack: 0.1, noise: 0.03, vibrato: 0.006, level: 0.13,
    body: [[110, 4, 2.5], [220, 3, 2.5], [600, 4, 1.6], [1500, 6, 1.1]],
  },
};

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuffer(ctx: BaseAudioContext) {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

function bowed(o: BowedPreset): VoiceFactory {
  return (ctx, dest, midi, t, vel) => {
    const f = freq(midi);
    const { env, rel } = shell(ctx, dest);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.7;
    const cutoff = clamp(f * 16, 1500, o.cutoff);
    lp.frequency.setValueAtTime(cutoff * 0.3, t);
    lp.frequency.setTargetAtTime(cutoff, t, o.attack / 2); // the tone brightens as the bow grips
    const body = o.body.map(([hz, db, q]) => {
      const pk = ctx.createBiquadFilter();
      pk.type = "peaking";
      pk.frequency.value = hz;
      pk.gain.value = db;
      pk.Q.value = q;
      return pk;
    });
    lp.connect(body[0]);
    body.reduce((a, b) => (a.connect(b), b)).connect(env);

    // one string, so one sawtooth: a detuned pair beats and makes the tone pulse
    const saw = ctx.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.value = f;
    saw.connect(lp);
    const vib = ctx.createOscillator();
    const depth = ctx.createGain();
    vib.frequency.value = 5.4;
    depth.gain.setValueAtTime(0, t + 0.12);
    depth.gain.linearRampToValueAtTime(f * o.vibrato, t + 0.5);
    vib.connect(depth);
    depth.connect(saw.frequency);

    // bow hiss: a scratch as the bow bites, then a quiet steady hiss through the same body
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;
    const hiss = ctx.createBiquadFilter();
    hiss.type = "bandpass";
    hiss.frequency.value = 3000;
    hiss.Q.value = 0.7;
    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0, t);
    hissGain.gain.linearRampToValueAtTime(o.noise * 3, t + 0.015);
    hissGain.gain.setTargetAtTime(o.noise, t + 0.015, 0.04);
    noise.connect(hiss);
    hiss.connect(hissGain);
    hissGain.connect(body[0]);

    saw.start(t);
    vib.start(t);
    noise.start(t, Math.random() * 1.5);
    const peak = o.level * vel;
    env.gain.setValueAtTime(0, t);
    env.gain.setTargetAtTime(peak, t, o.attack / 3); // a swell with no spike
    return { stop: (when, tail = 0.35) => releaseVoice(rel, [saw, vib, noise], Math.max(when, t + 0.03), tail) };
  };
}

export const SYNTH: Record<InstrumentId, VoiceFactory> = {
  piano,
  violin: bowed(BOWED.violin),
  cello: bowed(BOWED.cello),
};
