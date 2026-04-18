import { cn } from "@/lib/utils";
import { TabBar, type TabId } from "@/components/wafa/tab-bar";

type AppViewportProps = {
  children: React.ReactNode;
  /** When true, renders fixed bottom tab bar and adds bottom padding for it. */
  showTabBar?: boolean;
  activeTab?: TabId;
  className?: string;
};

/** Full-viewport PWA shell: `min-h-dvh`, `bg-background`, content capped at 480px. Not a device frame. */
export function AppViewport({
  children,
  showTabBar = false,
  activeTab = "home",
  className,
}: AppViewportProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background", className)}>
      <div
        className={cn(
          "mx-auto flex min-h-0 w-full max-w-[480px] flex-1 flex-col",
          showTabBar && "pb-[calc(62px+env(safe-area-inset-bottom,0px))]"
        )}
      >
        {children}
      </div>
      {showTabBar ? <TabBar active={activeTab} /> : null}
    </div>
  );
}
