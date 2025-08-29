import { useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "./use-socket";

export type TypeArenaParticipant = {
    id: string;
    name?: string | null;
    ready: boolean;
    progress: number; // 0..100
    wpm: number;
    accuracy: number; // 0..100
    finishedAt?: number;
};

export type TypeArenaCaret = {
    [userId: string]: { index: number; ts: number };
};

export type TypeArenaMatch = {
    id: string;
    createdAt: number;
    status: "lobby" | "countdown" | "running" | "finished";
    text: string;
    participants: Record<string, TypeArenaParticipant>;
    caret: TypeArenaCaret;
    winnerId?: string | null;
};

export type UseTypeArenaState = {
    isConnected: boolean;
    isReconnecting: boolean;
    match?: TypeArenaMatch;
    countdown?: { at: number; seconds: number };
    startedAt?: number;
    ended?: { at: number; winnerId?: string | null };
    lastCaret?: { userId: string; index: number; ts: number };
    error?: string;
};

export function useTypeArena(options?: {
    url?: string;
    path?: string;
}) {
    const [socketState, socket] = useSocket({ url: options?.url, path: options?.path });
    const [state, setState] = useState<UseTypeArenaState>({
        isConnected: false,
        isReconnecting: false,
    });

    const matchRef = useRef<TypeArenaMatch | undefined>(undefined);

    useEffect(() => {
        setState((s) => ({
            ...s,
            isConnected: socketState.isConnected,
            isReconnecting: socketState.isReconnecting,
        }));
    }, [socketState.isConnected, socketState.isReconnecting]);

    useEffect(() => {
        if (!socket) return;

        const onState = (match: TypeArenaMatch) => {
            matchRef.current = match;
            setState((s) => ({ ...s, match }));
        };
        const onCountdown = (payload: { at: number; seconds: number }) => {
            setState((s) => ({ ...s, countdown: payload }));
        };
        const onStart = (payload: { at: number }) => {
            setState((s) => ({ ...s, startedAt: payload.at, ended: undefined }));
        };
        const onEnded = (payload: { at: number; winnerId?: string | null }) => {
            setState((s) => ({ ...s, ended: payload }));
        };
        const onCaret = (payload: { userId: string; index: number }) => {
            setState((s) => ({ ...s, lastCaret: { ...payload, ts: Date.now() } }));
        };

        socket.on("ta:state", onState);
        socket.on("ta:countdown", onCountdown);
        socket.on("ta:start", onStart);
        socket.on("ta:ended", onEnded);
        socket.on("ta:caret", onCaret);

        return () => {
            socket.off("ta:state", onState);
            socket.off("ta:countdown", onCountdown);
            socket.off("ta:start", onStart);
            socket.off("ta:ended", onEnded);
            socket.off("ta:caret", onCaret);
        };
    }, [socket]);

    type CreateJoinAck = { ok: boolean; match?: TypeArenaMatch };
    type BasicAck = { ok: boolean };

    const actions = useMemo(() => {
        return {
            create: async (text?: string): Promise<TypeArenaMatch | undefined> => {
                if (!socket) return;
                return new Promise<TypeArenaMatch | undefined>((resolve) => {
                    socket.emit("ta:create", { text }, (res: CreateJoinAck) => {
                        if (res?.ok && res.match) {
                            resolve(res.match as TypeArenaMatch);
                        } else {
                            resolve(undefined);
                        }
                    });
                });
            },
            join: async (matchId: string): Promise<TypeArenaMatch | undefined> => {
                if (!socket) return;
                return new Promise<TypeArenaMatch | undefined>((resolve) => {
                    socket.emit("ta:join", { matchId }, (res: CreateJoinAck) => {
                        if (res?.ok && res.match) resolve(res.match as TypeArenaMatch);
                        else resolve(undefined);
                    });
                });
            },
            leave: async (matchId: string): Promise<boolean> => {
                if (!socket) return false;
                return new Promise<boolean>((resolve) => {
                    socket.emit("ta:leave", { matchId }, (res: BasicAck) => {
                        resolve(Boolean(res?.ok));
                    });
                });
            },
            setReady: (matchId: string, ready: boolean) => {
                if (!socket) return;
                socket.emit("ta:ready", { matchId, ready });
            },
            sendCaret: (matchId: string, index: number) => {
                if (!socket) return;
                socket.emit("ta:caret", { matchId, index });
            },
            sendProgress: (matchId: string, progress: number, wpm?: number, accuracy?: number) => {
                if (!socket) return;
                socket.emit("ta:progress", { matchId, progress, wpm, accuracy });
            },
            finish: (matchId: string) => {
                if (!socket) return;
                socket.emit("ta:finish", { matchId });
            },
        };
    }, [socket]);

    return [state, actions] as const;
}


