'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserProfile, UserRole, RolePermissions } from './roles';
import { getPermissions, canAccessRoute } from './roles';

interface UseAuthReturn {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseUserRoleReturn {
  role: UserRole | null;
  isLoading: boolean;
  permissions: RolePermissions | null;
  can: (permission: keyof RolePermissions) => boolean;
  canAccess: (routePath: string) => boolean;
}

/**
 * Client hook to get current user and auth state
 * Fetches from /api/auth/user endpoint
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/auth/user', { cache: 'no-store' });

      if (!response.ok) {
        // Not authenticated
        setUser(null);
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch: fetchUser,
  };
}

/**
 * Client hook to get user role and permissions
 * Use this for role-based UI rendering
 */
export function useUserRole(): UseUserRoleReturn {
  const { user, isLoading } = useAuth();
  const role = (user?.role ?? null) as UserRole | null;
  const permissions = role ? getPermissions(role) : null;

  return {
    role,
    isLoading,
    permissions,
    can: (permission: keyof RolePermissions) => {
      if (!role) return false;
      return permissions?.[permission] ?? false;
    },
    canAccess: (routePath: string) => {
      if (!role) return false;
      return canAccessRoute(role, routePath);
    },
  };
}

/**
 * Hook to enforce authentication - redirects to login if not authenticated
 * Use at the top of pages that require auth
 */
export function useAuthRequired(): UseAuthReturn {
  const auth = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        // Redirect to login
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      setIsCheckingAuth(false);
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return {
    ...auth,
    isLoading: auth.isLoading || isCheckingAuth,
  };
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(requiredRole: UserRole | UserRole[]): boolean {
  const { role, isLoading } = useUserRole();

  if (isLoading || !role) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(role);
}

/**
 * Hook to enforce a specific role - redirects if user doesn't have required role
 */
export function useRoleRequired(requiredRole: UserRole | UserRole[]): { isAuthorized: boolean; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!user || !roles.includes(user.role)) {
        // Redirect to access denied or home
        window.location.href = '/';
      }
      setIsCheckingRole(false);
    }
  }, [isLoading, user, requiredRole]);

  const isAuthorized = user && (Array.isArray(requiredRole) ? requiredRole.includes(user.role) : user.role === requiredRole);

  return {
    isAuthorized: !!isAuthorized,
    isLoading: isLoading || isCheckingRole,
  };
}
