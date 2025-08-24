import mysql from "mysql2/promise"

export const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0, 
    charset: 'utf8mb4' // Better unicode support
})

// Helper function for transactions (bonus feature)
export async function withTransaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const result = await callback(connection)
        await connection.commit()
        return result
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
}