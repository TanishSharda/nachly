"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getOAuthRedirectBaseClient } from "@/lib/utils/site-url";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);

    if (!isSupabaseConfigured()) {
      await new Promise((r) => setTimeout(r, 1000));
      setLoading(false);
      router.push("/explore");
      return;
    }

    try {
      const supabase = createClient();
      const redirectBase = getOAuthRedirectBaseClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectBase}/auth/callback?redirect=${encodeURIComponent("/explore")}`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        setLoading(false);
        setError("Google signup did not redirect. Check popup/cookie settings and try again.");
      }, 12000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold app-accent-text mb-2">Start dancing today</h1>
        <p className="text-zinc-300">Use Google to create your account, or log in if you already have one</p>
      </div>

      {!isSupabaseConfigured() && (
        <div className="p-3 bg-nred-500/10 border border-nred-400/30 rounded-xl text-sm text-nred-200 mb-4 text-center">
          <strong>Demo mode:</strong> Supabase is not connected. Signup will be simulated.
        </div>
      )}

      {error && (
        <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-sm text-amber-200 mb-4 text-center">
          {error}
        </div>
      )}

      <Button onClick={handleGoogleSignup} loading={loading} className="w-full">
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-zinc-300">
        Already have an account?{" "}
        <Link href="/login" className="text-nred-300 font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
