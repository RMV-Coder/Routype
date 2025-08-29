import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    const [exists] = await connection.query(`SELECT id FROM user WHERE email = ? LIMIT 1`, [email]);
    if ((exists as Array<{ id: number }>).length) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    const hash = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      `INSERT INTO user (name, email, password) VALUES (?, ?, ?)`,
      [name || null, email, hash]
    );
    const insertResult = result as {insertId: number};
    const userId = insertResult.insertId;

    await connection.query(`
        INSERT INTO account (user_id, provider_type, provider, provider_account_id, account_type) VALUES (?, ?, ?, ?, ?)`,
        [userId, 'credentials', "credentials", email, "credentials"]
    );
    return NextResponse.json({ success: true, message: "User signed up successfully" }, {status: 201});
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  } finally {
    connection.release();
  }
}


