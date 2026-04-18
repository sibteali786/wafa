import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <Card className="w-full max-w-sm text-left">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Wafa</CardTitle>
          <CardDescription>
            Private promise spaces for your close relationships.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/signup" className={buttonVariants({ className: "w-full" })}>
            Create account
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Log in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
