import { create } from "zustand";

import { api } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthState = {
  user: User | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  hydrate: async () => {
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  login: async (username, password) => {
    const response = await api.post<{ user: User }>("/auth/login", { username, password });
    set({ user: response.user, loading: false });
  },
  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null });
  }
}));
