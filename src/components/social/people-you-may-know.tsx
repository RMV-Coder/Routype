"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Suggestion = { id: number; name: string | null; image: string | null; score: number; mutualFriends: number; coReads: number };

export function PeopleYouMayKnow() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState<Set<number>>(new Set());

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
      setRequested((prev) => new Set(prev).add(userId));
    });
  };

  if (items.length === 0) return null;
  return (
    <Card className="p-3 grid gap-3">
      <div className="text-sm font-medium">People you may know</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((u) => (
          <Card key={u.id} className="p-3 flex items-center gap-3">
            <Avatar className="size-10">
              {u.image && <AvatarImage src={u.image} alt="" />}
              <AvatarFallback>{(u.name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{u.name || `User #${u.id}`}</div>
              <div className="text-xs text-muted-foreground">{u.mutualFriends} mutual · {u.coReads} co-reads</div>
            </div>
            <Button size="sm" onClick={() => sendRequest(u.id)} disabled={pending || requested.has(u.id)}>
              {requested.has(u.id) ? "Requested" : "Add friend"}
            </Button>
          </Card>
        ))}
      </div>
    </Card>
  );
}


