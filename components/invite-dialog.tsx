"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type InviteIntendedRole,
  inviteGenerateFormSchema,
  type InviteGenerateFormValues,
} from "@/lib/schemas/invite";
import { cn } from "@/lib/utils";

export type InviteGenerateResult = {
  inviteUrl: string;
};

type InviteDialogProps = {
  spaceId: string;
  spaceLabel?: string;
  triggerLabel?: string;
  onGenerate?: (
    input: { spaceId: string; intendedRole: InviteIntendedRole }
  ) => Promise<InviteGenerateResult>;
};

async function defaultGenerateInvite({
  spaceId,
  intendedRole,
}: {
  spaceId: string;
  intendedRole: InviteIntendedRole;
}): Promise<InviteGenerateResult> {
  if (typeof window === "undefined") {
    return { inviteUrl: "" };
  }
  const token = `preview-${spaceId.slice(0, 8)}-${intendedRole}`;
  const inviteUrl = `${window.location.origin}/invite/${encodeURIComponent(token)}`;
  return { inviteUrl };
}

export function InviteDialog({
  spaceId,
  spaceLabel,
  triggerLabel = "Invite someone",
  onGenerate = defaultGenerateInvite,
}: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const form = useForm<InviteGenerateFormValues>({
    resolver: zodResolver(inviteGenerateFormSchema),
    defaultValues: { intendedRole: "member" },
  });

  async function handleSubmit(values: InviteGenerateFormValues) {
    setPending(true);
    setCopyDone(false);
    try {
      const { inviteUrl: url } = await onGenerate({
        spaceId,
        intendedRole: values.intendedRole,
      });
      setInviteUrl(url);
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setInviteUrl(null);
          setCopyDone(false);
        }
      }}
    >
      <DialogTrigger className={cn(buttonVariants({ variant: "outline" }))}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite link</DialogTitle>
          <DialogDescription>
            {spaceLabel
              ? `Generate a one-time invite for ${spaceLabel}.`
              : "Generate a one-time invite link for this space."}{" "}
            Persistence and token hashing land in Phase 2; this preview builds
            the URL client-side only.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="intendedRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Role for invitee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {inviteUrl ? (
              <div className="space-y-2">
                <Label>Link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCopy}
                  >
                    {copyDone ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Generating…" : inviteUrl ? "Regenerate" : "Generate link"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
