import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessRoute } from "@/lib/auth/roles";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  let onboardingComplete = true;
  let isFreshAccount = false;

  // OAuth callback links can land on '/?code=...' depending on provider settings.
  // Route those hits through our callback handler before rendering the landing page.
  if (
    request.nextUrl.pathname === "/" &&
    request.nextUrl.searchParams.has("code")
  ) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  const attachSupabaseCookies = (response: NextResponse) => {
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    return response;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth checks if Supabase isn't configured yet
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("http")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  let userRole = "student";
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, created_at, preferences")
        .eq("id", user.id)
        .maybeSingle();
      userRole = profile?.role || "student";

      onboardingComplete = Boolean((profile?.preferences as Record<string, unknown> | null)?.onboarding_completed);
      const authCreatedAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      const profileCreatedAt = profile?.created_at ? new Date(profile.created_at as string).getTime() : 0;
      isFreshAccount = authCreatedAt > 0 && profileCreatedAt > 0 && Math.abs(authCreatedAt - profileCreatedAt) < 10 * 60 * 1000;
    }
  } catch {
    // Supabase connection failed — skip auth checks
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  // Public learner routes stay accessible so guest users can enter the scroll
  // and open a lesson player directly from shared links.
  const publicFeedPaths = ["/feed", "/scroll", "/scrool", "/learn/feed"];
  const learnRouteParts = pathname.split("/").filter(Boolean);
  const isPublicLearnLesson =
    learnRouteParts[0] === "learn" &&
    learnRouteParts.length >= 2 &&
    !["feed", "practice", "profile", "session", "choreo"].includes(learnRouteParts[1]);

  if (publicFeedPaths.some((path) => pathname.startsWith(path)) || isPublicLearnLesson) {
    return attachSupabaseCookies(supabaseResponse);
  }

  // Protected routes (require authentication)
  const protectedPaths = [
    "/select-role",
    "/learn/practice",
    "/learn/profile",
    "/learn/session",
    "/learn/choreo",
    "/library",
    "/stats",
    "/profile/me",
    "/profile",
    "/settings",
    "/creator",
    "/choreographer",
    "/admin",
  ];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Normalize legacy scroll paths to the canonical learner feed.
    if (request.nextUrl.pathname.startsWith("/scroll") || request.nextUrl.pathname.startsWith("/scrool")) {
    const url = request.nextUrl.clone();
    url.pathname = "/learn/feed";
    return NextResponse.redirect(url);
  }

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return attachSupabaseCookies(NextResponse.redirect(url));
  }

  // Role-based route access
  if (user && !canAccessRoute(userRole as any, request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/learn/feed";
    return attachSupabaseCookies(NextResponse.redirect(url));
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ["/auth", "/login", "/signup"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    // Canonical post-auth entry now goes through role selection.
    url.pathname = "/select-role";
    url.search = "";
    return attachSupabaseCookies(NextResponse.redirect(url));
  }

  return attachSupabaseCookies(supabaseResponse);
}

export const config = {
  matcher: [
    // Exclude Next static assets, images, favicon, service worker and manifest
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
