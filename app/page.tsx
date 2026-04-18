import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <Card className="w-full max-w-sm border-line-strong text-left shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Wafa</CardTitle>
          <CardDescription className="text-ink-secondary">
            Private promise spaces for your close relationships.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/signup" className={buttonVariants({ variant: "cta", size: "cta", className: "w-full" })}>
            Create account
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "wireGhost", size: "cta", className: "w-full" })}
          >
            Log in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
