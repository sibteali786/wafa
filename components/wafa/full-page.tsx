import { cn } from "@/lib/utils";

type FullPageProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Required layout contract for new pages:
 * full viewport + centered 480px column.
 */
export function FullPage({ children, className }: FullPageProps) {
  return (
    <main className={cn("min-h-screen bg-background", className)}>
      <div className="mx-auto w-full max-w-[480px] px-4">{children}</div>
    </main>
  );
}

