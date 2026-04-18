"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(32,51,47,0.35)]"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative mt-auto flex max-h-[min(420px,70%)] w-full max-w-[480px] flex-col self-center rounded-t-[20px] bg-card px-[18px] pb-6 pt-5 shadow-lg",
          className
        )}
      >
        <div className="mb-3 h-1 w-8 self-center rounded-full bg-line-strong" />
        <h2 className="mb-3 text-[15px] font-semibold text-foreground">{title}</h2>
        <div className="min-h-0 flex-1 overflow-y-auto text-sm text-ink-secondary">{children}</div>
        {footer != null ? <div className="mt-4 shrink-0">{footer}</div> : null}
      </div>
    </div>
  );
}
