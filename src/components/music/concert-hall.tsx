"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Headphones, Medal, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { announceAchievements } from "@/components/layout/achievement-toasts";
import { playback } from "@/lib/music/audio/performer";
import { SAMPLE_SETS } from "@/lib/music/audio/sample-sets";
import { buildChart } from "@/lib/music/chart";
import { ensembleEnd, ensembleTracks } from "@/lib/music/ensemble";
import { letterGrade } from "@/lib/music/judge";
import { KEY_OF } from "@/lib/music/keymap";
import { noteName, parsePart } from "@/lib/music/notation";
import { ConcertSession, type Phase, type Take } from "@/lib/music/session";
import { getSong, SONG_GROUPS, SONGS } from "@/lib/music/songs";
import type { InstrumentId, Song } from "@/lib/music/types";
import { drawRoll, isViewId, readStageColors, VIEWS, type ViewId } from "@/lib/music/views";
import { cn } from "@/lib/utils";

const SPEEDS = [50, 75, 100] as const;
type Speed = (typeof SPEEDS)[number];
const isSpeed = (v: number): v is Speed => (SPEEDS as readonly number[]).includes(v);

interface Saved {
  xp: number;
  best: boolean;
  unlocked: { code: string; name: string; description: string; xp: number }[];
}
interface Best {
  song_id: string;
  part_id: string;
  speed: number;
  score: number;
  accuracy: number;
}
const bestKey = (song: string, part: string, speed: number) => `${song}/${part}/${speed}`;

// per-viewer conveniences; the page works the same without storage
const prefs = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  },
};

/** Pitches each recorded instrument plays in a piece, so only those recordings are fetched. */
function recordedPitches(song: Song): [InstrumentId, number[]][] {
  const out = new Map<InstrumentId, number[]>();
  for (const p of song.parts) {
    if (!SAMPLE_SETS[p.instrument]) continue;
    out.set(p.instrument, [...(out.get(p.instrument) ?? []), ...parsePart(p.notes).notes.map((n) => n.midi)]);
  }
  return [...out];
}

