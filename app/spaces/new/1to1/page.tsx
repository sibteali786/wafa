"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { FullPage } from "@/components/wafa/full-page";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  type NewOneToOneWizardValues,
  newOneToOneWizardSchema,
} from "@/lib/schemas/space-wizard";
import { cn } from "@/lib/utils";

const tones = ["coral", "sand", "teal", "sky"] as const;

export default function NewOneToOneSpacePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<NewOneToOneWizardValues>({
    resolver: zodResolver(newOneToOneWizardSchema),
    defaultValues: { name: "", avatarTone: "coral" },
  });

  function onSubmit(values: NewOneToOneWizardValues) {
    form.clearErrors("root");
    startTransition(async () => {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spaceType: "one_to_one",
          name: values.name,
          avatarTone: values.avatarTone,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        form.setError("root", {
          message: payload.error ?? "Could not create space.",
        });
        return;
      }
      router.push(
        `/spaces/${payload.id}?first=1&tone=${values.avatarTone}&inviteFor=${encodeURIComponent(values.name || "them")}`,
      );
    });
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col pb-6 pt-4">
        <header className="mb-4 flex items-center justify-between">
          <Link
            href="/spaces/new"
            className="text-ink-secondary hover:bg-muted/40 inline-flex size-8 items-center justify-center rounded-lg"
            aria-label="Back"
          >
            <ChevronLeft className="size-5 stroke-[1.8]" />
          </Link>
          <h1 className="text-foreground text-base font-semibold">1:1 space</h1>
          <span className="size-8" />
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name this space</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Areeba" maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatarTone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar color</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Avatar color">
                      {tones.map((swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => field.onChange(swatch)}
                          className={cn(
                            "h-10 rounded-lg border",
                            field.value === swatch ? "border-foreground" : "border-line-strong",
                            swatch === "coral"
                              ? "bg-coral-soft"
                              : swatch === "sand"
                                ? "bg-sand"
                                : swatch === "teal"
                                  ? "bg-primary-soft"
                                  : "bg-sky",
                          )}
                          aria-label={`Use ${swatch} avatar color`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-muted-foreground rounded-lg border border-line-strong bg-card px-3 py-2 text-[12px] text-sm">
              Only you see this name.
            </p>

            {rootError ? <p className="text-destructive text-sm">{rootError}</p> : null}

            <Button
              type="submit"
              variant="cta"
              size="cta"
              disabled={isPending}
              className="mt-auto w-full gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create space & get invite link
            </Button>
          </form>
        </Form>
      </div>
    </FullPage>
  );
}
