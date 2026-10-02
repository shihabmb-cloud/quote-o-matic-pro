import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createQuotationFromRfq } from "@/lib/quotation.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StageRail } from "@/components/StageRail";
import {
  Badge,
  DataTable,
  EmptyRow,
  Eyebrow,
  Field,
  KeyValue,
  Panel,
  PanelHeader,
  StatusBadge,
  Td,
  Th,
} from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import {
  aed,
  durationBetween,
  pct,
  priorityTone,
  requiredApproval,
  RFQ_STATUSES,
  shortDate,
  suggestedSellingPrice,
} from "@/lib/ops";
import { costRfq, logActivity, nextSequence, notify } from "@/lib/rfq-data";
import {
  useCustomers,
  useQuotations,
  useRfqItems,
  useRfqs,
  useSupplierQuotes,
  useSuppliers,
} from "@/lib/use-ops";

export const Route = createFileRoute("/rfqs/$id")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "RFQ detail — OneTouch High Technology" },
      {
        name: "description",
        content: "RFQ line items, supplier pricing, margin and the hand-off between sales and purchase.",
      },
      { property: "og:title", content: "RFQ detail — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Line items, supplier pricing, margin and team hand-off for a single RFQ.",
      },
    ],
  }),
  component: RfqDetail,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60";

function RfqDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { displayName, canSeeCost } = useAuth();
  const createQuotationFn = useServerFn(createQuotationFromRfq);

  const rfq = (useRfqs().data ?? []).find((r) => r.id === id);
  const allItems = useRfqItems().data ?? [];
  const quotes = useSupplierQuotes().data ?? [];
  const customers = useCustomers().data ?? [];
  const suppliers = useSuppliers().data ?? [];
  const quotations = useQuotations().data ?? [];

  const [busy, setBusy] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [item, setItem] = useState({
    category: "",
    brand: "",
    model: "",
    part_number: "",
    description: "",
    quantity: 1,
    target_price: 0,
  });

  if (!rfq) {
    return (
      <AppShell breadcrumb={["CRM", "RFQs", "Not found"]}>
        <Panel>
          <div className="py-10 text-center text-sm text-muted-foreground">
            This RFQ is no longer available.{" "}
            <Link to="/rfqs" className="text-primary-soft hover:underline">
              Back to RFQs
            </Link>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const items = allItems.filter((i) => i.rfq_id === rfq.id);
  const customer = customers.find((c) => c.id === rfq.customer_id);
  const cost = costRfq(rfq, items, quotes);
  const linkedQuotation = quotations.find((q) => q.rfq_id === rfq.id);
  const supplierName = (sid: string) => suppliers.find((s) => s.id === sid)?.name ?? "Supplier";

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries();
      toast.success(label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status: string) =>
    run(`Status set to ${status}`, async () => {
      const { error } = await supabase.from("rfqs").update({ status }).eq("id", rfq.id);
      if (error) throw error;
      await logActivity(displayName, `set ${rfq.rfq_no} to ${status}`, "rfq", rfq.id);
    });

  const submitToPurchase = () =>
    run("Sent to the purchase team", async () => {
      if (items.length === 0) throw new Error("Add at least one line item first");
      const { error } = await supabase
        .from("rfqs")
        .update({
          status: "SUBMITTED TO PURCHASE",
          submitted_at: new Date().toISOString(),
          submitted_by: displayName,
        })
        .eq("id", rfq.id);
      if (error) throw error;
      await notify({
        title: `New RFQ ${rfq.rfq_no} for pricing`,
        message: `${customer?.name ?? "Customer"} · ${rfq.project_name} · ${items.length} item(s) · priority ${rfq.priority}`,
        target_role: "purchase",
        sender: displayName,
        kind: rfq.priority === "Urgent" ? "alert" : "info",
        rfq_id: rfq.id,
      });
      await logActivity(displayName, `submitted ${rfq.rfq_no} to purchase`, "rfq", rfq.id);
    });

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await run("Line item added", async () => {
      const { error } = await supabase.from("rfq_items").insert({
        company_id: (await supabase.from("rfqs").select("company_id").eq("id", rfq.id).single()).data!
          .company_id,
        rfq_id: rfq.id,
        category: item.category,
        brand: item.brand,
        model: item.model,
        part_number: item.part_number,
        description: item.description,
        quantity: Number(item.quantity),
        target_price: Number(item.target_price),
      });
      if (error) throw error;
      setShowItem(false);
      setItem({
        category: "",
        brand: "",
        model: "",
        part_number: "",
        description: "",
        quantity: 1,
        target_price: 0,
      });
    });
  };

  const createQuotation = () =>
    run("Quotation drafted from this RFQ", async () => {
      const created = await createQuotationFn({ data: { rfq_id: rfq.id, salesperson: displayName } });
      await logActivity(displayName, `drafted ${created.quotation_no} from ${rfq.rfq_no}`, "quotation", created.id);
      if (created.approval !== "Auto-approved") {
        await notify({
          title: `${created.quotation_no} needs ${created.approval.toLowerCase()}`,
          message: `${customer?.name ?? "Customer"} · AED ${aed(created.sellingPrice)}`,
          target_role: created.approval === "Manager approval" ? "manager" : "super_admin",
          sender: displayName,
          kind: "warning",
          quotation_id: created.id,
        });
      }
      void navigate({ to: "/quotations/$id", params: { id: created.id } });
    });

  return (
    <AppShell breadcrumb={["CRM", "RFQs", rfq.rfq_no]}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>{rfq.project_name || "RFQ"}</Eyebrow>
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
            {rfq.rfq_no}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={rfq.status} dot />
            <Badge tone={priorityTone(rfq.priority)}>{rfq.priority} priority</Badge>
            {customer ? (
              <Link
                to="/customers/$id"
                params={{ id: customer.id }}
                className="text-[12px] text-primary-soft hover:underline"
              >
                {customer.name}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg bg-white/5 px-3 py-2 text-[12px] text-foreground ring-1 ring-border outline-none"
            value={rfq.status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={busy}
          >
            {RFQ_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-card">
                {s}
              </option>
            ))}
          </select>
          {rfq.status === "DRAFT" ? (
            <button
              onClick={submitToPurchase}
              disabled={busy}
              className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
            >
              Submit to Purchase
            </button>
          ) : null}
          {rfq.status === "READY FOR CRM" && !linkedQuotation ? (
            <button
              onClick={createQuotation}
              disabled={busy}
              className="rounded-lg bg-ready px-3.5 py-2 text-[13px] font-medium text-background hover:bg-ready/90 disabled:opacity-60"
            >
              Create quotation
            </button>
          ) : null}
          {linkedQuotation ? (
            <Link
              to="/quotations/$id"
              params={{ id: linkedQuotation.id }}
              className="glass2 rounded-lg px-3.5 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-white/10"
            >
              {linkedQuotation.quotation_no}
            </Link>
          ) : null}
          {canSeeCost ? (<Link
            to="/purchase/$id"
            params={{ id: rfq.id }}
            className="glass2 rounded-lg px-3.5 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-white/10"
          >
            Purchase workspace
          </Link>) : null}
        </div>
      </div>

      <Panel>
        <StageRail status={rfq.status} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <KeyValue label="Customer" value={customer?.name ?? "—"} />
            <KeyValue label="Contact" value={customer?.contact_person ?? "—"} />
            <KeyValue label="Salesperson" value={rfq.salesperson} />
            <KeyValue label="RFQ date" value={shortDate(rfq.rfq_date)} />
            <KeyValue label="Required date" value={shortDate(rfq.required_date)} />
            <KeyValue label="Customer reference" value={rfq.customer_reference || "—"} />
            <KeyValue label="Submitted to purchase" value={shortDate(rfq.submitted_at)} />
            <KeyValue label="Purchase turnaround" value={durationBetween(rfq.submitted_at, rfq.ready_at)} />
          </div>
          {rfq.notes ? (
            <p className="mt-4 rounded-lg bg-white/[0.03] p-3 text-[13px] text-muted-foreground ring-1 ring-border">
              {rfq.notes}
            </p>
          ) : null}
        </Panel>

        {canSeeCost ? (
        <Panel>
          <Eyebrow>Costing</Eyebrow>
          <div className="mt-3 space-y-2">
            <KeyValue label="Product cost" value={`AED ${aed(cost.productCost)}`} />
            <KeyValue label="Shipping" value={`AED ${aed(rfq.shipping_cost)}`} />
            <KeyValue label="Other costs" value={`AED ${aed(rfq.other_cost)}`} />
            <div className="h-px bg-border" />
            <KeyValue label="Total cost" value={`AED ${aed(cost.totalCost)}`} />
            <KeyValue label="Selling price" value={`AED ${aed(cost.sellingPrice)}`} />
            <KeyValue label="Gross profit" value={`AED ${aed(cost.grossProfit)}`} />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-border">
            <span className="text-[12px] text-muted-foreground">GP margin</span>
            <span className={`num text-lg font-semibold ${cost.gpPercent >= 20 ? "text-ready" : cost.gpPercent >= 15 ? "text-wait" : "text-urgent"}`}>
              {cost.pricedItems ? pct(cost.gpPercent) : "—"}
            </span>
          </div>
          <div className="mt-2 text-[12px] text-muted-foreground">
            {cost.pricedItems
              ? requiredApproval(cost.gpPercent)
              : "Waiting for supplier prices"}
          </div>
        </Panel>
        ) : (
          <Panel>
            <Eyebrow>Pricing</Eyebrow>
            <div className="mt-3 space-y-2">
              <KeyValue label="Selling price" value={cost.pricedItems ? `AED ${aed(items.reduce((s, i) => s + Number(i.selling_price) * Number(i.quantity), 0))}` : "—"} />
            </div>
            <div className="mt-2 text-[12px] text-muted-foreground">
              {cost.pricedItems || rfq.ready_at ? "Prices set by purchase" : "Waiting for purchase pricing"}
            </div>
          </Panel>
        )}
      </div>

      <Panel flush>
        <PanelHeader
          title={`Line items (${items.length})`}
          subtitle="What the customer asked for, and the best supplier price so far"
          action={
            <button
              onClick={() => setShowItem((v) => !v)}
              className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90"
            >
              {showItem ? "Close" : "Add item"}
            </button>
          }
        />
        {showItem ? (
          <form onSubmit={addItem} className="grid gap-3 border-b border-border p-5 sm:grid-cols-3">
            <Field label="Category">
              <input
                className={inputClass}
                value={item.category}
                onChange={(e) => setItem({ ...item, category: e.target.value })}
                placeholder="Networking"
                required
              />
            </Field>
            <Field label="Brand">
              <input
                className={inputClass}
                value={item.brand}
                onChange={(e) => setItem({ ...item, brand: e.target.value })}
                placeholder="Cisco"
              />
            </Field>
            <Field label="Model">
              <input
                className={inputClass}
                value={item.model}
                onChange={(e) => setItem({ ...item, model: e.target.value })}
                placeholder="C9300-48P"
              />
            </Field>
            <Field label="Part number">
              <input
                className={inputClass}
                value={item.part_number}
                onChange={(e) => setItem({ ...item, part_number: e.target.value })}
              />
            </Field>
            <Field label="Quantity">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={item.quantity}
                onChange={(e) => setItem({ ...item, quantity: Number(e.target.value) })}
              />
            </Field>
            <Field label="Target price AED">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={item.target_price}
                onChange={(e) => setItem({ ...item, target_price: Number(e.target.value) })}
              />
            </Field>
            <div className="sm:col-span-3">
              <Field label="Description">
                <input
                  className={inputClass}
                  value={item.description}
                  onChange={(e) => setItem({ ...item, description: e.target.value })}
                  placeholder="48-port PoE+ access switch with 3-year support"
                />
              </Field>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
              >
                Add line item
              </button>
            </div>
          </form>
        ) : null}
        <DataTable minWidth={880}>
          <thead>
            <tr className="border-b border-border">
              <Th>Item</Th>
              <Th>Part no.</Th>
              <Th align="right">Qty</Th>
              <Th align="right">Target AED</Th>
              {canSeeCost ? <Th>Best supplier</Th> : null}
              {canSeeCost ? <Th align="right">Unit cost AED</Th> : null}
              <Th align="right">Selling AED</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyRow colSpan={7} label="No line items yet. Add what the customer asked for." />
            ) : null}
            {items.map((i) => {
              const itemQuotes = quotes.filter((q) => q.rfq_item_id === i.id);
              const chosen =
                itemQuotes.find((q) => q.id === i.selected_quote_id) ??
                [...itemQuotes].sort((a, b) => Number(a.unit_cost) - Number(b.unit_cost))[0];
              return (
                <tr key={i.id} className="rowhover border-b border-white/5">
                  <Td>
                    <div className="font-medium text-foreground">
                      {i.brand} {i.model}
                    </div>
                    <div className="text-[12px] text-muted-foreground">{i.description}</div>
                  </Td>
                  <Td className="num text-muted-foreground">{i.part_number || "—"}</Td>
                  <Td align="right" className="num text-foreground">
                    {i.quantity}
                  </Td>
                  <Td align="right" className="num text-muted-foreground">
                    {aed(i.target_price)}
                  </Td>
                  {canSeeCost ? (<Td className="text-foreground/80">
                    {chosen ? (
                      <span className="flex items-center gap-2">
                        {supplierName(chosen.supplier_id)}
                        {i.selected_quote_id === chosen.id ? (
                          <Badge tone="ready">selected</Badge>
                        ) : (
                          <Badge tone="wait">lowest</Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">awaiting prices</span>
                    )}
                  </Td>) : null}
                  {canSeeCost ? (<Td align="right" className="num text-foreground">
                    {chosen ? aed(chosen.unit_cost) : "—"}
                  </Td>) : null}
                  <Td align="right" className="num text-foreground">
                    {Number(i.selling_price) > 0 ? aed(i.selling_price) : "—"}
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