export function ConcertHall({ musicFont }: { musicFont: string }) {
  const [songId, setSongId] = useState(SONGS[0].id);
  const song = getSong(songId) ?? SONGS[0];
  const [partId, setPartId] = useState(song.parts[0].id);
  const part = song.parts.find((p) => p.id === partId) ?? song.parts[0];
  const [view, setView] = useState<ViewId>("falling");
  const [speed, setSpeed] = useState<Speed>(75);
  const [metronome, setMetronome] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [take, setTake] = useState<Take | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [bests, setBests] = useState<Map<string, Best>>(new Map());
  const [listening, setListening] = useState(false);

  const themeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLElement>(null);
  const comboRef = useRef<HTMLElement>(null);
  const accuracyRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const judgmentRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ConcertSession | null>(null);
  const playbackRef = useRef<{ stop: () => void } | null>(null);
  const rollRaf = useRef(0);
  const saveRun = useRef(0);

  const chart = useMemo(() => buildChart(song, part, speed / 100), [song, part, speed]);
  const tracks = useMemo(() => (take ? ensembleTracks(take) : []), [take]);

  // the session lives as long as the page; the controls feed it below
  useEffect(() => {
    const session = new ConcertSession(
      {
        canvas: canvasRef.current!, theme: themeRef.current!, score: scoreRef.current!, combo: comboRef.current!,
        accuracy: accuracyRef.current!, bar: barRef.current!, progress: progressRef.current!, judgment: judgmentRef.current!,
      },
      { ui: getComputedStyle(document.body).fontFamily, music: musicFont },
      { song, part, speed: speed / 100, view, metronome },
      (next, result) => {
        setPhase(next);
        setTake(result ?? null);
      },
    );
    sessionRef.current = session;
    const redraw = () => session.redraw();
    window.addEventListener("resize", redraw);
    document.fonts?.load(`20px ${musicFont}`, "\u{1D11E}\u{1D122}♯").catch(() => {});
    document.fonts?.ready.then(redraw);
    return () => {
      window.removeEventListener("resize", redraw);
      session.dispose();
      sessionRef.current = null;
    };
    // created once; later changes go through setup()/setView()/setMetronome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // remembered view, speed and metronome
  useEffect(() => {
    const v = prefs.get("concert-hall.view");
    const s = Number(prefs.get("concert-hall.speed"));
    if (isViewId(v)) setView(v);
    if (isSpeed(s)) setSpeed(s);
    if (prefs.get("concert-hall.metronome") === "off") setMetronome(false);
  }, []);

  useEffect(() => {
    sessionRef.current?.setup({ song, part, speed: speed / 100, view, metronome });
    // view and metronome changes don't rebuild the chart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, part, speed]);

  useEffect(() => {
    sessionRef.current?.setView(view);
  }, [view]);

  useEffect(() => {
    sessionRef.current?.setMetronome(metronome);
  }, [metronome]);

  // recorded instruments: fetch the notes this piece needs (the synth stands in if they fail)
  useEffect(() => {
    const session = sessionRef.current;
    const wanted = recordedPitches(song);
    if (!session || !wanted.length) return;
    let cancelled = false;
    setLoading(true);
    const giveUp = new Promise((resolve) => window.setTimeout(resolve, 10000));
    Promise.race([Promise.all(wanted.map(([instrument, pitches]) => session.audio.load(instrument, pitches))), giveUp]).then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [song]);

  useEffect(() => {
    fetch("/api/music/scores")
      .then((res) => (res.ok ? res.json() : { bests: [] }))
      .then((data: { bests: Best[] }) => setBests(new Map(data.bests.map((b) => [bestKey(b.song_id, b.part_id, b.speed), b]))))
      .catch(() => {});
  }, []);

  const stopListening = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
    cancelAnimationFrame(rollRaf.current);
    setListening(false);
  }, []);

  const drawEnsemble = useCallback((t: number) => {
    const canvas = rollRef.current;
    const theme = themeRef.current;
    if (!canvas || !theme || !take) return;
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
    const colors = readStageColors(theme);
    const colored = tracks.map((tr, i) => ({ color: colors.parts[i % colors.parts.length], notes: tr.notes }));
    drawRoll(g, r.width, r.height, colors, colored, t, ensembleEnd(tracks, take.chart.end));
  }, [take, tracks]);

  useEffect(() => {
    if (!take) return;
    drawEnsemble(0);
    const redraw = () => drawEnsemble(0);
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [take, drawEnsemble]);

  // a finished run is saved straight away; a newer run's answer wins
  useEffect(() => {
    if (!take) return;
    const { stats, setup: run } = take;
    const id = ++saveRun.current;
    if (stats.perfect + stats.great + stats.good === 0) {
      setSaving(false);
      return;
    }
    const speedPercent = Math.round(run.speed * 100);
    setSaving(true);
    fetch("/api/music/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songId: run.song.id,
        partId: run.part.id,
        speed: speedPercent,
        score: stats.score,
        maxCombo: stats.maxCombo,
        perfect: stats.perfect,
        great: stats.great,
        good: stats.good,
        miss: stats.miss,
        stray: stats.stray,
        holds: stats.holds,
        holdsKept: stats.holdsKept,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data: Saved = await res.json();
        if (data.best) {
          const key = bestKey(run.song.id, run.part.id, speedPercent);
          setBests((b) => new Map(b).set(key, { song_id: run.song.id, part_id: run.part.id, speed: speedPercent, score: stats.score, accuracy: take.accuracy }));
        }
        if (id !== saveRun.current) return;
        setSaved(data);
        announceAchievements(data.unlocked);
      })
      .catch(() => {})
      .finally(() => {
        if (id === saveRun.current) setSaving(false);
      });
  }, [take]);

  const start = useCallback(() => {
    if (loading) return;
    stopListening();
    setSaved(null);
    (document.activeElement as HTMLElement | null)?.blur?.();
    sessionRef.current?.start();
  }, [loading, stopListening]);

  // the keyboard is the instrument while playing; Enter starts and Esc stops
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  }, [start]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const session = sessionRef.current;
      if (!session || session.keydown(e)) return;
      const inControl = (e.target as HTMLElement | null)?.closest?.("input, textarea, select, button, a, [contenteditable]");
      if (e.key === "Enter" && session.phase !== "playing" && !inControl) {
        e.preventDefault();
        startRef.current();
      } else if (e.key === "Escape" && session.phase === "playing") {
        session.stop();
      }
    };
    const up = (e: KeyboardEvent) => sessionRef.current?.keyup(e);
    const blur = () => sessionRef.current?.releaseAll();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => stopListening, [stopListening]);

  const listen = () => {
    const session = sessionRef.current;
    if (!session || !take) return;
    if (playbackRef.current) return stopListening();
    session.audio.ensure();
    const startAt = session.audio.now + 0.15;
    const total = ensembleEnd(tracks, take.chart.end);
    playbackRef.current = playback(session.audio, tracks, startAt);
    setListening(true);
    const tick = () => {
      if (!playbackRef.current) return;
      const t = session.audio.now - startAt;
      drawEnsemble(Math.max(0, t));
      if (t > total + 1.5) return stopListening();
      rollRaf.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const chooseSong = (id: string) => {
    const next = getSong(id);
    if (!next) return;
    stopListening();
    setSongId(id);
    setPartId(next.parts[0].id);
  };
  const chooseView = (v: ViewId) => {
    setView(v);
    prefs.set("concert-hall.view", v);
  };
  const chooseSpeed = (s: Speed) => {
    setSpeed(s);
    prefs.set("concert-hall.speed", String(s));
  };
  const chooseMetronome = (on: boolean) => {
    setMetronome(on);
    prefs.set("concert-hall.metronome", on ? "on" : "off");
  };

  const playing = phase === "playing";
  const best = bests.get(bestKey(song.id, part.id, speed));
  const tempo = Math.round(song.tempo[0].bpm * (speed / 100));
  const hasSharps = chart.notes.some((n) => n.shift);
  const octaves = Math.abs(chart.transpose / 12);
  const credits = [...new Set(song.parts.map((p) => SAMPLE_SETS[p.instrument]?.credit).filter(Boolean))];
  const stats = take?.stats;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 py-2">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">Concert Hall</h1>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Every pitch lives on one key: low to high in reading order, <Kbd>Shift</Kbd> for sharps (<Kbd>t</Kbd> is middle C).
          Pick a piece and a part, choose a view, then press <Kbd>Enter</Kbd>.
        </p>
        <p className="hidden text-sm font-medium text-destructive [@media(pointer:coarse)]:block">
          Concert Hall is played on a physical keyboard.
        </p>
      </div>

      <section aria-label="Setup" className="flex flex-wrap items-end gap-x-4 gap-y-3 text-sm">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Piece
          <select
            className="max-w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
            value={song.id}
            disabled={playing}
            onChange={(e) => chooseSong(e.target.value)}
          >
            {SONG_GROUPS.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {SONGS.filter((s) => s.group === group.id).map((s) => (
                  <option key={s.id} value={s.id}>{s.title} · {s.format}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Your part
          <select
            className="max-w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground"
            value={part.id}
            disabled={playing}
            onChange={(e) => setPartId(e.target.value)}
          >
            {song.parts.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
          </select>
        </label>
        <div className="grid gap-1 text-xs text-muted-foreground">
          View
          <Segmented label="View" options={VIEWS.map((v) => [v.id, v.label])} value={view} onChange={chooseView} />
        </div>
        <div className="grid gap-1 text-xs text-muted-foreground">
          Speed
          <Segmented label="Speed" options={SPEEDS.map((s) => [s, `${s}%`])} value={speed} onChange={chooseSpeed} disabled={playing} />
        </div>
        <label className="flex items-center gap-2 pb-1.5">
          <input type="checkbox" checked={metronome} onChange={(e) => chooseMetronome(e.target.checked)} />
          Metronome
        </label>
        {playing ? (
          <Button variant="outline" onClick={() => sessionRef.current?.stop()}><Square /> Stop</Button>
        ) : (
          <Button onClick={start} disabled={loading}>
            <Play /> {loading ? "Loading recordings…" : phase === "done" ? "Play again" : "Start"}
          </Button>
        )}
      </section>

      <section
        ref={themeRef}
        aria-label="Stage"
        className="concert-hall relative overflow-hidden rounded-xl border bg-[var(--ch-stage)] text-[var(--ch-ink)]"
      >
        <canvas ref={canvasRef} aria-label="Notes to play" className="block h-[clamp(300px,56vh,560px)] w-full" />
        <div className="pointer-events-none absolute inset-x-3 top-2.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
          <HudStat label="Score" valueRef={scoreRef} />
          <HudStat label="Combo" valueRef={comboRef} />
          <HudStat label="Accuracy" valueRef={accuracyRef} />
          <HudStat label="Bar" valueRef={barRef} />
          <span className="ml-auto hidden text-sm italic text-[var(--ch-muted)] sm:inline">
            {song.marking} · {song.beatUnit === 8 ? "♪" : "♩"} = {tempo}
          </span>
        </div>
        <div
          ref={judgmentRef}
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 text-center text-2xl font-bold [&_small]:block [&_small]:text-xs [&_small]:font-normal [&_small]:text-[var(--ch-muted)]"
        />
        <div className="absolute inset-x-0 bottom-0 h-[3px]"><i ref={progressRef} className="block h-full w-0 bg-[var(--ch-accent)]" /></div>

        {phase === "idle" && (
          <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--ch-stage)_72%,transparent)] p-4 text-center">
            <div className="grid max-w-[46ch] gap-1.5">
              <strong>{loading ? "Tuning up…" : "Ready when you are"}</strong>
              <p className="text-sm text-[var(--ch-muted)]">
                {loading
                  ? "Loading the recorded notes for this piece."
                  : <>Press <Kbd>Enter</Kbd> to start. A count-in, then play the keys as they reach the line. Hold keys for long notes. <Kbd>Esc</Kbd> stops.</>}
              </p>
              {best && (
                <p className="text-xs text-[var(--ch-muted)]">
                  Your best here: {best.score.toLocaleString()} · {letterGrade(best.accuracy)} · {best.accuracy.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        )}

        {phase === "done" && take && stats && (
          <div className="absolute inset-0 grid grid-rows-[auto_1fr_auto] gap-3 overflow-auto bg-[var(--ch-stage)] p-4">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 tabular-nums">
              <span aria-label="Grade" className="text-5xl font-bold leading-none text-[var(--ch-accent)]">{take.grade}</span>
              <ResultStat label="Score" value={stats.score.toLocaleString()} />
              <ResultStat label="Accuracy" value={`${take.accuracy.toFixed(1)}%`} />
              <ResultStat label="Max combo" value={String(stats.maxCombo)} />
              <ResultStat label="Perfect · Great · Good" value={`${stats.perfect} · ${stats.great} · ${stats.good}`} />
              <ResultStat label="Missed" value={String(stats.miss)} />
              <ResultStat label="Wrong keys" value={String(stats.stray)} />
              {stats.holds > 0 && <ResultStat label="Long notes held" value={`${stats.holdsKept} / ${stats.holds}`} />}
              <ResultStat label="XP" value={saving ? "…" : saved ? `+${saved.xp}` : "—"} />
              {saved?.best && <span className="text-sm font-semibold text-[var(--ch-accent)]">New personal best</span>}
            </div>
            {/* sized by its box, not by the pixels drawn into it */}
            <div className="relative min-h-[150px]">
              <canvas ref={rollRef} aria-label="Ensemble recording" className="absolute inset-0 size-full rounded-lg border border-[var(--ch-line)]" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={listen}>
                {listening ? <><Square /> Stop playback</> : <><Headphones /> {song.parts.length > 1 ? "Hear the ensemble" : "Hear your recording"}</>}
              </Button>
              <Button variant="outline" onClick={start}><RotateCcw /> Play again</Button>
              <Button variant="ghost" asChild>
                <Link href={`/leaderboard?board=concert-hall&song=${song.id}&part=${part.id}&speed=${speed}`}><Medal /> Leaderboard</Link>
              </Button>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-[var(--ch-muted)]">
                {tracks.map((t, i) => (
                  <span key={t.partId} className="flex items-center gap-1.5">
                    <i className="inline-block size-2.5 rounded-sm" style={{ background: `var(--ch-p${(i % 4) + 1})` }} />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Keys in this part" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <span>{part.name} in <em>{song.title}</em> uses {chart.keys.length} keys:</span>
        {chart.keys.map((k) => (
          <span key={k} className="inline-flex items-baseline gap-1.5 rounded-md border bg-background px-2 py-0.5">
            <b className="text-base text-foreground">{KEY_OF.get(k)?.label ?? "?"}</b>
            {noteName(k - chart.transpose)}
          </span>
        ))}
        <span>
          {hasSharps && <>Capitals and symbols mean <Kbd>Shift</Kbd> + key (the sharp). </>}
          {octaves > 0 && <>Played {octaves} octave{octaves > 1 ? "s" : ""} {chart.transpose > 0 ? "up" : "down"} on the keys so it fits the layout. </>}
          {song.composer}, {song.source}.
        </span>
      </section>
      {credits.length > 0 && <p className="-mt-3 text-xs text-muted-foreground">{credits.join(" · ")}.</p>}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-b-2 bg-background px-1.5 font-mono text-foreground">{children}</kbd>;
}

function HudStat({ label, valueRef }: { label: string; valueRef: React.RefObject<HTMLElement | null> }) {
  return (
    <span className="grid text-[11px] uppercase tracking-wider text-[var(--ch-muted)]">
      {label}
      <b ref={valueRef} className="text-xl normal-case tracking-normal text-[var(--ch-ink)]" />
    </span>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="grid text-[11px] uppercase tracking-wider text-[var(--ch-muted)]">
      {label}
      <b className="text-lg normal-case tracking-normal text-[var(--ch-ink)]">{value}</b>
    </span>
  );
}

function Segmented<T extends string | number>({
  label, options, value, onChange, disabled,
}: {
  label: string;
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={v === value}
          disabled={disabled}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm text-muted-foreground disabled:opacity-60",
            v === value && "bg-background font-bold text-foreground shadow-sm",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
