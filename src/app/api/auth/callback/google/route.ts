import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isHeyPalAdminUser, isOrganizationUser, getPublicOrigin } from "@/lib/event-auth";
import { setSessionCookie } from "@/lib/session";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
  email_verified?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?error=oauth_${encodeURIComponent(error)}`, publicOrigin));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?error=missing_oauth_parameters", publicOrigin));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("heypal_oauth_state")?.value;
  cookieStore.delete("heypal_oauth_state");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/?error=invalid_oauth_state", publicOrigin));
  }

  let callbackUrl = "/events";
  try {
    const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      callbackUrl?: string;
    };
    if (parsedState.callbackUrl && parsedState.callbackUrl.startsWith("/")) {
      callbackUrl = parsedState.callbackUrl;
    }
  } catch {
    // Fallback to default callbackUrl
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?error=google_credentials_missing", publicOrigin));
  }

  const redirectUri = `${publicOrigin}/api/auth/callback/google`;

  // Exchange code for token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    console.error("Failed to exchange Google OAuth code:", errorBody);
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", publicOrigin));
  }

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

  // Retrieve user profile
  const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userinfoResponse.ok) {
    return NextResponse.redirect(new URL("/?error=failed_fetching_userinfo", publicOrigin));
  }

  const userinfo = (await userinfoResponse.json()) as GoogleUserInfo;
  if (!userinfo.email) {
    return NextResponse.redirect(new URL("/?error=missing_email_claim", publicOrigin));
  }

  const email = userinfo.email.trim().toLowerCase();
  const isAdmin = isHeyPalAdminUser(email);

  // Validate allowed organization domain (admins are always permitted)
  if (!isAdmin && !isOrganizationUser([email])) {
    return NextResponse.redirect(
      new URL(`/?error=unauthorized_domain&email=${encodeURIComponent(email)}`, publicOrigin),
    );
  }

  // Set authenticated session cookie
  await setSessionCookie({
    id: userinfo.sub,
    email,
    name: userinfo.name || email,
    picture: userinfo.picture || null,
    isAdmin,
  });

  return NextResponse.redirect(new URL(callbackUrl, publicOrigin));
}
