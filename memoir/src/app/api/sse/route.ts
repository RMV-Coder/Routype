import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

type SseMessage = {
    event?: string;
    id?: string;
    data: unknown;
};

const encoder = new TextEncoder();

// Simple in-memory per-user connection limiter
const userConnectionCounts: Map<string, number> = new Map();
const MAX_CONNECTIONS_PER_USER = 3;

function formatSseMessage(message: SseMessage): string {
    const lines: string[] = [];
    if (message.id) lines.push(`id: ${message.id}`);
    if (message.event) lines.push(`event: ${message.event}`);
    lines.push(`data: ${JSON.stringify(message.data)}`);
    lines.push("\n");
    return lines.join("\n");
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = String(session.user.id);
    const clientLastEventId = request.headers.get("last-event-id") || undefined;

    const current = userConnectionCounts.get(userId) || 0;
    if (current >= MAX_CONNECTIONS_PER_USER) {
        return new Response("Too many connections", { status: 429 });
    }
    userConnectionCounts.set(userId, current + 1);

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            // Immediately send a ready event and optional replay hint
            const initMsg = formatSseMessage({
                event: "ready",
                data: {
                    userId,
                    now: Date.now(),
                    resumeFromId: clientLastEventId ?? null,
                },
            });
            controller.enqueue(encoder.encode(initMsg));

            // Heartbeat to keep the connection alive across proxies/CDNs
            const heartbeatIntervalMs = 15000;
            const heartbeat = setInterval(() => {
                controller.enqueue(
                    encoder.encode(formatSseMessage({ event: "heartbeat", data: { t: Date.now() } }))
                );
            }, heartbeatIntervalMs);

            // Example: push a welcome notification as a named event
            const welcomeMsg = formatSseMessage({
                event: "notification",
                id: `${Date.now()}`,
                data: { kind: "welcome", message: "SSE connected" },
            });
            controller.enqueue(encoder.encode(welcomeMsg));

            // Clean up on client disconnect
            const abortHandler = () => {
                clearInterval(heartbeat);
                controller.close();
                const now = (userConnectionCounts.get(userId) || 1) - 1;
                if (now <= 0) userConnectionCounts.delete(userId);
                else userConnectionCounts.set(userId, now);
            };
            request.signal.addEventListener("abort", abortHandler, { once: true });
        },
        cancel() {
            // No-op; start() registered abort handler already handles cleanup
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            Connection: "keep-alive",
            // Disable proxy buffering (Nginx) to ensure immediate flush
            "X-Accel-Buffering": "no",
        },
    });
}


