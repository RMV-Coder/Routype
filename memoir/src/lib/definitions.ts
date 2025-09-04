export type User = {
    id: string;
    email?: string | null;
    name?: string | null;
    password?: string;
    type?: string;
    image?: string | null;
    email_verified_at ?: Date | null;
}
export interface Profile {
  name: string;
  image: string;
}

export interface Account {
  id: number;
  user_id: number;
  provider: string;
  provider_account_id: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
}

export interface Journal {
  id: number;
  user_id : number;
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'friends';
  created_at: string;
}

export interface Entry {
  id: number;
  journal_id : number;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'scheduled';
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// types/typing.ts
// export type KeyEvent = {
//   t: number;                // ms since start
//   kind: "char" | "space" | "backspace";
//   value?: string;           // typed character
//   wi: number;               // word index at time of event
//   ci: number;               // char index within word at time of event (logical)
// };

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
  t: number;          // ms since start (as before)
  absoluteT: number; // e.g., performance.now() or Date.now()
  kind: "char" | "space" | "backspace";
  value?: string;    // actual key for char
  wi: number;         // word index
  ci: number;         // char-index or extras index
  correct?: boolean;  // whether the typed char was correct
}
