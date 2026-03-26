"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getOAuthRedirectBaseClient } from "@/lib/utils/site-url";
import BrandLogo from "@/components/shared/BrandLogo";
import Spinner from "@/components/ui/Spinner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirect = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/explore";
  const authErrorCode = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const authErrorMap: Record<string, string> = {
    auth_failed: "Google login failed. Please try again.",
    missing_code: "Login callback was incomplete. Please retry sign-in.",
    callback_exchange_failed: "Could not verify login code. Please try again.",
    callback_profile_sync_failed: "Logged in, but profile sync failed. Please continue and retry profile save.",
    rate_limit_exceeded: "Too many attempts. Please wait and try again.",
  };

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    if (!isSupabaseConfigured()) {
      await new Promise((r) => setTimeout(r, 1200));
      setLoading(false);
      router.push(redirect);
      return;
    }

    try {
      const supabase = createClient();
      const redirectBase = getOAuthRedirectBaseClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${redirectBase}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
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
        setError("Google login did not redirect. Check popup/cookie settings and try again.");
      }, 12000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo size={34} className="shadow-[0_0_14px_rgba(121,255,206,0.3)]" priority />
            <motion.h1
              className="font-display text-4xl font-bold text-white mb-1"
              whileHover={{ scale: 1.02 }}
            >
              Naachly
            </motion.h1>
          </Link>
          <p className="text-zinc-300 text-sm mt-2">Sign in to start dancing</p>
        </div>

        {!isSupabaseConfigured() && (
          <div className="p-3 bg-nred-500/10 border border-nred-400/30 rounded-xl text-sm text-nred-200 mb-6 text-center">
            <strong>Demo mode:</strong> Supabase not connected. Login will be simulated.
          </div>
        )}

        {authErrorCode && !error && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-200 text-center">
            {authErrorMap[authErrorCode] || "Login failed. Please try again."}
          </div>
        )}

        <motion.button
          onClick={handleGoogleLogin}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white hover:bg-zinc-100 text-zinc-800 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
        >
          {loading ? (
            <Spinner />
          ) : (
            <>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-800">G</span>
              Continue with Google
            </>
          )}
        </motion.button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-200 text-center"
          >
            {error}
          </motion.div>
        )}

        <p className="mt-6 text-center text-sm text-zinc-300">
          New here? Google will create your account automatically.
        </p>

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-zinc-600">OR</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Link href="/explore">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium rounded-xl transition-all border border-white/10"
          >
            Continue as Guest
          </motion.button>
        </Link>

        <p className="mt-8 text-center text-xs text-zinc-400">
          By continuing, you agree to Naachly&apos;s Terms of Service and Privacy Policy.
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-zinc-300 hover:text-white transition-colors">
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Spinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
