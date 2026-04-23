"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FullPage } from "@/components/wafa/full-page";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewGroupSpacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spaceType: "group",
          name,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "Could not create group.");
        return;
      }
      router.push(`/spaces/${payload.id}?first=1`);
    });
  }

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col pb-6 pt-4">
        <header className="mb-4 flex items-center justify-between">
          <Link
            href="/spaces/new"
            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-muted/40"
            aria-label="Back"
          >
            <ChevronLeft className="size-5 stroke-[1.8]" />
          </Link>
          <h1 className="text-base font-semibold text-foreground">Group</h1>
          <span className="size-8" />
        </header>

        <div className="space-y-2">
          <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Group name
          </label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Cousins"
            maxLength={120}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={isPending || name.trim().length === 0}
          className={buttonVariants({
            variant: "cta",
            size: "cta",
            className: "mt-auto w-full gap-2",
          })}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create group
        </button>
      </div>
    </FullPage>
  );
}

