import { AppViewport } from "@/components/wafa/app-viewport";
import { Skeleton } from "@/components/ui/skeleton";

export default function SpaceDetailLoading() {
  return (
    <AppViewport showTabBar={true} activeTab="home">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4">
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
    </AppViewport>
  );
}
