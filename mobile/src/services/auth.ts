/**
 * Mobile Authentication Service
 * Shared with web app - connects to same Supabase backend
 */

import { Linking } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const MOBILE_OAUTH_REDIRECT_URI = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI || 'nachly://auth/callback';
const OAUTH_TIMEOUT_MS = 90_000;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: SecureStore as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

function waitForDeepLink(expectedPrefix: string, timeoutMs: number) {
  return new Promise<string>((resolve, reject) => {
    let finished = false;

    const cleanup = () => {
      subscription.remove();
      clearTimeout(timeout);
    };

    const resolveIfMatch = (url: string | null | undefined) => {
      if (!url || finished || !url.startsWith(expectedPrefix)) {
        return;
      }

      finished = true;
      cleanup();
      resolve(url);
    };

    const subscription = Linking.addEventListener('url', ({ url }: { url: string }) => {
      resolveIfMatch(url);
    });

    const timeout = setTimeout(() => {
      if (finished) {
        return;
      }

      finished = true;
      cleanup();
      reject(new Error('Google sign-in timed out. Please try again.'));
    }, timeoutMs);

    Linking.getInitialURL()
      .then(resolveIfMatch)
      .catch(() => {
        // Ignore initial URL read failures and keep waiting for the deep link.
      });
  });
}

export class MobileAuthService {
  /**
   * Sign up with email and password
   */
  static async signup(email: string, password: string, fullName: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }

  /**
   * Sign in with email and password
   */
  static async signin(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { session: data.session, error: null };
    } catch (error) {
      return { session: null, error };
    }
  }

  /**
   * Sign in with OAuth (Google)
   */
  static async signinWithOAuth(provider: 'google' | 'github') {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: MOBILE_OAUTH_REDIRECT_URI,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;

      const authUrl = data?.url;
      if (!authUrl) {
        throw new Error('Google sign-in did not return an authentication URL.');
      }

      const canOpen = await Linking.canOpenURL(authUrl);
      if (!canOpen) {
        throw new Error('Unable to open Google sign-in in the browser.');
      }

      await Linking.openURL(authUrl);

      const callbackUrl = await waitForDeepLink(MOBILE_OAUTH_REDIRECT_URI, OAUTH_TIMEOUT_MS);
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(callbackUrl);

      if (exchangeError) throw exchangeError;

      return { session: sessionData.session, error: null };
    } catch (error) {
      return { session: null, error };
    }
  }

  /**
   * Sign out
   */
  static async signout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<{ user: AuthUser | null; error: any }> {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();

      if (error || !authUser) {
        return { user: null, error };
      }

      // Get profile with role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        return { user: null, error: profileError };
      }

      return {
        user: {
          id: authUser.id,
          email: authUser.email || '',
          role: (profile?.role as any) || 'student',
          full_name: profile?.full_name || authUser.email?.split('@')[0] || 'Dancer',
          avatar_url: profile?.avatar_url || null,
        },
        error: null,
      };
    } catch (error) {
      return { user: null, error };
    }
  }

  /**
   * Refresh session
   */
  static async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      return { session: data.session, error: null };
    } catch (error) {
      return { session: null, error };
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  }
}
