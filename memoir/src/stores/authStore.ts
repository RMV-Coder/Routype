import { create } from 'zustand';
import { z } from 'zod';

const userSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.email().nullable,
    image: z.url().nullable(),
});

type User = z.infer<typeof userSchema>;

type userData = {
    name?: string | null;
    email?: string | null;
    role?: string | null;
}

interface AuthState {
    user: User | null;
    setUser: (userData: userData) => void;
    clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    setUser: (userData) => {
        const parsed = userSchema.safeParse(userData);
        if(parsed.success){
            set({ user: parsed.data});
        } else {
            console.warn('Invalid user data ', z.treeifyError(parsed.error));
        }
    },
    clearUser: () => set({ user: null}),
}));