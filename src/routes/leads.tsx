import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  StatusBadge,
  Td,
  Th,
} from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { aed, shortDate } from "@/lib/ops";
import { logActivity, nextSequence } from "@/lib/rfq-data";
import { useLeads } from "@/lib/use-ops";

export const Route = createFileRoute("/leads")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Leads — OneTouch High Technology" },
      {
        name: "description",
        content: "Lead pipeline with source, expected value, probability and next follow-up date.",
      },
      { property: "og:title", content: "Leads — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Source, value, probability and next action for every lead.",
      },
    ],
  }),
  component: Leads,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60";

const SOURCES = ["Website", "Referral", "Cold call", "Exhibition", "Existing customer", "Email campaign", "LinkedIn"];
const STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Converted", "Lost"];

const empty = {
  company_name: "",
  contact_person: "",
  mobile: "",
  email: "",
  source: "Website",
  requirement: "",
  expected_value: 0,
  probability: 40,
  next_followup: "",
  status: "New",
  notes: "",
};

function Leads() {
  const qc = useQueryClient();
  const { displayName } = useAuth();
  const leads = useLeads().data ?? [];
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const rows = leads.filter((l) => filter === "ALL" || l.status === filter);
  const active = leads.filter((l) => ["New", "Contacted", "Qualified", "Proposal"].includes(l.status));
  const weighted = active.reduce((s, l) => s + (Number(l.expected_value) * Number(l.probability)) / 100, 0);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("company_id").maybeSingle();
      const lead_no = nextSequence(leads.map((l) => l.lead_no), "LEAD");
      const { data, error } = await supabase
        .from("leads")
        .insert({
          ...form,
          next_followup: form.next_followup || null,
          expected_value: Number(form.expected_value),
          probability: Number(form.probability),
          company_id: profile!.company_id,
          lead_no,
          lead_date: new Date().toISOString().slice(0, 10),
          salesperson: displayName,
        })
        .select("id, lead_no")
        .single();
      if (error) throw error;
      await logActivity(displayName, `created ${data.lead_no}`, "lead", data.id);
      await qc.invalidateQueries();
      toast.success(`${data.lead_no} created`);
      setForm(empty);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create lead");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logActivity(displayName, `moved a lead to ${status}`, "lead", id);
    await qc.invalidateQueries();
  };

  return (
    <AppShell breadcrumb={["CRM", "Leads"]}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Leads</h1>
          <p className="text-[13px] text-muted-foreground">
            Early enquiries before they become an RFQ.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90"
        >
          {open ? "Close" : "New lead"}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active leads" value={active.length} foot={`${leads.length} total`} />
        <StatCard
          label="Pipeline value"
          value={`AED ${aed(active.reduce((s, l) => s + Number(l.expected_value), 0), { compact: true })}`}
          foot="unweighted"
        />
        <StatCard label="Weighted value" value={`AED ${aed(weighted, { compact: true })}`} foot="by probability" />
        <StatCard
          label="Converted"
          value={leads.filter((l) => l.status === "Converted").length}
          foot="became customers"
          footTone="ready"
        />
      </section>

      {open ? (
        <Panel>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Company">
              <input
                className={inputClass}
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Contact person">
              <input
                className={inputClass}
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              />
            </Field>
            <Field label="Mobile">
              <input
                className={inputClass}
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Source">
              <select
                className={inputClass}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s} className="bg-card">
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Expected value AED">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.expected_value}
                onChange={(e) => setForm({ ...form, expected_value: Number(e.target.value) })}
              />
            </Field>
            <Field label="Probability %">
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
              />
            </Field>
            <Field label="Next follow-up">
              <input
                type="date"
                className={inputClass}
                value={form.next_followup}
                onChange={(e) => setForm({ ...form, next_followup: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-card">
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Requirement">
                <input
                  className={inputClass}
                  value={form.requirement}
                  onChange={(e) => setForm({ ...form, requirement: e.target.value })}
                  placeholder="20 access points and a controller for a warehouse"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save lead"}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel flush>
        <PanelHeader
          title={`${rows.length} lead${rows.length === 1 ? "" : "s"}`}
          action={
            <select
              className="rounded-lg bg-white/5 px-3 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL" className="bg-card">
                All statuses
              </option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-card">
                  {s}
                </option>
              ))}
            </select>
          }
        />
        <DataTable minWidth={960}>
          <thead>
            <tr className="border-b border-border">
              <Th>Lead</Th>
              <Th>Company</Th>
              <Th>Requirement</Th>
              <Th>Source</Th>
              <Th align="right">Value AED</Th>
              <Th align="right">Prob.</Th>
              <Th>Next follow-up</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={8} label="No leads in this view." /> : null}
            {rows.map((l) => (
              <tr key={l.id} className="rowhover border-b border-white/5">
                <Td className="num text-primary-soft">{l.lead_no}</Td>
                <Td>
                  <div className="font-medium text-foreground">{l.company_name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {l.contact_person} · {l.mobile}
                  </div>
                </Td>
                <Td className="text-muted-foreground">{l.requirement}</Td>
                <Td>
                  <Badge tone="new">{l.source}</Badge>
                </Td>
                <Td align="right" className="num text-foreground">
                  {aed(l.expected_value)}
                </Td>
                <Td align="right" className="num text-muted-foreground">
                  {l.probability}%
                </Td>
                <Td className="text-muted-foreground">{shortDate(l.next_followup)}</Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-2">
                    <StatusBadge status={l.status} />
                    <select
                      className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-foreground ring-1 ring-border outline-none"
                      value={l.status}
                      onChange={(e) => void setStatus(l.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-card">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </AppShell>
  );
}
