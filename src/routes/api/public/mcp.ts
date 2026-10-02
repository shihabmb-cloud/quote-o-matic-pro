import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

const TOOLS = [
  { name: "list_rfqs", description: "List RFQs with status, priority, customer and dates. Optional status filter.", inputSchema: { type: "object", properties: { status: { type: "string" }, limit: { type: "number" } } } },
  { name: "get_rfq", description: "Get one RFQ by RFQ number (e.g. RFQ-2026-0125) with items and supplier quotes.", inputSchema: { type: "object", properties: { rfq_no: { type: "string" } }, required: ["rfq_no"] } },
  { name: "list_quotations", description: "List quotations with status, approval and customer.", inputSchema: { type: "object", properties: { status: { type: "string" }, limit: { type: "number" } } } },
  { name: "list_customers", description: "List customers with contact details.", inputSchema: { type: "object", properties: { search: { type: "string" } } } },
  { name: "list_suppliers", description: "List suppliers.", inputSchema: { type: "object", properties: {} } },
  { name: "list_leads", description: "List leads with source, status and expected value.", inputSchema: { type: "object", properties: { status: { type: "string" } } } },
  { name: "list_follow_ups", description: "List open follow-ups.", inputSchema: { type: "object", properties: {} } },
  { name: "recent_activity", description: "Recent audit log entries.", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
];

function authorized(request: Request) {
  const expected = process.env["MCP_API_KEY"];
  if (!expected) return false;
  const url = new URL(request.url);
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") || url.searchParams.get("key") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function callTool(name: string, args: any) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const limit = Math.min(Number(args.limit) || 50, 200);
  switch (name) {
    case "list_rfqs": {
      let q = db.from("rfqs").select("rfq_no, project_name, status, priority, salesperson, rfq_date, required_date, customers(name)").order("created_at", { ascending: false }).limit(limit);
      if (args.status) q = q.eq("status", String(args.status));
      return (await q).data;
    }
    case "get_rfq": {
      const { data: rfq } = await db.from("rfqs").select("*, customers(name, contact_person)").eq("rfq_no", String(args.rfq_no)).maybeSingle();
      if (!rfq) return { error: "RFQ not found" };
      const { data: items } = await db.from("rfq_items").select("*, supplier_quotes(unit_cost, delivery_days, availability, suppliers(name))").eq("rfq_id", rfq.id);
      return { ...rfq, items };
    }
    case "list_quotations": {
      let q = db.from("quotations").select("quotation_no, status, approval_status, salesperson, quote_date, valid_until, vat_percent, customers(name), rfqs(rfq_no)").order("created_at", { ascending: false }).limit(limit);
      if (args.status) q = q.eq("status", String(args.status));
      return (await q).data;
    }
    case "list_customers": {
      let q = db.from("customers").select("name, contact_person, email, mobile, city, country, industry, salesperson").order("name");
      if (args.search) q = q.ilike("name", `%${String(args.search)}%`);
      return (await q).data;
    }
    case "list_suppliers":
      return (await db.from("suppliers").select("name, contact_person, email, country, brands, payment_terms, currency").order("name")).data;
    case "list_leads": {
      let q = db.from("leads").select("lead_no, company_name, contact_person, source, status, expected_value, probability, next_followup, salesperson").order("created_at", { ascending: false });
      if (args.status) q = q.eq("status", String(args.status));
      return (await q).data;
    }
    case "list_follow_ups":
      return (await db.from("follow_ups").select("due_date, due_time, type, owner, notes, next_action, customers(name)").eq("done", false).order("due_date")).data;
    case "recent_activity":
      return (await db.from("activity_logs").select("actor, action, entity, created_at").order("created_at", { ascending: false }).limit(limit)).data;
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors } });

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: cors }),
      GET: async () => new Response("Method not allowed", { status: 405, headers: cors }),
      POST: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const msg = (await request.json()) as { id?: unknown; method: string; params?: any };
        const reply = (result: unknown) => json({ jsonrpc: "2.0", id: msg.id ?? null, result });
        if (msg.id === undefined) return new Response(null, { status: 202, headers: cors });
        try {
          switch (msg.method) {
            case "initialize":
              return reply({ protocolVersion: msg.params?.protocolVersion ?? "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "vantage-ops", version: "1.0.0" } });
            case "ping":
              return reply({});
            case "tools/list":
              return reply({ tools: TOOLS });
            case "tools/call": {
              const out = await callTool(msg.params?.name, msg.params?.arguments ?? {});
              return reply({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
            }
            default:
              return json({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
          }
        } catch (e) {
          return reply({ isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : "Error" }] });
        }
      },
    },
  },
});
