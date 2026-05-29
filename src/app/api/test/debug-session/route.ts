import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
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
