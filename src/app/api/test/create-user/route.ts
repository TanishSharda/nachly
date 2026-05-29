import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    console.log('create-user request', { method: request.method });
    // Log headers for debugging
    try {
      console.log('create-user headers', Object.fromEntries(request.headers));
    } catch (e) {
      console.warn('failed to read headers', e);
    }
    const raw = await request.text();
    console.log('create-user raw body', raw);
    let body: any;
    try {
      body = raw ? JSON.parse(raw) : {};
      // Handle double-encoded JSON (e.g. quoted JSON string)
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.warn('create-user double-parse failed', e);
        }
      }
    } catch (e) {
      console.error('create-user parse error', e, raw);
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }

    const { email, password } = body;
    if (!email || !password) return NextResponse.json({ error: 'missing' }, { status: 400 })

    const supabase = createServiceRoleClient()
    // @ts-ignore
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })

    // If the user already exists, treat this as idempotent and continue.
    if (error) {
      const msg = String(error.message || '')
      if (/already|registered|exists/i.test(msg)) {
        console.warn('create-user: user already exists, proceeding:', msg)
        return NextResponse.json({ ok: true, existing: true }, { status: 200 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Ensure a profiles row exists and set role to 'choreographer' so seeded users
    // are immediately usable for Creator-wizard flows without manual role selection.
    try {
      const userId = (data as any)?.id
      if (userId) {
        await supabase.from('profiles').upsert({ id: userId, role: 'choreographer' }, { onConflict: 'id' })
      }
    } catch (e) {
      console.warn('create-user: failed to upsert profile role', e)
    }

    return NextResponse.json({ user: data }, { status: 201 })
  } catch (err) {
    console.error('create-user error', err)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
