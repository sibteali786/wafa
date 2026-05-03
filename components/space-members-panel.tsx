"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/wafa/bottom-sheet";
import { WafaBadge } from "@/components/wafa/wafa-badge";
import { WafaToast } from "@/components/wafa/wafa-toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SpaceMember = {
  userId: string;
  displayName: string;
  role: "admin" | "member";
};

type SpaceMembersPanelProps = {
  spaceId: string;
  currentUserId: string;
  isAdmin: boolean;
  initialMembers: SpaceMember[];
};

export function SpaceMembersPanel({
  spaceId,
  currentUserId,
  isAdmin,
  initialMembers,
}: SpaceMembersPanelProps) {
  const [members, setMembers] = useState<SpaceMember[]>(initialMembers);
  const [selectedMember, setSelectedMember] = useState<SpaceMember | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        return a.displayName.localeCompare(b.displayName);
      }),
    [currentUserId, members]
  );

  function openMemberActions(member: SpaceMember) {
    if (!isAdmin || member.userId === currentUserId) return;
    setSelectedMember(member);
    setError(null);
    setSheetOpen(true);
  }

  async function removeMember() {
    if (!selectedMember) return;
    setPending(true);
    setError(null);
    const response = await fetch(`/api/spaces/${spaceId}/members/${selectedMember.userId}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not remove member.");
      return;
    }
    setMembers((prev) => prev.filter((member) => member.userId !== selectedMember.userId));
    setSuccess(`${selectedMember.displayName} removed`);
    setSheetOpen(false);
    setSelectedMember(null);
  }

  return (
    <section className="space-y-2 rounded-xl border border-line-strong bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Members</p>
        <span className="text-[11px] text-muted-foreground">{members.length}</span>
      </div>

      <div className="space-y-2">
        {sortedMembers.map((member) => {
          const canManage = isAdmin && member.userId !== currentUserId;
          return (
            <button
              key={member.userId}
              type="button"
              onClick={() => openMemberActions(member)}
              disabled={!canManage}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border border-line-strong bg-background px-3 py-2 text-left transition-all duration-100 active:scale-90 active:opacity-60",
                canManage ? "hover:bg-muted/40" : "cursor-default"
              )}
            >
              <span className="text-sm text-foreground">
                {member.displayName}
                {member.userId === currentUserId ? " (you)" : ""}
              </span>
              <WafaBadge variant={member.role === "admin" ? "admin" : "member"}>{member.role}</WafaBadge>
            </button>
          );
        })}
      </div>

      {error ? <WafaToast variant="coral">{error}</WafaToast> : null}
      {success ? <WafaToast>{success}</WafaToast> : null}

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Member actions"
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={removeMember}
              disabled={pending}
              className={cn(
                buttonVariants({ variant: "destructive", size: "cta" }),
                "w-full transition-all duration-100 active:scale-[0.97] active:opacity-70"
              )}
            >
              Remove from group
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className={cn(
                buttonVariants({ variant: "wireGhost", size: "cta" }),
                "w-full transition-all duration-100 active:scale-[0.97] active:opacity-70"
              )}
            >
              Cancel
            </button>
          </div>
        }
      >
        <p className="text-sm text-foreground">
          This will remove {selectedMember?.displayName ?? "this member"} and invalidate their invite link. They
          cannot rejoin unless you send a new one.
        </p>
      </BottomSheet>
    </section>
  );
}
