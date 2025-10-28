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
  const requestId =
    req.headers.get("x-request-id") ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  const { pathname } = req.nextUrl;

  if (req.method === "HEAD" || req.method === "OPTIONS") {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const canonicalRedirect = resolveAdminCanonicalRedirect(req.nextUrl);
  if (canonicalRedirect) {
    const response = NextResponse.redirect(canonicalRedirect, 308);
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const buildSignInUrl = () => {
    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = "/signin";
    signInUrl.search = "";
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return signInUrl;
  };

  let shouldRedirect = false;

  try {
    if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      if (!hasSessionCookie(req)) {
        shouldRedirect = true;
      }
    }
  } catch (_error) {
    shouldRedirect = true;
  }

  const response = shouldRedirect
    ? NextResponse.redirect(buildSignInUrl())
    : NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = { matcher: ["/app/:path*", "/admin/:path*", "/api/:path*"] };

function resolveAdminCanonicalRedirect(url: URL): URL | null {
  if (!url.pathname.startsWith("/admin")) {
    return null;
  }

  const normalized = url.pathname.endsWith("/") && url.pathname !== "/admin"
    ? url.pathname.replace(/\/+/g, "/").replace(/\/$/, "")
    : url.pathname;

  const synonymTarget = ADMIN_PATH_SYNONYMS.get(normalized.toLowerCase());
  const targetPath = synonymTarget ?? normalized;

  if (targetPath === url.pathname) {
    return null;
  }

  const redirectUrl = url.clone();
  redirectUrl.pathname = targetPath;
  return redirectUrl;
}

const ADMIN_PATH_SYNONYMS = new Map<string, string>([
  ["/admin/dashboard", "/admin"],
  ["/admin/assignments", "/admin/assign"],
  ["/admin/assignment", "/admin/assign"],
  ["/admin/user", "/admin/users"],
  ["/admin/group", "/admin/groups"],
  ["/admin/analytics/overview", "/admin/analytics"]
]);
