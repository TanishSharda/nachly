import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

export function shouldUseFirebaseFallback(): boolean {
  const value = (process.env.NEXT_PUBLIC_DISABLE_FIREBASE_FALLBACK || "").trim().toLowerCase();
  return value !== "1" && value !== "true";
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Please add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
