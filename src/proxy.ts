import { NextResponse, type NextRequest } from "next/server";
import { isOpenAccessMode } from "@/lib/env";

/**
 * LOGIC EXPLAINED:
 * The previous proxy performed a full Supabase getUser() validation on every
 * matched request, including prefetched routes. Next.js 16 explicitly warns
 * against slow auth/database work in Proxy and recommends optimistic cookie
 * checks there instead. This version only checks whether a session cookie
 * exists for protected routes, then leaves the secure verification to the
 * auth layer inside server components and route handlers.
 */

const PROTECTED_PREFIXES = ["/dashboard", "/setup", "/onboarding"];
const LOCAL_SESSION_COOKIE = "ac_local_session";

function hasOptimisticSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => {
    if (name === LOCAL_SESSION_COOKIE) {
      return true;
    }

    return name.startsWith("sb-") && name.includes("-auth-token");
  });
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isOpenAccessMode()) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !hasOptimisticSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);

    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("next", pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
