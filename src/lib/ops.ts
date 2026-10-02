export const RFQ_STATUSES = [
  "DRAFT",
  "SUBMITTED TO PURCHASE",
  "PURCHASE RECEIVED",
  "PURCHASE IN PROGRESS",
  "WAITING FOR SUPPLIER",
  "SUPPLIER PRICES RECEIVED",
  "PRICE COMPARISON",
  "READY FOR CRM",
  "QUOTATION DRAFT",
  "WAITING APPROVAL",
  "QUOTATION SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "CANCELLED",
] as const;

export type RfqStatus = (typeof RFQ_STATUSES)[number];

/** Seven visible hand-off stages used by the stage rail. */
export const RFQ_STAGES = [
  { label: "Draft", statuses: ["DRAFT"] },
  { label: "Submitted to Purchase", statuses: ["SUBMITTED TO PURCHASE", "PURCHASE RECEIVED"] },
  {
    label: "Supplier compare",
    statuses: ["PURCHASE IN PROGRESS", "WAITING FOR SUPPLIER", "SUPPLIER PRICES RECEIVED", "PRICE COMPARISON"],
  },
  { label: "Ready for CRM", statuses: ["READY FOR CRM"] },
  { label: "Quotation", statuses: ["QUOTATION DRAFT", "WAITING APPROVAL"] },
  { label: "Quotation sent", statuses: ["QUOTATION SENT", "NEGOTIATION"] },
  { label: "Won / Lost", statuses: ["WON", "LOST", "CANCELLED"] },
] as const;

export function stageIndex(status: string) {
  const i = RFQ_STAGES.findIndex((s) => (s.statuses as readonly string[]).includes(status));
  return i < 0 ? 0 : i;
}

export type Tone = "new" | "wait" | "ready" | "urgent" | "lost";

export function statusTone(status: string): Tone {
  const s = status.toUpperCase();
  if (["DRAFT", "NEW", "CONTACTED", "QUALIFIED"].includes(s)) return "new";
  if (["WON", "READY FOR CRM", "APPROVED", "COMPLETED"].includes(s)) return "ready";
  if (["LOST", "CANCELLED", "EXPIRED"].includes(s)) return "lost";
  if (s.includes("WAITING") || s.includes("SUBMITTED") || s.includes("NEGOTIAT")) return "wait";
  if (["URGENT", "HIGH"].includes(s)) return "urgent";
  return "new";
}

export const toneClasses: Record<Tone, string> = {
  new: "bg-new/15 text-new ring-new/40",
  wait: "bg-wait/15 text-wait ring-wait/40",
  ready: "bg-ready/15 text-ready ring-ready/40",
  urgent: "bg-urgent/15 text-urgent ring-urgent/40",
  lost: "bg-lost/15 text-lost ring-lost/40",
};

export function priorityTone(priority: string): Tone {
  if (priority === "Urgent") return "urgent";
  if (priority === "High") return "wait";
  return "new";
}

export function aed(value: number | null | undefined, opts?: { compact?: boolean }) {
  const n = Number(value ?? 0);
  if (opts?.compact) {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
  }
  return n.toLocaleString("en-AE", { maximumFractionDigits: 0 });
}

export function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export type MarginInput = {
  productCost: number;
  shipping: number;
  otherCosts: number;
  sellingPrice: number;
};

export function margin({ productCost, shipping, otherCosts, sellingPrice }: MarginInput) {
  const totalCost = productCost + shipping + otherCosts;
  const grossProfit = sellingPrice - totalCost;
  const gpPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
  return { totalCost, grossProfit, gpPercent };
}

export function suggestedSellingPrice(totalCost: number, targetGpPercent: number) {
  const gp = Math.min(Math.max(targetGpPercent, 0), 95) / 100;
  return gp >= 1 ? totalCost : totalCost / (1 - gp);
}

/** Approval rule: GP >= 20% auto, 15–20% manager, below 15% director/admin. */
export function requiredApproval(gpPercent: number) {
  if (gpPercent >= 20) return "Auto-approved" as const;
  if (gpPercent >= 15) return "Manager approval" as const;
  return "Director approval" as const;
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function durationBetween(from: string | null | undefined, to: string | null | undefined) {
  if (!from || !to) return "—";
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms < 0) return "—";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.round((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}
