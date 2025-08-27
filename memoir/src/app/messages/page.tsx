"use client";

import { useEffect, useMemo, useState } from "react";
import { Chat } from "@/components/custom/chat";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Room = {
  id: string;
  title: string;
  kind: "dm" | "group";
  image?: string | string[] | null;
};

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cursor, setCursor] = useState<{ cursorTs: string; cursorId: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");

  const fetchRooms = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "15");
      if (!reset && cursor?.cursorTs) {
        params.set("cursorTs", cursor.cursorTs);
        params.set("cursorId", String(cursor.cursorId));
      }
      const res = await fetch(`/api/messages/rooms?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const json = await res.json();
      setRooms((prev) => (reset ? json.items : [...prev, ...json.items]));
      setCursor(json.nextCursor || null);
      if (reset && json.items?.length) setSelectedId(json.items[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return rooms;
    return rooms.filter((r) => r.title.toLowerCase().includes(q));
  }, [rooms, query]);

  const selected = rooms.find((r) => r.id === selectedId) || filtered[0];

  return (
    <div className="grid grid-cols-12 gap-4 p-2">
      <Card className="col-span-12 md:col-span-4 lg:col-span-3 p-3 gap-3">
        {/* <div className="space-y-1"> */}
          <div className="text-sm font-medium">Messages</div>
          {/* <div className="text-xs text-muted-foreground">Friend-to-me (DMs) and Friends-to-me (Groups)</div> */}
        {/* </div> */}
        <Input
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="overflow-y-auto rounded-md border bg-background divide-y">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 ${selected?.id === r.id ? "bg-accent" : ""}`}
            >
              {/* Simple avatar: single image or stacked two */}
              {Array.isArray(r.image) ? (
                <span className="relative inline-flex -space-x-2">
                  <img src={r.image[0]} alt="" className="h-6 w-6 rounded-full border" />
                  {r.image[1] && <img src={r.image[1]} alt="" className="h-6 w-6 rounded-full border" />}
                </span>
              ) : r.image ? (
                <img src={r.image} alt="" className="h-6 w-6 rounded-full border" />
              ) : (
                <span className="h-6 w-6 rounded-full bg-muted inline-block" />
              )}
              <span>{r.title}</span>
            </button>
          ))}
          {cursor && (
            <button
              onClick={() => fetchRooms(false)}
              className="w-full text-center text-sm py-2 hover:bg-accent"
              disabled={loading}
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      </Card>
      <div className="col-span-12 md:col-span-8 lg:col-span-9">
        <Chat room={selected?.id} title={selected?.title} />
      </div>
    </div>
  );
}