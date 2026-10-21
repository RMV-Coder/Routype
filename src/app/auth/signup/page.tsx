"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkInbox, setCheckInbox] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    // The profile row is created from `data.name` by the on_auth_user_created trigger.
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }
    // With email confirmation on, there is no session until the link is clicked.
    if (!data.session) {
      setCheckInbox(true);
      setSubmitting(false);
      return;
    }
    window.location.href = "/";
  };

  return (
    <AuthShell
      subtitle="Create your account and start writing."
      footer={<span>Already have an account? <Link className="underline" href="/auth/signin">Sign in</Link></span>}
    >
      {checkInbox ? (
        <p className="text-center text-sm">Almost there — we sent a confirmation link to <strong>{email.trim()}</strong>.</p>
      ) : (
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Input placeholder="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={255} />
          <Input type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (8+ characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Sign up"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
