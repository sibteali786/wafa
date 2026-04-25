import { NextResponse } from "next/server";

type StoreInviteTokenPayload = {
  token?: string;
};

const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as StoreInviteTokenPayload | null;
  const token = payload?.token?.trim();

  if (!token || !INVITE_TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("wafa_invite_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60,
  });

  return response;
}
