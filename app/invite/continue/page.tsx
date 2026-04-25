import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function clearInviteCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set("wafa_invite_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
}

export default async function InviteContinuePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("wafa_invite_token")?.value?.trim();

  if (!token) {
    redirect("/home");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/invite/continue")}`);
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  if (!host) {
    clearInviteCookie(cookieStore);
    redirect("/home");
  }
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const response = await fetch(`${protocol}://${host}/api/invites/${encodeURIComponent(token)}/join`, {
    method: "POST",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { spaceId?: string } | null;

  clearInviteCookie(cookieStore);

  if (!response.ok || !payload?.spaceId) {
    redirect("/home");
  }

  redirect(`/spaces/${payload.spaceId}`);
}
