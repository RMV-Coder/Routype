import { AudioEngine } from "./audio/engine";
import { Performer } from "./audio/performer";
import { buildChart } from "./chart";
import { Judge, type JudgeStats, type LetterGrade } from "./judge";
import { midiForKey } from "./keymap";
import type { Chart, HitGrade, Part, PlayedNote, Song } from "./types";
import { readStageColors, VIEWS, type StageColors, type StageFonts, type ViewId } from "./views";

export type Phase = "idle" | "playing" | "done";
type Flash = HitGrade | "miss" | "stray";

/** The stage's canvas and the score bar laid over it; the session writes to them every frame. */
export interface SessionElements {
  canvas: HTMLCanvasElement;
  /** Holds the stage colours as CSS variables. */
  theme: HTMLElement;
  score: HTMLElement;
  combo: HTMLElement;
  accuracy: HTMLElement;
  bar: HTMLElement;
  progress: HTMLElement;
  judgment: HTMLElement;
}

export interface Setup {
  song: Song;
  part: Part;
  /** 0.5, 0.75 or 1. */
  speed: number;
  view: ViewId;
  metronome: boolean;
}

export interface Take {
  setup: Setup;
  chart: Chart;
  stats: JudgeStats;
  accuracy: number;
  grade: LetterGrade;
  /** The player's own take, as it sounded. */
  played: PlayedNote[];
}

const LABEL: Record<Flash, string> = { perfect: "Perfect", great: "Great", good: "Good", miss: "Miss", stray: "Wrong key" };
const MIN_COUNT_IN = 1.6;

/**
 * One practice run of one part: the count-in and metronome, the keyboard, the judge,
 * the player's instrument and the stage drawing. The page owns the controls around it.
 */
export class ConcertSession {
  readonly audio = new AudioEngine();
  phase: Phase = "idle";
  private readonly el: SessionElements;
  private readonly fonts: StageFonts;
  private readonly onChange: (phase: Phase, take?: Take) => void;
  // set by setup(), which the constructor calls
  private setupNow!: Setup;
  private chart!: Chart;
  private judge!: Judge;
  private performer!: Performer;
  private t0 = 0;
  private nextClickBeat = 0;
  private raf = 0;
  private flashTimer = 0;
  private colors: StageColors | null = null;
  private colorsAt = 0;
  private readonly pressed = new Set<number>();
  private readonly codeKey = new Map<string, number>();

  constructor(el: SessionElements, fonts: StageFonts, setup: Setup, onChange: (phase: Phase, take?: Take) => void) {
    this.el = el;
    this.fonts = fonts;
    this.onChange = onChange;
    this.setup(setup);
  }

  /** Builds the chart for a piece, part and speed and shows its first notes on their way in. */
  setup(setup: Setup) {
    this.halt();
    this.setupNow = setup;
    this.chart = buildChart(setup.song, setup.part, setup.speed);
    this.judge = new Judge(this.chart);
    this.performer = new Performer(this.audio, this.chart.instrument, (songT) => this.t0 + songT);
    this.el.judgment.replaceChildren();
    this.updateHud(null);
    this.setPhase("idle");
    this.redraw();
  }

  setView(view: ViewId) {
    this.setupNow = { ...this.setupNow, view };
    this.redraw();
  }

  setMetronome(metronome: boolean) {
    this.setupNow = { ...this.setupNow, metronome };
  }

  /** Starts after a count-in: the bar before bar 1 (two when one is too short), at the opening tempo. */
  start() {
    if (this.phase === "playing") return;
    if (this.phase === "done") this.setup(this.setupNow);
    this.audio.ensure();
    const { song } = this.setupNow;
    let countIn = song.pickup - song.beatsPerBar;
    while (-this.chart.timeAt(countIn) < MIN_COUNT_IN) countIn -= song.beatsPerBar;
    this.t0 = this.audio.now - this.chart.timeAt(countIn) + 0.12;
    this.nextClickBeat = countIn;
    this.setPhase("playing");
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    if (this.phase === "playing") this.setup(this.setupNow);
  }

  /** Plays a key. Returns true when the key is the game's (its default action is then prevented). */
  keydown(e: KeyboardEvent): boolean {
    if (this.phase !== "playing" || e.ctrlKey || e.metaKey || e.altKey) return false;
    const key = midiForKey(e.code, e.shiftKey);
    if (key == null) return false;
    e.preventDefault();
    if (e.repeat || this.codeKey.has(e.code)) return true;
    const T = this.audio.now - this.t0;
    const sound = key - this.chart.transpose;
    this.codeKey.set(e.code, key);
    this.pressed.add(key);
    if (T < -0.3) {
      this.performer.down(e.code, sound, T, null, false); // warming up during the count-in
      return true;
    }
    const n = this.judge.press(key, T);
    this.performer.down(e.code, sound, T, n && !n.hold ? n.t + n.dur : null);
    this.flash(n ? (n.grade as HitGrade) : "stray", n ? n.delta : null);
    return true;
  }

