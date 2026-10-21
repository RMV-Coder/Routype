'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type CurrentUser = { id: string; email: string | null; name: string | null; image: string | null };

type AuthState = { user: CurrentUser | null; loading: boolean };

const AuthContext = createContext<AuthState>({ user: null, loading: true });

/** The signed-in user (with their profile name and avatar), kept in sync with Supabase Auth. */
export function useCurrentUser() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({ user: null, loading: true });

    useEffect(() => {
        // Created here (not during render) so pages can prerender without Supabase env vars.
        const supabase = createClient();
        let cancelled = false;
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                if (!cancelled) setState({ user: null, loading: false });
                return;
            }
            const { data: profile } = await supabase.from('profiles').select('name, image').eq('id', user.id).maybeSingle();
            if (!cancelled) {
                setState({
                    user: { id: user.id, email: user.email ?? null, name: profile?.name ?? null, image: profile?.image ?? null },
                    loading: false,
                });
            }
        };
        load();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            // Defer: Supabase calls inside this callback can deadlock the auth lock.
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(load, 0);
        });
        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
