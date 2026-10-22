"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { OAUTH_LABELS, OAUTH_PROVIDERS, safeRedirectPath } from "@/lib/auth-providers";

const ERRORS: Record<string, string> = {
  callback: "Sign in could not be completed. Please try again.",
  invalid_credentials: "Wrong email or password.",
  email_not_confirmed: "Confirm your email first — check your inbox for the link.",
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const searchParams = useSearchParams();
  const callbackUrl = safeRedirectPath(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const code = searchParams.get("error");
    return code ? ERRORS[code] ?? "Sign in failed. Please try again." : null;
  });
  const [submitting, setSubmitting] = useState(false);

  const onOAuth = async (provider: Provider) => {
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`;
    const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setError(error.message);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(ERRORS[error.code ?? ""] ?? "Sign in failed. Please try again.");
      setSubmitting(false);
      return;
    }
    window.location.href = callbackUrl;
  };

  return (
    <AuthShell
      subtitle="Welcome back, writer."
      footer={<span>Don&apos;t have an account? <Link className="underline" href="/auth/signup">Sign up</Link></span>}
    >
      {OAUTH_PROVIDERS.length > 0 && (
        <>
          <div className="grid gap-2">
            {OAUTH_PROVIDERS.map((p) => (
              <Button key={p} variant="outline" onClick={() => onOAuth(p)}>Continue with {OAUTH_LABELS[p]}</Button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><Separator className="flex-1" /> or <Separator className="flex-1" /></div>
        </>
      )}
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <Input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthShell>
  );
}
