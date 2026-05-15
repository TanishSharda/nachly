/**
 * Role definitions and permissions for Nachly
 * Unified model: every authenticated user can learn and create.
 */

export type UserRole = 'student' | 'choreographer' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface RolePermissions {
  canViewHome: boolean;
  canViewExplore: boolean;
  canViewLearn: boolean;
  canViewProfile: boolean;
  canViewPractice: boolean;
  canRecord: boolean;
  canViewLibrary: boolean;
  canViewStats: boolean;
  canCreate: boolean; // Upload choreography posts
  canViewDashboard: boolean; // Creator dashboard
  canViewAdmin: boolean; // Admin dashboard
}

const PERMISSIONS: Record<UserRole, RolePermissions> = {
  student: {
    canViewHome: true,
    canViewExplore: true,
    canViewLearn: true,
    canViewProfile: true,
    canViewPractice: true,
    canRecord: true,
    canViewLibrary: true,
    canViewStats: true,
    canCreate: true,
    canViewDashboard: true,
    canViewAdmin: false,
  },
  choreographer: {
    canViewHome: true,
    canViewExplore: true,
    canViewLearn: true,
    canViewProfile: true,
    canViewPractice: true,
    canRecord: true,
    canViewLibrary: true,
    canViewStats: true,
    canCreate: true,
    canViewDashboard: true,
    canViewAdmin: false,
  },
  admin: {
    canViewHome: true,
    canViewExplore: true,
    canViewLearn: true,
    canViewProfile: true,
    canViewPractice: true,
    canRecord: true,
    canViewLibrary: true,
    canViewStats: true,
    canCreate: true,
    canViewDashboard: true,
    canViewAdmin: true,
  },
};

/**
 * Get permissions for a given role
 */
export function getPermissions(role: UserRole): RolePermissions {
  return PERMISSIONS[role];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return PERMISSIONS[role][permission];
}

/**
 * Check if a user can access a route based on role
 */
export function canAccessRoute(role: UserRole, routePath: string): boolean {
  const permissions = getPermissions(role);

  if (routePath.startsWith('/home')) return permissions.canViewHome;
  if (routePath.startsWith('/explore')) return permissions.canViewExplore;
  if (routePath.startsWith('/learn')) return permissions.canViewLearn;
  if (routePath.startsWith('/profile')) return permissions.canViewProfile;
  if (routePath.startsWith('/practice')) return permissions.canViewPractice;
  if (routePath.startsWith('/record')) return permissions.canRecord;
  if (routePath.startsWith('/library')) return permissions.canViewLibrary;
  if (routePath.startsWith('/stats')) return permissions.canViewStats;
  if (routePath.startsWith('/choreographer/apply')) return true;
  if (routePath.startsWith('/choreographer/create')) return permissions.canCreate;
  if (routePath.startsWith('/choreographer')) return permissions.canViewDashboard;
  if (routePath.startsWith('/admin')) return permissions.canViewAdmin;

  return true; // Public routes
}
