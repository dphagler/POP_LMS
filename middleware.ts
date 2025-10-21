// middleware.ts (cookie check version shown; works with v4/v5)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/app", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  try {
    if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      const session = await auth();
      if (!session) {
        const signInUrl = new URL("/signin", req.url);
        signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
        return NextResponse.redirect(signInUrl);
      }
    }
  } catch (error) {
    console.error("Middleware session check failed:", error);
    return NextResponse.redirect(new URL("/signin", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
