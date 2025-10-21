import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const protectedRoutes = ["/app", "/admin"];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  let response = NextResponse.next();

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!req.auth) {
      const signInUrl = new URL("/signin", req.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
      return NextResponse.redirect(signInUrl);
    }
    if (!req.auth.user?.orgId) {
      req.auth.user = { ...req.auth.user, orgId: null } as typeof req.auth.user;
    } else {
      const org = await prisma.organization.findUnique({
        where: { id: req.auth.user.orgId },
        select: { themeJson: true }
      });
      if (org?.themeJson) {
        response.cookies.set("pop-theme", JSON.stringify(org.themeJson));
      }
    }
  }
  return response;
});

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/api/:path*"]
};
