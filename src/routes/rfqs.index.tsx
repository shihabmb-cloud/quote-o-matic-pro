import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import {
  Badge,
  DataTable,
  EmptyRow,
  Field,
  Panel,
  PanelHeader,
  StatusBadge,
  Td,
  Th,
} from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { aed, pct, priorityTone, RFQ_STATUSES, shortDate } from "@/lib/ops";
import { costRfq, logActivity, nextSequence } from "@/lib/rfq-data";
import { useCustomers, useRfqItems, useRfqs, useSupplierQuotes } from "@/lib/use-ops";

export const Route = createFileRoute("/rfqs/")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "RFQs — OneTouch High Technology" },
      {
        name: "description",
        content: "Every request for quotation with its purchase status, value and gross profit in one list.",
      },
      { property: "og:title", content: "RFQs — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Track RFQs from draft to won, with live purchase status and margin.",
      },
    ],
  }),
  component: RfqList,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60";

function RfqList() {
  const { displayName, canSeeCost } = useAuth();
  const qc = useQueryClient();
  const rfqs = useRfqs().data ?? [];
  const items = useRfqItems().data ?? [];
  const quotes = useSupplierQuotes().data ?? [];
  const customers = useCustomers().data ?? [];

  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    project_name: "",
    customer_reference: "",
    priority: "Medium",
    required_date: "",
    target_gp_percent: 22,
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rfqs.filter((r) => {
      if (filter !== "ALL" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.rfq_no.toLowerCase().includes(q) ||
        r.project_name.toLowerCase().includes(q) ||
        customerName(r.customer_id).toLowerCase().includes(q)
      );
    });
  }, [rfqs, filter, search, customers]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("company_id").maybeSingle();
      if (!profile) throw new Error("No workspace found for your account");
      const rfq_no = nextSequence(rfqs.map((r) => r.rfq_no), "RFQ");
      const { data, error } = await supabase
        .from("rfqs")
        .insert({
          company_id: profile.company_id,
          rfq_no,
          customer_id: form.customer_id || null,
          salesperson: displayName,
          rfq_date: new Date().toISOString().slice(0, 10),
          required_date: form.required_date || null,
          customer_reference: form.customer_reference,
          project_name: form.project_name,
          priority: form.priority,
          status: "DRAFT",
          notes: form.notes,
          target_gp_percent: Number(form.target_gp_percent),
        })
        .select("id, rfq_no")
        .single();
      if (error) throw error;
      await logActivity(displayName, `created ${data.rfq_no}`, "rfq", data.id);
      await qc.invalidateQueries();
      toast.success(`${data.rfq_no} created`);
      setOpen(false);
      setForm({
        customer_id: "",
        project_name: "",
        customer_reference: "",
        priority: "Medium",
        required_date: "",
        target_gp_percent: 22,
        notes: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create RFQ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell breadcrumb={["CRM", "RFQs"]}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Requests for quotation</h1>
          <p className="text-[13px] text-muted-foreground">
            The shared document between sales and purchase.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90"
        >
          {open ? "Close" : "New RFQ"}
        </button>
      </div>

      {open ? (
        <Panel>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer">
              <select
                className={inputClass}
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                required
              >
                <option value="" className="bg-card">
                  Select customer
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card">
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project name">
              <input
                className={inputClass}
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                placeholder="Head office switch refresh"
                required
              />
            </Field>
            <Field label="Customer reference">
              <input
                className={inputClass}
                value={form.customer_reference}
                onChange={(e) => setForm({ ...form, customer_reference: e.target.value })}
                placeholder="PO / enquiry ref"
              />
            </Field>
            <Field label="Priority">
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {["Low", "Medium", "High", "Urgent"].map((p) => (
                  <option key={p} value={p} className="bg-card">
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Required date">
              <input
                type="date"
                className={inputClass}
                value={form.required_date}
                onChange={(e) => setForm({ ...form, required_date: e.target.value })}
              />
            </Field>
            <Field label="Target GP %">
              <input
                type="number"
                min={0}
                max={90}
                className={inputClass}
                value={form.target_gp_percent}
                onChange={(e) => setForm({ ...form, target_gp_percent: Number(e.target.value) })}
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Notes for purchase">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Site conditions, brand preferences, delivery constraints…"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Create RFQ"}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel flush>
        <PanelHeader
          title={`${rows.length} RFQ${rows.length === 1 ? "" : "s"}`}
          subtitle="Filter by status or search by number, customer or project"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="w-44 rounded-lg bg-white/5 px-3 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60"
                placeholder="Search RFQs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="rounded-lg bg-white/5 px-3 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL" className="bg-card">
                  All statuses
                </option>
                {RFQ_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-card">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        <DataTable minWidth={900}>
          <thead>
            <tr className="border-b border-border">
              <Th>RFQ</Th>
              <Th>Customer</Th>
              <Th>Project</Th>
              <Th>Priority</Th>
              <Th>Required</Th>
              <Th align="right">Value AED</Th>
              <Th align="right">GP %</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={8} label="No RFQs match this view." /> : null}
            {rows.map((r) => {
              const v = costRfq(r, items.filter((i) => i.rfq_id === r.id), quotes);
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
                  <Td className="text-muted-foreground">{r.project_name}</Td>
                  <Td>
                    <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge>
                  </Td>
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
    </AppShell>
  );
}
