// app/typing/components/ReplayButton.tsx
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextLine } from "./textline";
import type { KeyEvent, WordRender, SlotState } from "@/lib/definitions";

export function ReplayButton({
  words,
  events,
}: {
  words: WordRender[];
  events: KeyEvent[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary">Replay</Button>
      {open && <ReplayModal onClose={() => setOpen(false)} baseWords={words} events={events} />}
    </>
  );
}

function applyEvent(w: WordRender[], ev: KeyEvent, activeWiRef: {current:number}) {
  const wi = activeWiRef.current;
  const word = w[wi];
  if (!word) return;

  if (ev.kind === "char" && ev.value) {
    if (word.caretIndex < word.expected.length) {
      const expected = word.expected[word.caretIndex];
      word.slots[word.caretIndex] = (ev.value === expected) ? "correct" : "mismatch";
      if (ev.value !== expected) word.mismatches[word.caretIndex] = ev.value;
      word.caretIndex += 1;
    } else {
      word.extras.push(ev.value);
    }
  } else if (ev.kind === "space") {
    word.committed = true;
    activeWiRef.current = Math.min(w.length - 1, wi + 1);
  } else if (ev.kind === "backspace") {
    if (word.extras.length) {
      word.extras.pop();
    } else if (word.caretIndex > 0) {
      word.caretIndex -= 1;
      if (word.slots[word.caretIndex] === "mismatch") {
        delete word.mismatches[word.caretIndex];
      }
      word.slots[word.caretIndex] = "pending";
    }
  }
}

function cloneWords(ws: WordRender[]): WordRender[] {
  return ws.map(w => ({
    expected: w.expected,
    slots: [...w.slots],
    mismatches: { ...w.mismatches },
    extras: [...w.extras],
    caretIndex: w.caretIndex,
    committed: w.committed,
  }));
}

function ReplayModal({
  onClose,
  baseWords,
  events,
}: {
  onClose: () => void;
  baseWords: WordRender[];
  events: KeyEvent[];
}) {
  const [ghostWords, setGhostWords] = useState<WordRender[]>(cloneWords(baseWords));
  const activeWiRef = useRef(0);

  function startReplay() {
    // reset
    setGhostWords(cloneWords(baseWords));
    activeWiRef.current = 0;
    const start = performance.now();
    events.forEach((ev) => {
      const delay = ev.t - (events[0]?.t ?? 0);
      window.setTimeout(() => {
        setGhostWords((prev) => {
          const copy = cloneWords(prev);
          applyEvent(copy, ev, activeWiRef);
          return copy;
        });
      }, delay);
    });
  }

  return (
    <Card className="fixed inset-0 bg-background/90 p-6 flex flex-col gap-4">
      <div className="flex gap-2">
        <Button onClick={startReplay}>Play</Button>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
      <TextLine words={ghostWords} activeWordIndex={activeWiRef.current} showCaret={true} ghost />
    </Card>
  );
}
