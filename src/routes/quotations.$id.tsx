import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import {
  Badge,
  DataTable,
  Eyebrow,
  KeyValue,
  Panel,
  PanelHeader,
  StatusBadge,
  Td,
  Th,
} from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { aed, pct, requiredApproval, shortDate } from "@/lib/ops";
import { logActivity, notify, quotationTotals } from "@/lib/rfq-data";
import { useCustomers, useQuotationItems, useQuotations, useRfqs } from "@/lib/use-ops";

export const Route = createFileRoute("/quotations/$id")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Quotation detail — OneTouch High Technology" },
      {
        name: "description",
        content: "Quotation lines, margin, approval decision and the path to won or lost.",
      },
      { property: "og:title", content: "Quotation detail — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Lines, margin, approval and outcome for a single quotation.",
      },
    ],
  }),
  component: QuotationDetail,
});

const QUOTE_STATUSES = ["Draft", "Sent", "Viewed", "Negotiation", "Follow-up", "Won", "Lost", "Expired"];

function QuotationDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { displayName, roles, canSeeCost } = useAuth();

  const quotation = (useQuotations().data ?? []).find((q) => q.id === id);
  const allItems = useQuotationItems().data ?? [];
  const customers = useCustomers().data ?? [];
  const rfqs = useRfqs().data ?? [];
  const [busy, setBusy] = useState(false);

  if (!quotation) {
    return (
      <AppShell breadcrumb={["CRM", "Quotations", "Not found"]}>
        <Panel>
          <div className="py-10 text-center text-sm text-muted-foreground">
            This quotation is no longer available.{" "}
            <Link to="/quotations" className="text-primary-soft hover:underline">
              Back to quotations
            </Link>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const items = allItems.filter((i) => i.quotation_id === quotation.id);
  const customer = customers.find((c) => c.id === quotation.customer_id);
  const rfq = rfqs.find((r) => r.id === quotation.rfq_id);
  const t = quotationTotals(items, quotation.vat_percent);
  const gp = quotation.gp_percent ?? t.gpPercent;
  const rule = requiredApproval(gp);
  const canApprove = roles.includes("manager") || roles.includes("super_admin");

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
    run(`Quotation marked ${status}`, async () => {
      const patch: { status: string; sent_at?: string } =
        status === "Sent" ? { status, sent_at: new Date().toISOString() } : { status };
      const { error } = await supabase.from("quotations").update(patch).eq("id", quotation.id);
      if (error) throw error;
      if (rfq) {
        const rfqStatus =
          status === "Won"
            ? "WON"
            : status === "Lost"
              ? "LOST"
              : status === "Negotiation"
                ? "NEGOTIATION"
                : status === "Sent"
                  ? "QUOTATION SENT"
                  : null;
        if (rfqStatus) await supabase.from("rfqs").update({ status: rfqStatus }).eq("id", rfq.id);
      }
      await logActivity(displayName, `marked ${quotation.quotation_no} ${status}`, "quotation", quotation.id);
    });

  const decide = (decision: "Approved" | "Rejected") =>
    run(`Quotation ${decision.toLowerCase()}`, async () => {
      const { error } = await supabase
        .from("quotations")
        .update({
          approval_status: decision,
          approved_by: displayName,
          approved_at: new Date().toISOString(),
        })
        .eq("id", quotation.id);
      if (error) throw error;
      await notify({
        title: `${quotation.quotation_no} ${decision.toLowerCase()}`,
        message: `${customer?.name ?? "Customer"} · AED ${aed(t.total)}`,
        target_role: "crm",
        sender: displayName,
        kind: decision === "Approved" ? "success" : "warning",
        quotation_id: quotation.id,
      });
      await logActivity(displayName, `${decision.toLowerCase()} ${quotation.quotation_no}`, "quotation", quotation.id);
    });

  const requestApproval = () =>
    run("Approval requested", async () => {
      const { error } = await supabase
        .from("quotations")
        .update({ approval_status: "Pending" })
        .eq("id", quotation.id);
      if (error) throw error;
      if (rfq) await supabase.from("rfqs").update({ status: "WAITING APPROVAL" }).eq("id", rfq.id);
      await notify({
        title: `${quotation.quotation_no} needs ${rule.toLowerCase()}`,
        message: `${customer?.name ?? "Customer"} · AED ${aed(t.total)}`,
        target_role: rule === "Director approval" ? "super_admin" : "manager",
        sender: displayName,
        kind: "warning",
        quotation_id: quotation.id,
      });
      await logActivity(displayName, `requested approval for ${quotation.quotation_no}`, "quotation", quotation.id);
    });

  return (
    <AppShell breadcrumb={["CRM", "Quotations", quotation.quotation_no]}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>{customer?.name ?? "Customer"}</Eyebrow>
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
            {quotation.quotation_no}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={quotation.status} dot />
            <Badge
              tone={
                quotation.approval_status === "Approved"
                  ? "ready"
                  : quotation.approval_status === "Rejected"
                    ? "urgent"
                    : "wait"
              }
            >
              {quotation.approval_status}
            </Badge>
            {rfq ? (
              <Link
                to="/rfqs/$id"
                params={{ id: rfq.id }}
                className="font-mono text-[12px] text-primary-soft hover:underline"
              >
                {rfq.rfq_no}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg bg-white/5 px-3 py-2 text-[12px] text-foreground ring-1 ring-border outline-none"
            value={quotation.status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={busy}
          >
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-card">
                {s}
              </option>
            ))}
          </select>
          {quotation.approval_status !== "Approved" && rule !== "Auto-approved" ? (
            <button
              onClick={requestApproval}
              disabled={busy}
              className="glass2 rounded-lg px-3.5 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-white/10 disabled:opacity-60"
            >
              Request approval
            </button>
          ) : null}
          {canApprove && quotation.approval_status === "Pending" ? (
            <>
              <button
                onClick={() => decide("Approved")}
                disabled={busy}
                className="rounded-lg bg-ready px-3.5 py-2 text-[13px] font-medium text-background hover:bg-ready/90 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => decide("Rejected")}
                disabled={busy}
                className="rounded-lg bg-urgent/90 px-3.5 py-2 text-[13px] font-medium text-background hover:bg-urgent disabled:opacity-60"
              >
                Reject
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <KeyValue label="Customer" value={customer?.name ?? "—"} />
            <KeyValue label="Contact" value={customer?.contact_person ?? "—"} />
            <KeyValue label="Salesperson" value={quotation.salesperson} />
            <KeyValue label="Quote date" value={shortDate(quotation.quote_date)} />
            <KeyValue label="Valid until" value={shortDate(quotation.valid_until)} />
            <KeyValue label="Sent" value={shortDate(quotation.sent_at)} />
            <KeyValue label="Payment terms" value={quotation.payment_terms || "—"} />
            <KeyValue label="Delivery terms" value={quotation.delivery_terms || "—"} />
            <KeyValue label="Approved by" value={quotation.approved_by ?? "—"} />
            <KeyValue label="Approval rule" value={rule} />
          </div>
          {quotation.notes ? (
            <p className="mt-4 rounded-lg bg-white/[0.03] p-3 text-[13px] text-muted-foreground ring-1 ring-border">
              {quotation.notes}
            </p>
          ) : null}
        </Panel>

        <Panel>
          <Eyebrow>Totals</Eyebrow>
          <div className="mt-3 space-y-2">
            {canSeeCost ? <KeyValue label="Cost" value={`AED ${aed(t.cost)}`} /> : null}
            <KeyValue label="Subtotal" value={`AED ${aed(t.subtotal)}`} />
            <KeyValue label={`VAT ${quotation.vat_percent}%`} value={`AED ${aed(t.vat)}`} />
            <div className="h-px bg-border" />
            <KeyValue label="Total" value={`AED ${aed(t.total)}`} />
            {canSeeCost ? <KeyValue label="Gross profit" value={`AED ${aed(t.grossProfit)}`} /> : null}
          </div>
          {canSeeCost ? (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-border">
            <span className="text-[12px] text-muted-foreground">GP margin</span>
            <span
              className={`num text-lg font-semibold ${gp >= 20 ? "text-ready" : gp >= 15 ? "text-wait" : "text-urgent"}`}
            >
              {pct(gp)}
            </span>
          </div>
          ) : null}
          <div className="mt-2 text-[12px] text-muted-foreground">{rule}</div>
        </Panel>
      </div>

      <Panel flush>
        <PanelHeader title={`Lines (${items.length})`} subtitle="Imported from the RFQ pricing" />
        <DataTable minWidth={800}>
          <thead>
            <tr className="border-b border-border">
              <Th>Description</Th>
              <Th>Part no.</Th>
              <Th align="right">Qty</Th>
              {canSeeCost ? <Th align="right">Unit cost AED</Th> : null}
              <Th align="right">Unit price AED</Th>
              <Th align="right">Line total AED</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No lines on this quotation.
                </td>
              </tr>
            ) : null}
            {items.map((i) => (
              <tr key={i.id} className="rowhover border-b border-white/5">
                <Td className="text-foreground">{i.description}</Td>
                <Td className="num text-muted-foreground">{i.part_number || "—"}</Td>
                <Td align="right" className="num text-foreground">
                  {i.quantity}
                </Td>
                {canSeeCost ? (
                  <Td align="right" className="num text-muted-foreground">
                    {aed(i.unit_cost)}
                  </Td>
                ) : null}
                <Td align="right" className="num text-foreground">
                  {aed(i.unit_price)}
                </Td>
                <Td align="right" className="num text-foreground">
                  {aed(Number(i.unit_price) * Number(i.quantity))}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </AppShell>
  );
}
