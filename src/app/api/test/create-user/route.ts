import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    if (!email || !password) return NextResponse.json({ error: 'missing' }, { status: 400 })

    const supabase = createServiceRoleClient()
    // @ts-ignore
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data }, { status: 201 })
  } catch (err) {
    console.error('create-user error', err)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
