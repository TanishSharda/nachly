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

export default function AuthScreen() {
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
        setEmail(saved);
        setRemember(true);
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
        // ignore
      }

      setLoading(false);
      router.push(redirect);
    } catch (err) {
      setError("Unable to sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <BrandLogo />
          <h1 className="mt-4 text-2xl font-bold">Welcome</h1>
        </div>

        <div className="space-y-4">
          <Button onClick={handleGoogleAuth} loading={loading} variant="primary" className="w-full">
            Continue with Google
          </Button>

          <div className="text-center text-sm text-muted-foreground">or</div>

          {!showEmailForm ? (
            <Button variant="secondary" onClick={() => setShowEmailForm(true)} className="w-full">
              Sign in with email
            </Button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
              <Button type="submit" loading={loading} className="w-full">
                {isSignupMode ? "Create account" : "Sign in"}
              </Button>
            </form>
          )}

          {error && <div className="text-red-500">{error}</div>}

          <div className="mt-4 text-center text-sm">
            <Link href={`/auth?mode=${isSignupMode ? "login" : "signup"}&redirect=${encodeURIComponent(redirect)}`} className="text-blue-500 hover:underline">
              Need help?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
