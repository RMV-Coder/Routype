"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Suggestion = { id: number; name: string | null; image: string | null; score: number; mutualFriends: number; coReads: number };

export function PeopleYouMayKnow() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/friends/suggestions?limit=12");
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    })();
  }, []);

  const sendRequest = async (userId: number) => {
    startTransition(async () => {
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    });
  };

  const openProfile = (userId: number) => {
    window.location.href = `/profile?user=${userId}`;
  };

  return (
    <Card className="p-3 grid gap-3">
      <div className="text-sm font-medium">People you may know</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((u) => (
          <Card key={u.id} className="p-3 flex items-center gap-3">
            <button onClick={() => openProfile(u.id)} className="focus:outline-none">
              {u.image ? (
                <img src={u.image} alt={u.name || "User"} className="h-10 w-10 rounded-full border" />
              ) : (
                <span className="h-10 w-10 rounded-full bg-muted inline-block" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{u.name || `User #${u.id}`}</div>
              <div className="text-xs text-muted-foreground">{u.mutualFriends} mutual · {u.coReads} co-reads</div>
            </div>
            <Button size="sm" onClick={() => sendRequest(u.id)} disabled={pending}>Add Friend</Button>
          </Card>
        ))}
      </div>
    </Card>
  );
}


