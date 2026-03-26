import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isPhoneRequest(request: NextRequest) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const isTablet = /ipad|tablet/.test(ua);
  const isPhone = /iphone|ipod|android.*mobile|mobile/.test(ua);
  return isPhone && !isTablet;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase connection failed — skip auth checks
    return supabaseResponse;
  }

  // Protected routes
  const protectedPaths = ["/library", "/stats", "/profile", "/choreographer"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return attachSupabaseCookies(NextResponse.redirect(url));
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/explore";
    return attachSupabaseCookies(NextResponse.redirect(url));
  }

  // Mobile entrypoint: go directly to auth flow instead of download gate.
  if (request.nextUrl.pathname === "/" && isPhoneRequest(request)) {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/explore" : "/login";
    return attachSupabaseCookies(NextResponse.redirect(url));
  }

  return attachSupabaseCookies(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
