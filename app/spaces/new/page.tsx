import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { FullPage } from "@/components/wafa/full-page";

function PickerCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-line-strong bg-card px-4 py-4 shadow-sm transition hover:bg-muted/30"
    >
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-foreground">{title}</span>
        <span className="block text-[12px] leading-snug text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

export default function NewSpacePickerPage() {
  return (
    <FullPage>
      <div className="flex min-h-screen flex-col pb-6 pt-4">
        <header className="mb-4 flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-muted/40"
            aria-label="Back"
          >
            <ChevronLeft className="size-5 stroke-[1.8]" />
          </Link>
          <h1 className="text-base font-semibold text-foreground">Create a space</h1>
          <span className="size-8" />
        </header>

        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Choose who this space is for. You can create a private 1:1 space or a group.
        </p>

        <div className="space-y-3">
          <PickerCard
            href="/spaces/new/1to1"
            title="1:1 space"
            description="You and one person. Both can add promises."
            icon={<Users className="size-5 stroke-[1.8]" />}
          />
          <PickerCard
            href="/spaces/new/group"
            title="Group"
            description="One admin with multiple members and role-based actions."
            icon={<Users className="size-5 stroke-[1.8]" />}
          />
        </div>
      </div>
    </FullPage>
  );
}

