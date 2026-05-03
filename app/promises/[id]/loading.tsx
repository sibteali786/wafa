import { FullPage } from "@/components/wafa/full-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function PromiseDetailLoading() {
  return (
    <FullPage>
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between py-4">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="size-7 rounded-md" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6 pt-4">
          <Skeleton className="h-8 w-3/5 rounded-md" />

          <div className="space-y-2 rounded-lg border border-line-strong bg-card p-3">
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-16 rounded-sm" />
              <Skeleton className="h-4 w-40 rounded-sm" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-14 rounded-sm" />
              <Skeleton className="h-4 w-28 rounded-sm" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-20 rounded-sm" />
              <Skeleton className="h-4 w-32 rounded-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </FullPage>
  );
}
