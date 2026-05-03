import { cn } from "@/lib/utils";

type RowItemProps = {
  leading?: React.ReactNode;
  title: string;
  sub?: string;
  trailing?: React.ReactNode;
  className?: string;
};

export function RowItem({ leading, title, sub, trailing, className }: RowItemProps) {
  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-card px-3 py-3 transition-colors duration-150 active:bg-muted/60",
        className
      )}
    >
      {leading != null ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">{title}</div>
        {sub != null ? (
          <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
        ) : null}
      </div>
      {trailing != null ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
