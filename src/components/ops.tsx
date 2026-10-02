import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statusTone, toneClasses, type Tone } from "@/lib/ops";

export function Panel({
  children,
  className,
  flush,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "glass rounded-xl ring-1 ring-border overflow-hidden",
        flush ? "" : "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{title}</div>
        {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
      {action ? <div className="ml-auto flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{children}</div>
  );
}

export function Badge({
  children,
  tone,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  const t = tone ?? "new";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
        toneClasses[t],
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status, dot }: { status: string; dot?: boolean }) {
  return (
    <Badge tone={statusTone(status)} dot={dot === true}>
      {status}
    </Badge>
  );
}

export function StatCard({
  label,
  value,
  foot,
  footTone,
}: {
  label: string;
  value: ReactNode;
  foot?: string;
  footTone?: Tone;
}) {
  const toneText: Record<Tone, string> = {
    new: "text-new",
    wait: "text-wait",
    ready: "text-ready",
    urgent: "text-urgent",
    lost: "text-lost",
  };
  return (
    <div className="glass rounded-xl p-4 ring-1 ring-border">
      <Eyebrow>{label}</Eyebrow>
      <div className="num mt-2 text-2xl font-semibold text-foreground">{value}</div>
      {foot ? (
        <div className={cn("mt-1 text-xs", footTone ? toneText[footTone] : "text-muted-foreground")}>
          {foot}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

export function Th({ children, align }: { children?: ReactNode; align?: "right" }) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align,
  className,
}: {
  children?: ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 text-[13px] first:pl-5 last:pr-5",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function DataTable({ children, minWidth }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="num text-foreground">{value}</span>
    </div>
  );
}
