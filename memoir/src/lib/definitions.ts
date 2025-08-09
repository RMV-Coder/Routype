export type User = {
    id: string;
    email?: string | null;
    name?: string | null;
    password?: string;
    role?: string;
    image?: string | null;
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
