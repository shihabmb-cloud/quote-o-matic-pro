import { useState } from "react";
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
  StatCard,
  Td,
  Th,
} from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { shortDate } from "@/lib/ops";
import { logActivity } from "@/lib/rfq-data";
import { useCustomers, useFollowUps, useQuotations, useRfqs } from "@/lib/use-ops";

export const Route = createFileRoute("/followups")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Follow-ups — OneTouch High Technology" },
      {
        name: "description",
        content: "Scheduled calls, emails and visits linked to customers, RFQs and quotations.",
      },
      { property: "og:title", content: "Follow-ups — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Calls, emails and visits with owner, due date and next action.",
      },
    ],
  }),
  component: FollowUps,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60";

const TYPES = ["Call", "Email", "WhatsApp", "Meeting", "Site visit"];

function FollowUps() {
  const qc = useQueryClient();
  const { displayName } = useAuth();
  const followUps = useFollowUps().data ?? [];
  const customers = useCustomers().data ?? [];
  const rfqs = useRfqs().data ?? [];
  const quotations = useQuotations().data ?? [];

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"open" | "done" | "all">("open");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    rfq_id: "",
    quotation_id: "",
    due_date: new Date().toISOString().slice(0, 10),
    due_time: "10:00",
    type: "Call",
    notes: "",
    next_action: "",
  });

  const today = new Date().toISOString().slice(0, 10);
  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "—";
  const rows = followUps.filter((f) =>
    view === "all" ? true : view === "done" ? f.done : !f.done,
  );
  const overdue = followUps.filter((f) => !f.done && f.due_date < today);
  const dueToday = followUps.filter((f) => !f.done && f.due_date === today);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("company_id").maybeSingle();
      const { error } = await supabase.from("follow_ups").insert({
        company_id: profile!.company_id,
        customer_id: form.customer_id || null,
        rfq_id: form.rfq_id || null,
        quotation_id: form.quotation_id || null,
        due_date: form.due_date,
        due_time: form.due_time,
        type: form.type,
        owner: displayName,
        notes: form.notes,
        next_action: form.next_action,
      });
      if (error) throw error;
      await logActivity(displayName, "scheduled a follow-up", "follow_up");
      await qc.invalidateQueries();
      toast.success("Follow-up scheduled");
      setOpen(false);
      setForm({ ...form, notes: "", next_action: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule follow-up");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, done: boolean) => {
    const { error } = await supabase.from("follow_ups").update({ done }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (done) await logActivity(displayName, "completed a follow-up", "follow_up", id);
    await qc.invalidateQueries();
  };

  return (
    <AppShell breadcrumb={["CRM", "Follow-ups"]}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Follow-ups</h1>
          <p className="text-[13px] text-muted-foreground">
            Nothing slips: every call, email and visit with an owner and a date.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90"
        >
          {open ? "Close" : "Schedule follow-up"}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Overdue" value={overdue.length} foot="past due date" footTone={overdue.length ? "urgent" : "ready"} />
        <StatCard label="Due today" value={dueToday.length} foot="plan the day" footTone="wait" />
        <StatCard label="Open" value={followUps.filter((f) => !f.done).length} foot="all pending" />
        <StatCard label="Completed" value={followUps.filter((f) => f.done).length} foot="logged" footTone="ready" />
      </section>

      {open ? (
        <Panel>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer">
              <select
                className={inputClass}
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              >
                <option value="" className="bg-card">
                  No customer
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card">
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Related RFQ">
              <select
                className={inputClass}
                value={form.rfq_id}
                onChange={(e) => setForm({ ...form, rfq_id: e.target.value })}
              >
                <option value="" className="bg-card">
                  None
                </option>
                {rfqs.map((r) => (
                  <option key={r.id} value={r.id} className="bg-card">
                    {r.rfq_no}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Related quotation">
              <select
                className={inputClass}
                value={form.quotation_id}
                onChange={(e) => setForm({ ...form, quotation_id: e.target.value })}
              >
                <option value="" className="bg-card">
                  None
                </option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id} className="bg-card">
                    {q.quotation_no}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                className={inputClass}
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                required
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                className={inputClass}
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t} className="bg-card">
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <input
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Check if the technical team approved the switch model"
                />
              </Field>
            </div>
            <Field label="Next action">
              <input
                className={inputClass}
                value={form.next_action}
                onChange={(e) => setForm({ ...form, next_action: e.target.value })}
                placeholder="Send revised pricing"
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Schedule"}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel flush>
        <PanelHeader
          title={`${rows.length} follow-up${rows.length === 1 ? "" : "s"}`}
          action={
            <select
              className="rounded-lg bg-white/5 px-3 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none"
              value={view}
              onChange={(e) => setView(e.target.value as typeof view)}
            >
              <option value="open" className="bg-card">
                Open
              </option>
              <option value="done" className="bg-card">
                Completed
              </option>
              <option value="all" className="bg-card">
                All
              </option>
            </select>
          }
        />
        <DataTable minWidth={900}>
          <thead>
            <tr className="border-b border-border">
              <Th>Due</Th>
              <Th>Type</Th>
              <Th>Customer</Th>
              <Th>Notes</Th>
              <Th>Next action</Th>
              <Th>Owner</Th>
              <Th>Linked</Th>
              <Th align="right">Done</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={8} label="Nothing here." /> : null}
            {rows.map((f) => {
              const rfq = rfqs.find((r) => r.id === f.rfq_id);
              const quotation = quotations.find((q) => q.id === f.quotation_id);
              return (
                <tr key={f.id} className="rowhover border-b border-white/5">
                  <Td>
                    <span className={f.due_date < today && !f.done ? "text-urgent" : "text-foreground"}>
                      {shortDate(f.due_date)}
                    </span>
                    <div className="text-[12px] text-muted-foreground">{f.due_time}</div>
                  </Td>
                  <Td>
                    <Badge tone="new">{f.type}</Badge>
                  </Td>
                  <Td className="text-foreground/80">{customerName(f.customer_id)}</Td>
                  <Td className="text-muted-foreground">{f.notes}</Td>
                  <Td className="text-muted-foreground">{f.next_action}</Td>
                  <Td className="text-muted-foreground">{f.owner}</Td>
                  <Td>
                    {rfq ? (
                      <Link
                        to="/rfqs/$id"
                        params={{ id: rfq.id }}
                        className="font-mono text-[12px] text-primary-soft hover:underline"
                      >
                        {rfq.rfq_no}
                      </Link>
                    ) : quotation ? (
                      <Link
                        to="/quotations/$id"
                        params={{ id: quotation.id }}
                        className="font-mono text-[12px] text-primary-soft hover:underline"
                      >
                        {quotation.quotation_no}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td align="right">
                    <input
                      type="checkbox"
                      className="size-4 accent-current"
                      checked={f.done}
                      onChange={(e) => void toggle(f.id, e.target.checked)}
                    />
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
