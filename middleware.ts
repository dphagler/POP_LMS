// middleware.ts (cookie check version shown; works with v4/v5)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/app", "/admin"];

function hasSessionCookie(req: NextRequest) {
  try {
    const c = req.cookies;
    return Boolean(
      c.get("__Secure-authjs.session-token") ||
        c.get("authjs.session-token") ||
        c.get("__Secure-next-auth.session-token") ||
        c.get("next-auth.session-token")
    );
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  const buildSignInUrl = () => {
    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = "/signin";
    signInUrl.search = "";
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return signInUrl;
  };

  try {
    if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      if (!hasSessionCookie(req)) {
        return NextResponse.redirect(buildSignInUrl());
      }
    }
  } catch (_error) {
    return NextResponse.redirect(buildSignInUrl());
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
