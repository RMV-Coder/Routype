// // app/typing/components/TypingTest.tsx
// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
// import { TextLine } from "./textline";
// import type { WordRender, KeyEvent, SlotState } from "@/lib/definitions";
// import { getSocket } from "@/lib/socket";
// import { ReplayButton } from "./replay-button";

// function buildWords(prompt: string[]): WordRender[] {
//   return prompt.map((w) => ({
//     expected: w,
//     slots: Array<SlotState>(w.length).fill("pending"),
//     mismatches: {},
//     extras: [],
//     caretIndex: 0,
//     committed: false,
//   }));
// }

// function isPrintable(e: KeyboardEvent) {
//   return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
// }

// export default function TypingTest({
//   promptWords,
//   durationSec = 60,
// }: {
//   promptWords: string[];
//   durationSec?: number;
// }) {
//   const [words, setWords] = useState<WordRender[]>(() => buildWords(promptWords));
//   const [activeWi, setActiveWi] = useState(0);
//   const [running, setRunning] = useState(false);
//   const [done, setDone] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const startRef = useRef<number | null>(null);
//   const eventsRef = useRef<KeyEvent[]>([]);
//   const socket = useMemo(() => getSocket(), []);

//   // KPIs
//   const stats = useMemo(() => {
//     if (!startRef.current) return null;
//     const elapsedMs = (done ? (eventsRef.current.at(-1)?.t ?? 0) : performance.now() - startRef.current);
//     const typedChars = eventsRef.current.filter(e => e.kind === "char").length;
//     const wrong = words.reduce((acc, w) => acc + Object.keys(w.mismatches).length + w.extras.length, 0);
//     const wpm = (typedChars / 5) / Math.max(elapsedMs / 60000, 1/60000);
//     const accuracy = typedChars ? ((typedChars - wrong) / typedChars) * 100 : 100;
//     return {
//       wpm: Math.round(wpm),
//       accuracy: Math.round(accuracy),
//       wrong,
//       elapsedMs: Math.round(elapsedMs),
//     };
//   }, [done, words]);

//   // timer/progress
//   useEffect(() => {
//     if (!running || done) return;
//     const id = setInterval(() => {
//       if (!startRef.current) return;
//       const pct = ((performance.now() - startRef.current) / (durationSec * 1000)) * 100;
//       setProgress(Math.min(100, pct));
//       if (pct >= 100) finish();
//     }, 100);
//     return () => clearInterval(id);
//   }, [running, done, durationSec]);

//   function finish() {
//     setRunning(false);
//     setDone(true);
//     // emit stats
//     if (stats) socket.emit("typing:stats", stats);
//   }

//   function record(evt: Omit<KeyEvent, "t">) {
//     if (!startRef.current) startRef.current = performance.now();
//     eventsRef.current.push({
//       t: performance.now() - startRef.current,
//       ...evt,
//     });
//   }

//   function handleChar(value: string) {
//     setWords((prev) => {
//       const copy = [...prev];
//       const w = copy[activeWi];
//       if (!w) return prev;

//       // typing inside word
//       if (w.caretIndex < w.expected.length) {
//         const expected = w.expected[w.caretIndex];
//         if (value === expected) {
//           w.slots[w.caretIndex] = "correct";
//         } else {
//           w.slots[w.caretIndex] = "mismatch";
//           w.mismatches[w.caretIndex] = value; // show wrong typed above
//         }
//         w.caretIndex += 1;
//       } else {
//         // extras beyond word length
//         w.extras.push(value); // red extra
//       }
//       return copy;
//     });
//     record({ kind: "char", value, wi: activeWi, ci: currentCi() });
//   }

//   function handleSpace() {
//     setWords((prev) => {
//       const copy = [...prev];
//       const w = copy[activeWi];
//       if (w) w.committed = true;
//       return copy;
//     });
//     record({ kind: "space", wi: activeWi, ci: currentCi() });
//     if (activeWi + 1 >= words.length) return finish();
//     setActiveWi((i) => i + 1);
//   }

//   function handleBackspace() {
//     setWords((prev) => {
//       const copy = [...prev];
//       const w = copy[activeWi];
//       if (!w) return prev;

//       // if extras exist, remove extras first
//       if (w.extras.length > 0) {
//         w.extras.pop();
//         return copy;
//       }

