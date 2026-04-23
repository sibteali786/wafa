"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";

type InviteHandoffCardProps = {
  token: string;
  spaceName: string;
};

export function InviteHandoffCard({ token, spaceName }: InviteHandoffCardProps) {
  useEffect(() => {
    sessionStorage.setItem("wafa.invite", token);
  }, [token]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Invite</p>
      <h2 className="text-[19px] font-semibold text-foreground">You&apos;re invited to</h2>
      <p className="text-[28px] font-bold leading-tight text-primary">{spaceName}</p>
      <p className="max-w-[260px] text-[12px] text-muted-foreground">
        Sign up or log in to join this space. We&apos;ll continue automatically after authentication.
      </p>
      <div className="mt-2 flex w-full flex-col gap-2">
        <Link href="/signup?next=/invite/continue" className={buttonVariants({ variant: "cta", size: "cta" })}>
          Sign up & join
        </Link>
        <Link
          href="/login?next=/invite/continue"
          className={buttonVariants({ variant: "wireGhost", size: "cta" })}
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}

