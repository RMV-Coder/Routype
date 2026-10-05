"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GhostCaret, KeyEvent, MetricPoint, SlotState, WordRender } from "@/lib/definitions";
import { aggregateMetrics, computeStats, globalCaretIndex, locateIndex, type TypingStats } from "@/lib/game/stats";

export type TypingMode = "time" | "words" | "piece" | "sudden-death" | "race";

export interface TypingResult extends TypingStats {
  metrics: MetricPoint[];
  /** Sudden death runs that ended on a mistake. */
  failed: boolean;
}

export interface TypingProgress {
  caretIndex: number;
  progress: number; // 0..100
  wpm: number;
  accuracy: number;
}

interface TypingTestProps {
  words: string[];
  mode: TypingMode;
  /** Length of a `time` test. */
  durationSec?: number;
  /** Prevents typing (e.g. before a race starts). */
  disabled?: boolean;
  /** Other players' carets. */
  ghosts?: GhostCaret[];
  onStart?: () => void;
  onProgress?: (p: TypingProgress) => void;
  onFinish: (result: TypingResult) => void;
  /** Called on Tab, the usual "restart" shortcut. */
  onRestart?: () => void;
  autoFocus?: boolean;
}

function buildWords(prompt: string[]): WordRender[] {
  return prompt.map((w) => ({
    expected: w,
    slots: Array.from({ length: w.length }, () => "pending" as SlotState),
    mismatches: {},
    extras: [],
    caretIndex: 0,
    committed: false,
  }));
}

function cloneWord(w: WordRender): WordRender {
  return { ...w, slots: [...w.slots], mismatches: { ...w.mismatches }, extras: [...w.extras] };
}

const isPerfect = (w: WordRender) => w.extras.length === 0 && w.slots.every((s) => s === "correct");

function isPrintableKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
}

