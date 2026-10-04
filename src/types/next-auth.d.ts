import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

// Extend the built-in types
declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    type?: string;
    image?: string;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      type?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type?: string;
  }
}