import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { DataTable, EmptyRow, Field, Panel, PanelHeader, StatCard, Td, Th } from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { pct } from "@/lib/ops";
import { logActivity } from "@/lib/rfq-data";
import { useRfqItems, useSupplierQuotes, useSuppliers } from "@/lib/use-ops";

export const Route = createFileRoute("/suppliers")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Suppliers — OneTouch High Technology" },
      {
        name: "description",
        content: "Supplier directory with brands, terms, quote history and win share on priced items.",
      },
      { property: "og:title", content: "Suppliers — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Brands, terms, quote counts and win share for every supplier.",
      },
    ],
  }),
  component: Suppliers,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60";

const empty = {
  name: "",
  contact_person: "",
  mobile: "",
  email: "",
  country: "United Arab Emirates",
  city: "",
  brands: "",
  payment_terms: "",
  delivery_terms: "",
  currency: "AED",
  reliability_notes: "",
};

function Suppliers() {
  const qc = useQueryClient();
  const { displayName } = useAuth();
  const suppliers = useSuppliers().data ?? [];
  const quotes = useSupplierQuotes().data ?? [];
  const items = useRfqItems().data ?? [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const rows = suppliers.filter((s) =>
    `${s.name} ${s.brands} ${s.city} ${s.country}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedIds = new Set(items.map((i) => i.selected_quote_id).filter(Boolean) as string[]);

  const stats = (sid: string) => {
    const mine = quotes.filter((q) => q.supplier_id === sid);
    const wins = mine.filter((q) => selectedIds.has(q.id));
    const avgDelivery = mine.length
      ? Math.round(mine.reduce((s, q) => s + Number(q.delivery_days), 0) / mine.length)
      : 0;
    return {
      quotes: mine.length,
      wins: wins.length,
      winShare: mine.length ? (wins.length / mine.length) * 100 : 0,
      avgDelivery,
      value: wins.reduce((s, q) => s + Number(q.unit_cost), 0),
    };
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("company_id").maybeSingle();
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...form, company_id: profile!.company_id })
        .select("id, name")
        .single();
      if (error) throw error;
      await logActivity(displayName, `added supplier ${data.name}`, "supplier", data.id);
      await qc.invalidateQueries();
      toast.success(`${data.name} added`);
      setForm(empty);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add supplier");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell breadcrumb={["Purchase", "Suppliers"]}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Suppliers</h1>
          <p className="text-[13px] text-muted-foreground">
            Who we buy from, their brands, terms and track record.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90"
        >
          {open ? "Close" : "Add supplier"}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Suppliers" value={suppliers.length} foot="in the directory" />
        <StatCard label="Price quotes" value={quotes.length} foot="across all RFQs" />
        <StatCard label="Selected quotes" value={selectedIds.size} foot="winning prices" footTone="ready" />
        <StatCard
          label="Avg delivery"
          value={`${quotes.length ? Math.round(quotes.reduce((s, q) => s + Number(q.delivery_days), 0) / quotes.length) : 0}d`}
          foot="quoted lead time"
        />
      </section>

      {open ? (
        <Panel>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["name", "Supplier name"],
                ["contact_person", "Contact person"],
                ["mobile", "Mobile"],
                ["email", "Email"],
                ["city", "City"],
                ["country", "Country"],
                ["brands", "Brands"],
                ["payment_terms", "Payment terms"],
                ["delivery_terms", "Delivery terms"],
                ["currency", "Currency"],
                ["reliability_notes", "Reliability notes"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  className={inputClass}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={key === "name"}
                />
              </Field>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save supplier"}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel flush>
        <PanelHeader
          title={`${rows.length} supplier${rows.length === 1 ? "" : "s"}`}
          action={
            <input
              className="w-48 rounded-lg bg-white/5 px-3 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60"
              placeholder="Search suppliers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
        />
        <DataTable minWidth={960}>
          <thead>
            <tr className="border-b border-border">
              <Th>Supplier</Th>
              <Th>Brands</Th>
              <Th>Terms</Th>
              <Th>Location</Th>
              <Th align="right">Quotes</Th>
              <Th align="right">Won</Th>
              <Th align="right">Win share</Th>
              <Th align="right">Avg delivery</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={8} label="No suppliers yet." /> : null}
            {rows.map((s) => {
              const st = stats(s.id);
              return (
                <tr key={s.id} className="rowhover border-b border-white/5">
                  <Td>
                    <div className="font-medium text-foreground">{s.name}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {s.contact_person} · {s.email}
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">{s.brands}</Td>
                  <Td className="text-muted-foreground">
                    {s.payment_terms}
                    <div className="text-[12px] opacity-70">{s.delivery_terms}</div>
                  </Td>
                  <Td className="text-muted-foreground">
                    {s.city}
                    {s.country ? `, ${s.country}` : ""}
                  </Td>
                  <Td align="right" className="num text-foreground">
                    {st.quotes}
                  </Td>
                  <Td align="right" className="num text-foreground">
                    {st.wins}
                  </Td>
                  <Td align="right" className={st.winShare >= 50 ? "text-ready" : "text-muted-foreground"}>
                    {pct(st.winShare)}
                  </Td>
                  <Td align="right" className="num text-muted-foreground">
                    {st.avgDelivery}d
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
