import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { logServiceRoleUsage } from "@/lib/security/serviceRoleAudit";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  return createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — can't set cookies
          }
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const roleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  // lightweight audit: record caller stack and environment
  try {
    const stack = new Error().stack || '';
    const lines = stack.split('\n').map((l) => l.trim()).slice(2, 8);
    const caller = lines.find((l) => l && !l.includes('node:internal') && !l.includes('internal/modules')) || lines[0] || 'unknown';
    logServiceRoleUsage({ caller });
  } catch (e) {
    // ignore logging failures
  }

  return createSupabaseClient(
    url,
    roleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
