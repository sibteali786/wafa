"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/wafa/bottom-sheet";

export function HomeEmptyActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="cta" size="cta" className="w-full" onClick={() => setOpen(true)}>
        Create a space
      </Button>
      <p className="max-w-[220px] text-center text-[12px] leading-snug text-muted-foreground">
        To join a space, open the invite link they sent you.
      </p>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Create a space"
        footer={
          <Button type="button" variant="cta" size="cta" className="w-full" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <p>
          Space creation and invites will connect in Phase 2. For now this screen is UI-only.
        </p>
      </BottomSheet>
    </>
  );
}
