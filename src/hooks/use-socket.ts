"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ManagerOptions, SocketOptions } from "socket.io-client";

type Presence = { id: string; name?: string | null; type?: string | null };

export type UseSocketState = {
	isConnected: boolean;
	isReconnecting: boolean;
	me?: Presence;
	error?: string;
};

export type UseSocketOptions = {
	url?: string; // realtime server origin, defaults to NEXT_PUBLIC_WS_URL
	path?: string; // socket.io server path
	autoConnect?: boolean;
	reconnectionAttempts?: number;
	reconnectionDelay?: number;
	reconnectionDelayMax?: number;
};

export function useSocket(options: UseSocketOptions = {}): [UseSocketState, Socket | null] {
	const {
		url = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4001",
		path = "/realtime/socket.io",
		autoConnect = true,
		reconnectionAttempts = 10,
		reconnectionDelay = 500,
		reconnectionDelayMax = 8000,
	} = options;

	const [state, setState] = useState<UseSocketState>({ isConnected: false, isReconnecting: false });
	const socketRef = useRef<Socket | null>(null);

	const fetchToken = async (): Promise<string | null> => {
		try {
			const res = await fetch("/api/realtime/token", { credentials: "include" });
			if (!res.ok) return null;
			const json = await res.json();
			return json.token as string;
		} catch {
			return null;
		}
	};

	const socket = useMemo(() => {
		const opts: Partial<SocketOptions & ManagerOptions> = {
			path,
			autoConnect: false, // we'll connect after attaching auth token
			transports: ["websocket", "polling"],
			withCredentials: true,
			reconnection: true,
			reconnectionAttempts,
			reconnectionDelay,
			reconnectionDelayMax,
		};
		const s = io(url ?? undefined, opts);
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

		// Initial token fetch and connect
		(async () => {
			const token = await fetchToken();
			if (token) (s as unknown as { auth: { token?: string } }).auth = { token };
			if (autoConnect) s.connect();
		})();

		// Refresh token before each reconnect attempt
		s.io.on("reconnect_attempt", async () => {
			const token = await fetchToken();
			if (token) (s as unknown as { auth: { token?: string } }).auth = { token };
		});

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
	}, [autoConnect]);

	return [state, socket];
}


