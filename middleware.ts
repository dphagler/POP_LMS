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
  try {
    if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      if (!hasSessionCookie(req)) {
        try {
          const signInUrl = new URL("/signin", req.url);
          signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
          return NextResponse.redirect(signInUrl);
        } catch {
          return NextResponse.redirect("/signin");
        }
      }
    }
  } catch (error) {
    const host = req.headers.get("host") ?? "unknown";
    const hasCookie = hasSessionCookie(req);
    console.error(
      `[MW] middleware failed path=${pathname} host=${host} hasCookie=${hasCookie}`,
      error
    );
    try {
      const signInUrl = new URL("/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
      return NextResponse.redirect(signInUrl);
    } catch {
      return NextResponse.redirect("/signin");
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
