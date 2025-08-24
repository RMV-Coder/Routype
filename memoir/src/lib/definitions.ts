export type User = {
    id: string;
    email?: string | null;
    name?: string | null;
    password?: string;
    type?: string;
    image?: string | null;
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
