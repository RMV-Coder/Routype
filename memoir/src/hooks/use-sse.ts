"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NamedEventHandler = (data: string | object | number, rawEvent: MessageEvent) => void;

export type UseSseOptions = {
    url?: string;
    onMessage?: NamedEventHandler; // default message
    onEvent?: Record<string, NamedEventHandler>; // named events
    withCredentials?: boolean;
    // connection
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    heartbeatTimeoutMs?: number; // disconnect if no heartbeat within this window
};

export type UseSseState = {
    isConnected: boolean;
    isReconnecting: boolean;
    lastEventId?: string;
    lastHeartbeatAt?: number;
    error?: string;
};

export function useSse(options: UseSseOptions = {}): UseSseState {
    const {
        url = "/api/sse",
        onMessage,
        onEvent,
        withCredentials = true,
        maxRetries = 8,
        baseDelayMs = 500,
        maxDelayMs = 10000,
        heartbeatTimeoutMs = 45000,
    } = options;

    const [state, setState] = useState<UseSseState>({ isConnected: false, isReconnecting: false });
    const esRef = useRef<EventSource | null>(null);
    const retryRef = useRef<number>(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearReconnectTimer = () => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    };

    const clearHeartbeatTimer = () => {
        if (heartbeatTimerRef.current) {
            clearTimeout(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }
    };

    const scheduleHeartbeatTimeout = useCallback(() => {
        clearHeartbeatTimer();
        heartbeatTimerRef.current = setTimeout(() => {
            // consider stale -> force reconnect
            esRef.current?.close();
            esRef.current = null;
            setState((s) => ({ ...s, isConnected: false, isReconnecting: true, error: "Heartbeat timeout" }));
            connect();
        }, heartbeatTimeoutMs);
    }, [heartbeatTimeoutMs]);

    const connect = useCallback(() => {
        // avoid duplicate connections
        if (esRef.current) return;

        const es = new EventSource(url, { withCredentials });
        esRef.current = es;

        es.onopen = () => {
            retryRef.current = 0;
            setState((s) => ({ ...s, isConnected: true, isReconnecting: false, error: undefined }));
            scheduleHeartbeatTimeout();
        };

        es.addEventListener("heartbeat", (evt) => {
            setState((s) => ({ ...s, lastHeartbeatAt: Date.now() }));
            scheduleHeartbeatTimeout();
        });

        es.addEventListener("ready", (evt) => {
            try {
                const data = JSON.parse((evt as MessageEvent).data);
                if (onEvent?.ready) onEvent.ready(data, evt as MessageEvent);
            } catch {
                // ignore parse error
            }
        });

        // forward named events
        if (onEvent) {
            Object.keys(onEvent).forEach((eventName) => {
                if (eventName === "ready") return; // already attached
                es.addEventListener(eventName, (evt) => {
                    try {
                        const data = JSON.parse((evt as MessageEvent).data);
                        onEvent[eventName]?.(data, evt as MessageEvent);
                    } catch {
                        onEvent[eventName]?.((evt as MessageEvent).data, evt as MessageEvent);
                    }
                });
            });
        }

        es.onmessage = (evt) => {
            if (evt.lastEventId) {
                setState((s) => ({ ...s, lastEventId: evt.lastEventId }));
            }
            if (onMessage) {
                try {
                    onMessage(JSON.parse(evt.data), evt);
                } catch {
                    onMessage(evt.data, evt);
                }
            }
        };

        es.onerror = () => {
            setState((s) => ({ ...s, isConnected: false }));
            es.close();
            esRef.current = null;

            if (retryRef.current >= maxRetries) {
                setState((s) => ({ ...s, isReconnecting: false, error: "Max retries reached" }));
                return;
            }

            const attempt = retryRef.current++;
            const delay = Math.min(maxDelayMs, Math.floor(baseDelayMs * Math.pow(2, attempt)));
            clearReconnectTimer();
            setState((s) => ({ ...s, isReconnecting: true }));
            reconnectTimerRef.current = setTimeout(() => {
                connect();
            }, delay);
        };
    }, [url, withCredentials, onMessage, onEvent, maxRetries, baseDelayMs, maxDelayMs, scheduleHeartbeatTimeout]);

    useEffect(() => {
        connect();
        return () => {
            clearReconnectTimer();
            clearHeartbeatTimer();
            esRef.current?.close();
            esRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    return state;
}


