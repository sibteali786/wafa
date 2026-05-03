import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[480px] px-4 py-4">
        <div className="space-y-5">
          <Skeleton className="h-5 w-2/5 rounded-md" />

          <div className="space-y-3">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-3 w-16 rounded-sm" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
