import Link from "next/link";
import { ChevronLeft, Link2Off } from "lucide-react";
import { InviteHandoffCard } from "@/components/invite-handoff-card";
import { buttonVariants } from "@/components/ui/button";
import { FullPage } from "@/components/wafa/full-page";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { hashInviteToken } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const tokenHash = hashInviteToken(token);
  const { data: invite } = await admin
    .from("invite_links")
    .select("status, spaces(name)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const linkedSpace =
    invite && invite.spaces && !Array.isArray(invite.spaces)
      ? ((invite.spaces as { name: string | null }).name ?? null)
      : null;
  const canUse = invite?.status === "pending";

  if (canUse) {
    return (
      <FullPage>
        <div className="flex min-h-screen flex-col">
        <ScreenHeader
          className="!px-4"
          title="Invite"
          left={
            <Link
              href="/"
              className="inline-flex h-7 w-7 items-center justify-center text-ink-secondary"
              aria-label="Back"
            >
              <ChevronLeft className="size-5 stroke-[1.8]" />
            </Link>
          }
        />
        <div className="flex min-h-0 flex-1 flex-col pb-6 pt-2">
          <InviteHandoffCard token={token} spaceName={linkedSpace || "Wafa space"} />
        </div>
        </div>
      </FullPage>
    );
  }

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col">
      <ScreenHeader
        className="!px-4"
        title="Invite"
        left={
          <Link
            href="/"
            className="inline-flex h-7 w-7 items-center justify-center text-ink-secondary"
            aria-label="Back"
          >
            <ChevronLeft className="size-5 stroke-[1.8]" />
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 pb-8 pt-4 text-center">
        <div className="flex size-[72px] items-center justify-center rounded-[18px] border border-line-strong bg-gradient-to-br from-primary-soft to-sand text-primary-ink">
          <Link2Off className="size-9 stroke-[1.5]" aria-hidden />
        </div>
        <div>
          <h2 className="mb-1.5 text-[15px] font-semibold text-foreground">This invite can&apos;t be used</h2>
          <p className="mx-auto max-w-[240px] text-[12px] leading-snug text-muted-foreground">
            The link has already been used, was revoked, or the person who sent it removed you. Ask them to
            send a new one.
          </p>
        </div>
        <div className="mt-3 flex w-full flex-col gap-2.5">
          <Link href="/home" className={buttonVariants({ variant: "cta", size: "cta", className: "w-full" })}>
            Go to my spaces
          </Link>
          <a
            href="mailto:"
            className={buttonVariants({ variant: "wireGhost", size: "cta", className: "w-full" })}
          >
            Contact sender
          </a>
        </div>
        <p className="mt-2 font-mono text-[10px] text-[#b8c1bd]">status: used · revoked · expired</p>
      </div>
      </div>
    </FullPage>
  );
}
