import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type WafaToastProps = {
  variant?: "neutral" | "coral";
  children: React.ReactNode;
  className?: string;
};

export function WafaToast({ variant = "neutral", children, className }: WafaToastProps) {
  const isCoral = variant === "coral";
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-2.5 rounded-[10px] border px-3 py-2.5 text-xs leading-snug",
        isCoral
          ? "border-[#e8b79a] bg-coral-soft text-coral-ink"
          : "border-[#b5d7ce] bg-primary-soft text-primary-ink",
        className
      )}
    >
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px]",
          isCoral ? "bg-coral-ink text-coral-soft" : "bg-primary-ink text-primary-soft"
        )}
      >
        {isCoral ? (
          <AlertCircle className="size-[11px]" strokeWidth={2.5} />
        ) : (
          <Info className="size-[11px]" strokeWidth={2.5} />
        )}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </div>
  );
}
