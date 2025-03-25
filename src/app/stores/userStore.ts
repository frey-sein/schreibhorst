'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'user';
  avatar?: string;
}

interface UserStore {
  currentUser: User | null;
  getCurrentUser: () => User | null;
  setCurrentUser: (user: User) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      
      getCurrentUser: () => {
        return get().currentUser;
      },
      
      setCurrentUser: (user: User) => {
        set({ currentUser: user });
      },
      
      logout: () => {
        set({ currentUser: null });
      },
    }),
    {
      name: 'user-storage',
    }
  )
); 