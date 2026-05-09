/**
 * Auth Store
 * Singleton reactive store for authentication state
 */

import {
  getUsername,
  isAuthenticated,
  removeToken,
  revalidateToken,
  saveToken,
} from '../services/github/auth';
import { safeError } from '../services/security/logger';

export interface AuthState {
  isAuthenticated: boolean;
  tokenValid: boolean;
  username: string | null;
}

export type AuthStoreListener = (state: AuthState) => void;

class AuthStore {
  private state: AuthState = {
    isAuthenticated: false,
    tokenValid: false,
    username: null,
  };
  private listeners: AuthStoreListener[] = [];

  subscribe(listener: AuthStoreListener): () => void {
    this.listeners.push(listener);
    listener({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(): AuthState {
    return { ...this.state };
  }

  async checkAuth(): Promise<void> {
    try {
      const authenticated = await isAuthenticated();
      const username = await getUsername();
      let tokenValid = false;
      if (authenticated) {
        const result = await revalidateToken();
        tokenValid = result.valid;
      }
      this.state = {
        isAuthenticated: authenticated,
        tokenValid,
        username,
      };
      this.notifyListeners();
    } catch (err) {
      safeError('[AuthStore] checkAuth failed', err);
      this.state = { isAuthenticated: false, tokenValid: false, username: null };
      this.notifyListeners();
    }
  }

  async setToken(token: string): Promise<{ success: boolean; error?: string }> {
    const result = await saveToken(token);
    if (result.success) {
      await this.checkAuth();
    }
    return result;
  }

  async clearAuth(): Promise<void> {
    await removeToken();
    this.state = { isAuthenticated: false, tokenValid: false, username: null };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = { ...this.state };
    this.listeners.forEach((l) => l(state));
  }
}

const authStore = new AuthStore();
export default authStore;
