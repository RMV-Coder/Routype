"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSocket } from "@/hooks/use-socket";
import { useSse } from "@/hooks/use-sse";

type ChatMessage = {
    id: string;
    tempId?: string;
    message: string;
    ts: number;
    user: { id: string; name?: string | null };
};

function initials(name?: string | null) {
    if (!name) return "?";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return name.slice(0, 1).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function Chat({ room, title }: { room?: string; title?: string }) {
    const [socketState, socket] = useSocket();
    const [pending, startTransition] = useTransition();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
        messages,
        (state: ChatMessage[], newMsg: ChatMessage) => [...state, newMsg]
    );
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useSse({
        onEvent: {
            notification: (data) => {
                // Optionally display notifications; for now no-op
            },
        },
    });

    useEffect(() => {
        if (!socket) return;
        const onChat = (payload: ChatMessage) => {
            setMessages((prev) => {
                // If matches optimistic tempId, replace
                const idx = prev.findIndex((m) => m.tempId && m.tempId === payload.tempId);
                if (idx !== -1) {
                    const next = prev.slice();
                    next[idx] = payload;
                    return next;
                }
                return [...prev, payload];
            });
        };
        socket.on("chat:new", onChat);
        if (room) socket.emit("room:join", room);
        return () => {
            socket.off("chat:new", onChat);
            if (room) socket.emit("room:leave", room);
        };
    }, [socket, room]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [optimisticMessages.length, messages.length]);

    const handleSend = async () => {
        if (!socket || !input.trim()) return;
        const tempId = `tmp_${Date.now()}`;
        const optimistic: ChatMessage = {
            id: tempId,
            tempId,
            message: input,
            ts: Date.now(),
            user: { id: socketState.me?.id || "me", name: socketState.me?.name },
        };
        addOptimisticMessage(optimistic);
        setInput("");

        startTransition(() => {
            socket.emit("chat:send", { room, message: optimistic.message, tempId });
        });

        // Persist to API (ciphertexts should be provided by client-side E2EE; for now, store plaintext fallback)
        try {
            await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomId: room,
                    ciphertexts: [],
                    textFallback: optimistic.message,
                }),
            });
        } catch {
            // Optionally show an error toast; keep optimistic UI
        }
    };

    return (
        <Card className="p-4 grid gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Online badge using a simple dot; replace with MUI Avatar badge if desired */}
                    <span className={`h-2 w-2 rounded-full ${socketState.isConnected ? "bg-green-500" : "bg-gray-400"}`} />
                    <div className="text-sm font-medium">{title || room || "Messages"}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {socketState.me ? `You: ${socketState.me.name ?? socketState.me.id}` : ""}
                </div>
            </div>
            <div className="border rounded-md h-72 overflow-y-auto p-2 space-y-2 bg-background">
                {(optimisticMessages.length ? optimisticMessages : messages).map((m) => (
                    <div key={m.id} className="flex items-start gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-xs text-muted-foreground">
                                {m.user.name || m.user.id} · {new Date(m.ts).toLocaleTimeString()}
                                {m.id.startsWith("tmp_") ? " · sending..." : ""}
                            </div>
                            <div className="text-sm">{m.message}</div>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSend();
                    }}
                />
                <Button onClick={handleSend} disabled={!socketState.isConnected || pending || !input.trim()}>
                    Send
                </Button>
            </div>
        </Card>
    );
}


