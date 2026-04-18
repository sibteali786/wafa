import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
  {
    variants: {
      variant: {
        default: "border-line-strong bg-card text-ink-secondary",
        admin: "border-[#b5d7ce] bg-primary-soft text-primary-ink",
        member: "border-[#b8cde0] bg-sky text-sky-ink",
        warn: "border-warn-border bg-warn-bg text-warn-ink",
        coral: "border-[#e8b79a] bg-coral-soft text-coral-ink",
        dark: "border-primary bg-primary text-primary-foreground",
      },
      dot: {
        true: "before:size-[5px] before:shrink-0 before:rounded-full before:bg-current before:content-['']",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      dot: false,
    },
  }
);

export type WafaBadgeProps = VariantProps<typeof badgeVariants> & {
  children: React.ReactNode;
  className?: string;
};

export function WafaBadge({ variant, dot, children, className }: WafaBadgeProps) {
  return <span className={cn(badgeVariants({ variant, dot }), className)}>{children}</span>;
}
