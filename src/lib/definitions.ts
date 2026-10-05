export type User = {
    id: string;
    email?: string | null;
    name?: string | null;
    password?: string;
    type?: string;
    image?: string | null;
    email_verified_at ?: Date | null;
}

export type Visibility = 'public' | 'friends' | 'private';

export interface Journal {
  id: number;
  user_id : number;
  title: string;
  description: string | null;
  visibility: Visibility;
  created_at: string;
  entry_count?: number;
}

export const PIECE_KINDS = [
  'story', 'poetry', 'riddle', 'novel', 'phrase', 'thought', 'article', 'blog', 'diary',
] as const;
export type PieceKind = typeof PIECE_KINDS[number];

export const PIECE_KIND_LABELS: Record<PieceKind, string> = {
  story: 'Story',
  poetry: 'Poetry',
  riddle: 'Riddle',
  novel: 'Novel chapter',
  phrase: 'Phrase',
  thought: 'Thought',
  article: 'Article',
  blog: 'Blog post',
  diary: 'Diary',
};

export type EntryStatus = 'draft' | 'published' | 'scheduled';

export interface Entry {
  id: number;
  journal_id : number;
  title: string | null;
  kind: PieceKind;
  content: string;
  visibility: Visibility;
  allow_typing: boolean;
  status: EntryStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** An entry joined with its author, as shown in feeds and on the read page. */
export interface EntryWithAuthor extends Entry {
  author_id: number;
  author_name: string | null;
  author_image: string | null;
  journal_title: string;
}

// ----------------------------------------------------------------------------
// Typing engine
// ----------------------------------------------------------------------------

export type SlotState = "pending" | "correct" | "mismatch";

export type WordRender = {
  expected: string;             // the word
  slots: SlotState[];           // one per expected char
  mismatches: Record<number, string>; // ci -> wrong char user typed
  extras: string[];             // extra wrong chars beyond word length
  caretIndex: number;           // logical caret pos within word (0..)
  committed: boolean;           // after pressing space
};

export interface MetricPoint {
  second: number;       // e.g. 0, 1, 2, …
  chars: number;        // total characters typed in that 1-second window
  errors: number;       // errors in that second
  rawWPM: number;       // (chars / 5) * 60
};

export interface KeyEvent {
  t: number;          // ms since start
  absoluteT: number;  // performance.now() at the time of the event
  kind: "char" | "space" | "backspace";
  value?: string;     // actual key for char
  wi: number;         // word index
  ci: number;         // char-index or extras index
  correct?: boolean;  // whether the typed char was correct
}

/** Another player's caret, rendered on top of the text. */
export interface GhostCaret {
  id: string;
  name: string;
  /** Global character index into `words.join(" ")`. */
  index: number;
  color: string;
}
