import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { getPublicOrigin } from "@/lib/event-auth";

export async function GET(request: Request) {
  const publicOrigin = getPublicOrigin(request);
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", publicOrigin));
}

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
