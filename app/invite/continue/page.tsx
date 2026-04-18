"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppViewport } from "@/components/wafa/app-viewport";
import { ScreenHeader } from "@/components/wafa/screen-header";

/**
 * Phase 2: read sessionStorage invite token, call join API, redirect to space.
 * Phase 1: redirect home so post-auth flow does not 404.
 */
export default function InviteContinuePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  return (
    <AppViewport showTabBar={false}>
      <ScreenHeader title="Invite" />
      <div className="flex flex-1 items-center justify-center px-[18px] pb-8 pt-4 text-center text-sm text-muted-foreground">
        Continuing…
      </div>
    </AppViewport>
  );
}
