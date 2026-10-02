import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { DataTable, EmptyRow, Field, Panel, PanelHeader, Td, Th } from "@/components/ops";
import { requireSession, useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/rfq-data";
import { useCustomers, useRfqs } from "@/lib/use-ops";

export const Route = createFileRoute("/customers/")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Customers — OneTouch High Technology" },
      {
        name: "description",
        content: "Customer directory with contacts, industry, salesperson and RFQ history.",
      },
      { property: "og:title", content: "Customers — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Contacts, industry, owner and full RFQ history for every customer.",
      },
    ],
  }),
  component: CustomerList,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60";

const empty = {
  name: "",
  contact_person: "",
  designation: "",
  mobile: "",
  email: "",
  website: "",
  address: "",
  city: "",
  country: "United Arab Emirates",
  trn: "",
  industry: "",
  customer_type: "Prospect",
  notes: "",
};

function CustomerList() {
  const qc = useQueryClient();
  const { displayName } = useAuth();
  const customers = useCustomers().data ?? [];
  const rfqs = useRfqs().data ?? [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const rows = customers.filter((c) =>
    `${c.name} ${c.city} ${c.industry} ${c.contact_person}`.toLowerCase().includes(search.toLowerCase()),
  );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("company_id").maybeSingle();
      const { data, error } = await supabase
        .from("customers")
        .insert({ ...form, company_id: profile!.company_id, salesperson: displayName })
        .select("id, name")
        .single();
      if (error) throw error;
      await logActivity(displayName, `added customer ${data.name}`, "customer", data.id);
      await qc.invalidateQueries();
      toast.success(`${data.name} added`);
      setForm(empty);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add customer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell breadcrumb={["CRM", "Customers"]}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Customers</h1>
          <p className="text-[13px] text-muted-foreground">
            Every account, with its contacts and complete RFQ history.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90"
        >
          {open ? "Close" : "Add customer"}
        </button>
      </div>

      {open ? (
        <Panel>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["name", "Company name"],
                ["contact_person", "Contact person"],
                ["designation", "Designation"],
                ["mobile", "Mobile"],
                ["email", "Email"],
                ["website", "Website"],
                ["city", "City"],
                ["country", "Country"],
                ["trn", "TRN"],
                ["industry", "Industry"],
                ["address", "Address"],
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
            <Field label="Customer type">
              <select
                className={inputClass}
                value={form.customer_type}
                onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
              >
                {["Prospect", "Active", "Key account", "Dormant"].map((t) => (
                  <option key={t} value={t} className="bg-card">
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save customer"}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel flush>
        <PanelHeader
          title={`${rows.length} customer${rows.length === 1 ? "" : "s"}`}
          action={
            <input
              className="w-48 rounded-lg bg-white/5 px-3 py-1.5 text-[12px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60"
              placeholder="Search customers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
        />
        <DataTable minWidth={860}>
          <thead>
            <tr className="border-b border-border">
              <Th>Customer</Th>
              <Th>Contact</Th>
              <Th>Industry</Th>
              <Th>City</Th>
              <Th>Owner</Th>
              <Th align="right">RFQs</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={6} label="No customers yet." /> : null}
            {rows.map((c) => (
              <tr key={c.id} className="rowhover border-b border-white/5">
                <Td>
                  <Link
                    to="/customers/$id"
                    params={{ id: c.id }}
                    className="font-medium text-primary-soft hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="text-[12px] text-muted-foreground">{c.customer_type}</div>
                </Td>
                <Td className="text-foreground/80">
                  {c.contact_person}
                  <div className="text-[12px] text-muted-foreground">{c.mobile}</div>
                </Td>
                <Td className="text-muted-foreground">{c.industry}</Td>
                <Td className="text-muted-foreground">{c.city}</Td>
                <Td className="text-muted-foreground">{c.salesperson}</Td>
                <Td align="right" className="num text-foreground">
                  {rfqs.filter((r) => r.customer_id === c.id).length}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </AppShell>
  );
}
