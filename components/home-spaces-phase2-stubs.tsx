"use client";

import { useState } from "react";
import { InviteDialog } from "@/components/invite-dialog";
import { SpaceForm } from "@/components/space-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SpaceFormValues } from "@/lib/schemas/space";

const DEMO_SPACE_ID = "00000000-0000-0000-0000-000000000001";

export function HomeSpacesPhase2Stubs() {
  const [lastSpacePayload, setLastSpacePayload] = useState<SpaceFormValues | null>(
    null
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a space (Phase 2 preview)</CardTitle>
          <CardDescription>
            Validation and UI only. Persisting to Supabase is the next step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SpaceForm
            onSubmit={async (values) => {
              setLastSpacePayload(values);
            }}
          />
          {lastSpacePayload ? (
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-left text-xs">
              {JSON.stringify(lastSpacePayload, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite link (Phase 2 preview)</CardTitle>
          <CardDescription>
            Stub URL with a placeholder space id. Wire to invite creation once
            spaces exist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteDialog spaceId={DEMO_SPACE_ID} spaceLabel="Preview space" />
        </CardContent>
      </Card>
    </div>
  );
}
