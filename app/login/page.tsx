import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-semibold">Welcome back</h1>
      <p className="mb-8 text-zinc-600">
        Log in to see your spaces and promises.
      </p>

      <AuthForm mode="login" />

      <p className="mt-6 text-sm text-zinc-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-zinc-900">
          Create an account
        </Link>
      </p>
    </main>
  );
}
