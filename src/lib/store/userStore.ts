import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import bcryptjs from 'bcryptjs';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin: string;
  hashedPassword?: string;
}

interface UserStore {
  currentUser: string | null;
  users: UserProfile[];
  setCurrentUser: (userId: string | null) => void;
  addUser: (user: Omit<UserProfile, 'id' | 'createdAt' | 'lastLogin'> & { password?: string }) => void;
  updateUser: (userId: string, data: Partial<UserProfile> & { password?: string }) => void;
  deleteUser: (userId: string) => void;
  getCurrentUser: () => UserProfile | null;
  verifyPassword: (userId: string, password: string) => Promise<boolean>;
  setPassword: (userId: string, password: string) => Promise<void>;
  initializeAdminPassword: () => void;
}

const INITIAL_USER: UserProfile = {
  id: '1',
  name: 'Carsten',
  email: '',
  imageUrl: null,
  role: 'admin',
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
  hashedPassword: bcryptjs.hashSync('admin', 10) // Standard Admin-Passwort
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [INITIAL_USER],
      
      setCurrentUser: (userId) => {
        console.log('Setting current user:', userId);
        set((state) => {
          // Aktualisiere auch das lastLogin-Datum
          const updatedUsers = state.users.map(user =>
            user.id === userId
              ? { ...user, lastLogin: new Date().toISOString() }
              : user
          );
          
          return {
            currentUser: userId,
            users: updatedUsers
          };
        });
      },
      
      getCurrentUser: () => {
        const state = get();
        const user = state.users.find(user => user.id === state.currentUser);
        console.log('Getting current user:', user);
        return user || null;
      },
      
      addUser: (userData) => {
        console.log('Adding new user:', userData);
        const { password, ...rest } = userData;
        const hashedPassword = password ? bcryptjs.hashSync(password, 10) : undefined;
        
        set((state) => ({
          users: [...state.users, {
            ...rest,
            hashedPassword,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          }]
        }));
      },
      
      updateUser: (userId, data) => {
        console.log('Updating user:', userId, data);
        const { password, ...rest } = data;
        const updates = { ...rest };
        
        if (password) {
          updates.hashedPassword = bcryptjs.hashSync(password, 10);
        }
        
        set((state) => ({
          users: state.users.map(user =>
            user.id === userId
              ? { ...user, ...updates }
              : user
          )
        }));
      },
      
      deleteUser: (userId) => {
        console.log('Deleting user:', userId);
        set((state) => ({
          users: state.users.filter(user => user.id !== userId),
          currentUser: state.currentUser === userId ? null : state.currentUser
        }));
      },

      verifyPassword: async (userId, password) => {
        console.log('Verifying password for user:', userId);
        const state = get();
        const user = state.users.find(u => u.id === userId);
        
        if (!user?.hashedPassword) {
          console.log('No hashed password found for user');
          return false;
        }
        
        const isValid = await bcryptjs.compare(password, user.hashedPassword);
        console.log('Password validation result:', isValid);
        return isValid;
      },

      setPassword: async (userId, password) => {
        console.log('Setting password for user:', userId);
        const hashedPassword = await bcryptjs.hash(password, 10);
        set((state) => ({
          users: state.users.map(user =>
            user.id === userId
              ? { ...user, hashedPassword }
              : user
          )
        }));
      },

      initializeAdminPassword: () => {
        console.log('Initializing admin password');
        const state = get();
        const adminUser = state.users.find(u => u.role === 'admin');
        
        if (adminUser && !adminUser.hashedPassword) {
          console.log('Setting default admin password');
          set((state) => ({
            users: state.users.map(user =>
              user.id === adminUser.id
                ? { ...user, hashedPassword: bcryptjs.hashSync('admin', 10) }
                : user
            )
          }));
        }
      }
    }),
    {
      name: 'user-storage',
      onRehydrateStorage: () => (state) => {
        console.log('Store rehydrated:', state);
        if (state) {
          state.initializeAdminPassword();
        }
      }
    }
  )
); 