import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requiredApproval, suggestedSellingPrice } from "@/lib/ops";
import { nextSequence } from "@/lib/rfq-data";

/** Builds a quotation from an RFQ on the server so sales staff never receive supplier costs. */
export const createQuotationFromRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ rfq_id: z.string().uuid(), salesperson: z.string().max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("can_access_sales");
    if (!ok) throw new Error("Only the sales team can create quotations");
    // RLS check: caller must be able to see this RFQ (same company)
    const { data: visible } = await context.supabase.from("rfqs").select("id").eq("id", data.rfq_id).maybeSingle();
    if (!visible) throw new Error("RFQ not found");

    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: rfq } = await db.from("rfqs").select("*").eq("id", data.rfq_id).single();
    if (!rfq) throw new Error("RFQ not found");
    const { data: items } = await db.from("rfq_items").select("*").eq("rfq_id", rfq.id);
    const ids = (items ?? []).map((i) => i.id);
    const { data: quotes } = ids.length
      ? await db.from("supplier_quotes").select("id, rfq_item_id, unit_cost").in("rfq_item_id", ids)
      : { data: [] as { id: string; rfq_item_id: string; unit_cost: number }[] };
    const { data: existing } = await db.from("quotations").select("quotation_no").eq("company_id", rfq.company_id);

    const lines = (items ?? []).map((i) => {
      const iq = (quotes ?? []).filter((q) => q.rfq_item_id === i.id);
      const chosen = iq.find((q) => q.id === i.selected_quote_id) ?? [...iq].sort((a, b) => Number(a.unit_cost) - Number(b.unit_cost))[0];
      const unitCost = chosen ? Number(chosen.unit_cost) : 0;
      const unitPrice = Number(i.selling_price) > 0 ? Number(i.selling_price) : Math.round(suggestedSellingPrice(unitCost, Number(rfq.target_gp_percent)));
      return {
        company_id: rfq.company_id,
        description: `${i.brand} ${i.model} — ${i.description}`.trim(),
        part_number: i.part_number,
        quantity: Number(i.quantity),
        unit_cost: unitCost,
        unit_price: unitPrice,
      };
    });
    const revenue = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const cost = lines.reduce((s, l) => s + l.unit_cost * l.quantity, 0) + Number(rfq.shipping_cost) + Number(rfq.other_cost);
    const gp = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 10000) / 100 : 0;
    const approval = requiredApproval(gp);

    const { data: created, error } = await db
      .from("quotations")
      .insert({
        company_id: rfq.company_id,
        quotation_no: nextSequence((existing ?? []).map((q) => q.quotation_no), "QTN"),
        rfq_id: rfq.id,
        customer_id: rfq.customer_id,
        salesperson: data.salesperson,
        quote_date: new Date().toISOString().slice(0, 10),
        valid_until: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        status: "Draft",
        payment_terms: "50% advance, balance on delivery",
        delivery_terms: "2-3 weeks from PO",
        vat_percent: 5,
        notes: rfq.notes,
        approval_status: approval === "Auto-approved" ? "Approved" : "Pending",
        gp_percent: gp,
      })
      .select("id, quotation_no")
      .single();
    if (error) throw new Error(error.message);
    if (lines.length) {
      const { error: e2 } = await db.from("quotation_items").insert(lines.map((l) => ({ ...l, quotation_id: created.id })));
      if (e2) throw new Error(e2.message);
    }
    await db.from("rfqs").update({ status: "QUOTATION DRAFT" }).eq("id", rfq.id);
    return { id: created.id, quotation_no: created.quotation_no, approval, sellingPrice: revenue };
  });
