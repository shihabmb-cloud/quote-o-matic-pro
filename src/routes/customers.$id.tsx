import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Badge,
  DataTable,
  Eyebrow,
  KeyValue,
  Panel,
  PanelHeader,
  StatCard,
  StatusBadge,
  Td,
  Th,
} from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { aed, pct, shortDate } from "@/lib/ops";
import { costRfq, quotationTotals } from "@/lib/rfq-data";
import {
  useCustomers,
  useFollowUps,
  useLeads,
  useQuotationItems,
  useQuotations,
  useRfqItems,
  useRfqs,
  useSupplierQuotes,
} from "@/lib/use-ops";

export const Route = createFileRoute("/customers/$id")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Customer profile — OneTouch High Technology" },
      {
        name: "description",
        content: "One customer: contacts, RFQ history, quotations, win rate and open follow-ups.",
      },
      { property: "og:title", content: "Customer profile — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Contacts, RFQ history, quotations and follow-ups for one account.",
      },
    ],
  }),
  component: CustomerProfile,
});

function CustomerProfile() {
  const { canSeeCost } = useAuth();
  const { id } = Route.useParams();
  const customer = (useCustomers().data ?? []).find((c) => c.id === id);
  const rfqs = (useRfqs().data ?? []).filter((r) => r.customer_id === id);
  const items = useRfqItems().data ?? [];
  const quotes = useSupplierQuotes().data ?? [];
  const quotations = (useQuotations().data ?? []).filter((q) => q.customer_id === id);
  const quotationItems = useQuotationItems().data ?? [];
  const followUps = (useFollowUps().data ?? []).filter((f) => f.customer_id === id);
  const leads = (useLeads().data ?? []).filter((l) => l.company_name === customer?.name);

  if (!customer) {
    return (
      <AppShell breadcrumb={["CRM", "Customers", "Not found"]}>
        <Panel>
          <div className="py-10 text-center text-sm text-muted-foreground">
            Customer not found.{" "}
            <Link to="/customers" className="text-primary-soft hover:underline">
              Back to customers
            </Link>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const won = quotations.filter((q) => q.status === "Won");
  const lost = quotations.filter((q) => q.status === "Lost");
  const wonValue = won.reduce(
    (s, q) => s + quotationTotals(quotationItems.filter((i) => i.quotation_id === q.id), q.vat_percent).total,
    0,
  );

  return (
    <AppShell breadcrumb={["CRM", "Customers", customer.name]}>
      <div>
        <Eyebrow>{customer.industry || "Customer"}</Eyebrow>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{customer.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge tone={customer.customer_type === "Key account" ? "ready" : "new"}>
            {customer.customer_type}
          </Badge>
          <span className="text-[12px] text-muted-foreground">
            {customer.city}
            {customer.country ? `, ${customer.country}` : ""} · owner {customer.salesperson}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="RFQs" value={rfqs.length} foot="lifetime" />
        <StatCard label="Quotations" value={quotations.length} foot={`${won.length} won`} footTone="ready" />
        <StatCard label="Won value" value={`AED ${aed(wonValue, { compact: true })}`} foot="closed business" />
        <StatCard
          label="Win rate"
          value={pct(won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0)}
          foot={`${lost.length} lost`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <KeyValue label="Contact person" value={customer.contact_person || "—"} />
            <KeyValue label="Designation" value={customer.designation || "—"} />
            <KeyValue label="Mobile" value={customer.mobile || "—"} />
            <KeyValue label="Email" value={customer.email || "—"} />
            <KeyValue label="Website" value={customer.website || "—"} />
            <KeyValue label="TRN" value={customer.trn || "—"} />
            <KeyValue label="Address" value={customer.address || "—"} />
            <KeyValue label="Leads" value={leads.length} />
          </div>
          {customer.notes ? (
            <p className="mt-4 rounded-lg bg-white/[0.03] p-3 text-[13px] text-muted-foreground ring-1 ring-border">
              {customer.notes}
            </p>
          ) : null}
        </Panel>

        <Panel flush>
          <PanelHeader title="Open follow-ups" subtitle={`${followUps.filter((f) => !f.done).length} pending`} />
          <div className="divide-y divide-white/5">
            {followUps.filter((f) => !f.done).slice(0, 6).map((f) => (
              <div key={f.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground">{f.type}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {shortDate(f.due_date)} {f.due_time}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">{f.notes}</div>
              </div>
            ))}
            {followUps.filter((f) => !f.done).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing scheduled.</div>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel flush>
        <PanelHeader title="RFQ history" subtitle="Every enquiry from this account" />
        <DataTable minWidth={780}>
          <thead>
            <tr className="border-b border-border">
              <Th>RFQ</Th>
              <Th>Project</Th>
              <Th>Date</Th>
              <Th align="right">Value AED</Th>
              <Th align="right">GP %</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {rfqs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No RFQs for this customer yet.
                </td>
              </tr>
            ) : null}
            {rfqs.map((r) => {
              const c = costRfq(r, items.filter((i) => i.rfq_id === r.id), quotes);
              return (
                <tr key={r.id} className="rowhover border-b border-white/5">
                  <Td>
                    <Link
                      to="/rfqs/$id"
                      params={{ id: r.id }}
                      className="font-mono text-[12px] text-primary-soft hover:underline"
                    >
                      {r.rfq_no}
                    </Link>
                  </Td>
                  <Td className="text-foreground/80">{r.project_name}</Td>
                  <Td className="text-muted-foreground">{shortDate(r.rfq_date)}</Td>
                  <Td align="right" className="num text-foreground">
                    {aed(c.sellingPrice)}
                  </Td>
                  <Td align="right" className={c.gpPercent >= 20 ? "text-ready" : "text-wait"}>
                    {canSeeCost ? (c.pricedItems ? pct(c.gpPercent) : "—") : "—"}
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
        <PanelHeader title="Quotation history" subtitle="What we offered, and how it ended" />
        <DataTable minWidth={720}>
          <thead>
            <tr className="border-b border-border">
              <Th>Quotation</Th>
              <Th>Date</Th>
              <Th align="right">Total AED</Th>
              <Th align="right">GP %</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No quotations yet.
                </td>
              </tr>
            ) : null}
            {quotations.map((q) => {
              const t = quotationTotals(
                quotationItems.filter((i) => i.quotation_id === q.id),
                q.vat_percent,
              );
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
                  <Td className="text-muted-foreground">{shortDate(q.quote_date)}</Td>
                  <Td align="right" className="num text-foreground">
                    {aed(t.total)}
                  </Td>
                  <Td align="right" className={t.gpPercent >= 20 ? "text-ready" : "text-wait"}>
                    {canSeeCost ? pct(t.gpPercent) : "—"}
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
