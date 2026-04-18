import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
  {
    variants: {
      size: {
        sm: "size-7 text-[10px]",
        md: "size-9 text-[11px]",
        lg: "size-14 text-sm",
      },
      tone: {
        teal: "bg-primary-soft text-primary-ink",
        coral: "bg-coral-soft text-coral-ink",
        sand: "bg-sand text-sand-ink",
        sky: "bg-sky text-sky-ink",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "teal",
    },
  }
);

type WafaAvatarProps = VariantProps<typeof avatarVariants> & {
  initials: string;
  className?: string;
};

export function WafaAvatar({ initials, size, tone, className }: WafaAvatarProps) {
  return (
    <span className={cn(avatarVariants({ size, tone }), className)} aria-hidden>
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}
