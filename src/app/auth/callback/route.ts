import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logAuthEvent } from "@/lib/supabase/auth-observability";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");
  const redirectParam = searchParams.get("redirect") || "/explore";
  const redirect = redirectParam.startsWith("/") ? redirectParam : "/explore";
  const requestId = crypto.randomUUID();
  const pendingCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const finalizeRedirect = (target: string) => {
    const response = NextResponse.redirect(target);
    for (const cookie of pendingCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options as Record<string, unknown> | undefined);
    }
    return response;
  };

  if (providerError) {
    logAuthEvent({
      event: "oauth_provider_error",
      level: "warn",
      requestId,
      details: {
        redirect,
        providerError,
        providerErrorDescription: providerErrorDescription || null,
      },
    });
    return finalizeRedirect(`${origin}/login?error=auth_failed`);
  }

  if (!code) {
    logAuthEvent({
      event: "oauth_callback_missing_code",
      level: "warn",
      requestId,
      details: { redirect },
    });
    return finalizeRedirect(`${origin}/login?error=missing_code`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith("http")) {
    logAuthEvent({
      event: "oauth_callback_missing_supabase_config",
      level: "error",
      requestId,
      details: { redirect },
    });
    return finalizeRedirect(`${origin}/login?error=auth_unavailable`);
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logAuthEvent({
        event: "oauth_exchange_failed",
        level: "error",
        requestId,
        details: { redirect, errorName: error.name, errorMessage: error.message },
      });
      return finalizeRedirect(`${origin}/login?error=callback_exchange_failed`);
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (user) {
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        (user.email?.split("@")[0] ?? "Dancer");

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName,
          avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        logAuthEvent({
          event: "oauth_profile_sync_failed",
          level: "warn",
          requestId,
          userId: user.id,
          details: {
            redirect,
            errorCode: profileError.code,
            errorMessage: profileError.message,
          },
        });
      }

      const { error: streakError } = await supabase
        .from("user_streaks")
        .upsert({ user_id: user.id }, { onConflict: "user_id" });

      if (streakError) {
        logAuthEvent({
          event: "oauth_streak_seed_failed",
          level: "warn",
          requestId,
          userId: user.id,
          details: {
            redirect,
            errorCode: streakError.code,
            errorMessage: streakError.message,
          },
        });
      }

      logAuthEvent({
        event: "oauth_login_success",
        level: "info",
        requestId,
        userId: user.id,
        details: { redirect },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logAuthEvent({
      event: "oauth_callback_unhandled_exception",
      level: "error",
      requestId,
      details: { redirect, errorMessage: message },
    });
    return finalizeRedirect(`${origin}/login?error=callback_exception`);
  }

  return finalizeRedirect(`${origin}${redirect}`);
}
