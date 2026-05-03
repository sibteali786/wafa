import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type FabProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  href?: string;
};

/** Floating above fixed tab bar + safe area (PWA viewport). */
export function Fab({ className, type = "button", href, ...props }: FabProps) {
  const classes = cn(
    "fixed bottom-[calc(62px+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-40 flex size-[52px] items-center justify-center rounded-full bg-coral text-white shadow-[0_10px_22px_-6px_rgba(217,119,87,0.45),0_2px_4px_rgba(217,119,87,0.2)]",
    "outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 transition-all duration-100 active:scale-90",
    className
  );

  if (href) {
    return (
      <a href={href} className={classes} aria-label={props["aria-label"] ?? "Create"}>
        <Plus className="size-[22px] stroke-[2]" aria-hidden />
        <span className="sr-only">Create</span>
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      <Plus className="size-[22px] stroke-[2]" aria-hidden />
      <span className="sr-only">Create</span>
    </button>
  );
}
