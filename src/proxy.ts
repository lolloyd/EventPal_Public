import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { isLocalDemoMode } from "@/lib/event-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // In local demo mode, bypass proxy protection for development convenience
  if (isLocalDemoMode()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? verifySessionToken(token) : null;
  const isHtmlNavigation = request.headers.get("accept")?.includes("text/html");

  if (!user) {
    if (isHtmlNavigation) {
      const loginUrl = new URL("/api/auth/google", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  // NOTE: /api/upload and /api/events are intentionally NOT matched here.
  // - Those route handlers perform their own authentication.
  // - When proxy runs, Next.js buffers request bodies only up to 10 MB
  //   (proxyClientMaxBodySize) and silently truncates the rest, which corrupts
  //   larger photo uploads.
  // - The public photo wall polls /api/events/[id]/photos without a session.
  matcher: [
    "/admin/:path*",
    "/events/:path*",
    "/api/admin/:path*",
  ],
};
