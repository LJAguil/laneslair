import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "@/lib/auth/redirect";
import { getSupabaseEnv } from "./env";

/**
 * Runs before every matched request (see /proxy.ts):
 * 1. Refreshes the Supabase session and writes updated auth cookies.
 * 2. Verifies the user with getClaims(), which validates the JWT signature,
 *    rather than trusting the cookie contents.
 * 3. Redirects signed-out visitors to /login and signed-in visitors away from it.
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });
  // Cache headers the library asks for whenever it writes auth cookies, so a
  // CDN never stores one user's session cookie and serves it to someone else.
  let authHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Update the request so Server Components in this same request see the
        // refreshed tokens, then rebuild the response and copy cookies onto it.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        authHeaders = { ...authHeaders, ...headers };
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Keep this call directly after creating the client: it triggers the token
  // refresh, and any code in between could run against a stale session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;
  const { pathname, search } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return withAuthState(NextResponse.redirect(loginUrl), response, authHeaders);
  }

  if (signedIn && isPublicPath(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return withAuthState(NextResponse.redirect(homeUrl), response, authHeaders);
  }

  return response;
}

/** Carries any refreshed/cleared auth cookies and cache headers over to a redirect. */
function withAuthState(redirect: NextResponse, from: NextResponse, headers: Record<string, string>) {
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  Object.entries(headers).forEach(([key, value]) => redirect.headers.set(key, value));
  return redirect;
}
