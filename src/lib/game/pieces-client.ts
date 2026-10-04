import type { PieceFilter } from "./modes";

export interface TypingPiece {
  id: number;
  title: string | null;
  kind: string;
  authorId: number;
  authorName: string | null;
  text: string;
}

/** Fetches a random community piece that its author allowed in TypeArena. */
export async function fetchPiece(kind: PieceFilter, exclude?: number, id?: number): Promise<TypingPiece | null> {
  const params = new URLSearchParams();
  if (id) params.set("id", String(id));
  if (kind !== "any") params.set("kind", kind);
  if (exclude) params.set("exclude", String(exclude));
  const res = await fetch(`/api/typing/pieces?${params}`);
  if (!res.ok) return null;
  return (await res.json()).piece ?? null;
}
