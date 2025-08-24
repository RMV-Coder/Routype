import { NextAuthOptions, Session, Account as NextAuthAccount, User as NextAuthUser, Profile } from "next-auth"
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { pool } from "@/lib/db";
import { User, Account } from "@/lib/definitions";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { FieldPacket, ResultSetHeader } from "mysql2";
import MySQLAdapter from "../mysql-adapter";
// interface MySQLUserWithPassword {
//     id: number;
//     name: string | null;
//     email: string;
//     password: string | null;
//     email_verified_at: Date | null;
//     image: string | null;
//     type: 'business' | 'page' | 'admin' | 'default';
// }
export const authOptions: NextAuthOptions = {
    adapter: MySQLAdapter(),
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
                const user = await getUserByEmailWithPassword(credentials.email);
                
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
                    role: user.type || "user", 
                };
            },
        }),
    ],
    
    session: {
        strategy: "database" as const,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 2 * 24 * 60 * 60, // new session every 2 days
    },

    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    },

    callbacks: {
         async signIn({ account }) {
            // Allow credentials login
            if (account?.provider === 'credentials') {
                return true;
            }

            // For OAuth providers, allow automatic linking if emails match
            if (account?.provider === 'github' || account?.provider === 'google') {
                return true; // Let the adapter handle the linking
            }

            return true;
        },
        // async signIn({ user, account}: {user: NextAuthUser & Partial<User>, account: (NextAuthAccount & Partial<Account>) | null, profile?: Profile}){
        //     let connection = null;
        //     try{
        //         connection = await pool.getConnection();
        //         if(!account){
        //             const [existing] : [User[], FieldPacket[]] = await connection.query(`SELECT * FROM user WHERE email = ? LIMIT 1`, [user.email]) as [User[], FieldPacket[]];
        //             return existing.length > 0;
        //         }
        //         const query = `
        //             SELECT u.*
        //             FROM user u
        //             INNER JOIN account a ON u.id = a.user_id
        //             WHERE a.provider = ? AND a.provider_account_id = ?
        //         `;
        //         const [linkedAccount] : [User[],FieldPacket[]] = await connection.query(query, [account.provider, account.provider_account_id]) as [User[],FieldPacket[]];
        //         if(linkedAccount.length > 0){
        //             return true; // User exists, link session
        //         }
        //         if(user.email) {
        //             const [existingUser] : [User[], FieldPacket[]] = await connection.query(`SELECT * FROM user WHERE email = ?`,[user.email]) as [User[], FieldPacket[]];
        //             let userId: number;
        //             if(existingUser.length > 0){
        //                 userId = existingUser[0].id as unknown as number;
        //             } else {
        //                 const [result] : [ResultSetHeader, FieldPacket[]] = await connection.query(`INSERT INTO user (id, email, name, image) VALUES (?, ?, ?, ?)`, [user.id, user.email, user.name || null, user.image || null]) as [ResultSetHeader, FieldPacket[]];
        //                 userId = result.insertId;
        //             }
        //             await connection.query(`
        //                 INSERT INTO account (user_id, provider, provider_account_id, access_token, refresh_token, expires_at)
        //                 VALUES ( ? , ? , ? , ? , ? , ? )`,
        //                 [ userId, account.provider, account.provider_account_id, account.access_token || null, account.refresh_token || null, account.expires_at || null]
        //             );
        //             return true;
        //         }
        //         return false;
        //     }catch(error){
        //         console.error(error);
        //         return false;
        //     }finally{
        //         if(connection) connection.release();
        //     }
        // },



        async jwt({ token, user }:  {token: JWT; user?:User}){
            if(user) {
                token.id = user.id;
                token.email = user.email;
                token.type = user.type;
            }
            return token;
        },
        async session({ session, user }: { session: Session; user: User}){
            console.log("session.user: ", JSON.stringify(session.user));
            console.log("user: ", JSON.stringify(user));//undefined
            if(session.user){
                session.user.type = user.type;
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

const getUserByEmailWithPassword = async (email: string): Promise<User | null> => {
    let connection = null;
    try{
        connection = await pool.getConnection();
        const userQuery = `
            SELECT id, name, email, password, email_verified_at, image, type
            FROM user
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
