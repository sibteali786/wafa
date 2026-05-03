import { AppViewport } from "@/components/wafa/app-viewport";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <AppViewport showTabBar={true} activeTab="home">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 rounded-sm" />
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    </AppViewport>
  );
}
