import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

// Extend the built-in types
declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role?: string;
    image?: string;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role?: string;
  }
}