import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to see your spaces and promises.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="login" />
          <p className="mt-6 text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className={buttonVariants({ variant: "link", size: "sm" })}>
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
