// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/app", "/admin"];

// Works with NextAuth v4 and v5 cookie names (secure/non-secure)
function hasSessionCookie(req: NextRequest) {
  const c = req.cookies;
  return Boolean(
    c.get("__Secure-authjs.session-token") || // v5 secure
    c.get("authjs.session-token") ||          // v5 non-secure (http)
    c.get("__Secure-next-auth.session-token") || // v4 secure
    c.get("next-auth.session-token")             // v4 non-secure
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!hasSessionCookie(req)) {
      const signInUrl = new URL("/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
