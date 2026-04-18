"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
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

type AuthMode = "signup" | "login";

type AuthFormProps = {
  mode: AuthMode;
};

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type LoginValues = z.infer<typeof loginSchema>;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  const form = useForm<SignUpValues | LoginValues>({
    resolver: zodResolver(isSignup ? signUpSchema : loginSchema),
    defaultValues: isSignup
      ? { displayName: "", email: "", password: "" }
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {isSignup && (
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" autoComplete="name" {...field} />
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
              <FormControl>
                <Input
                  required
                  minLength={8}
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
        </Button>
      </form>
    </Form>
  );
}
