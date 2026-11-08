import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse } from "next/server";

// Next.js 16 "proxy" (formerly middleware): runs on the server before each route renders.
export async function proxy(request: NextRequest) {
  // This exact machine endpoint authenticates its own bearer capability, not a user cookie.
  if (request.nextUrl.pathname === "/api/push/dispatch") return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files, so CSS, JS and
    // images still load on the login page.
    "/((?!_next/static|_next/image|sw\\.js$|manifest\\.webmanifest$|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
