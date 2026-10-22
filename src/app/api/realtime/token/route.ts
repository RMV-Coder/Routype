import crypto from "crypto";
import { getAuth } from "@/lib/api";

function base64url(input: Buffer | string): string {
    const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwtHS256(payload: Record<string, unknown>, secret: string, expiresInSec: number): string {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = { iat: now, exp: now + expiresInSec, ...payload };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(fullPayload));
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.createHmac("sha256", secret).update(data).digest();
    return `${data}.${base64url(signature)}`;
}

// GET /api/realtime/token -> short-lived token for the realtime server (server/ws-server.cjs)
export async function GET(): Promise<Response> {
    const auth = await getAuth();
    if (!auth) return new Response("Unauthorized", { status: 401 });

    const secret = process.env.REALTIME_JWT_SECRET;
    if (!secret) return new Response("Server misconfigured", { status: 500 });

    const { data: profile } = await auth.supabase.from("profiles").select("name, type").eq("id", auth.userId).maybeSingle();
    const payload: { sub: string; name: string | null; type: string | null } = {
        sub: auth.userId,
        name: profile?.name ?? null,
        type: profile?.type ?? null,
    };

    const token = signJwtHS256(payload, secret, 5 * 60);
    return Response.json({ token });
}