export function TypingTest({
  words: promptWords,
  mode,
  durationSec = 30,
  disabled = false,
  ghosts = [],
  onStart,
  onProgress,
  onFinish,
  onRestart,
  autoFocus = true,
}: TypingTestProps) {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const wordsRef = useRef<WordRender[]>(buildWords(promptWords));
  const activeWiRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const eventsRef = useRef<KeyEvent[]>([]);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Latest callbacks without re-binding handlers
  const callbacks = useRef({ onStart, onProgress, onFinish, onRestart });
  callbacks.current = { onStart, onProgress, onFinish, onRestart };

  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // Reset whenever a new text arrives
  useEffect(() => {
    wordsRef.current = buildWords(promptWords);
    activeWiRef.current = 0;
    startRef.current = null;
    eventsRef.current = [];
    doneRef.current = false;
    stopTimer();
    setElapsedMs(0);
    setScrollTop(0);
    rerender();
  }, [promptWords]);

  useEffect(() => stopTimer, []);

  useEffect(() => {
    if (autoFocus && !disabled) containerRef.current?.focus();
  }, [autoFocus, disabled, promptWords]);

  const elapsed = () => (startRef.current == null ? 0 : performance.now() - startRef.current);

  const finish = useCallback((failed = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopTimer();
    const ms = mode === "time" && !failed ? durationSec * 1000 : elapsed();
    setElapsedMs(ms);
    const stats = computeStats(wordsRef.current, activeWiRef.current, eventsRef.current, ms);
    callbacks.current.onFinish({ ...stats, metrics: aggregateMetrics(eventsRef.current), failed });
    rerender();
  }, [mode, durationSec]);

  const reportProgress = useCallback(() => {
    const words = wordsRef.current;
    const caretIndex = globalCaretIndex(words, activeWiRef.current);
    const total = words.reduce((n, w) => n + w.expected.length, 0) + Math.max(0, words.length - 1);
    const stats = computeStats(words, activeWiRef.current, eventsRef.current, Math.max(elapsed(), 1000));
    const progress = mode === "time"
      ? Math.min(100, (elapsed() / (durationSec * 1000)) * 100)
      : Math.min(100, (caretIndex / Math.max(1, total)) * 100);
    callbacks.current.onProgress?.({ caretIndex, progress, wpm: stats.wpm, accuracy: stats.accuracy });
  }, [mode, durationSec]);

  const start = useCallback(() => {
    startRef.current = performance.now();
    callbacks.current.onStart?.();
    timerRef.current = window.setInterval(() => {
      const ms = elapsed();
      setElapsedMs(ms);
      if (mode === "time" && ms >= durationSec * 1000) finish();
    }, 100);
  }, [mode, durationSec, finish]);

  const record = (evt: Omit<KeyEvent, "t" | "absoluteT">) => {
    const now = performance.now();
    eventsRef.current.push({ ...evt, t: startRef.current == null ? 0 : now - startRef.current, absoluteT: now });
  };

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      callbacks.current.onRestart?.();
      return;
    }
    if (disabled || doneRef.current || e.nativeEvent.isComposing) return;

    const isSpace = e.key === " ";
    const isBackspace = e.key === "Backspace";
    if (!isSpace && !isBackspace && !isPrintableKey(e)) return;
    e.preventDefault();
    if (startRef.current == null) {
      if (isBackspace) return;
      start();
    }

    const words = wordsRef.current.slice();
    let wi = activeWiRef.current;
    const w = cloneWord(words[wi]);
    words[wi] = w;

    if (isBackspace) {
      if (w.extras.length > 0) {
        w.extras.pop();
      } else if (w.caretIndex > 0) {
        if (e.ctrlKey || e.altKey) {
          // delete the whole word
          w.slots = w.slots.map(() => "pending");
          w.mismatches = {};
          w.caretIndex = 0;
        } else {
          w.caretIndex -= 1;
          delete w.mismatches[w.caretIndex];
          w.slots[w.caretIndex] = "pending";
        }
      } else if (wi > 0 && !isPerfect(words[wi - 1])) {
        // step back into the previous word only if it contains mistakes
        wi -= 1;
        const prev = cloneWord(words[wi]);
        prev.committed = false;
        words[wi] = prev;
      }
      record({ kind: "backspace", wi, ci: words[wi].caretIndex });
    } else if (isSpace) {
      if (w.caretIndex === 0 && w.extras.length === 0) return; // ignore leading spaces
      w.committed = true;
      const skipped = w.caretIndex < w.expected.length;
      record({ kind: "space", wi, ci: w.caretIndex, correct: !skipped && isPerfect(w) });
      if (mode === "sudden-death" && !isPerfect(w)) {
        wordsRef.current = words;
        finish(true);
        return;
      }
      if (wi + 1 >= words.length) {
        wordsRef.current = words;
        finish();
        return;
      }
      wi += 1;
    } else {
      const correct = w.caretIndex < w.expected.length && e.key === w.expected[w.caretIndex];
      if (w.caretIndex < w.expected.length) {
        w.slots[w.caretIndex] = correct ? "correct" : "mismatch";
        if (!correct) w.mismatches[w.caretIndex] = e.key;
        w.caretIndex += 1;
      } else if (w.extras.length < 20) {
        w.extras.push(e.key);
      }
      record({ kind: "char", value: e.key, wi, ci: w.caretIndex - 1, correct });
      if (mode === "sudden-death" && !correct) {
        wordsRef.current = words;
        finish(true);
        return;
      }
      // the last word finishes as soon as it is typed correctly
      if (wi === words.length - 1 && isPerfect(w) && w.caretIndex === w.expected.length) {
        w.committed = true;
        wordsRef.current = words;
        activeWiRef.current = wi;
        reportProgress();
        finish();
        return;
      }
    }

    wordsRef.current = words;
    activeWiRef.current = wi;
    reportProgress();
    rerender();
  }, [disabled, mode, start, finish, reportProgress]);

  const words = wordsRef.current;
  const activeWi = activeWiRef.current;

  // Keep the active line in view: show three lines, scrolling once the caret reaches the third.
  useLayoutEffect(() => {
    const el = activeWordRef.current;
    if (!el) return;
    const lineHeight = el.offsetHeight || 40;
    const top = el.offsetTop;
    setScrollTop(top > lineHeight ? top - lineHeight : 0);
  }, [words, activeWi]);
  const done = doneRef.current;
  const running = startRef.current != null && !done;
  const ghostPositions = ghosts.map((g) => ({ ...g, ...locateIndex(words, g.index) }));
  const liveStats = running && elapsedMs > 1000 ? computeStats(words, activeWi, eventsRef.current, elapsedMs) : null;

  const counter = mode === "time"
    ? `${Math.max(0, Math.ceil(durationSec - elapsedMs / 1000))}`
    : `${Math.min(activeWi, words.length)}/${words.length}`;

  return (
    <div className="grid gap-3">
      <div className="flex items-baseline gap-6 text-2xl font-bold text-primary h-8">
        {(running || mode === "time") && !done && <span>{counter}</span>}
        {liveStats && <span className="text-base font-normal text-muted-foreground">{Math.round(liveStats.wpm)} wpm</span>}
      </div>
      <div
        ref={containerRef}
        tabIndex={0}
        role="textbox"
        aria-label="Typing area"
        aria-disabled={disabled}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="relative outline-none cursor-text"
      >
        <div className="relative h-[7.5rem] overflow-hidden">
          <div
            className={cn(
              "flex flex-wrap gap-x-3 text-2xl leading-10 select-none transition-transform duration-150",
              !focused && !done && "blur-[3px] opacity-60",
            )}
            style={{ transform: `translateY(-${scrollTop}px)` }}
          >
            {words.map((w, wi) => (
              <Word
                key={wi}
                word={w}
                isActive={wi === activeWi && !done}
                showCaret={wi === activeWi && focused && !done && !disabled}
                ghosts={ghostPositions.filter((g) => g.wi === wi)}
                ref={wi === activeWi ? activeWordRef : undefined}
              />
            ))}
          </div>
        </div>
        {!focused && !done && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MousePointerClick className="size-4" />
            {disabled ? "Waiting for the race to start…" : "Click here or press any key to focus"}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        <kbd className="rounded border px-1">tab</kbd> restart
        {mode === "sudden-death" && " · one mistake ends the run"}
      </p>
    </div>
  );
}

