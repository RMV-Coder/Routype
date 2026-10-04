import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { withTransaction } from "@/lib/db";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// POST /api/auth/signup { name, email, password }
export async function POST(req: NextRequest) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid sign up" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  try {
    const hash = await bcrypt.hash(password, 10);
    const created = await withTransaction(async (conn) => {
      const [exists] = await conn.query<RowDataPacket[]>(`SELECT id FROM user WHERE email = ? LIMIT 1`, [email]);
      if (exists.length) return false;
      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO user (name, email, password) VALUES (?, ?, ?)`, [name, email, hash]);
      await conn.query(
        `INSERT INTO account (user_id, provider_type, provider, provider_account_id, account_type) VALUES (?, ?, ?, ?, ?)`,
        [result.insertId, "credentials", "credentials", email, "credentials"],
      );
      return true;
    });
    if (!created) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    return NextResponse.json({ success: true, message: "User signed up successfully" }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
