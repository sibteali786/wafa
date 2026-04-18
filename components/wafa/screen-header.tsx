import { cn } from "@/lib/utils";

type ScreenHeaderProps = {
  title: string;
  /** Back control (auth screens). */
  left?: React.ReactNode;
  /** Trailing control (settings, etc.). */
  right?: React.ReactNode;
  /** Small mono line above title (e.g. “Signed in as …”). */
  crumb?: React.ReactNode;
  /** `auth`: centered title like /signup. `main`: crumb + title left, `right` on the right (e.g. /home). */
  layout?: "auth" | "main";
  className?: string;
};

export function ScreenHeader({
  title,
  left,
  right,
  crumb,
  layout = "auth",
  className,
}: ScreenHeaderProps) {
  if (layout === "main") {
    return (
      <header
        className={cn(
          "flex shrink-0 items-start justify-between gap-2 border-b border-border px-[18px] pb-3 pt-4",
          className
        )}
      >
        <div className="min-w-0">
          {crumb != null && (
            <div className="mb-0.5 font-mono text-[11px] text-muted-foreground">{crumb}</div>
          )}
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        {right != null ? <div className="shrink-0">{right}</div> : null}
      </header>
    );
  }

  return (
    <header
      className={cn(
        "flex shrink-0 items-center border-b border-border px-[18px] pb-3 pt-4",
        className
      )}
    >
      <div className="w-7 shrink-0">{left}</div>
      <div className="min-w-0 flex-1 px-1 text-center">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <div className="flex w-7 shrink-0 justify-end">{right}</div>
    </header>
  );
}
