import { supabase } from "@/integrations/supabase/client";
import { margin, suggestedSellingPrice } from "@/lib/ops";

export type Rfq = {
  id: string;
  rfq_no: string;
  customer_id: string | null;
  salesperson: string;
  rfq_date: string;
  required_date: string | null;
  customer_reference: string;
  project_name: string;
  priority: string;
  status: string;
  notes: string;
  shipping_cost: number;
  other_cost: number;
  target_gp_percent: number;
  submitted_at: string | null;
  submitted_by: string | null;
  ready_at: string | null;
  ready_by: string | null;
  created_at: string;
};

export type SupplierQuote = {
  id: string;
  rfq_item_id: string;
  supplier_id: string;
  unit_cost: number;
  availability: string;
  delivery_days: number;
  warranty: string;
  payment_terms: string;
  quote_ref: string;
  notes: string;
};

export type RfqItem = {
  id: string;
  rfq_id: string;
  category: string;
  brand: string;
  model: string;
  part_number: string;
  description: string;
  quantity: number;
  target_price: number;
  selling_price: number;
  selected_quote_id: string | null;
  notes: string;
};

export async function logActivity(actor: string, action: string, entity: string, entityId?: string) {
  await supabase.from("activity_logs").insert({ actor, action, entity, entity_id: entityId ?? null });
}

export async function notify(input: {
  title: string;
  message: string;
  target_role: "crm" | "purchase" | "manager" | "super_admin";
  sender: string;
  kind?: "info" | "success" | "warning" | "alert";
  rfq_id?: string | null;
  quotation_id?: string | null;
}) {
  await supabase.from("notifications").insert({
    title: input.title,
    message: input.message,
    target_role: input.target_role,
    sender: input.sender,
    kind: input.kind ?? "info",
    rfq_id: input.rfq_id ?? null,
    quotation_id: input.quotation_id ?? null,
  });
}

/** Costing for one RFQ: uses selected supplier quote per item, else the cheapest one. */
export function costRfq(rfq: Pick<Rfq, "shipping_cost" | "other_cost" | "target_gp_percent">, items: RfqItem[], quotes: SupplierQuote[]) {
  let productCost = 0;
  let sellingTotal = 0;
  let pricedItems = 0;

  for (const item of items) {
    const itemQuotes = quotes.filter((q) => q.rfq_item_id === item.id);
    const chosen =
      itemQuotes.find((q) => q.id === item.selected_quote_id) ??
      [...itemQuotes].sort((a, b) => Number(a.unit_cost) - Number(b.unit_cost))[0];
    if (chosen) {
      productCost += Number(chosen.unit_cost) * Number(item.quantity);
      pricedItems += 1;
    }
    const unitSell = Number(item.selling_price) || 0;
    if (unitSell > 0) sellingTotal += unitSell * Number(item.quantity);
  }

  const baseCost = productCost + Number(rfq.shipping_cost) + Number(rfq.other_cost);
  const selling =
    sellingTotal > 0
      ? sellingTotal
      : pricedItems > 0
        ? suggestedSellingPrice(baseCost, Number(rfq.target_gp_percent))
        : 0;

  return {
    productCost,
    pricedItems,
    ...margin({
      productCost,
      shipping: Number(rfq.shipping_cost),
      otherCosts: Number(rfq.other_cost),
      sellingPrice: selling,
    }),
    sellingPrice: selling,
  };
}

export function nextSequence(existing: string[], prefix: string) {
  const year = new Date().getFullYear();
  const nums = existing
    .map((v) => Number(v.split("-").pop()))
    .filter((n) => Number.isFinite(n)) as number[];
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

export function quotationTotals(
  items: { quantity: number; unit_cost: number; unit_price: number }[],
  vatPercent = 0,
) {
  const cost = items.reduce((s, i) => s + Number(i.unit_cost) * Number(i.quantity), 0);
  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
  const vat = (subtotal * Number(vatPercent)) / 100;
  const gp = subtotal - cost;
  return {
    cost,
    subtotal,
    vat,
    total: subtotal + vat,
    grossProfit: gp,
    gpPercent: subtotal > 0 ? (gp / subtotal) * 100 : 0,
  };
}
