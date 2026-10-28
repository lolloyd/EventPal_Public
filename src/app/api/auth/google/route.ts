import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { isLocalDemoMode, getPublicOrigin } from "@/lib/event-auth";
import { setSessionCookie } from "@/lib/session";

function sanitizeCallbackUrl(url: string | null): string {
  if (!url) return "/events";
  // Only permit relative internal paths starting with /
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return "/events";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  const targetCallbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl") || searchParams.get("redirect"));
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // In local demo mode when Google Client ID is not configured, grant instant demo session
  if (!clientId || isLocalDemoMode()) {
    if (process.env.NODE_ENV !== "production") {
      const isAdminTarget = targetCallbackUrl.startsWith("/admin");
      await setSessionCookie({
        id: isAdminTarget ? "heypal-demo-admin" : "heypal-demo-attendee",
        email: isAdminTarget ? "lloyd.miguel@gmail.com" : "demo.attendee@heypal.local",
        name: isAdminTarget ? "Lloyd Miguel (Demo)" : "Demo Attendee",
        isAdmin: isAdminTarget,
      });
      return NextResponse.redirect(new URL(targetCallbackUrl, publicOrigin));
    }

    return NextResponse.json(
      { error: "Google Sign-In is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 503 },
    );
  }

  const stateNonce = randomBytes(16).toString("hex");
  const stateData = JSON.stringify({ nonce: stateNonce, callbackUrl: targetCallbackUrl });
  const encodedState = Buffer.from(stateData).toString("base64url");

  // Save state in a short-lived HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set("heypal_oauth_state", encodedState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });

  const redirectUri = `${publicOrigin}/api/auth/callback/google`;
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", encodedState);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleAuthUrl.toString());
}
