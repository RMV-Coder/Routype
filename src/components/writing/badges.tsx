import { Globe, Keyboard, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIECE_KIND_LABELS, type PieceKind, type Visibility } from "@/lib/definitions";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export function KindBadge({ kind }: { kind: PieceKind }) {
  return <Badge>{PIECE_KIND_LABELS[kind] ?? kind}</Badge>;
}

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const Icon = visibility === "public" ? Globe : visibility === "friends" ? Users : Lock;
  return <Badge><Icon className="size-3" /> {visibility}</Badge>;
}

export function TypingBadge() {
  return <Badge className="border-primary/40 text-primary"><Keyboard className="size-3" /> in TypeArena</Badge>;
}

export function StatusBadge({ status, scheduledAt }: { status: string; scheduledAt?: string | null }) {
  if (status === "published") return null;
  return (
    <Badge className={status === "draft" ? "border-amber-500/50 text-amber-600" : "border-sky-500/50 text-sky-600"}>
      {status === "scheduled" && scheduledAt ? `scheduled ${new Date(scheduledAt).toLocaleString()}` : status}
    </Badge>
  );
}
