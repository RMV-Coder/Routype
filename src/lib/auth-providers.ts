import type { Provider } from "@supabase/supabase-js";

export const OAUTH_LABELS: Partial<Record<Provider, string>> = {
  google: "Google",
  github: "GitHub",
  discord: "Discord",
  facebook: "Facebook",
  twitter: "X",
  apple: "Apple",
};

/**
 * OAuth providers shown on the sign-in page. Each one must also be enabled in the
 * Supabase dashboard (Authentication → Sign In / Providers). Comma separated, e.g. "google,github".
 */
export const OAUTH_PROVIDERS: Provider[] = (process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS ?? "google,github")
  .split(",")
  .map((p) => p.trim())
  .filter((p): p is Provider => p in OAUTH_LABELS);

/** Only same-site relative paths, so redirects cannot be used as an open redirect. */
export function safeRedirectPath(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}