  keyup(e: KeyboardEvent) {
    const key = this.codeKey.get(e.code);
    if (key != null) this.release(e.code, key);
  }

  releaseAll() {
    for (const [code, key] of [...this.codeKey]) this.release(code, key);
  }

  /** Redraws the still frame shown when not playing (after a resize or a view change). */
  redraw() {
    if (this.phase === "playing") return;
    this.colors = null;
    this.draw(this.phase === "done" ? this.chart.end : (this.chart.notes[0]?.t ?? 0) - 0.5);
  }

  dispose() {
    this.halt();
    window.clearTimeout(this.flashTimer);
    this.audio.close();
  }

  private halt() {
    cancelAnimationFrame(this.raf);
    this.releaseAll();
  }

  private setPhase(phase: Phase, take?: Take) {
    this.phase = phase;
    this.onChange(phase, take);
  }

  private release(code: string, key: number) {
    const T = this.audio.ctx ? this.audio.now - this.t0 : 0;
    this.codeKey.delete(code);
    this.pressed.delete(key);
    this.performer.up(code);
    this.judge.release(key, T);
  }

  private readonly frame = () => {
    if (this.phase !== "playing") return;
    const T = this.audio.now - this.t0;
    this.scheduleClicks(T);
    if (this.judge.update(T).length) this.flash("miss", null);
    this.draw(T);
    this.updateHud(T);
    if (T > this.chart.end + 0.8) return this.finish();
    this.raf = requestAnimationFrame(this.frame);
  };

  private scheduleClicks(T: number) {
    const { song, metronome } = this.setupNow;
    const { timeAt, totalBeats } = this.chart;
    while (timeAt(this.nextClickBeat) < T + 0.2 && this.nextClickBeat < totalBeats - 1e-6) {
      const beat = this.nextClickBeat;
      if (metronome || beat < 0) {
        const inBar = (((beat - song.pickup) % song.beatsPerBar) + song.beatsPerBar) % song.beatsPerBar;
        this.audio.click(this.t0 + timeAt(beat), inBar < 1e-6);
      }
      this.nextClickBeat += 1;
    }
  }

  private finish() {
    cancelAnimationFrame(this.raf);
    this.releaseAll();
    this.judge.update(Infinity);
    this.updateHud(this.chart.end);
    this.setPhase("done", {
      setup: this.setupNow,
      chart: this.chart,
      stats: { ...this.judge.stats },
      accuracy: this.judge.accuracy(),
      grade: this.judge.grade(),
      played: this.performer.played,
    });
    this.draw(this.chart.end);
  }

  private draw(T: number) {
    const { canvas } = this.el;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const g = canvas.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const view = VIEWS.find((v) => v.id === this.setupNow.view) ?? VIEWS[0];
    const now = performance.now();
    if (!this.colors || now - this.colorsAt > 1000) {
      this.colors = readStageColors(this.el.theme);
      this.colorsAt = now;
    }
    view.draw(g, r.width, r.height, { chart: this.chart, T, lookahead: view.lookahead, pressed: this.pressed, colors: this.colors, fonts: this.fonts });
  }

  private updateHud(T: number | null) {
    const s = this.judge.stats;
    const { bars, end } = this.chart;
    const el = this.el;
    el.score.textContent = s.score.toLocaleString();
    el.combo.textContent = String(s.combo);
    el.accuracy.textContent = `${this.judge.accuracy().toFixed(1)}%`;
    const total = Math.max(1, bars.length - 1);
    let bar = 0;
    if (T != null) for (let i = 0; i < bars.length; i++) if (T >= bars[i] - 1e-6) bar = i + 1;
    el.bar.textContent = T == null ? `– / ${total}` : T < 0 ? "count-in" : `${Math.min(total, Math.max(1, bar))} / ${total}`;
    el.progress.style.width = `${T == null ? 0 : Math.max(0, Math.min(100, (T / end) * 100))}%`;
  }

  private flash(kind: Flash, delta: number | null) {
    const el = this.el.judgment;
    el.style.color = `var(--ch-${kind === "stray" ? "miss" : kind})`;
    el.replaceChildren(LABEL[kind]);
    if (delta != null && kind !== "perfect") {
      const small = document.createElement("small");
      small.textContent = `${Math.round(Math.abs(delta) * 1000)} ms ${delta < 0 ? "early" : "late"}`;
      el.append(small);
    }
    el.classList.remove("ch-pop");
    void el.offsetWidth;
    el.classList.add("ch-pop");
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => el.replaceChildren(), 700);
  }
}
