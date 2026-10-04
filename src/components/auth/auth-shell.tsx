import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export function AuthShell({ subtitle, children, footer }: { subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-[95vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="grid gap-5 px-8">
          <div className="grid justify-items-center gap-2">
            <Image priority src="/logo_routype.svg" alt="Routype" width={218} height={66} />
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          <div className="grid gap-2 text-center text-xs text-muted-foreground">
            {footer}
            <span>
              By continuing you agree to our <Link className="underline" href="/privacy-policy">privacy policy</Link> and{" "}
              <Link className="underline" href="/terms-of-service">terms of service</Link>.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
