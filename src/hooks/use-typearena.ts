import { useEffect, useMemo, useState } from "react";
import { useSocket } from "./use-socket";

export type TypeArenaParticipant = {
    id: string;
    name?: string | null;
    color: string;
    ready: boolean;
    connected: boolean;
    progress: number; // 0..100
    wpm: number;
    accuracy: number; // 0..100
    finishedAt?: number | null;
    placement?: number | null;
};

export type TypeArenaCaret = {
    [userId: string]: { index: number; ts: number };
};

export type TypeArenaPiece = { id: number | null; title: string | null; authorName: string | null };

export type TypeArenaMatch = {
    id: string;
    hostId: string;
    createdAt: number;
    status: "lobby" | "countdown" | "running" | "finished";
    text: string;
    piece: TypeArenaPiece | null;
    participants: Record<string, TypeArenaParticipant>;
    caret: TypeArenaCaret;
    startedAt?: number | null;
    winnerId?: string | null;
};

export type UseTypeArenaState = {
    isConnected: boolean;
    isReconnecting: boolean;
    me?: { id: string; name?: string | null };
    match?: TypeArenaMatch;
    countdown?: { at: number; seconds: number };
    startedAt?: number;
    ended?: { at: number; winnerId?: string | null };
    error?: string;
};

type CreateJoinAck = { ok: boolean; match?: TypeArenaMatch; error?: string };
type BasicAck = { ok: boolean; placement?: number };

export function useTypeArena(options?: { url?: string; path?: string }) {
    const [socketState, socket] = useSocket({ url: options?.url, path: options?.path });
    const [state, setState] = useState<Omit<UseTypeArenaState, "isConnected" | "isReconnecting" | "me">>({});

    useEffect(() => {
        if (!socket) return;
        const onState = (match: TypeArenaMatch) => setState((s) => ({ ...s, match }));
        const onCountdown = (payload: { at: number; seconds: number }) => setState((s) => ({ ...s, countdown: payload }));
        const onStart = (payload: { at: number }) => setState((s) => ({ ...s, startedAt: payload.at, countdown: undefined, ended: undefined }));
        const onEnded = (payload: { at: number; winnerId?: string | null }) => setState((s) => ({ ...s, ended: payload }));
        // Ghost carets: merge into the match so renderers have a single source of truth
        const onCaret = (payload: { userId: string; index: number }) =>
            setState((s) => s.match
                ? { ...s, match: { ...s.match, caret: { ...s.match.caret, [payload.userId]: { index: payload.index, ts: Date.now() } } } }
                : s);

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

    const actions = useMemo(() => {
        const call = <T,>(event: string, payload: object) =>
            new Promise<T | undefined>((resolve) => {
                if (!socket) return resolve(undefined);
                socket.timeout(8000).emit(event, payload, (err: Error | null, res: T) => resolve(err ? undefined : res));
            });
        return {
            create: async (text: string, piece?: TypeArenaPiece | null) => {
                const res = await call<CreateJoinAck>("ta:create", { text, piece });
                if (res?.match) setState((s) => ({ ...s, match: res.match, ended: undefined, startedAt: undefined }));
                return res;
            },
            join: async (matchId: string) => {
                const res = await call<CreateJoinAck>("ta:join", { matchId });
                if (res?.match) setState((s) => ({ ...s, match: res.match, error: undefined }));
                else setState((s) => ({ ...s, error: res?.error || "Could not join match" }));
                return res;
            },
            leave: async (matchId: string) => Boolean((await call<BasicAck>("ta:leave", { matchId }))?.ok),
            setReady: (matchId: string, ready: boolean) => call<BasicAck>("ta:ready", { matchId, ready }),
            start: (matchId: string) => call<BasicAck>("ta:start", { matchId }),
            sendCaret: (matchId: string, index: number) => { socket?.emit("ta:caret", { matchId, index }); },
            sendProgress: (matchId: string, progress: number, wpm?: number, accuracy?: number) => {
                socket?.emit("ta:progress", { matchId, progress, wpm, accuracy });
            },
            finish: (matchId: string, wpm: number, accuracy: number) => call<BasicAck>("ta:finish", { matchId, wpm, accuracy }),
        };
    }, [socket]);

    const fullState: UseTypeArenaState = {
        ...state,
        isConnected: socketState.isConnected,
        isReconnecting: socketState.isReconnecting,
        me: socketState.me,
        error: state.error ?? socketState.error,
    };
    return [fullState, actions] as const;
}