//       // if inside word and at > 0 caret, step back
//       if (w.caretIndex > 0) {
//         w.caretIndex -= 1;
//         // clear mismatch or correct back to pending
//         if (w.slots[w.caretIndex] === "mismatch") {
//           delete w.mismatches[w.caretIndex];
//         }
//         w.slots[w.caretIndex] = "pending";
//       }
//       // do NOT move to previous word (Monkeytype default-like)
//       return copy;
//     });
//     record({ kind: "backspace", wi: activeWi, ci: currentCi() });
//   }

//   function currentCi() {
//     const w = words[activeWi];
//     if (!w) return 0;
//     // logical “typed length” = min(caretIndex, wordLen) + extrasCount
//     return Math.min(w.caretIndex, w.expected.length) + w.extras.length;
//   }

//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (done) return;
//       if (!running) setRunning(true);

//       if (e.key === "Backspace") {
//         e.preventDefault();
//         handleBackspace();
//         return;
//       }
//       if (e.key === " " || e.code === "Space") {
//         e.preventDefault();
//         handleSpace();
//         return;
//       }
//       if (isPrintable(e)) {
//         e.preventDefault();
//         handleChar(e.key);
//       }
//     };
//     document.addEventListener("keydown", onKey);
//     return () => document.removeEventListener("keydown", onKey);
//   }, [done, running, words, activeWi]);

//   function restart() {
//     setWords(buildWords(promptWords));
//     setActiveWi(0);
//     setRunning(false);
//     setDone(false);
//     setProgress(0);
//     startRef.current = null;
//     eventsRef.current = [];
//   }

//   return (
//     <Card className="p-6 space-y-4">
//       <div className="flex items-center justify-between">
//         <div className="text-sm text-muted-foreground">
//           Duration: {durationSec}s
//         </div>
//         <div className="w-48">
//           <Progress value={progress} />
//         </div>
//       </div>

//       {!done && (
//         <TextLine words={words} activeWordIndex={activeWi} showCaret />
//       )}

//       {done && stats && (
//         <div className="flex items-center gap-4">
//           <div className="text-xl font-semibold">WPM: {stats.wpm}</div>
//           <div className="text-xl">Accuracy: {stats.accuracy}%</div>
//           <div className="text-xl">Errors: {stats.wrong}</div>
//           <Button variant="default" onClick={restart}>Restart</Button>
//           <ReplayButton words={buildWords(promptWords)} events={eventsRef.current} />
//         </div>
//       )}
//     </Card>
//   );
// }

// app/typing/components/TypingTestFixed.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TextLine } from "./textline"; 
import { MetricPoint, KeyEvent } from "@/lib/definitions";
import { TypingMetricsLineChart } from "./typing-metrics-chart";

type SlotState = "pending" | "correct" | "mismatch";
type WordRender = {
  expected: string;
  slots: SlotState[];
  mismatches: Record<number, string>;
  extras: string[];
  caretIndex: number;
  committed: boolean;
};


function buildWords(prompt: string[]): WordRender[] {
  return prompt.map((w) => ({
    expected: w,
    slots: Array.from({ length: w.length }).map(() => "pending") as SlotState[],
    mismatches: {},
    extras: [],
    caretIndex: 0,
    committed: false,
  }));
}

function isPrintableKey(e: KeyboardEvent):boolean {
  // printable char has length 1, ignore modifiers / control sequences, ignore dead keys
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== "Dead";
}

export default function TypingTestFixed({
  promptWords,
  durationSec = 60,
}: {
  promptWords: string[];
  durationSec?: number;
}) {
  // React state (kept for rendering)
  const [words, setWords] = useState<WordRender[]>(() => buildWords(promptWords));
  const [activeWi, setActiveWi] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [finalStats, setFinalStats] = useState<{
    rawWPM: number;
    netWPM: number;
    accuracy: number;
    errorsPerMinute: number;
    consistency: number;
  } | null>(null);
  
  // Refs for the live values (the event handler reads/writes these)
  const wordsRef = useRef<WordRender[]>(words);
  const activeWiRef = useRef<number>(activeWi);
  const runningRef = useRef<boolean>(running);
  const startRef = useRef<number | null>(null);
  const eventsRef = useRef<KeyEvent[]>([]);
  const timerRef = useRef<number | null>(null);

  // keep refs in sync with state when state changes from React flows (e.g. restart)
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { activeWiRef.current = activeWi; }, [activeWi]);
  useEffect(() => { runningRef.current = running; }, [running]);
  
