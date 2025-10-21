// middleware.ts
import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Protect app and admin routes using NextAuth JWT (edge-safe).
export default withAuth(
  function middleware() {
    // No DB calls here — Prisma is not supported in Edge middleware.
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/signin",
    },
  }
);

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
