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

  // Admin route protection: verify organizer role
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!user.isAdmin) {
      if (isHtmlNavigation) {
        return NextResponse.redirect(new URL("/events?error=admin_required", request.url));
      }
      return NextResponse.json({ error: "Organizer role required" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/admin/:path*",
    "/events/:path*",
    "/api/upload/:path*",
    "/api/events/:path*",
    "/api/admin/:path*",
  ],
};
