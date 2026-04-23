"use client";

import { useState, useTransition } from "react";
import { Copy, Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SpaceInvitePanelProps = {
  spaceId: string;
  inviteForLabel: string;
};

export function SpaceInvitePanel({ spaceId, inviteForLabel }: SpaceInvitePanelProps) {
  const [url, setUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ensureInvite() {
    return new Promise<string>((resolve, reject) => {
      if (url) {
        resolve(url);
        return;
      }
      startTransition(async () => {
        setError(null);
        const response = await fetch("/api/invites", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ spaceId, intendedRole: "member" }),
        });
        const payload = (await response.json()) as { inviteUrl?: string; error?: string };
        if (!response.ok || !payload.inviteUrl) {
          const nextError = payload.error ?? "Could not generate invite link.";
          setError(nextError);
          reject(new Error(nextError));
          return;
        }
        setUrl(payload.inviteUrl);
        resolve(payload.inviteUrl);
      });
    });
  }

  async function copyInvite() {
    try {
      const inviteUrl = await ensureInvite();
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // handled above
    }
  }

  async function shareInvite() {
    try {
      const inviteUrl = await ensureInvite();
      if (navigator.share) {
        await navigator.share({
          title: "Wafa invite",
          text: `Join my Wafa space (${inviteForLabel})`,
          url: inviteUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // handled above
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-line-strong bg-card p-3">
      <div className="text-[13px] font-medium text-foreground">
        Space is ready — Send this link to {inviteForLabel}, it works once
      </div>
      <div className="rounded-lg border border-dashed border-line-strong bg-muted/40 px-3 py-2 font-mono text-[11px] text-ink-secondary">
        {url || "Generate to reveal invite URL"}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copyInvite}
          disabled={isPending}
          className={cn(buttonVariants({ variant: "wireGhost", size: "sm" }), "flex-1 gap-1.5")}
        >
          <Copy className="size-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={shareInvite}
          disabled={isPending}
          className={cn(buttonVariants({ variant: "cta", size: "sm" }), "flex-1 gap-1.5")}
        >
          <Share2 className="size-3.5" />
          Share
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

