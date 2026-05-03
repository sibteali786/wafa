import { Skeleton } from "@/components/ui/skeleton";

export default function SpaceDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[480px] px-4 py-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-32 rounded-md" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-9 w-full rounded-full" />
          </div>

          <div className="space-y-2 pt-1">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="flex h-[60px] w-full items-center justify-between rounded-xl border border-line-strong bg-card px-3"
              >
                <Skeleton className="h-4 w-2/3 rounded-sm" />
                <Skeleton className="size-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
