// app/typing/components/TextLine.tsx
"use client";

import { motion } from "framer-motion";
import { WordRender } from "@/lib/definitions";
import clsx from "clsx";

export function TextLine({
  words,
  activeWordIndex,
  showCaret = true,
  ghost = false,
}: {
  words: WordRender[];
  activeWordIndex: number;
  showCaret?: boolean;
  ghost?: boolean;
}) {
  return (
    <div className={clsx("flex flex-wrap gap-x-2 text-xl leading-relaxed select-none",
                         ghost ? "opacity-60" : "")}>
      {words.map((w, wi) => (
        <div key={wi} className="relative">
          {/* expected letters */}
          {w.expected.split("").map((ch, ci) => {
            const state = w.slots[ci] ?? "pending";
            const isMismatch = state === "mismatch";
            const color =
              state === "pending" ? "text-muted-foreground"
              : state === "correct" ? "text-foreground"
              : "text-destructive";
            return (
              <span key={ci} className={clsx("relative", color)}>
                {/* wrong char overlay (small, red) just before expected slot */}
                {w.mismatches[ci] && (
                  <span className="absolute -top-4 left-0 text-destructive/80 text-xs">
                    {w.mismatches[ci]}
                  </span>
                )}
                {ch}
                {/* underline caret at active slot */}
                {showCaret && wi === activeWordIndex && w.caretIndex === ci && (
                  <motion.span
                    layoutId="caret"
                    className="absolute left-0 -bottom-0.5 h-0.5 w-full bg-foreground"
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  />
                )}
              </span>
            );
          })}
          {/* extras (red) after end of word */}
          {w.extras.map((x, i) => (
            <span key={`x-${i}`} className="text-destructive">{x}</span>
          ))}

          {/* caret at end-of-word position */}
          {showCaret &&
            wi === activeWordIndex &&
            w.caretIndex === w.expected.length &&
            w.extras.length === 0 && (
              <motion.span
                layoutId="caret"
                className="inline-block align-bottom h-0.5 w-3 bg-foreground ml-0"
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              />
          )}
        </div>
      ))}
    </div>
  );
}
