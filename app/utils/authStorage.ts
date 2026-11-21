import { Platform } from 'react-native';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  createdAt?: string;
}

const TOKEN_KEY = 'landeed_auth_token';
const USER_KEY = 'landeed_auth_user';

let memoryStore: Record<string, string> = {};

export const authStorage = {
  async getToken(): Promise<string | null> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(TOKEN_KEY);
      } catch {
        return memoryStore[TOKEN_KEY] || null;
      }
    }
    return memoryStore[TOKEN_KEY] || null;
  },

  async setToken(token: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(TOKEN_KEY, token);
      } catch {
        // Fallback to memory
      }
    }
    memoryStore[TOKEN_KEY] = token;
  },

  async getUser(): Promise<UserProfile | null> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = window.localStorage.getItem(USER_KEY);
        return data ? JSON.parse(data) : null;
      } catch {
        const mem = memoryStore[USER_KEY];
        return mem ? JSON.parse(mem) : null;
      }
    }
    const mem = memoryStore[USER_KEY];
    return mem ? JSON.parse(mem) : null;
  },

  async setUser(user: UserProfile): Promise<void> {
    const data = JSON.stringify(user);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(USER_KEY, data);
      } catch {
        // Fallback to memory
      }
    }
    memoryStore[USER_KEY] = data;
  },

  async clear(): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
      } catch {
        // Ignore
      }
    }
    delete memoryStore[TOKEN_KEY];
    delete memoryStore[USER_KEY];
  }
};
