"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  type MeDisplayNameValues,
  meDisplayNameSchema,
} from "@/lib/schemas/me-profile";

/** Phase 1: local-only edit; persist via profile API in a later phase. */
export function MeDisplayNameField({ initialName }: { initialName: string }) {
  const form = useForm<MeDisplayNameValues>({
    resolver: zodResolver(meDisplayNameSchema),
    defaultValues: { displayName: initialName },
  });

  useEffect(() => {
    form.reset({ displayName: initialName });
  }, [initialName, form]);

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