type GhostAt = GhostCaret & { wi: number; ci: number };

function Caret({ color, label, blink }: { color?: string; label?: string; blink?: boolean }) {
  return (
    <span
      className={cn("pointer-events-none absolute -left-px top-1 bottom-1 w-0.5 rounded", blink && "animate-pulse")}
      style={{ background: color ?? "var(--color-primary)", opacity: color ? 0.7 : 1 }}
    >
      {label && (
        <span
          className="absolute -top-3 left-0 whitespace-nowrap rounded px-1 text-[10px] leading-3 text-white"
          style={{ background: color }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

function Word({
  word,
  isActive,
  showCaret,
  ghosts,
  ref,
}: {
  word: WordRender;
  isActive: boolean;
  showCaret: boolean;
  ghosts: GhostAt[];
  ref?: React.Ref<HTMLDivElement>;
}) {
  const hasError = word.committed && !isPerfect(word);
  const endIndex = word.expected.length;
  return (
    <div ref={ref} className={cn("relative", hasError && "underline decoration-destructive/70 underline-offset-8")}>
      {word.expected.split("").map((ch, ci) => {
        const state = word.slots[ci];
        return (
          <span
            key={ci}
            title={state === "mismatch" ? `typed "${word.mismatches[ci]}"` : undefined}
            className={cn(
              "relative",
              state === "pending" && "text-muted-foreground/60",
              state === "correct" && "text-foreground",
              state === "mismatch" && "text-destructive",
            )}
          >
            {ch}
            {showCaret && word.caretIndex === ci && <Caret blink={!isActive} />}
            {ghosts.filter((g) => g.ci === ci).map((g) => <Caret key={g.id} color={g.color} label={g.name} />)}
          </span>
        );
      })}
      {word.extras.map((x, i) => (
        <span key={`x-${i}`} className="text-destructive/70">{x}</span>
      ))}
      <span className="relative">
        {showCaret && word.caretIndex >= endIndex && <Caret />}
        {ghosts.filter((g) => g.ci >= endIndex).map((g) => <Caret key={g.id} color={g.color} label={g.name} />)}
      </span>
    </div>
  );
}
