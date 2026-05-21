import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/auth/user
 * Returns the current authenticated user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Get authenticated user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile with role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, created_at, updated_at')
      .eq('id', authUser.id)
      .single();

    if (error) {
      // Profile doesn't exist yet (new user) - create default
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert([
          {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Dancer',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            role: 'student',
          },
        ])
        .select()
        .single();

      if (!newProfile) {
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      return NextResponse.json(
        {
          user: {
            id: newProfile.id,
            email: newProfile.email,
            full_name: newProfile.full_name,
            avatar_url: newProfile.avatar_url,
            role: newProfile.role,
            created_at: newProfile.created_at,
            updated_at: newProfile.updated_at,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[/api/auth/user] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
