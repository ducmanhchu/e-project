import { create } from "zustand";

interface AuthState {
	accessToken: string | null;
	setAccessToken: (token: string) => void;
	clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	accessToken: null,
	setAccessToken: (accessToken) => set({ accessToken }),
	clearAuth: () => set({ accessToken: null }),
}));
