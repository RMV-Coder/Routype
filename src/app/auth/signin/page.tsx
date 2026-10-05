"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getProviders, signIn, type ClientSafeProvider } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/components/auth/auth-shell";

const ERRORS: Record<string, string> = {
  CredentialsSignin: "Wrong email or password.",
  OAuthAccountNotLinked: "This email is already registered with another sign-in method.",
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
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [providers, setProviders] = useState<ClientSafeProvider[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const code = searchParams.get("error");
    return code ? ERRORS[code] ?? "Sign in failed. Please try again." : null;
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProviders().then((p) => setProviders(Object.values(p ?? {}).filter((x) => x.type === "oauth")));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    if (res?.error) {
      setError(ERRORS[res.error] ?? "Sign in failed. Please try again.");
      setSubmitting(false);
      return;
    }
    window.location.href = res?.url || callbackUrl;
  };

  return (
    <AuthShell
      subtitle="Welcome back, writer."
      footer={<span>Don&apos;t have an account? <Link className="underline" href="/auth/signup">Sign up</Link></span>}
    >
      {providers.length > 0 && (
        <>
          <div className="grid gap-2">
            {providers.map((p) => (
              <Button key={p.id} variant="outline" onClick={() => signIn(p.id, { callbackUrl })}>Continue with {p.name}</Button>
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
