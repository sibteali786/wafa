import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PromiseCreateForm } from "@/components/promise-create-form";
import { FullPage } from "@/components/wafa/full-page";
import { ScreenHeader } from "@/components/wafa/screen-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PromiseNewPageProps = {
  searchParams: Promise<{ spaceId?: string }>;
};

export default async function PromiseNewPage({ searchParams }: PromiseNewPageProps) {
  const { spaceId } = await searchParams;
  if (!spaceId) {
    redirect("/home");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId);

  const memberIds = membership?.map((m) => m.user_id) ?? [];
  const { data: profiles } =
    memberIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", memberIds)
      : { data: [] };

  const memberOptions = memberIds.map((id) => {
    const profile = profiles?.find((p) => p.user_id === id);
    return {
      id,
      label: profile?.display_name || "Member",
    };
  });

  return (
    <FullPage>
      <div className="flex min-h-screen flex-col">
        <ScreenHeader
          className="!px-0"
          title="New promise"
          left={
            <Link
              href={`/spaces/${spaceId}`}
              className="inline-flex h-7 w-7 items-center justify-center text-ink-secondary"
              aria-label="Back"
            >
              <ChevronLeft className="size-5 stroke-[1.8]" />
            </Link>
          }
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-4">
          <PromiseCreateForm spaceId={spaceId} members={memberOptions} />
        </div>
      </div>
    </FullPage>
  );
}

