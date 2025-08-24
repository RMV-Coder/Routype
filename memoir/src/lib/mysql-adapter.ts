import { pool } from './db';
import { ResultSetHeader, FieldPacket, RowDataPacket } from 'mysql2';
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";
// import { User } from './definitions';
/**
 * Custom MySQL Adapter using your existing database pool
 * Much cleaner and more efficient than manual connection management
 */
export default function MySQLAdapter(): Adapter {
    return {
        async createUser(user: Omit<AdapterUser, "id">):Promise<AdapterUser> {
            try {
                const { name, email, emailVerified, image } = user
                const emailVerifiedAt = emailVerified ? new Date(emailVerified) : null
                
                const [result] = await pool.execute(
                    `INSERT INTO user (name, email, email_verified_at, image, is_active) 
                     VALUES (?, ?, ?, ?, 1)`,
                    [name, email, emailVerifiedAt, image]
                ) as [ResultSetHeader, FieldPacket[]]

                const userId = result.insertId
                
                // Return the created user
                const [rows] = await pool.execute(
                    `SELECT id, name, email, email_verified_at as emailVerified, image 
                     FROM user WHERE id = ?`,
                    [userId]
                ) as [RowDataPacket[], FieldPacket[]]

                const createdUser = rows[0]
                return {
                    id: createdUser.id.toString(),
                    name: createdUser.name,
                    email: createdUser.email,
                    emailVerified: createdUser.emailVerified,
                    image: createdUser.image
                }
            } catch (error) {
                console.error('Error creating user:', error)
                throw error
            }
        },

        async getUser(id): Promise<AdapterUser | null> {
            try {
                const [rows] = await pool.execute(
                    `SELECT id, name, email, email_verified_at as emailVerified, image 
                     FROM user WHERE id = ?`,
                    [id]
                ) as [RowDataPacket[], FieldPacket[]]

                if (rows.length === 0) return null

                const user = rows[0]
                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    image: user.image
                }
            } catch (error) {
                console.error('Error getting user:', error)
                return null
            }
        },

        async getUserByEmail(email): Promise<AdapterUser | null> {
            try {
                const [rows] = await pool.execute(
                    `SELECT id, name, email, email_verified_at as emailVerified, image 
                     FROM user WHERE email = ?`,
                    [email]
                ) as [RowDataPacket[], FieldPacket[]]

                if (rows.length === 0) return null

                const user = rows[0]
                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    image: user.image
                }
            } catch (error) {
                console.error('Error getting user by email:', error)
                return null
            }
        },

        async getUserByAccount({ providerAccountId, provider }): Promise<AdapterUser | null> {
            try {
                const [rows] = await pool.execute(
                    `SELECT u.id, u.name, u.email, u.email_verified_at as emailVerified, u.image 
                     FROM user u 
                     JOIN account a ON u.id = a.user_id 
                     WHERE a.provider = ? AND a.provider_account_id = ?`,
                    [provider, providerAccountId]
                ) as [RowDataPacket[], FieldPacket[]]

                if (rows.length === 0) return null

                const user = rows[0]
                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    image: user.image
                }
            } catch (error) {
                console.error('Error getting user by account:', error)
                return null
            }
        },

        async updateUser(user): Promise<AdapterUser> {
            try {
                const { id, name, email, emailVerified, image } = user
                const emailVerifiedAt = emailVerified ? new Date(emailVerified) : null
                
                await pool.execute(
                    `UPDATE user 
                     SET name = ?, email = ?, email_verified_at = ?, image = ?, last_update = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [name, email, emailVerifiedAt, image, id]
                )

                const [rows] = await pool.execute(
                    `SELECT id, name, email, email_verified_at as emailVerified, image
                    FROM user WHERE id = ?`, [id]
                ) as [RowDataPacket[], FieldPacket[]];

                if (rows.length == 0){
                    throw new Error(`User with id ${id} not found.`);
                }
                const updatedUser = rows[0];

                return {
                    id: updatedUser.id.toString(),
                    name: updatedUser.name,
                    email: updatedUser.email,
                    emailVerified: updatedUser.emailVerified,
                    image: updatedUser.image
                }
            } catch (error) {
                console.error('Error updating user:', error)
                throw error
            }
        },

        async deleteUser(userId): Promise<void> {
            try {
                await pool.execute(`DELETE FROM user WHERE id = ?`, [userId])
            } catch (error) {
                console.error('Error deleting user:', error)
                throw error
            }
        },

        async linkAccount(account: AdapterAccount): Promise<AdapterAccount | null | undefined> {
            try {
                const {
                    userId,
                    provider,
                    providerAccountId,
                    type,
                    refresh_token,
                    access_token,
                    expires_at,
                    token_type,
                    scope,
                    id_token,
                    session_state
                } = account;

                console.log('🔗 Linking account - Full account object:', JSON.stringify(account, null, 2));
                console.log('🔗 Provider Account ID specifically:', providerAccountId);

                // Ensure providerAccountId is not null/undefined
                if (!providerAccountId) {
                    console.error('❌ providerAccountId is required but was:', providerAccountId);
                    console.error('❌ Full account object:', account);
                    throw new Error('providerAccountId cannot be null or undefined');
                }

                const toNullIfEmpty = (value: number|string|undefined) => (value === undefined || value === '') ? null : value;

                await pool.execute(
                    `INSERT INTO account 
                     (user_id, provider, provider_account_id, account_type, provider_type,
                      refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        provider,
                        providerAccountId,
                        type,
                        provider, // provider_type = provider for most cases
                        toNullIfEmpty(refresh_token),
                        toNullIfEmpty(access_token),
                        toNullIfEmpty(expires_at),
                        toNullIfEmpty(token_type),
                        toNullIfEmpty(scope),
                        toNullIfEmpty(id_token),
                        toNullIfEmpty(session_state)
                    ]
                )

                return {
                    userId: account.userId,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    type: account.type,
                    refresh_token: account.refresh_token,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state
                };
            } catch (error) {
                console.error('Error linking account:', error)
                throw error
            }
        },

        async unlinkAccount({ providerAccountId, provider }: {providerAccountId:string, provider:string}): Promise<void>  {
            try {
                await pool.execute(
                    `DELETE FROM account WHERE provider = ? AND provider_account_id = ?`,
                    [provider, providerAccountId]
                )
            } catch (error) {
                console.error('Error unlinking account:', error)
                throw error
            }
        },

        async createSession({ sessionToken, userId, expires }): Promise<AdapterSession> {
            try {
                // Generate a session ID
                const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                
                await pool.execute(
                    `INSERT INTO session (session_id, session_token, user_id, expires) 
                     VALUES (?, ?, ?, ?)`,
                    [sessionId, sessionToken, userId, expires]
                )

                return {
                    sessionToken,
                    userId: userId.toString(),
                    expires
                }
            } catch (error) {
                console.error('Error creating session:', error)
                throw error
            }
        },

        async getSessionAndUser(sessionToken): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
            try {
                const [rows] = await pool.execute(
                    `SELECT 
                       s.session_token as sessionToken,
                       s.user_id,
                       s.expires,
                       u.id,
                       u.name,
                       u.email,
                       u.email_verified_at as emailVerified,
                       u.image
                     FROM session s 
                     JOIN user u ON s.user_id = u.id 
                     WHERE s.session_token = ? AND s.expires > NOW()`,
                    [sessionToken]
                ) as [RowDataPacket[], FieldPacket[]]

                if (rows.length === 0) return null

                const { sessionToken: token, user_id, expires, id, name, email, emailVerified, image } = rows[0]

                return {
                    session: {
                        sessionToken: token,
                        userId: user_id.toString(),
                        expires: expires
                    },
                    user: {
                        id: id.toString(),
                        name,
                        email,
                        emailVerified,
                        image
                    }
                }
            } catch (error) {
                console.error('Error getting session and user:', error)
                return null
            }
        },

        async updateSession({ sessionToken, expires }): Promise<AdapterSession | null | undefined> {
            try {
                await pool.execute(
                    `UPDATE session SET expires = ? WHERE session_token = ?`,
                    [expires, sessionToken]
                )

                const [rows] = await pool.execute(
                    `SELECT session_token as sessionToken, user_id, expires 
                     FROM session WHERE session_token = ?`,
                    [sessionToken]
                ) as [RowDataPacket[], FieldPacket[]]

                if (rows.length === 0) return null

                const session = rows[0]
                return {
                    sessionToken: session.sessionToken,
                    userId: session.user_id.toString(),
                    expires: session.expires
                }
            } catch (error) {
                console.error('Error updating session:', error)
                return null
            }
        },

        async deleteSession(sessionToken): Promise<void> {
            try {
                await pool.execute(
                    `DELETE FROM session WHERE session_token = ?`,
                    [sessionToken]
                )
            } catch (error) {
                console.error('Error deleting session:', error)
                throw error
            }
        },

        async createVerificationToken({ identifier, expires, token }):  Promise<VerificationToken | null | undefined> {
            try {
                await pool.execute(
                    `INSERT INTO verification_token (identifier, token, expires) 
                     VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE token = VALUES(token), expires = VALUES(expires)`,
                    [identifier, token, expires]
                )

                return { identifier, token, expires }
            } catch (error) {
                console.error('Error creating verification token:', error)
                throw error
            }
        },

        async useVerificationToken({ identifier, token }) {
            try {
                const [rows] = await pool.execute(
                    `SELECT identifier, token, expires 
                     FROM verification_token 
                     WHERE identifier = ? AND token = ? AND expires > NOW()`,
                    [identifier, token]
                ) as [RowDataPacket[], FieldPacket[]]

                if (rows.length === 0) return null

                // Delete the token after use (one-time use)
                await pool.execute(
                    `DELETE FROM verification_token WHERE identifier = ? AND token = ?`,
                    [identifier, token]
                )

                const verificationToken = rows[0]
                return {
                    identifier: verificationToken.identifier,
                    token: verificationToken.token,
                    expires: verificationToken.expires
                }
            } catch (error) {
                console.error('Error using verification token:', error)
                return null
            }
        }
    }
}