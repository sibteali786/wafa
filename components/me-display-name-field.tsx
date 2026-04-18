"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

const labelClass =
  "mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground";

const fieldShellClass =
  "rounded-[10px] border border-line-strong bg-card px-3.5 py-3";

const inputBareClass =
  "h-auto min-h-0 w-full border-0 bg-transparent p-0 text-[13px] text-foreground shadow-none focus-visible:ring-0 md:text-[13px]";

/** Phase 1: local-only edit; persist via profile API in a later phase. */
export function MeDisplayNameField({ initialName }: { initialName: string }) {
  const [value, setValue] = useState(initialName);

  return (
    <div>
      <p className={labelClass}>Display name</p>
      <div className={fieldShellClass}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="name"
          className={inputBareClass}
        />
      </div>
    </div>
  );
}
