import type { NextAuthOptions, Session } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { FieldPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import type { User } from "@/lib/definitions";
import MySQLAdapter from "../mysql-adapter";

/** OAuth providers are only registered when their credentials are configured. */
function buildProviders(): Provider[] {
    const providers: Provider[] = [];
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        providers.push(GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }));
    }
    if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
        providers.push(GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            // GitHub now sends `iss` on the OAuth callback (RFC 9207); openid-client rejects
            // it ("issuer must be configured on the issuer") unless the provider declares one.
            issuer: process.env.GITHUB_OAUTH_ISSUER || "https://github.com/login/oauth",
        }));
    }
    providers.push(CredentialsProvider({
        name: "Email & Password",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) return null;
            const user = await getUserByEmailWithPassword(credentials.email);
            if (!user?.password) return null;
            const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
            if (!isPasswordValid) return null;
            return {
                id: String(user.id),
                name: user.name ?? null,
                email: user.email ?? null,
                image: user.image ?? undefined,
                type: user.type,
            };
        },
    }));
    return providers;
}

export const authOptions: NextAuthOptions = {
    adapter: MySQLAdapter(),
    providers: buildProviders(),

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 2 * 24 * 60 * 60, // refresh every 2 days
    },

    secret: process.env.NEXTAUTH_SECRET,

    callbacks: {
        async jwt({ token, user }: { token: JWT; user?: User }) {
            if (user) {
                token.id = String(user.id);
                token.email = user.email;
                token.type = user.type;
            }
            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user) {
                session.user.id = token?.id ?? session.user.id;
                session.user.name = token?.name ?? session.user.name;
                session.user.email = token?.email ?? session.user.email;
                session.user.image = token?.picture ?? session.user.image;
                session.user.type = token?.type ?? session.user.type ?? "default";
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
        error: "/auth/signin",
    },
};

async function getUserByEmailWithPassword(email: string): Promise<User | null> {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, password, email_verified_at, image, type
             FROM user
             WHERE email = ? AND is_active = 1
             LIMIT 1`,
            [email],
        ) as [User[], FieldPacket[]];
        return rows[0] ?? null;
    } catch (error) {
        console.error("Database error in getUserByEmailWithPassword: ", error);
        return null;
    }
}
