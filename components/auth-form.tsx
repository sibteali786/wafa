"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { WafaToast } from "@/components/wafa/wafa-toast";
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "signup" | "login";

type AuthFormProps = {
  mode: AuthMode;
};

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: "Please agree to the terms to continue",
  }),
});

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type LoginValues = z.infer<typeof loginSchema>;

const labelClass =
  "text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground";

const fieldShellClass =
  "rounded-[10px] border border-line-strong bg-card px-3.5 py-3";

const inputBareClass =
  "h-auto min-h-0 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0 md:text-[13px]";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  const form = useForm<SignUpValues | LoginValues>({
    resolver: zodResolver(isSignup ? signUpSchema : loginSchema),
    defaultValues: isSignup
      ? { displayName: "", email: "", password: "", termsAccepted: false }
      : { email: "", password: "" },
  });

  async function handleSubmit(values: SignUpValues | LoginValues) {
    setPending(true);
    setError(null);

    try {
      if (isSignup) {
        const signUpValues = values as SignUpValues;
        const { error: signUpError } = await supabase.auth.signUp({
          email: signUpValues.email,
          password: signUpValues.password,
          options: {
            data: {
              display_name: signUpValues.displayName.trim(),
            },
          },
        });
        if (signUpError) throw signUpError;

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: signUpValues.email,
          password: signUpValues.password,
        });
        if (signInError) throw signInError;

        const token = data.session?.access_token;
        if (token) {
          await fetch("/api/profile/upsert", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: signUpValues.displayName,
              timezone: "Asia/Karachi",
            }),
          });
        }
      } else {
        const loginValues = values as LoginValues;
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: loginValues.email,
          password: loginValues.password,
        });
        if (loginError) throw loginError;
      }

      const inviteToken = sessionStorage.getItem("invite_token");
      router.push(inviteToken ? "/invite/continue" : "/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-2.5">
        {isSignup && (
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className={labelClass}>Display name</FormLabel>
                <div className={fieldShellClass}>
                  <FormControl>
                    <Input
                      placeholder="How you'll appear in spaces"
                      autoComplete="name"
                      className={inputBareClass}
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className={cn("space-y-2", isSignup && "mt-1.5")}>
              <FormLabel className={labelClass}>Email</FormLabel>
              <div className={fieldShellClass}>
                <FormControl>
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={inputBareClass}
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="mt-1.5 space-y-2">
              <FormLabel className={labelClass}>Password</FormLabel>
              <div className={fieldShellClass}>
                <FormControl>
                  <Input
                    required
                    minLength={8}
                    type="password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    className={inputBareClass}
                    {...field}
                  />
                </FormControl>
                {isSignup && (
                  <p className="mt-1 text-[10px] text-muted-foreground">Min 8 characters</p>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isSignup && (
          <div className="text-right">
            <Link
              href="#"
              className="text-xs text-primary underline"
              onClick={(e) => e.preventDefault()}
            >
              Forgot password?
            </Link>
          </div>
        )}

        {isSignup && (
          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="mt-1 flex flex-row items-start gap-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    className="mt-0.5 size-3.5 shrink-0 rounded-sm border border-ink-secondary"
                  />
                </FormControl>
                <div className="space-y-1 leading-snug text-[11px] font-normal text-muted-foreground">
                    I agree to Wafa&apos;s terms. My timezone will default to{" "}
                    <span className="font-mono text-[11px] text-ink-secondary">Asia/Karachi (PKT)</span>{" "}
                    — can&apos;t change this in v1.
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        )}

        {error != null && (
          <WafaToast variant="coral" className="mt-1">
            {error}
          </WafaToast>
        )}

        <Button type="submit" variant="cta" size="cta" disabled={pending} className="mt-1 w-full">
          {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
        </Button>

        <div className="h-px bg-border" />

        {isSignup ? (
          <p className="text-center text-[12px] text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Log in
            </Link>
          </p>
        ) : (
          <p className="text-center text-[12px] text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="text-primary underline">
              Create account
            </Link>
          </p>
        )}
      </form>
    </Form>
  );
}
