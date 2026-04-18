import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold">Wafa</h1>
        <p className="text-zinc-600">
          Private promise spaces for your close relationships.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-700"
        >
          Create account
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-zinc-300 px-4 py-2 transition hover:bg-zinc-100"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
