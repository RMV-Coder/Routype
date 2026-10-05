"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Sign up failed");
      const login = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/" });
      if (login?.error) throw new Error("Account created, but signing in failed. Please sign in.");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      subtitle="Create your account and start writing."
      footer={<span>Already have an account? <Link className="underline" href="/auth/signin">Sign in</Link></span>}
    >
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input placeholder="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={255} />
        <Input type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password (8+ characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Sign up"}</Button>
      </form>
    </AuthShell>
  );
}
