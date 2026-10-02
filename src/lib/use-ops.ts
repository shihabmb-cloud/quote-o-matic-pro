import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Rfq, RfqItem, SupplierQuote } from "@/lib/rfq-data";

function table<T>(name: string, order: string, ascending = false) {
  return async () => {
    const query = supabase.from(name as never) as unknown as {
      select: (cols: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    const { data, error } = await query.select("*").order(order, { ascending });
    if (error) throw error;
    return (data ?? []) as T[];
  };
}

export type Customer = {
  id: string;
  name: string;
  contact_person: string;
  designation: string;
  mobile: string;
  email: string;
  website: string;
  address: string;
  city: string;
  country: string;
  trn: string;
  industry: string;
  salesperson: string;
  customer_type: string;
  notes: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact_person: string;
  mobile: string;
  email: string;
  country: string;
  city: string;
  brands: string;
  payment_terms: string;
  delivery_terms: string;
  currency: string;
  reliability_notes: string;
};

export type Lead = {
  id: string;
  lead_no: string;
  lead_date: string;
  company_name: string;
  contact_person: string;
  mobile: string;
  email: string;
  source: string;
  salesperson: string;
  requirement: string;
  expected_value: number;
  probability: number;
  next_followup: string | null;
  status: string;
  notes: string;
};

export type Quotation = {
  id: string;
  quotation_no: string;
  rfq_id: string | null;
  customer_id: string | null;
  salesperson: string;
  quote_date: string;
  valid_until: string | null;
  status: string;
  payment_terms: string;
  delivery_terms: string;
  vat_percent: number;
  notes: string;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  gp_percent: number | null;
};

export type QuotationItem = {
  id: string;
  quotation_id: string;
  description: string;
  part_number: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
};

export type FollowUp = {
  id: string;
  customer_id: string | null;
  quotation_id: string | null;
  rfq_id: string | null;
  due_date: string;
  due_time: string;
  type: string;
  owner: string;
  notes: string;
  next_action: string;
  done: boolean;
};

export type ActivityLog = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
};

export const useRfqs = () => useQuery({ queryKey: ["rfqs"], queryFn: table<Rfq>("rfqs", "created_at") });
export const useRfqItems = () =>
  useQuery({ queryKey: ["rfq_items"], queryFn: table<RfqItem>("rfq_items", "created_at", true) });
export const useSupplierQuotes = () =>
  useQuery({ queryKey: ["supplier_quotes"], queryFn: table<SupplierQuote>("supplier_quotes", "unit_cost", true) });
export const useCustomers = () =>
  useQuery({ queryKey: ["customers"], queryFn: table<Customer>("customers", "name", true) });
export const useSuppliers = () =>
  useQuery({ queryKey: ["suppliers"], queryFn: table<Supplier>("suppliers", "name", true) });
export const useLeads = () => useQuery({ queryKey: ["leads"], queryFn: table<Lead>("leads", "lead_date") });
export const useQuotations = () =>
  useQuery({ queryKey: ["quotations"], queryFn: table<Quotation>("quotations", "created_at") });
export const useQuotationItems = () =>
  useQuery({
    queryKey: ["quotation_items"],
    queryFn: async () => {
      const [{ data, error }, { data: costs }] = await Promise.all([
        supabase
          .from("quotation_items")
          .select("id, quotation_id, description, part_number, quantity, unit_price")
          .order("created_at", { ascending: true }),
        supabase.rpc("quotation_item_costs"),
      ]);
      if (error) throw error;
      const byId = new Map((costs ?? []).map((c) => [c.id, Number(c.unit_cost)]));
      return (data ?? []).map((i) => ({ ...i, unit_cost: byId.get(i.id) ?? 0 })) as QuotationItem[];
    },
  });
export const useFollowUps = () =>
  useQuery({ queryKey: ["follow_ups"], queryFn: table<FollowUp>("follow_ups", "due_date", true) });
export const useActivity = () =>
  useQuery({ queryKey: ["activity_logs"], queryFn: table<ActivityLog>("activity_logs", "created_at") });
