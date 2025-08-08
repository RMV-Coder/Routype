import NextAuth, { Session } from "next-auth"
// import { NextRequest, NextResponse } from "next/server"
import { FieldPacket } from "mysql2";
import GitHubProvider from "next-auth/providers/github"
// import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { pool } from "@/lib/db";
import { User} from "@/lib/definitions";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
// import { JWT } from "next-auth/jwt";
const authOptions = {
    providers: [
        // GoogleProvider({
        //     clientId: process.env.GOOGLE_CLIENT_ID!,
        //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // }),
        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "Password" },
            },
            async authorize(credentials) {
                if(!credentials?.email || !credentials?.password){
                    console.error("Missing email or password");
                    return null;
                }
                const user = await getUserByEmail(credentials.email);
                
                if(!user) {
                    console.error("User not found");
                    return null;
                }
                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password!
                )
                
                if(!isPasswordValid){
                    console.error("Invalid password");
                    return null;
                }
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role || "user", 
                };
            },
        }),
    ],
    
    session: {
        strategy: "jwt" as const,
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    },

    callbacks: {
        async jwt({ token, user }:  {token: JWT; user?:User}){
            if(user) {
                token.id = user.id;
                token.email = user.email;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }: { session: Session; token: JWT}){
            if(session.user){
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
    },
    debug: process.env.NODE_ENV === "development",
};

const getUserByEmail = async (email: string): Promise<User | null> => {
    let connection = null;
    try{
        connection = await pool.getConnection();
        const userQuery = `
            SELECT u.password 
            FROM user u
            WHERE u.email = ?
            LIMIT 1`;
        const [rows]: [User[],FieldPacket[]] = await connection.query(userQuery, [email]) as  [User[],FieldPacket[]];
        if (rows.length === 0){
            return null;
        }
        return rows[0];
    }catch(error){
        console.error("Database error in getUser: ", error);
        return null;
    }finally{
        if(connection){
            connection.release();
        }
    }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }