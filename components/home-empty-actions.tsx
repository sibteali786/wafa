import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function HomeEmptyActions() {
  return (
    <div className="w-full space-y-3">
      <Link href="/spaces/new" className={buttonVariants({ variant: "cta", size: "cta", className: "w-full" })}>
        Create a space
      </Link>
      <p className="max-w-[220px] text-center text-[12px] leading-snug text-muted-foreground">
        To join a space, open the invite link they sent you.
      </p>
    </div>
  );
}
