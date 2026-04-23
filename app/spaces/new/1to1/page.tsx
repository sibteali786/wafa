"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FullPage } from "@/components/wafa/full-page";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const tones = ["coral", "sand", "teal", "sky"] as const;
type Tone = (typeof tones)[number];

export default function NewOneToOneSpacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tone, setTone] = useState<Tone>("coral");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spaceType: "one_to_one",
          name,
          avatarTone: tone,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        setError(payload.error ?? "Could not create space.");
        return;
      }
      router.push(`/spaces/${payload.id}?first=1&tone=${tone}&inviteFor=${encodeURIComponent(name || "them")}`);
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
          <h1 className="text-base font-semibold text-foreground">1:1 space</h1>
          <span className="size-8" />
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Name this space
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Areeba"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Avatar color
            </p>
            <div className="grid grid-cols-4 gap-2">
              {tones.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setTone(swatch)}
                  className={`h-10 rounded-lg border ${
                    tone === swatch ? "border-foreground" : "border-line-strong"
                  } ${
                    swatch === "coral"
                      ? "bg-coral-soft"
                      : swatch === "sand"
                      ? "bg-sand"
                      : swatch === "teal"
                      ? "bg-primary-soft"
                      : "bg-sky"
                  }`}
                  aria-label={`Use ${swatch} avatar color`}
                />
              ))}
            </div>
          </div>

          <p className="rounded-lg border border-line-strong bg-card px-3 py-2 text-[12px] text-muted-foreground">
            Only you see this name.
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className={buttonVariants({
            variant: "cta",
            size: "cta",
            className: "mt-auto w-full gap-2",
          })}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create space & get invite link
        </button>
      </div>
    </FullPage>
  );
}

