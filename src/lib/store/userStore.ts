import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin: string;
}

interface UserStore {
  currentUser: string | null;
  users: UserProfile[];
  setCurrentUser: (userId: string | null) => void;
  addUser: (user: Omit<UserProfile, 'id' | 'createdAt' | 'lastLogin'>) => void;
  updateUser: (userId: string, data: Partial<UserProfile>) => void;
  deleteUser: (userId: string) => void;
  getCurrentUser: () => UserProfile | null;
}

const INITIAL_USER: UserProfile = {
  id: '1',
  name: 'Carsten',
  email: '',
  imageUrl: null,
  role: 'admin',
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString()
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      currentUser: INITIAL_USER.id,
      users: [INITIAL_USER],
      
      setCurrentUser: (userId) => set({ currentUser: userId }),
      
      getCurrentUser: () => {
        const state = get();
        return state.users.find(user => user.id === state.currentUser) || null;
      },
      
      addUser: (userData) => set((state) => ({
        users: [...state.users, {
          ...userData,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }]
      })),
      
      updateUser: (userId, data) => set((state) => ({
        users: state.users.map(user =>
          user.id === userId
            ? { ...user, ...data }
            : user
        )
      })),
      
      deleteUser: (userId) => set((state) => ({
        users: state.users.filter(user => user.id !== userId),
        currentUser: state.currentUser === userId ? null : state.currentUser
      })),
    }),
    {
      name: 'user-storage',
    }
  )
); 