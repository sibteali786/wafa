"use client";

import Link from "next/link";
import { useState } from "react";
import { PromiseRowActions } from "@/components/promise-row-actions";
import { RowItem } from "@/components/wafa/row-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PromiseItem = {
  id: string;
  title: string;
  state: string;
  due_at: string | null;
  is_suggestion: boolean;
  updated_at: string | null;
};

type SpaceDetailTabsProps = {
  promises: PromiseItem[];
  nowIso: string;
};

function PromiseRows({
  items,
  emptyText,
  sub,
  showFulfillAction,
  rowClassName,
}: {
  items: PromiseItem[];
  emptyText: string;
  sub: string;
  showFulfillAction?: boolean;
  rowClassName?: string;
}) {
  if (items.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{emptyText}</p>;
  }

  return (
    <>
      {items.map((promise) => (
        <Link key={promise.id} href={`/promises/${promise.id}`}>
          <RowItem
            className={rowClassName}
            title={promise.title}
            sub={sub}
            trailing={
              showFulfillAction ? (
                <PromiseRowActions
                  promiseId={promise.id}
                  mode="fulfill"
                  baseUpdatedAt={promise.updated_at}
                />
              ) : undefined
            }
          />
        </Link>
      ))}
    </>
  );
}

export function SpaceDetailTabs({ promises, nowIso }: SpaceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<"open" | "fulfilled" | "all">("open");
  const open = promises.filter((promise) => promise.state !== "fulfilled" && !promise.is_suggestion);
  const fulfilled = promises.filter((promise) => promise.state === "fulfilled" && !promise.is_suggestion);
  const overdue = open.filter(
    (promise) => promise.state !== "snoozed" && Boolean(promise.due_at) && promise.due_at! < nowIso
  );
  const snoozed = open.filter((promise) => promise.state === "snoozed");
  const pending = open.filter(
    (promise) => promise.state !== "snoozed" && !overdue.some((row) => row.id === promise.id)
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "open" | "fulfilled" | "all")}
      className="space-y-3"
    >
      <TabsList className="grid w-full grid-cols-3 rounded-lg bg-muted p-1">
        <TabsTrigger
          value="open"
          className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:rounded-md text-muted-foreground"
        >
          Open · {open.length}
        </TabsTrigger>
        <TabsTrigger
          value="fulfilled"
          className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:rounded-md text-muted-foreground"
        >
          Fulfilled · {fulfilled.length}
        </TabsTrigger>
        <TabsTrigger
          value="all"
          className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:rounded-md text-muted-foreground"
        >
          All
        </TabsTrigger>
      </TabsList>

      <TabsContent value="open" className="space-y-2">
        <section className="space-y-2">
          <div className="text-[11px] font-medium text-coral-ink">Overdue</div>
          <div className="space-y-2">
            <PromiseRows
              items={overdue}
              emptyText="No overdue promises."
              sub="Was due earlier"
              rowClassName="border-l-4 border-l-coral"
              showFulfillAction
            />
          </div>
        </section>
        <section className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">Pending</div>
          <div className="space-y-2">
            <PromiseRows items={pending} emptyText="No pending promises." sub="Open" showFulfillAction />
          </div>
        </section>
        <section className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">Snoozed</div>
          <div className="space-y-2">
            <PromiseRows items={snoozed} emptyText="No snoozed promises." sub="Snoozed" />
          </div>
        </section>
      </TabsContent>

      <TabsContent value="fulfilled" className="space-y-2">
        <section className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">Fulfilled</div>
          <div className="space-y-2">
            <PromiseRows items={fulfilled} emptyText="No fulfilled promises yet." sub="Fulfilled" />
          </div>
        </section>
      </TabsContent>

      <TabsContent value="all" className="space-y-2">
        <section className="space-y-2">
          <div className="text-[11px] font-medium text-coral-ink">Overdue</div>
          <div className="space-y-2">
            <PromiseRows
              items={overdue}
              emptyText="No overdue promises."
              sub="Was due earlier"
              rowClassName="border-l-4 border-l-coral"
              showFulfillAction
            />
          </div>
        </section>
        <section className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">Pending</div>
          <div className="space-y-2">
            <PromiseRows items={pending} emptyText="No pending promises." sub="Open" showFulfillAction />
          </div>
        </section>
        <section className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">Fulfilled</div>
          <div className="space-y-2">
            <PromiseRows items={fulfilled} emptyText="No fulfilled promises yet." sub="Fulfilled" />
          </div>
        </section>
        <section className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">Snoozed</div>
          <div className="space-y-2">
            <PromiseRows items={snoozed} emptyText="No snoozed promises." sub="Snoozed" />
          </div>
        </section>
      </TabsContent>
    </Tabs>
  );
}
