import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { access_token, refresh_token, expires_at } = body || {};

    if (!access_token) {
      return NextResponse.json({ error: 'missing access_token' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });

    // Set supabase auth cookies expected by server helpers
    // Short-lived access token cookie
    res.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: typeof expires_at === 'number' ? Math.max(0, expires_at - Math.floor(Date.now() / 1000)) : undefined,
    });

    // Refresh token cookie
    if (refresh_token) {
      res.cookies.set('sb-refresh-token', refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return res;
  } catch (err) {
    console.error('[/api/auth/session] Error:', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ authenticated: false, role: null })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || null

    return NextResponse.json({ authenticated: true, role })
  } catch (err) {
    console.error('session check error', err)
    return NextResponse.json({ authenticated: false, role: null })
  }
}
