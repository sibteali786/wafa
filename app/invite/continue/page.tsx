"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullPage } from "@/components/wafa/full-page";
import { ScreenHeader } from "@/components/wafa/screen-header";

/**
 * Reads cached invite token, joins, and redirects.
 */
export default function InviteContinuePage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    async function run() {
      const token = sessionStorage.getItem("wafa.invite");
      if (!token) {
        router.replace("/home");
        return;
      }

      const response = await fetch(`/api/invites/${encodeURIComponent(token)}/join`, {
        method: "POST",
      });
      const payload = (await response.json()) as { spaceId?: string };
      sessionStorage.removeItem("wafa.invite");
      if (!alive) return;

      if (response.ok && payload.spaceId) {
        router.replace(`/spaces/${payload.spaceId}`);
      } else {
        router.replace(`/invite/${encodeURIComponent(token)}`);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col">
        <ScreenHeader title="Invite" className="!px-4" />
        <div className="flex flex-1 items-center justify-center pb-8 pt-4 text-center text-sm text-muted-foreground">
          Continuing…
        </div>
      </div>
    </FullPage>
  );
}
