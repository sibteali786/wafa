import Link from "next/link";
import { Bell, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "home" | "reminders" | "me";

type TabBarProps = {
  active: TabId;
};

const tabs: { id: TabId; href: string; label: string; icon: typeof Home }[] = [
  { id: "home", href: "/home", label: "Home", icon: Home },
  { id: "reminders", href: "/reminders", label: "Reminders", icon: Bell },
  { id: "me", href: "/me", label: "Me", icon: User },
];

export function TabBar({ active }: TabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1.5 shadow-[0_-1px_0_0_var(--border)]"
      aria-label="Main"
    >
      <div className="mx-auto flex h-[62px] w-full max-w-[480px] items-stretch">
        {tabs.map(({ id, href, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <Link
              key={id}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-[22px] stroke-[1.8]" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
