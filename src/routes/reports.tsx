import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DataTable, Eyebrow, Panel, PanelHeader, StatCard, Td, Th } from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { aed, durationBetween, pct } from "@/lib/ops";
import { costRfq, quotationTotals } from "@/lib/rfq-data";
import {
  useCustomers,
  useLeads,
  useQuotationItems,
  useQuotations,
  useRfqItems,
  useRfqs,
  useSupplierQuotes,
  useSuppliers,
} from "@/lib/use-ops";

export const Route = createFileRoute("/reports")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Reports — OneTouch High Technology" },
      {
        name: "description",
        content: "Sales, purchase and management reports: win rate, margin, turnaround and supplier performance.",
      },
      { property: "og:title", content: "Reports — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Win rate, margin, RFQ turnaround and supplier performance in one place.",
      },
    ],
  }),
  component: Reports,
});

function hoursBetween(from: string | null, to: string | null) {
  if (!from || !to) return null;
  return (new Date(to).getTime() - new Date(from).getTime()) / 3600000;
}

function Reports() {
  const { canSeeCost } = useAuth();
  const rfqs = useRfqs().data ?? [];
  const items = useRfqItems().data ?? [];
  const quotes = useSupplierQuotes().data ?? [];
  const suppliers = useSuppliers().data ?? [];
  const customers = useCustomers().data ?? [];
  const leads = useLeads().data ?? [];
  const quotations = useQuotations().data ?? [];
  const quotationItems = useQuotationItems().data ?? [];

  const totals = (q: (typeof quotations)[number]) =>
    quotationTotals(quotationItems.filter((i) => i.quotation_id === q.id), q.vat_percent);

  const won = quotations.filter((q) => q.status === "Won");
  const lost = quotations.filter((q) => q.status === "Lost");
  const wonValue = won.reduce((s, q) => s + totals(q).total, 0);
  const avgGp = quotations.length
    ? quotations.reduce((s, q) => s + totals(q).gpPercent, 0) / quotations.length
    : 0;

  const turnarounds = rfqs
    .map((r) => hoursBetween(r.submitted_at, r.ready_at))
    .filter((h): h is number => h !== null);
  const avgTurnaround = turnarounds.length
    ? turnarounds.reduce((s, h) => s + h, 0) / turnarounds.length
    : 0;

  const salesMap = new Map<string, { name: string; count: number; value: number; won: number }>();
  for (const q of quotations) {
    const key = q.salesperson || "Unassigned";
    const row = salesMap.get(key) ?? { name: key, count: 0, value: 0, won: 0 };
    row.count += 1;
    row.value += totals(q).total;
    if (q.status === "Won") row.won += 1;
    salesMap.set(key, row);
  }
  const bySalesperson = [...salesMap.values()].sort((a, b) => b.value - a.value);

  const sourceMap = new Map<string, { source: string; count: number; value: number; converted: number }>();
  for (const l of leads) {
    const row = sourceMap.get(l.source) ?? { source: l.source, count: 0, value: 0, converted: 0 };
    row.count += 1;
    row.value += Number(l.expected_value);
    if (l.status === "Converted") row.converted += 1;
    sourceMap.set(l.source, row);
  }
  const bySource = [...sourceMap.values()].sort((a, b) => b.count - a.count);

  const selectedIds = new Set(items.map((i) => i.selected_quote_id).filter(Boolean) as string[]);
  const supplierRows = suppliers
    .map((s) => {
      const mine = quotes.filter((q) => q.supplier_id === s.id);
      const wins = mine.filter((q) => selectedIds.has(q.id));
      return {
        name: s.name,
        quotes: mine.length,
        wins: wins.length,
        share: mine.length ? (wins.length / mine.length) * 100 : 0,
        avgDelivery: mine.length
          ? Math.round(mine.reduce((a, q) => a + Number(q.delivery_days), 0) / mine.length)
          : 0,
      };
    })
    .sort((a, b) => b.wins - a.wins);

  const customerRows = customers
    .map((c) => {
      const theirs = rfqs.filter((r) => r.customer_id === c.id);
      const theirQuotes = quotations.filter((q) => q.customer_id === c.id);
      return {
        name: c.name,
        rfqs: theirs.length,
        value: theirs.reduce(
          (s, r) => s + costRfq(r, items.filter((i) => i.rfq_id === r.id), quotes).sellingPrice,
          0,
        ),
        won: theirQuotes.filter((q) => q.status === "Won").length,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <AppShell breadcrumb={["Reports"]}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="text-[13px] text-muted-foreground">
          Performance across sales, purchase and management.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Win rate"
          value={pct(won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0)}
          foot={`${won.length} won · ${lost.length} lost`}
        />
        <StatCard label="Won value" value={`AED ${aed(wonValue, { compact: true })}`} foot="closed business" footTone="ready" />
        <StatCard label="Average GP" value={canSeeCost ? pct(avgGp) : "—"} foot="across quotations" footTone={avgGp >= 20 ? "ready" : "wait"} />
        <StatCard
          label="RFQ turnaround"
          value={`${avgTurnaround.toFixed(1)}h`}
          foot="submit → ready for CRM"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel flush>
          <PanelHeader title="Salesperson performance" subtitle="Quotation value and wins" />
          <DataTable minWidth={420}>
            <thead>
              <tr className="border-b border-border">
                <Th>Salesperson</Th>
                <Th align="right">Quotes</Th>
                <Th align="right">Won</Th>
                <Th align="right">Value AED</Th>
              </tr>
            </thead>
            <tbody>
              {bySalesperson.map((s) => (
                <tr key={s.name} className="rowhover border-b border-white/5">
                  <Td className="text-foreground">{s.name}</Td>
                  <Td align="right" className="num text-muted-foreground">
                    {s.count}
                  </Td>
                  <Td align="right" className="num text-ready">
                    {s.won}
                  </Td>
                  <Td align="right" className="num text-foreground">
                    {aed(s.value)}
                  </Td>
                </tr>
              ))}
              {bySalesperson.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No quotations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </DataTable>
        </Panel>

        <Panel flush>
          <PanelHeader title="Lead sources" subtitle="Where enquiries come from" />
          <DataTable minWidth={420}>
            <thead>
              <tr className="border-b border-border">
                <Th>Source</Th>
                <Th align="right">Leads</Th>
                <Th align="right">Converted</Th>
                <Th align="right">Value AED</Th>
              </tr>
            </thead>
            <tbody>
              {bySource.map((s) => (
                <tr key={s.source} className="rowhover border-b border-white/5">
                  <Td className="text-foreground">{s.source}</Td>
                  <Td align="right" className="num text-muted-foreground">
                    {s.count}
                  </Td>
                  <Td align="right" className="num text-ready">
                    {s.converted}
                  </Td>
                  <Td align="right" className="num text-foreground">
                    {aed(s.value)}
                  </Td>
                </tr>
              ))}
              {bySource.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No leads yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </DataTable>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel flush>
          <PanelHeader title="Supplier performance" subtitle="Quotes given versus orders won" />
          <DataTable minWidth={460}>
            <thead>
              <tr className="border-b border-border">
                <Th>Supplier</Th>
                <Th align="right">Quotes</Th>
                <Th align="right">Won</Th>
                <Th align="right">Share</Th>
                <Th align="right">Avg delivery</Th>
              </tr>
            </thead>
            <tbody>
              {supplierRows.map((s) => (
                <tr key={s.name} className="rowhover border-b border-white/5">
                  <Td className="text-foreground">{s.name}</Td>
                  <Td align="right" className="num text-muted-foreground">
                    {s.quotes}
                  </Td>
                  <Td align="right" className="num text-ready">
                    {s.wins}
                  </Td>
                  <Td align="right" className="num text-muted-foreground">
                    {pct(s.share)}
                  </Td>
                  <Td align="right" className="num text-muted-foreground">
                    {s.avgDelivery}d
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>

        <Panel flush>
          <PanelHeader title="Top customers" subtitle="By RFQ value" />
          <DataTable minWidth={420}>
            <thead>
              <tr className="border-b border-border">
                <Th>Customer</Th>
                <Th align="right">RFQs</Th>
                <Th align="right">Won quotes</Th>
                <Th align="right">Value AED</Th>
              </tr>
            </thead>
            <tbody>
              {customerRows.map((c) => (
                <tr key={c.name} className="rowhover border-b border-white/5">
                  <Td className="text-foreground">{c.name}</Td>
                  <Td align="right" className="num text-muted-foreground">
                    {c.rfqs}
                  </Td>
                  <Td align="right" className="num text-ready">
                    {c.won}
                  </Td>
                  <Td align="right" className="num text-foreground">
                    {aed(c.value)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
      </div>

      <Panel flush>
        <PanelHeader title="RFQ turnaround detail" subtitle="How long purchase took on each hand-off" />
        <DataTable minWidth={620}>
          <thead>
            <tr className="border-b border-border">
              <Th>RFQ</Th>
              <Th>Submitted by</Th>
              <Th>Priced by</Th>
              <Th align="right">Turnaround</Th>
              <Th align="right">GP %</Th>
            </tr>
          </thead>
          <tbody>
            {rfqs
              .filter((r) => r.submitted_at)
              .map((r) => {
                const c = costRfq(r, items.filter((i) => i.rfq_id === r.id), quotes);
                return (
                  <tr key={r.id} className="rowhover border-b border-white/5">
                    <Td className="num text-primary-soft">{r.rfq_no}</Td>
                    <Td className="text-muted-foreground">{r.submitted_by ?? "—"}</Td>
                    <Td className="text-muted-foreground">{r.ready_by ?? "pending"}</Td>
                    <Td align="right" className="num text-foreground">
                      {durationBetween(r.submitted_at, r.ready_at)}
                    </Td>
                    <Td align="right" className={c.gpPercent >= 20 ? "text-ready" : "text-wait"}>
                      {canSeeCost ? (c.pricedItems ? pct(c.gpPercent) : "—") : "—"}
                    </Td>
                  </tr>
                );
              })}
          </tbody>
        </DataTable>
      </Panel>
      <Eyebrow>Figures update live as the teams work</Eyebrow>
    </AppShell>
  );
}
