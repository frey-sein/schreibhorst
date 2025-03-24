import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProfile {
  name: string;
  email: string;
  imageUrl: string | null;
}

interface UserStore {
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: {
        name: 'Carsten',
        email: '',
        imageUrl: null,
      },
      updateProfile: (data) => set((state) => ({
        profile: { ...state.profile, ...data }
      })),
    }),
    {
      name: 'user-storage',
    }
  )
); 