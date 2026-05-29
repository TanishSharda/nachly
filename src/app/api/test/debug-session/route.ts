import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    // Only expose this debug helper in development or when explicitly enabled.
    const enabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_TEST_API === '1';
    if (!enabled) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.getUser()

    // Also attempt to load the profile row for additional context
    let profile: any = null
    if (data?.user?.id) {
      try {
        const { data: p } = await supabase.from('profiles').select('id,role,preferences,created_at').eq('id', data.user.id).maybeSingle()
        profile = p
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({ user: data?.user ?? null, error: error ?? null, profile })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
