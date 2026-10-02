import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StageRail } from "@/components/StageRail";
import {
  Badge,
  DataTable,
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
  pct,
  priorityTone,
  requiredApproval,
  shortDate,
  suggestedSellingPrice,
} from "@/lib/ops";
import { costRfq, logActivity, notify } from "@/lib/rfq-data";
import { useCustomers, useRfqItems, useRfqs, useSupplierQuotes, useSuppliers } from "@/lib/use-ops";

export const Route = createFileRoute("/purchase/$id")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Supplier comparison — OneTouch High Technology" },
      {
        name: "description",
        content: "Compare supplier prices per line item, pick a winner, set margin and send the RFQ back to sales.",
      },
      { property: "og:title", content: "Supplier comparison — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Compare supplier prices, pick winners and send priced RFQs back to sales.",
      },
    ],
  }),
  component: PurchaseWorkspace,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60";

function PurchaseWorkspace() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { displayName } = useAuth();

  const rfq = (useRfqs().data ?? []).find((r) => r.id === id);
  const allItems = useRfqItems().data ?? [];
  const quotes = useSupplierQuotes().data ?? [];
  const suppliers = useSuppliers().data ?? [];
  const customers = useCustomers().data ?? [];

  const [busy, setBusy] = useState(false);
  const [quoteFor, setQuoteFor] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    supplier_id: "",
    unit_cost: 0,
    availability: "In stock",
    delivery_days: 7,
    warranty: "1 year",
    payment_terms: "30 days credit",
    quote_ref: "",
    notes: "",
  });

  if (!rfq) {
    return (
      <AppShell breadcrumb={["Purchase", "Not found"]}>
        <Panel>
          <div className="py-10 text-center text-sm text-muted-foreground">
            This RFQ is no longer available.{" "}
            <Link to="/purchase" className="text-primary-soft hover:underline">
              Back to queue
            </Link>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const items = allItems.filter((i) => i.rfq_id === rfq.id);
  const customer = customers.find((c) => c.id === rfq.customer_id);
  const cost = costRfq(rfq, items, quotes);
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

  const addQuote = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    await run("Supplier price saved", async () => {
      const { data: rfqRow } = await supabase.from("rfqs").select("company_id").eq("id", rfq.id).single();
      const { error } = await supabase.from("supplier_quotes").insert({
        company_id: rfqRow!.company_id,
        rfq_item_id: itemId,
        supplier_id: quoteForm.supplier_id,
        unit_cost: Number(quoteForm.unit_cost),
        availability: quoteForm.availability,
        delivery_days: Number(quoteForm.delivery_days),
        warranty: quoteForm.warranty,
        payment_terms: quoteForm.payment_terms,
        quote_ref: quoteForm.quote_ref,
        notes: quoteForm.notes,
      });
      if (error) throw error;
      if (rfq.status === "SUBMITTED TO PURCHASE" || rfq.status === "PURCHASE RECEIVED") {
        await supabase.from("rfqs").update({ status: "SUPPLIER PRICES RECEIVED" }).eq("id", rfq.id);
      }
      await logActivity(displayName, `added a supplier price on ${rfq.rfq_no}`, "rfq", rfq.id);
      setQuoteFor(null);
      setQuoteForm({ ...quoteForm, supplier_id: "", unit_cost: 0, quote_ref: "", notes: "" });
    });
  };

  const selectQuote = (itemId: string, quoteId: string, unitCost: number) =>
    run("Supplier selected", async () => {
      const item = items.find((i) => i.id === itemId)!;
      const selling =
        Number(item.selling_price) > 0
          ? Number(item.selling_price)
          : Math.round(suggestedSellingPrice(unitCost, Number(rfq.target_gp_percent)));
      const { error } = await supabase
        .from("rfq_items")
        .update({ selected_quote_id: quoteId, selling_price: selling })
        .eq("id", itemId);
      if (error) throw error;
      if (rfq.status !== "PRICE COMPARISON" && rfq.status !== "READY FOR CRM") {
        await supabase.from("rfqs").update({ status: "PRICE COMPARISON" }).eq("id", rfq.id);
      }
      await logActivity(displayName, `selected a supplier on ${rfq.rfq_no}`, "rfq", rfq.id);
    });

  const updateSelling = (itemId: string, value: number) =>
    run("Selling price updated", async () => {
      const { error } = await supabase.from("rfq_items").update({ selling_price: value }).eq("id", itemId);
      if (error) throw error;
    });

  const updateCosts = (patch: { shipping_cost?: number; other_cost?: number; target_gp_percent?: number }) =>
    run("Costing updated", async () => {
      const { error } = await supabase.from("rfqs").update(patch).eq("id", rfq.id);
      if (error) throw error;
    });

  const markReady = () =>
    run("Sent back to the sales team", async () => {
      if (cost.pricedItems < items.length || items.length === 0) {
        throw new Error("Every line item needs a supplier price first");
      }
      const { error } = await supabase
        .from("rfqs")
        .update({
          status: "READY FOR CRM",
          ready_at: new Date().toISOString(),
          ready_by: displayName,
        })
        .eq("id", rfq.id);
      if (error) throw error;
      await notify({
        title: `${rfq.rfq_no} is priced and ready`,
        message: `${customer?.name ?? "Customer"} · cost AED ${aed(cost.totalCost)} · GP ${pct(cost.gpPercent)} · ${requiredApproval(cost.gpPercent)}`,
        target_role: "crm",
        sender: displayName,
        kind: "success",
        rfq_id: rfq.id,
      });
      await logActivity(displayName, `marked ${rfq.rfq_no} ready for CRM`, "rfq", rfq.id);
    });

  return (
    <AppShell breadcrumb={["Purchase", rfq.rfq_no]}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>{customer?.name ?? "Customer"} · {rfq.project_name}</Eyebrow>
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">{rfq.rfq_no}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={rfq.status} dot />
            <Badge tone={priorityTone(rfq.priority)}>{rfq.priority} priority</Badge>
            <span className="text-[12px] text-muted-foreground">
              required {shortDate(rfq.required_date)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/rfqs/$id"
            params={{ id: rfq.id }}
            className="glass2 rounded-lg px-3.5 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-white/10"
          >
            Sales view
          </Link>
          <button
            onClick={markReady}
            disabled={busy || rfq.status === "READY FOR CRM"}
            className="rounded-lg bg-ready px-3.5 py-2 text-[13px] font-medium text-background hover:bg-ready/90 disabled:opacity-60"
          >
            {rfq.status === "READY FOR CRM" ? "Already sent to CRM" : "Mark Ready for CRM"}
          </button>
        </div>
      </div>

      <Panel>
        <StageRail status={rfq.status} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <Eyebrow>Additional costs & target</Eyebrow>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Shipping AED">
              <input
                type="number"
                min={0}
                className={inputClass}
                defaultValue={Number(rfq.shipping_cost)}
                onBlur={(e) => updateCosts({ shipping_cost: Number(e.target.value) })}
              />
            </Field>
            <Field label="Other costs AED">
              <input
                type="number"
                min={0}
                className={inputClass}
                defaultValue={Number(rfq.other_cost)}
                onBlur={(e) => updateCosts({ other_cost: Number(e.target.value) })}
              />
            </Field>
            <Field label="Target GP %">
              <input
                type="number"
                min={0}
                max={90}
                className={inputClass}
                defaultValue={Number(rfq.target_gp_percent)}
                onBlur={(e) => updateCosts({ target_gp_percent: Number(e.target.value) })}
              />
            </Field>
          </div>
          {rfq.notes ? (
            <p className="mt-4 rounded-lg bg-white/[0.03] p-3 text-[13px] text-muted-foreground ring-1 ring-border">
              Sales note: {rfq.notes}
            </p>
          ) : null}
        </Panel>

        <Panel>
          <Eyebrow>Cost & margin</Eyebrow>
          <div className="mt-3 space-y-2">
            <KeyValue label="Product cost" value={`AED ${aed(cost.productCost)}`} />
            <KeyValue label="Total cost" value={`AED ${aed(cost.totalCost)}`} />
            <KeyValue label="Selling price" value={`AED ${aed(cost.sellingPrice)}`} />
            <KeyValue label="Gross profit" value={`AED ${aed(cost.grossProfit)}`} />
            <KeyValue label="Items priced" value={`${cost.pricedItems}/${items.length}`} />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-border">
            <span className="text-[12px] text-muted-foreground">GP margin</span>
            <span
              className={`num text-lg font-semibold ${cost.gpPercent >= 20 ? "text-ready" : cost.gpPercent >= 15 ? "text-wait" : "text-urgent"}`}
            >
              {cost.pricedItems ? pct(cost.gpPercent) : "—"}
            </span>
          </div>
          <div className="mt-2 text-[12px] text-muted-foreground">
            {cost.pricedItems ? requiredApproval(cost.gpPercent) : "Add supplier prices to see margin"}
          </div>
        </Panel>
      </div>

      {items.map((item) => {
        const itemQuotes = [...quotes.filter((q) => q.rfq_item_id === item.id)].sort(
          (a, b) => Number(a.unit_cost) - Number(b.unit_cost),
        );
        const lowest = itemQuotes[0];
        return (
          <Panel key={item.id} flush>
            <PanelHeader
              title={`${item.brand} ${item.model}`.trim() || item.category}
              subtitle={`${item.description || item.category} · qty ${item.quantity}${item.part_number ? ` · ${item.part_number}` : ""}`}
              action={
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Selling
                    <input
                      type="number"
                      min={0}
                      className="w-28 rounded-lg bg-white/5 px-2.5 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none"
                      defaultValue={Number(item.selling_price)}
                      onBlur={(e) => updateSelling(item.id, Number(e.target.value))}
                    />
                  </label>
                  <button
                    onClick={() => setQuoteFor(quoteFor === item.id ? null : item.id)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90"
                  >
                    {quoteFor === item.id ? "Close" : "Add supplier price"}
                  </button>
                </div>
              }
            />
            {quoteFor === item.id ? (
              <form
                onSubmit={(e) => addQuote(e, item.id)}
                className="grid gap-3 border-b border-border p-5 sm:grid-cols-4"
              >
                <Field label="Supplier">
                  <select
                    className={inputClass}
                    value={quoteForm.supplier_id}
                    onChange={(e) => setQuoteForm({ ...quoteForm, supplier_id: e.target.value })}
                    required
                  >
                    <option value="" className="bg-card">
                      Select supplier
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-card">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit cost AED">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={quoteForm.unit_cost}
                    onChange={(e) => setQuoteForm({ ...quoteForm, unit_cost: Number(e.target.value) })}
                    required
                  />
                </Field>
                <Field label="Availability">
                  <input
                    className={inputClass}
                    value={quoteForm.availability}
                    onChange={(e) => setQuoteForm({ ...quoteForm, availability: e.target.value })}
                  />
                </Field>
                <Field label="Delivery days">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={quoteForm.delivery_days}
                    onChange={(e) => setQuoteForm({ ...quoteForm, delivery_days: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Warranty">
                  <input
                    className={inputClass}
                    value={quoteForm.warranty}
                    onChange={(e) => setQuoteForm({ ...quoteForm, warranty: e.target.value })}
                  />
                </Field>
                <Field label="Payment terms">
                  <input
                    className={inputClass}
                    value={quoteForm.payment_terms}
                    onChange={(e) => setQuoteForm({ ...quoteForm, payment_terms: e.target.value })}
                  />
                </Field>
                <Field label="Quote reference">
                  <input
                    className={inputClass}
                    value={quoteForm.quote_ref}
                    onChange={(e) => setQuoteForm({ ...quoteForm, quote_ref: e.target.value })}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
                  >
                    Save price
                  </button>
                </div>
              </form>
            ) : null}
            <DataTable minWidth={900}>
              <thead>
                <tr className="border-b border-border">
                  <Th>Supplier</Th>
                  <Th align="right">Unit cost AED</Th>
                  <Th align="right">Line total AED</Th>
                  <Th>Availability</Th>
                  <Th>Delivery</Th>
                  <Th>Warranty</Th>
                  <Th>Payment terms</Th>
                  <Th align="right">Decision</Th>
                </tr>
              </thead>
              <tbody>
                {itemQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No supplier prices yet for this item.
                    </td>
                  </tr>
                ) : null}
                {itemQuotes.map((q) => {
                  const selected = item.selected_quote_id === q.id;
                  return (
                    <tr
                      key={q.id}
                      className={`border-b border-white/5 ${selected ? "bg-ready/[0.07]" : "rowhover"}`}
                    >
                      <Td>
                        <span className="font-medium text-foreground">{supplierName(q.supplier_id)}</span>
                        {q.quote_ref ? (
                          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                            {q.quote_ref}
                          </span>
                        ) : null}
                      </Td>
                      <Td align="right" className="num text-foreground">
                        {aed(q.unit_cost)}
                        {lowest && q.id === lowest.id ? (
                          <span className="ml-2 align-middle">
                            <Badge tone="ready">lowest</Badge>
                          </span>
                        ) : null}
                      </Td>
                      <Td align="right" className="num text-foreground/80">
                        {aed(Number(q.unit_cost) * Number(item.quantity))}
                      </Td>
                      <Td className="text-muted-foreground">{q.availability}</Td>
                      <Td className="text-muted-foreground">{q.delivery_days} days</Td>
                      <Td className="text-muted-foreground">{q.warranty}</Td>
                      <Td className="text-muted-foreground">{q.payment_terms}</Td>
                      <Td align="right">
                        {selected ? (
                          <Badge tone="ready" dot>
                            Selected
                          </Badge>
                        ) : (
                          <button
                            onClick={() => selectQuote(item.id, q.id, Number(q.unit_cost))}
                            disabled={busy}
                            className="rounded-lg bg-white/5 px-3 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-border hover:bg-white/10 disabled:opacity-60"
                          >
                            Select
                          </button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </Panel>
        );
      })}

      {items.length === 0 ? (
        <Panel>
          <div className="py-8 text-center text-sm text-muted-foreground">
            Sales has not added line items to this RFQ yet.
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}
