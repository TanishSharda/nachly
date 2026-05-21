import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '../supabase/server';
import type { UserRole } from './roles';
import { canAccessRoute } from './roles';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Get authenticated user from request
 * Returns null if user is not authenticated
 */
export async function getAuthUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();

    return {
      id: authUser.id,
      email: authUser.email || '',
      role: (profile?.role as UserRole) || 'student',
    };
  } catch {
    return null;
  }
}

/**
 * Middleware to require authentication on API route
 * Returns 401 if user is not authenticated
 */
export async function requireAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handler(request, user);
}

/**
 * Middleware to require specific role on API route
 * Returns 403 if user doesn't have required role
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: UserRole | UserRole[],
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
  }

  return handler(request, user);
}

/**
 * Middleware to require permission for route access
 * Returns 403 if user doesn't have access to route
 */
export async function requireRouteAccess(
  request: NextRequest,
  routePath: string,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canAccessRoute(user.role, routePath)) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
  }

  return handler(request, user);
}

/**
 * Wrap API handler with role-based access control
 * Usage: export const POST = createProtectedHandler('choreographer', async (req, user) => { ... })
 */
export function createProtectedHandler(
  requiredRole: UserRole | UserRole[] | 'any',
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requiredRole !== 'any') {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
      }
    }

    return handler(request, user);
  };
}
