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
  type NewGroupWizardValues,
  newGroupWizardSchema,
} from "@/lib/schemas/space-wizard";

export default function NewGroupSpacePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<NewGroupWizardValues>({
    resolver: zodResolver(newGroupWizardSchema),
    defaultValues: { name: "" },
  });

  function onSubmit(values: NewGroupWizardValues) {
    form.clearErrors("root");
    startTransition(async () => {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spaceType: "group",
          name: values.name,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        form.setError("root", {
          message: payload.error ?? "Could not create group.",
        });
        return;
      }
      router.push(`/spaces/${payload.id}?first=1`);
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
          <h1 className="text-foreground text-base font-semibold">Group</h1>
          <span className="size-8" />
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Cousins" maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {rootError ? <p className="text-destructive text-sm">{rootError}</p> : null}

            <Button
              type="submit"
              variant="cta"
              size="cta"
              disabled={isPending}
              className="mt-auto w-full gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create group
            </Button>
          </form>
        </Form>
      </div>
    </FullPage>
  );
}
