import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  Building2,
  ClipboardList,
  FileText,
  Gauge,
  LogOut,
  PhoneCall,
  PieChart,
  ShoppingCart,
  Truck,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type AppRole } from "@/lib/auth";
import { relativeTime } from "@/lib/ops";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/rfqs", label: "RFQs", icon: ClipboardList },
  { to: "/purchase", label: "Purchase", icon: ShoppingCart },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/customers", label: "Customers", icon: Building2 },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/followups", label: "Follow-ups", icon: PhoneCall },
  { to: "/reports", label: "Reports", icon: PieChart },
  { to: "/activity", label: "Activity log", icon: Activity },
  { to: "/team", label: "Team", icon: Users },
] as const;

export function AppShell({
  breadcrumb,
  children,
}: {
  breadcrumb: string[];
  children: ReactNode;
}) {
  const { displayName, roles, signOut, profile } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const primaryRole: AppRole = roles.includes("purchase")
    ? "purchase"
    : roles.includes("manager")
      ? "manager"
      : roles.includes("super_admin")
        ? "super_admin"
        : "crm";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const rail = (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-semibold text-background">
          V
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-foreground">OneTouch High Technology</div>
          <div className="text-[11px] tracking-wide text-muted-foreground">RFQ → Quotation</div>
        </div>
        <button
          className="ml-auto text-muted-foreground md:hidden"
          onClick={() => setNavOpen(false)}
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-3 pt-4">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Role
        </div>
        <div className="glass2 rounded-xl p-1 ring-1 ring-border">
          {(["crm", "purchase", "manager"] as AppRole[]).map((r) => {
            const active = r === primaryRole;
            return (
              <div
                key={r}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px]",
                  active
                    ? "bg-primary/20 font-medium text-foreground ring-1 ring-primary/40"
                    : "text-muted-foreground",
                )}
              >
                <span>{ROLE_LABELS[r]}</span>
                {active ? <span className="size-1.5 rounded-full bg-primary-soft" /> : null}
              </div>
            );
          })}
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 pt-5">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Workspace
        </div>
        {NAV.filter(
          (item) =>
            (roles.some((r) => r !== "purchase") ||
              !["/quotations", "/customers", "/leads", "/followups", "/team"].includes(item.to)) &&
            (roles.some((r) => r !== "crm") || !["/purchase", "/suppliers"].includes(item.to)),
        ).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setNavOpen(false)}
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{
              className: "bg-white/5 text-foreground ring-1 ring-border font-medium",
            }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto p-3">
        <div className="glass2 rounded-xl p-3 ring-1 ring-border">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary-soft to-accent text-[11px] font-semibold text-background">
              {initials || "U"}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-medium text-foreground">{displayName}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {profile?.job_title || ROLE_LABELS[primaryRole]}
              </div>
            </div>
            <button
              onClick={() => void signOut()}
              className="ml-auto text-muted-foreground hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="app-glow" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="glass hidden w-60 shrink-0 flex-col border-r border-border md:flex">
          {rail}
        </aside>

        {navOpen ? (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-background/80" onClick={() => setNavOpen(false)} />
            <aside className="glass2 relative flex w-64 flex-col border-r border-border bg-card">
              {rail}
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass relative z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
            <button
              className="grid size-9 place-items-center rounded-lg ring-1 ring-border md:hidden"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
            >
              <span className="text-sm">☰</span>
            </button>
            <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
              {breadcrumb.map((part, i) => (
                <span key={part + i} className="flex items-center gap-2">
                  {i > 0 ? <span className="opacity-40">/</span> : null}
                  <span
                    className={
                      i === breadcrumb.length - 1 ? "truncate font-medium text-foreground" : ""
                    }
                  >
                    {part}
                  </span>
                </span>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <div className="hidden items-center gap-2 rounded-full px-3 py-1.5 ring-1 ring-border sm:flex glass2">
                <span className="size-2 rounded-full bg-ready" />
                <span className="text-xs text-muted-foreground">Live · AED</span>
              </div>
            </div>
          </header>

          <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass2 relative grid size-9 place-items-center rounded-lg text-muted-foreground ring-1 ring-border hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-urgent ring-2 ring-background" />
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass2 absolute right-0 top-11 z-50 w-[22rem] rounded-xl border border-border bg-card p-2 shadow-xl">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[13px] font-semibold text-foreground">Notifications</span>
              <span className="text-[11px] text-muted-foreground">{unread} unread</span>
            </div>
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {(data ?? []).length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Nothing yet.
                </div>
              ) : null}
              {(data ?? []).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    void markRead(n.id);
                    setOpen(false);
                    if (n.rfq_id) void navigate({ to: "/rfqs/$id", params: { id: n.rfq_id } });
                    else if (n.quotation_id)
                      void navigate({ to: "/quotations/$id", params: { id: n.quotation_id } });
                  }}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-2 text-left ring-1 ring-transparent hover:bg-white/5",
                    !n.read_at && "bg-white/5 ring-border",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        n.kind === "success"
                          ? "bg-ready"
                          : n.kind === "warning"
                            ? "bg-wait"
                            : n.kind === "alert"
                              ? "bg-urgent"
                              : "bg-new",
                      )}
                    />
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {n.title}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {relativeTime(n.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 pl-3.5 text-[11px] leading-relaxed text-muted-foreground">
                    {n.message}
                  </div>
                  <div className="mt-1 pl-3.5 text-[10px] text-muted-foreground opacity-70">
                    from {n.sender}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
