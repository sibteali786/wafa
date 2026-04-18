import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-semibold">Create your account</h1>
      <p className="mb-8 text-zinc-600">
        Sign up to create spaces and manage promises.
      </p>

      <AuthForm mode="signup" />

      <p className="mt-6 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900">
          Log in
        </Link>
      </p>
    </main>
  );
}
