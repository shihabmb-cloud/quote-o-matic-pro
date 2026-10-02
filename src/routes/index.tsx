import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StageRail } from "@/components/StageRail";
import { DataTable, Eyebrow, Panel, PanelHeader, StatCard, StatusBadge, Td, Th, EmptyRow } from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { aed, pct, relativeTime, shortDate } from "@/lib/ops";
import { costRfq } from "@/lib/rfq-data";
import {
  useActivity,
  useCustomers,
  useFollowUps,
  useLeads,
  useQuotations,
  useRfqItems,
  useRfqs,
  useSupplierQuotes,
} from "@/lib/use-ops";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "CRM dashboard — OneTouch High Technology" },
      {
        name: "description",
        content:
          "Live view of leads, RFQs waiting for purchase, quotations ready to send, and win rate across the sales pipeline.",
      },
      { property: "og:title", content: "CRM dashboard — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Leads, RFQs, quotations and win rate in one connected pipeline view.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { displayName, canSeeCost } = useAuth();
  const rfqs = useRfqs().data ?? [];
  const items = useRfqItems().data ?? [];
  const quotes = useSupplierQuotes().data ?? [];
  const customers = useCustomers().data ?? [];
  const leads = useLeads().data ?? [];
  const quotations = useQuotations().data ?? [];
  const followUps = useFollowUps().data ?? [];
  const activity = useActivity().data ?? [];

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "—";
  const today = new Date().toISOString().slice(0, 10);

  const waiting = rfqs.filter((r) =>
    ["SUBMITTED TO PURCHASE", "PURCHASE RECEIVED", "PURCHASE IN PROGRESS", "WAITING FOR SUPPLIER", "SUPPLIER PRICES RECEIVED", "PRICE COMPARISON"].includes(r.status),
  );
  const readyForQuote = rfqs.filter((r) => r.status === "READY FOR CRM");
  const sent = quotations.filter((q) => ["Sent", "Viewed", "Negotiation", "Follow-up"].includes(q.status));
  const won = quotations.filter((q) => q.status === "Won");
  const lost = quotations.filter((q) => q.status === "Lost");
  const newLeads = leads.filter((l) => ["New", "Contacted", "Qualified"].includes(l.status));
  const urgent = waiting.filter((r) => ["High", "Urgent"].includes(r.priority));
  const dueToday = followUps.filter((f) => !f.done && f.due_date <= today);

  const rfqValue = (rfqId: string) => {
    const rfq = rfqs.find((r) => r.id === rfqId);
    if (!rfq)
      return {
        sellingPrice: 0,
        gpPercent: 0,
        totalCost: 0,
        productCost: 0,
        grossProfit: 0,
        pricedItems: 0,
      };
    return costRfq(rfq, items.filter((i) => i.rfq_id === rfqId), quotes);
  };

  const pipeline = [
    { label: "New leads", value: newLeads.reduce((s, l) => s + Number(l.expected_value), 0), color: "bg-new/80" },
    { label: "Waiting purchase", value: waiting.reduce((s, r) => s + rfqValue(r.id).sellingPrice, 0), color: "bg-wait/80" },
    { label: "Ready to quote", value: readyForQuote.reduce((s, r) => s + rfqValue(r.id).sellingPrice, 0), color: "bg-ready/80" },
    { label: "Quotations sent", value: sent.reduce((s, q) => s + rfqValue(q.rfq_id ?? "").sellingPrice, 0), color: "bg-primary/80" },
    { label: "Won", value: won.reduce((s, q) => s + rfqValue(q.rfq_id ?? "").sellingPrice, 0), color: "bg-accent/80" },
    { label: "Lost", value: lost.reduce((s, q) => s + rfqValue(q.rfq_id ?? "").sellingPrice, 0), color: "bg-lost/60" },
  ];
  const peak = Math.max(...pipeline.map((p) => p.value), 1);

  const focusRfq = waiting[0] ?? readyForQuote[0] ?? rfqs[0];
  const winRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;

  return (
    <AppShell breadcrumb={["CRM", "Dashboard"]}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Good to see you</Eyebrow>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{displayName}</h1>
        </div>
        <Link
          to="/rfqs"
          className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90"
        >
          New RFQ
        </Link>
      </div>

      {focusRfq ? (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <Eyebrow>Hand-off stage</Eyebrow>
              <div className="text-sm font-semibold text-foreground">
                {focusRfq.rfq_no} · {customerName(focusRfq.customer_id)}
              </div>
            </div>
            <StatusBadge status={focusRfq.status} dot />
          </div>
          <StageRail status={focusRfq.status} />
        </Panel>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="New leads" value={newLeads.length} foot={`${leads.length} total`} />
        <StatCard
          label="RFQs waiting"
          value={waiting.length}
          foot={urgent.length ? `${urgent.length} high priority` : "all on track"}
          footTone={urgent.length ? "wait" : "ready"}
        />
        <StatCard
          label="Ready for quotation"
          value={readyForQuote.length}
          foot="priced by purchase"
          footTone="ready"
        />
        <StatCard
          label="Quotations sent"
          value={sent.length}
          foot={`AED ${aed(sent.reduce((s, q) => s + rfqValue(q.rfq_id ?? "").sellingPrice, 0), { compact: true })} in play`}
        />
        <StatCard
          label="Won / Lost"
          value={
            <>
              {won.length}
              <span className="text-base text-muted-foreground">/{lost.length}</span>
            </>
          }
          foot={`${pct(winRate)} win rate`}
          footTone="ready"
        />
      </section>

      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">Pipeline by stage</div>
          <div className="text-xs text-muted-foreground">AED · current pipeline</div>
        </div>
        <div className="flex h-36 items-end gap-2 sm:gap-3">
          {pipeline.map((p) => (
            <div key={p.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div
                className={`w-full rounded-t-md ${p.color}`}
                style={{ height: `${Math.max((p.value / peak) * 70, 2)}%` }}
              />
              <span className="num text-[11px] text-muted-foreground">{aed(p.value, { compact: true })}</span>
              <span className="text-center text-[10px] leading-tight text-muted-foreground opacity-70">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel flush>
        <PanelHeader
          title="RFQ queue"
          subtitle="Everything the sales team is tracking, with live purchase status"
          action={
            <Link to="/rfqs" className="text-[12px] text-primary-soft hover:underline">
              View all
            </Link>
          }
        />
        <DataTable minWidth={760}>
          <thead>
            <tr className="border-b border-border">
              <Th>RFQ</Th>
              <Th>Customer</Th>
              <Th>Salesperson</Th>
              <Th>Required</Th>
              <Th align="right">Value AED</Th>
              <Th align="right">GP %</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {rfqs.length === 0 ? <EmptyRow colSpan={7} label="No RFQs yet." /> : null}
            {rfqs.slice(0, 8).map((r) => {
              const v = rfqValue(r.id);
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
                  <Td className="text-foreground/80">{customerName(r.customer_id)}</Td>
                  <Td className="text-muted-foreground">{r.salesperson}</Td>
                  <Td className="text-muted-foreground">{shortDate(r.required_date)}</Td>
                  <Td align="right" className="text-foreground">
                    {aed(v.sellingPrice)}
                  </Td>
                  <Td align="right" className={v.gpPercent >= 20 ? "text-ready" : "text-wait"}>
                    {canSeeCost ? (v.pricedItems ? pct(v.gpPercent) : "—") : "—"}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel flush className="lg:col-span-2">
          <PanelHeader title="Activity log" subtitle="Who did what, across both teams" />
          <div className="divide-y divide-white/5">
            {activity.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="size-1.5 shrink-0 rounded-full bg-primary-soft" />
                <span className="flex-1 text-[13px] text-foreground/80">
                  <span className="font-medium text-foreground">{a.actor}</span> · {a.action}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {relativeTime(a.created_at)}
                </span>
              </div>
            ))}
            {activity.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No activity recorded yet.
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel flush>
          <PanelHeader title="Follow-ups due" subtitle={`${dueToday.length} need attention`} />
          <div className="divide-y divide-white/5">
            {dueToday.slice(0, 6).map((f) => (
              <div key={f.id} className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-1.5 rounded-full ${f.due_date < today ? "bg-urgent" : "bg-wait"}`}
                  />
                  <span className="text-[13px] font-medium text-foreground">
                    {customerName(f.customer_id)}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {f.due_time} · {f.type}
                  </span>
                </div>
                <div className="mt-1 pl-3.5 text-[12px] text-muted-foreground">{f.notes}</div>
              </div>
            ))}
            {dueToday.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nothing due. Nice.
              </div>
            ) : null}
          </div>
          <div className="border-t border-border px-5 py-3">
            <Link to="/followups" className="text-[12px] text-primary-soft hover:underline">
              Open follow-ups
            </Link>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {(["SUBMITTED TO PURCHASE", "READY FOR CRM", "WON"] as const).map((status) => {
          const list = rfqs.filter((r) => r.status === status);
          return (
            <Panel key={status} flush>
              <PanelHeader title={status} subtitle={`${list.length} RFQ${list.length === 1 ? "" : "s"}`} />
              <div className="divide-y divide-white/5">
                {list.slice(0, 4).map((r) => (
                  <Link
                    key={r.id}
                    to="/rfqs/$id"
                    params={{ id: r.id }}
                    className="rowhover block px-5 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-primary-soft">{r.rfq_no}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {aed(rfqValue(r.id).sellingPrice, { compact: true })} AED
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {customerName(r.customer_id)} · {r.project_name}
                    </div>
                  </Link>
                ))}
                {list.length === 0 ? (
                  <div className="px-5 py-6 text-center text-xs text-muted-foreground">Empty</div>
                ) : null}
              </div>
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
