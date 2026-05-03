import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] bg-[radial-gradient(circle_at_top,rgba(216,235,229,0.85),rgba(216,235,229,0)_70%)]"
        aria-hidden
      />

      <section className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Image
          src="/brand/wafa-icon.png"
          alt="Wafa"
          width={80}
          height={80}
          priority
          className="size-[80px] rounded-[20px] shadow-md"
        />
        <div className="mt-4 flex items-center gap-1.5" aria-hidden>
          <span className="size-1.5 rounded-full bg-primary-soft" />
          <span className="size-1.5 rounded-full bg-primary-soft" />
          <span className="size-1.5 rounded-full bg-primary-soft" />
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground">Wafa</h1>
        <p className="mt-3 max-w-[240px] text-center text-sm text-muted-foreground">
          وفا · Keep the promises that matter most
        </p>
      </section>

      <section className="relative rounded-t-3xl bg-card px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <Link href="/signup" className={buttonVariants({ variant: "cta", size: "cta", className: "w-full" })}>
          Create account
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ variant: "wireGhost", size: "cta", className: "mt-3 w-full" })}
        >
          Log in
        </Link>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">Private · invite-only · no ads</p>
      </section>
    </main>
  );
}
