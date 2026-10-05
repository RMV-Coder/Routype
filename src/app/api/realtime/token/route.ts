import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import crypto from "crypto";

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

export async function GET(): Promise<Response> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const secret = process.env.REALTIME_JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        return new Response("Server misconfigured", { status: 500 });
    }

    const payload: { sub: string; name: string | null; type: string | null } = {
        sub: String(session.user.id),
        name: session.user.name || null,
        type: (session.user as unknown as { type?: string })?.type ?? null,
    };

    const token = signJwtHS256(payload, secret, 5 * 60);
    return Response.json({ token });
}


