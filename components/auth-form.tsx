"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { sanitizeRedirect } from "@/lib/utils";

type AuthMode = "signup" | "login";

type AuthFormProps = {
  mode: AuthMode;
  nextPath?: string;
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

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: signUpValues.email,
          password: signUpValues.password,
        });
        if (signInError) throw signInError;

        await fetch("/api/profile/upsert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            displayName: signUpValues.displayName,
            timezone: "Asia/Karachi",
          }),
        });
      } else {
        const loginValues = values as LoginValues;
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: loginValues.email,
          password: loginValues.password,
        });
        if (loginError) throw loginError;
      }

      router.push(sanitizeRedirect(nextPath));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        {isSignup && (
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="How you'll appear in spaces"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    required
                    minLength={8}
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    className="pe-10"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute end-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-all duration-100 active:scale-90 active:opacity-60"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="size-4 stroke-[1.8]" />
                  ) : (
                    <Eye className="size-4 stroke-[1.8]" />
                  )}
                </button>
              </div>
              {isSignup ? (
                <FormDescription>Min 8 characters</FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        {!isSignup && (
          <div className="-mt-1 text-right">
            <Link
              href="#"
              className="text-primary text-xs underline"
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
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    className="border-input mt-1 size-4 shrink-0 rounded-sm border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </FormControl>
                <div className="space-y-1 leading-snug">
                  <FormLabel className="text-muted-foreground text-[11px] leading-snug font-normal">
                    I agree to Wafa&apos;s terms. My timezone will default to{" "}
                    <span className="text-foreground font-mono text-[11px]">
                      Asia/Karachi (PKT)
                    </span>{" "}
                    — can&apos;t change this in v1.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        )}

        {error != null && (
          <WafaToast variant="coral" className="-mt-1">
            {error}
          </WafaToast>
        )}

        <Button type="submit" variant="cta" size="cta" disabled={pending} className="w-full">
          {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
        </Button>

        <div className="h-px bg-border" />

        {isSignup ? (
          <p className="text-muted-foreground text-center text-[12px]">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Log in
            </Link>
          </p>
        ) : (
          <p className="text-muted-foreground text-center text-[12px]">
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
