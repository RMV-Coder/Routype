"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

type Toast = { id: number; name: string; xp: number };
const EVENT = "routype:achievements";

/** Announce newly unlocked achievements from anywhere in the app. */
export function announceAchievements(items: { name: string; xp: number }[]) {
  if (items.length) window.dispatchEvent(new CustomEvent(EVENT, { detail: items }));
}

export function AchievementToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const onEvent = (e: Event) => {
      const items = (e as CustomEvent<{ name: string; xp: number }[]>).detail;
      const added = items.map((a, i) => ({ id: Date.now() + i, name: a.name, xp: a.xp }));
      setToasts((t) => [...t, ...added]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => !added.some((a) => a.id === x.id))), 6000);
    };
    window.addEventListener(EVENT, onEvent);
    return () => window.removeEventListener(EVENT, onEvent);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 grid gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-background px-4 py-3 shadow-lg">
          <Trophy className="size-5 text-amber-500" />
          <div className="grid text-sm">
            <span className="font-semibold">Achievement unlocked</span>
            <span>{t.name} · +{t.xp} xp</span>
          </div>
        </div>
      ))}
    </div>
  );
}