// const lastSecond = useRef(0);
    // Helper: compute final stats
//   const computeStats = () => {
//     const evs = eventsRef.current;
//     if (!startRef.current) return null;
//     const elapsedMs = performance.now() - startRef.current;
//     const typed = evs.filter(e => e.kind === "char").length;
//     const wrong = wordsRef.current.reduce((acc, w) => acc + Object.keys(w.mismatches).length + w.extras.length, 0);
//     const wpm = Math.round((typed / 5) / (elapsedMs / 60000));
//     const accuracy = typed ? Math.round(((typed - wrong) / typed) * 100) : 100;
//     return { wpm, accuracy, wrong };
//   };
  // Aggregate metrics after finish
  const aggregateMetrics = (events: KeyEvent[]): MetricPoint[] => {
    const map = new Map<number, { chars: number; errors: number }>();
    for (const ev of events) {
      const sec = Math.floor(ev.t / 1000);
      const bucket = map.get(sec) ?? { chars: 0, errors: 0 };
      if (ev.kind === "char") {
        bucket.chars += 1;
        if (ev.correct === false) bucket.errors += 1;
      }
      map.set(sec, bucket);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([second, { chars, errors }]) => ({
        second,
        chars,
        errors,
        rawWPM: (chars / 5) * 60,
      }));
  };
// useEffect(() => {
//   if (!startRef.current) return;
//   const interval = setInterval(() => {
//     const elapsedMs = performance.now() - (startRef.current ?? performance.now());
//     const currentSecond = Math.floor(elapsedMs / 1000);
//     if (currentSecond !== lastSecond.current) {
//       lastSecond.current = currentSecond;
//       const evs = eventsRef.current;
//       // filter events for that exact second
//       const secs = evs.filter(e => Math.floor(e.t / 1000) === currentSecond);
//       const chars = secs.filter(e => e.kind === "char").length;
//       const errors = secs.filter(e => e.kind === "char").length
//                      - secs.filter(e => {
//                          return e.kind === "char" && /* logic to check if that char was a correct one? */
//                          true;
//                        }).length;
//       const rawWPM = (chars / 5) * 60;
//       console.log("Metrics:", JSON.stringify({second: currentSecond, chars, errors, rawWPM }))
//       setMetrics(prev => [
//         ...prev,
//         { second: currentSecond, chars, errors, rawWPM }
//       ]);
//     }
//   }, 500);
//   return () => clearInterval(interval);
// }, [running]);

  // Stats calculation helper (reads from refs)
//   function computeStats() {
//     const evs = eventsRef.current;
//     if (!startRef.current) return null;
//     const lastT = evs.length ? evs[evs.length - 1].t : performance.now() - startRef.current;
//     const elapsedMs = done ? lastT : performance.now() - startRef.current;
//     const typedChars = evs.filter((e) => e.kind === "char").length;
//     const wrong = wordsRef.current.reduce((acc, w) => acc + Object.keys(w.mismatches).length + w.extras.length, 0);
//     const wpm = Math.round(((typedChars / 5) / Math.max(elapsedMs / 60000, 1 / 60000)));
//     const accuracy = typedChars ? Math.round(((typedChars - wrong) / typedChars) * 100) : 100;
//     return { wpm, accuracy, wrong, elapsedMs: Math.round(elapsedMs) };
//   }
//   function aggregateMetricsFromEvents(events: KeyEvent[]): MetricPoint[] {
//     const map = new Map<number, { chars: number; errors: number }>();
  
//     for (const ev of events) {
//       const sec = Math.floor(ev.t / 1000);
//       const bucket = map.get(sec) ?? { chars: 0, errors: 0 };
//       if (ev.kind === "char") {
//         bucket.chars += 1;
//         if (ev.correct === false) {
//           bucket.errors += 1;
//         }
//       }
//       map.set(sec, bucket);
//     }
  
