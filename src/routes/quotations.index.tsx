import { useState } from "react";
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
import { requireSession, useAuth } from "@/lib/auth";
import { aed, pct, shortDate } from "@/lib/ops";
import { quotationTotals } from "@/lib/rfq-data";
import { useCustomers, useQuotationItems, useQuotations } from "@/lib/use-ops";

export const Route = createFileRoute("/quotations/")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Quotations — OneTouch High Technology" },
      {
        name: "description",
        content: "All customer quotations with value, margin, approval state and outcome.",
      },
      { property: "og:title", content: "Quotations — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Quotation values, margins, approvals and win/loss outcomes in one list.",
      },
    ],
  }),
  component: QuotationList,
});

function QuotationList() {
  const { canSeeCost } = useAuth();
  const quotations = useQuotations().data ?? [];
  const items = useQuotationItems().data ?? [];
  const customers = useCustomers().data ?? [];
  const [filter, setFilter] = useState("ALL");

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "—";
  const rows = quotations.filter((q) => filter === "ALL" || q.status === filter);

  const totalsFor = (qid: string, vat: number) =>
    quotationTotals(items.filter((i) => i.quotation_id === qid), vat);

  const won = quotations.filter((q) => q.status === "Won");
  const lost = quotations.filter((q) => q.status === "Lost");
  const pending = quotations.filter((q) => q.approval_status === "Pending");
  const open = quotations.filter((q) => !["Won", "Lost", "Expired"].includes(q.status));

  return (
    <AppShell breadcrumb={["CRM", "Quotations"]}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Quotations</h1>
        <p className="text-[13px] text-muted-foreground">
          Built from RFQ pricing, with approval rules applied automatically.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Open quotations"
          value={open.length}
          foot={`AED ${aed(open.reduce((s, q) => s + totalsFor(q.id, q.vat_percent).total, 0), { compact: true })}`}
        />
        <StatCard
          label="Awaiting approval"
          value={pending.length}
          foot={pending.length ? "needs a decision" : "nothing pending"}
          footTone={pending.length ? "wait" : "ready"}
        />
        <StatCard label="Won" value={won.length} foot={`AED ${aed(won.reduce((s, q) => s + totalsFor(q.id, q.vat_percent).total, 0), { compact: true })}`} footTone="ready" />
        <StatCard
          label="Win rate"
          value={pct(won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0)}
          foot={`${won.length} won · ${lost.length} lost`}
        />
      </section>

      <Panel flush>
        <PanelHeader
          title={`${rows.length} quotation${rows.length === 1 ? "" : "s"}`}
          action={
            <select
              className="rounded-lg bg-white/5 px-3 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["ALL", "Draft", "Sent", "Viewed", "Negotiation", "Follow-up", "Won", "Lost", "Expired"].map(
                (s) => (
                  <option key={s} value={s} className="bg-card">
                    {s === "ALL" ? "All statuses" : s}
                  </option>
                ),
              )}
            </select>
          }
        />
        <DataTable minWidth={940}>
          <thead>
            <tr className="border-b border-border">
              <Th>Quotation</Th>
              <Th>Customer</Th>
              <Th>Date</Th>
              <Th>Valid until</Th>
              <Th align="right">Total AED</Th>
              <Th align="right">GP %</Th>
              <Th>Approval</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={8} label="No quotations in this view." /> : null}
            {rows.map((q) => {
              const t = totalsFor(q.id, q.vat_percent);
              return (
                <tr key={q.id} className="rowhover border-b border-white/5">
                  <Td>
                    <Link
                      to="/quotations/$id"
                      params={{ id: q.id }}
                      className="font-mono text-[12px] text-primary-soft hover:underline"
                    >
                      {q.quotation_no}
                    </Link>
                  </Td>
                  <Td className="text-foreground/80">{customerName(q.customer_id)}</Td>
                  <Td className="text-muted-foreground">{shortDate(q.quote_date)}</Td>
                  <Td className="text-muted-foreground">{shortDate(q.valid_until)}</Td>
                  <Td align="right" className="num text-foreground">
                    {aed(t.total)}
                  </Td>
                  <Td align="right" className={t.gpPercent >= 20 ? "text-ready" : t.gpPercent >= 15 ? "text-wait" : "text-urgent"}>
                    {canSeeCost ? pct(t.gpPercent) : "—"}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        q.approval_status === "Approved"
                          ? "ready"
                          : q.approval_status === "Rejected"
                            ? "urgent"
                            : "wait"
                      }
                    >
                      {q.approval_status}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <StatusBadge status={q.status} />
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
