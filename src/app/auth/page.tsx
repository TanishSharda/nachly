"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import BrandLogo from "@/components/shared/BrandLogo";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getOAuthRedirectBaseClient } from "@/lib/utils/site-url";
import { getOrCreateGuestId } from "@/lib/utils/guest-session";

function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const authErrorCode = searchParams.get("error");
  const redirectParam = searchParams.get("redirect");
  const redirect = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/select-role";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const isSignupMode = useMemo(() => modeParam === "signup", [modeParam]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem("rememberedEmail");
      if (saved) {
        setTimeout(() => {
          setEmail(saved);
          setRemember(true);
        }, 0);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const authErrorMap: Record<string, string> = {
    auth_failed: "Google login failed. Please try again.",
    missing_code: "Login callback was incomplete. Please retry sign-in.",
    callback_exchange_failed: "Could not verify login code. Please try again.",
    callback_profile_sync_failed: "Logged in, but profile sync failed. Please continue and retry profile save.",
    rate_limit_exceeded: "Too many attempts. Please wait and try again.",
  };

  async function handleGoogleAuth() {
    setError("");
    setLoading(true);

    if (!isSupabaseConfigured()) {
      await new Promise((r) => setTimeout(r, 1000));
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
        setError("Google auth did not redirect. Check popup/cookie settings and try again.");
      }, 12000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
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
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      try {
        const session = signInData?.session;
        if (session) {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
            }),
          });
        }
      } catch {
        // ignore session sync errors
      }

      try {
        if (remember && email) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
      } catch {
        // ignore localStorage errors
      }

      router.push(redirect);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo size={34} className="shadow-[0_12px_32px_-22px_rgba(122,92,58,0.6)]" priority />
            <h1 className="font-display text-4xl font-bold app-accent-text mb-1">Nachly</h1>
          </Link>
          <p className="muted-text text-sm mt-2">
            {isSignupMode ? "Create your account to start dancing" : "Sign in to start dancing"}
          </p>
        </div>

        {!isSupabaseConfigured() && (
          <div className="p-3 bg-nred-500/10 border border-nred-400/30 rounded-xl text-sm text-nred-200 mb-6 text-center">
            <strong>Demo mode:</strong> Supabase not connected. Auth will be simulated.
          </div>
        )}

        {authErrorCode && !error && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-200 text-center">
            {authErrorMap[authErrorCode] || "Authentication failed. Please try again."}
          </div>
        )}

        <Button onClick={handleGoogleAuth} loading={loading} variant={isSignupMode ? "primary" : "secondary"} className="w-full flex items-center justify-center gap-3 py-3.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f1f0ee] text-xs font-bold text-[#2d241a]">G</span>
          {isSignupMode ? "Continue with Google" : "Continue with Google"}
        </Button>

        {!isSignupMode && (
          <>
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-zinc-600">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {!showEmailForm ? (
              <Button variant="ghost" className="w-full" onClick={() => setShowEmailForm(true)}>
                Sign in with Email
              </Button>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-4 mt-4">
                <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
                <Input id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />

                <div className="flex items-center gap-2">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded bg-white/5 border-white/10 text-[var(--gold)]"
                  />
                  <label htmlFor="remember" className="text-sm muted-text">Remember my email</label>
                </div>

                <Button type="submit" loading={loading} className="w-full" variant="primary">
                  {loading ? <Spinner /> : "Sign In"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowEmailForm(false);
                    setError("");
                    setPassword("");
                  }}
                >
                  Back to other options
                </Button>
              </form>
            )}
          </>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-200 text-center">
            {error}
          </motion.div>
        )}

        {!isSignupMode && !showEmailForm && (
          <>
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-zinc-600">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <Link href="/learn/feed" onClick={() => getOrCreateGuestId()}>
              <Button variant="secondary" className="w-full">Continue as Guest</Button>
            </Link>
          </>
        )}

        <p className="mt-6 text-center text-sm text-zinc-300">
          {isSignupMode ? "Already have an account?" : "New here?"}{" "}
          <Link href={isSignupMode ? `/auth?mode=login&redirect=${encodeURIComponent(redirect)}` : `/auth?mode=signup&redirect=${encodeURIComponent(redirect)}`} className="text-[var(--gold)] font-semibold hover:underline">
            {isSignupMode ? "Log in" : "Create account"}
          </Link>
        </p>

        <p className="mt-8 text-center text-xs text-zinc-400">By continuing, you agree to Nachly&apos;s Terms of Service and Privacy Policy.</p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-zinc-300 hover:text-white transition-colors">← Back to home</Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Spinner />
        </div>
      }
    >
      <AuthScreen />
    </Suspense>
  );
}