//     // Convert to sorted array
//     const result: MetricPoint[] = Array.from(map.entries())
//       .sort(([a], [b]) => a - b)
//       .map(([second, { chars, errors }]) => ({
//         second,
//         chars,
//         errors,
//         rawWPM: (chars / 5) * 60, // char-per-second to WPM per minute
//       }));
//     return result;
//   }
  

  // Single-key handler attached once on mount
  useEffect(() => {
    // function finish() {
    //     if (!runningRef.current) return;
    //     setRunning(false);
    //     setDone(true);
    //     const aggregated = aggregateMetricsFromEvents(eventsRef.current);
    //     setMetrics(aggregated);
    //     if (timerRef.current) {
    //         clearInterval(timerRef.current);
    //         timerRef.current = null;
    //     }
    //   // (optionally emit stats via socket here)
    // }
    const finish = () => {
        setRunning(false);
        setDone(true);
        const agg = aggregateMetrics(eventsRef.current);
        
        setMetrics(agg);

        // Compute final stats
        const elapsedMs = performance.now() - (startRef.current ?? performance.now());
        const evs = eventsRef.current;
        const totalChars = evs.filter(e => e.kind === "char").length;
        const totalErrors = evs.filter(e => e.kind === "char" && e.correct === false).length;
        const totalTimeMin = elapsedMs / 60000;
        const rawWPM = totalChars > 0 && totalTimeMin > 0 ? (totalChars / 5) / totalTimeMin : 0;
        const errorsPerMinute = totalErrors / (totalTimeMin || 1);
        const netWPM = Math.max(0, rawWPM - errorsPerMinute);
        const accuracy = totalChars > 0 ? ((totalChars - totalErrors) / totalChars) * 100 : 100;

        // Consistency based on coefficient of variation of rawWPM per second
        const samples = agg.map(pt => pt.rawWPM);
        const mean = samples.reduce((a, b) => a + b, 0) / (samples.length || 1);
        const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (samples.length || 1);
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 0;
        const consistency = Math.max(0, 100 - cv * 100);

        setFinalStats({
        rawWPM: Math.round(rawWPM),
        netWPM: Math.round(netWPM),
        accuracy: Math.round(accuracy),
        errorsPerMinute: parseFloat(errorsPerMinute.toFixed(2)),
        consistency: Math.round(consistency),
        });

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

    // function recordEvent(evt: Omit<KeyEvent, "t">) {
    //   if (!startRef.current) startRef.current = performance.now();
    //   eventsRef.current.push({
    //     t: performance.now() - startRef.current,
    //     ...evt,
    //   });
    // }
    function recordEvent(evt: Omit<KeyEvent, "t" | "absoluteT">) {
        const now = performance.now();
        const elapsed = startRef.current != null ? now - startRef.current : 0;
        eventsRef.current.push({
          ...evt,
          t: elapsed,
          absoluteT: now,
        });
    }

    function handleChar(value: string) {
      // compute new words state synchronously from ref
      const wIndex = activeWiRef.current;
      const currentWords = wordsRef.current.map((w) => ({ ...w, mismatches: { ...w.mismatches }, slots: [...w.slots], extras: [...w.extras] }));
      const w = currentWords[wIndex];
      if (!w) return;
      const wasCorrect = w.caretIndex < w.expected.length && value === w.expected[w.caretIndex];
      if (w.caretIndex < w.expected.length) {
        const expected = w.expected[w.caretIndex];
        if (value === expected) {
          w.slots[w.caretIndex] = "correct";
        } else {
          w.slots[w.caretIndex] = "mismatch";
          w.mismatches[w.caretIndex] = value;
        }
        w.caretIndex += 1;
      } else {
        // extras
        w.extras.push(value);
      }
      // update both ref and state together
      wordsRef.current = currentWords;
      setWords(currentWords);
    //   recordEvent({ kind: "char", value, wi: wIndex, ci: Math.min(w.caretIndex, w.expected.length) + w.extras.length - 1 });
      recordEvent({ kind: "char", value, wi: wIndex, ci: w.caretIndex - 1, correct: wasCorrect });

    }

    function handleSpace() {
      const wIndex = activeWiRef.current;
      const currentWords = wordsRef.current.map((w) => ({ ...w, mismatches: { ...w.mismatches }, slots: [...w.slots], extras: [...w.extras] }));
      const w = currentWords[wIndex];
      if (w) w.committed = true;
      wordsRef.current = currentWords;
      setWords(currentWords);
      recordEvent({ kind: "space", wi: wIndex, ci: w.caretIndex });
    //   recordEvent({ kind: "space", wi: wIndex, ci: currentWords[wIndex] ? (Math.min(currentWords[wIndex].caretIndex, currentWords[wIndex].expected.length) + currentWords[wIndex].extras.length) : 0 });
      if (wIndex + 1 >= currentWords.length) {
        finish();
        return;
      }
      activeWiRef.current = wIndex + 1;
      setActiveWi(wIndex + 1);
    }

    function handleBackspace() {
      const wIndex = activeWiRef.current;
      const currentWords = wordsRef.current.map((w) => ({ ...w, mismatches: { ...w.mismatches }, slots: [...w.slots], extras: [...w.extras] }));
      const w = currentWords[wIndex];
      if (!w) return;
      if (w.extras.length > 0) {
        w.extras.pop();
      } else if (w.caretIndex > 0) {
        w.caretIndex -= 1;
        if (w.slots[w.caretIndex] === "mismatch") {
          delete w.mismatches[w.caretIndex];
        }
        w.slots[w.caretIndex] = "pending";
      }
      wordsRef.current = currentWords;
      setWords(currentWords);
      recordEvent({ kind: "backspace", wi: wIndex, ci: w.caretIndex });
    //   recordEvent({ kind: "backspace", wi: wIndex, ci: Math.max(0, currentWords[wIndex] ? (Math.min(currentWords[wIndex].caretIndex, currentWords[wIndex].expected.length) + currentWords[wIndex].extras.length) : 0) });
    }
    
      

    // attach exactly one listener on mount
    const onKey = (e: KeyboardEvent) => {
      // debug: count how many handler invocations -- helps detect duplicates
    //   console.count("keydown-handler");

      // ignore IME composition events and repeats
      if (e.isComposing || e.repeat) return;

      // Start the timer on first key
      if (!runningRef.current && !done) {
        setRunning(true);
        runningRef.current = true;
        startRef.current = performance.now();
        timerRef.current = window.setInterval(() => {
        //   if (!startRef.current) return;
        //   const pct = ((performance.now() - startRef.current) / (durationSec * 1000)) * 100;
        //   setProgress(Math.min(100, pct));
        //   if (pct >= 100) {
        //     // finish
        //     setRunning(false);
        //     runningRef.current = false;
        //     setDone(true);
        //     if (timerRef.current) {
        //       clearInterval(timerRef.current);
        //       timerRef.current = null;
        //     }
        //   }
            const elapsed = performance.now() - (startRef.current ?? 0);
            setProgress(Math.min(100, (elapsed / (durationSec * 1000)) * 100));
            if (elapsed >= durationSec * 1000) finish();
        }, 100);
      }

      // Backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }
      // Space
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handleSpace();
        return;
      }
      // printable character
      if (isPrintableKey(e)) {
        e.preventDefault();
        handleChar(e.key);
        return;
      }

      // else ignore
    };

    document.addEventListener("keydown", onKey);
    return () => {
      // cleanup single listener
      document.removeEventListener("keydown", onKey);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // mount only
  }, [durationSec, done]);

  function restart() {
    const fresh = buildWords(promptWords);
    wordsRef.current = fresh;
    setWords(fresh);
    activeWiRef.current = 0;
    setActiveWi(0);
    setRunning(false);
    runningRef.current = false;
    setDone(false);
    startRef.current = null;
    eventsRef.current = [];
    setProgress(0);
    setMetrics([]);
  }

//   const finalStats = done ? computeStats() : null;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Duration: {durationSec}s
        </div>
        <div className="w-48">
          <Progress value={progress} />
        </div>
      </div>

      {!done && <TextLine words={words} activeWordIndex={activeWi} showCaret />}

      {done && finalStats && (
        <div className="flex items-center gap-4">
            <div>Raw WPM: {finalStats.rawWPM}</div>
            <div>Net WPM: {finalStats.netWPM}</div>
            <div>Accuracy: {finalStats.accuracy}%</div>
            <div>Errors per minute: {finalStats.errorsPerMinute}</div>
            <div>Consistency: {finalStats.consistency}%</div>
          <Button onClick={restart}>Restart</Button>
          {/* Replay button omitted for brevity — reuse your existing ReplayModal, but feed it eventsRef.current */}
          {metrics.length > 0 && <div className="w-full h-64"><TypingMetricsLineChart data={metrics} /></div>}

        </div>
      )}
      
    </Card>
  );
}

