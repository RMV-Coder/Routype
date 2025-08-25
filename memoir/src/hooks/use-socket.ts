"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Presence = { id: string; name?: string | null; type?: string | null };

export type UseSocketState = {
    isConnected: boolean;
    isReconnecting: boolean;
    me?: Presence;
    error?: string;
};

export type UseSocketOptions = {
    url?: string; // ws host, omit to use same origin
    path?: string; // socket.io server path
    autoConnect?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
};

export function useSocket(options: UseSocketOptions = {}): [UseSocketState, Socket | null] {
    const {
        url,
        path = "/realtime/socket.io",
        autoConnect = true,
        reconnectionAttempts = 10,
        reconnectionDelay = 500,
        reconnectionDelayMax = 8000,
    } = options;

    const [state, setState] = useState<UseSocketState>({ isConnected: false, isReconnecting: false });
    const socketRef = useRef<Socket | null>(null);

    const socket = useMemo(() => {
        const s = io(url ?? undefined, {
            path,
            autoConnect,
            transports: ["websocket", "polling"],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts,
            reconnectionDelay,
            reconnectionDelayMax,
        });
        socketRef.current = s;
        return s;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, path]);

    useEffect(() => {
        const s = socketRef.current;
        if (!s) return;

        const onConnect = () => setState((x) => ({ ...x, isConnected: true, isReconnecting: false, error: undefined }));
        const onDisconnect = () => setState((x) => ({ ...x, isConnected: false }));
        const onReconnectAttempt = () => setState((x) => ({ ...x, isReconnecting: true }));
        const onReconnectFailed = () => setState((x) => ({ ...x, isReconnecting: false, error: "Reconnect failed" }));
        const onError = (err: Error) => setState((x) => ({ ...x, error: String(err?.message || err || "socket error") }));
        const onMe = (me: Presence) => setState((x) => ({ ...x, me }));

        s.on("connect", onConnect);
        s.on("disconnect", onDisconnect);
        s.io.on("reconnect_attempt", onReconnectAttempt);
        s.io.on("reconnect_failed", onReconnectFailed);
        s.on("connect_error", onError);
        s.on("presence:me", onMe);

        return () => {
            s.off("connect", onConnect);
            s.off("disconnect", onDisconnect);
            s.io.off("reconnect_attempt", onReconnectAttempt);
            s.io.off("reconnect_failed", onReconnectFailed);
            s.off("connect_error", onError);
            s.off("presence:me", onMe);
            s.close();
        };
    }, []);

    return [state, socket];
}


