import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge, DataTable, EmptyRow, Panel, PanelHeader, Td, Th } from "@/components/ops";
import { requireSession } from "@/lib/auth";
import { relativeTime } from "@/lib/ops";
import { useActivity } from "@/lib/use-ops";

export const Route = createFileRoute("/activity")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Activity log — OneTouch High Technology" },
      {
        name: "description",
        content: "Audit trail of every action on RFQs, quotations, customers and suppliers.",
      },
      { property: "og:title", content: "Activity log — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Who changed what, and when, across sales and purchase.",
      },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const activity = useActivity().data ?? [];
  const [entity, setEntity] = useState("ALL");
  const entities = Array.from(new Set(activity.map((a) => a.entity)));
  const rows = activity.filter((a) => entity === "ALL" || a.entity === entity);

  return (
    <AppShell breadcrumb={["Admin", "Activity log"]}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Activity log</h1>
        <p className="text-[13px] text-muted-foreground">
          A permanent record of who did what, for accountability and audits.
        </p>
      </div>

      <Panel flush>
        <PanelHeader
          title={`${rows.length} event${rows.length === 1 ? "" : "s"}`}
          action={
            <select
              className="rounded-lg bg-white/5 px-3 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
            >
              <option value="ALL" className="bg-card">
                All records
              </option>
              {entities.map((e) => (
                <option key={e} value={e} className="bg-card">
                  {e}
                </option>
              ))}
            </select>
          }
        />
        <DataTable minWidth={700}>
          <thead>
            <tr className="border-b border-border">
              <Th>Person</Th>
              <Th>Action</Th>
              <Th>Record</Th>
              <Th align="right">When</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={4} label="No activity recorded yet." /> : null}
            {rows.map((a) => (
              <tr key={a.id} className="rowhover border-b border-white/5">
                <Td className="font-medium text-foreground">{a.actor}</Td>
                <Td className="text-foreground/80">{a.action}</Td>
                <Td>
                  <Badge tone="new">{a.entity}</Badge>
                </Td>
                <Td align="right" className="text-muted-foreground">
                  {relativeTime(a.created_at)}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </AppShell>
  );
}
