import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", origin));
}

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
