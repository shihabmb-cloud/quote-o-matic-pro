import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Badge,
  DataTable,
  EmptyRow,
  Panel,
  PanelHeader,
  StatCard,
  StatusBadge,
  Td,
  Th,
} from "@/components/ops";
import { requireSession } from "@/lib/auth";
import { aed, pct, priorityTone, relativeTime, shortDate } from "@/lib/ops";
import { costRfq } from "@/lib/rfq-data";
import { useCustomers, useRfqItems, useRfqs, useSupplierQuotes } from "@/lib/use-ops";

export const Route = createFileRoute("/purchase/")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Purchase workspace — OneTouch High Technology" },
      {
        name: "description",
        content: "The purchase team queue: RFQs waiting for supplier prices, comparison and cost sign-off.",
      },
      { property: "og:title", content: "Purchase workspace — OneTouch High Technology" },
      {
        property: "og:description",
        content: "RFQs waiting for supplier prices, with comparison and margin sign-off.",
      },
    ],
  }),
  component: PurchaseQueue,
});

const ACTIVE = [
  "SUBMITTED TO PURCHASE",
  "PURCHASE RECEIVED",
  "PURCHASE IN PROGRESS",
  "WAITING FOR SUPPLIER",
  "SUPPLIER PRICES RECEIVED",
  "PRICE COMPARISON",
];

function PurchaseQueue() {
  const rfqs = useRfqs().data ?? [];
  const items = useRfqItems().data ?? [];
  const quotes = useSupplierQuotes().data ?? [];
  const customers = useCustomers().data ?? [];

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "—";
  const queue = rfqs.filter((r) => ACTIVE.includes(r.status));
  const ready = rfqs.filter((r) => r.status === "READY FOR CRM");
  const urgent = queue.filter((r) => ["High", "Urgent"].includes(r.priority));
  const awaitingPrices = queue.filter((r) => {
    const its = items.filter((i) => i.rfq_id === r.id);
    return its.some((i) => !quotes.some((q) => q.rfq_item_id === i.id));
  });

  return (
    <AppShell breadcrumb={["Purchase", "Queue"]}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Purchase queue</h1>
        <p className="text-[13px] text-muted-foreground">
          RFQs handed over by sales, waiting for supplier prices and cost sign-off.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="In queue" value={queue.length} foot="assigned to purchase" />
        <StatCard
          label="High priority"
          value={urgent.length}
          foot={urgent.length ? "needs today" : "all calm"}
          footTone={urgent.length ? "urgent" : "ready"}
        />
        <StatCard label="Missing prices" value={awaitingPrices.length} foot="items without a quote" footTone="wait" />
        <StatCard label="Sent back to CRM" value={ready.length} foot="priced and ready" footTone="ready" />
      </section>

      <Panel flush>
        <PanelHeader title="Waiting on purchase" subtitle="Oldest hand-off first" />
        <DataTable minWidth={920}>
          <thead>
            <tr className="border-b border-border">
              <Th>RFQ</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Priority</Th>
              <Th>Required</Th>
              <Th>Handed over</Th>
              <Th align="right">Cost AED</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {queue.length === 0 ? <EmptyRow colSpan={8} label="Queue is clear." /> : null}
            {[...queue]
              .sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""))
              .map((r) => {
                const its = items.filter((i) => i.rfq_id === r.id);
                const c = costRfq(r, its, quotes);
                return (
                  <tr key={r.id} className="rowhover border-b border-white/5">
                    <Td>
                      <Link
                        to="/purchase/$id"
                        params={{ id: r.id }}
                        className="font-mono text-[12px] text-primary-soft hover:underline"
                      >
                        {r.rfq_no}
                      </Link>
                    </Td>
                    <Td className="text-foreground/80">{customerName(r.customer_id)}</Td>
                    <Td className="num text-muted-foreground">
                      {c.pricedItems}/{its.length} priced
                    </Td>
                    <Td>
                      <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge>
                    </Td>
                    <Td className="text-muted-foreground">{shortDate(r.required_date)}</Td>
                    <Td className="text-muted-foreground">{relativeTime(r.submitted_at)}</Td>
                    <Td align="right" className="num text-foreground">
                      {aed(c.totalCost)}
                    </Td>
                    <Td align="right">
                      <StatusBadge status={r.status} />
                    </Td>
                  </tr>
                );
              })}
          </tbody>
        </DataTable>
      </Panel>

      <Panel flush>
        <PanelHeader title="Recently sent back to CRM" subtitle="Priced RFQs the sales team can quote" />
        <DataTable minWidth={720}>
          <thead>
            <tr className="border-b border-border">
              <Th>RFQ</Th>
              <Th>Customer</Th>
              <Th>Priced by</Th>
              <Th align="right">Cost AED</Th>
              <Th align="right">GP %</Th>
            </tr>
          </thead>
          <tbody>
            {ready.length === 0 ? <EmptyRow colSpan={5} label="Nothing sent back yet." /> : null}
            {ready.map((r) => {
              const c = costRfq(r, items.filter((i) => i.rfq_id === r.id), quotes);
              return (
                <tr key={r.id} className="rowhover border-b border-white/5">
                  <Td>
                    <Link
                      to="/purchase/$id"
                      params={{ id: r.id }}
                      className="font-mono text-[12px] text-primary-soft hover:underline"
                    >
                      {r.rfq_no}
                    </Link>
                  </Td>
                  <Td className="text-foreground/80">{customerName(r.customer_id)}</Td>
                  <Td className="text-muted-foreground">{r.ready_by ?? "—"}</Td>
                  <Td align="right" className="num text-foreground">
                    {aed(c.totalCost)}
                  </Td>
                  <Td align="right" className={c.gpPercent >= 20 ? "text-ready" : "text-wait"}>
                    {pct(c.gpPercent)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </Panel>
    </AppShell>
  );
}
