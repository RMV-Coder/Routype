"use client";

import { useEffect, useState } from "react";
import { Lock, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Item = { code: string; name: string; description: string; category: string; xp: number; unlockedAt: string | null };
const CATEGORIES = [["typing", "Typing"], ["racing", "Racing"], ["writing", "Writing"]] as const;

export default function AchievementsPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    fetch("/api/achievements").then(async (res) => setItems(res.ok ? (await res.json()).items : []));
  }, []);
  const unlocked = items?.filter((i) => i.unlockedAt).length ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-bold">Achievements</h1>
        {items && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{unlocked} / {items.length} unlocked</span>
            <Progress value={(unlocked / Math.max(1, items.length)) * 100} className="max-w-xs" />
          </div>
        )}
      </div>
      {CATEGORIES.map(([cat, label]) => (
        <section key={cat} className="grid gap-3">
          <h2 className="text-lg font-semibold">{label}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items?.filter((i) => i.category === cat).map((a) => (
              <Card key={a.code} className={cn("flex flex-row items-start gap-3 p-4", !a.unlockedAt && "opacity-60")}>
                <div className={cn("rounded-full p-2", a.unlockedAt ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground")}>
                  {a.unlockedAt ? <Trophy className="size-5" /> : <Lock className="size-5" />}
                </div>
                <div className="grid gap-1">
                  <span className="font-semibold">{a.name}</span>
                  <span className="text-sm text-muted-foreground">{a.description}</span>
                  <span className="text-xs text-muted-foreground">
                    +{a.xp} xp{a.unlockedAt && ` · unlocked ${new Date(a.unlockedAt).toLocaleDateString()}`}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
