import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Badge, Panel, PanelHeader } from "@/components/ops";
import { requireSession } from "@/lib/auth";
import { relativeTime } from "@/lib/ops";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Notifications — OneTouch High Technology" },
      {
        name: "description",
        content: "Alerts between sales, purchase and management: new RFQs, priced RFQs and approvals.",
      },
      { property: "og:title", content: "Notifications — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Hand-off alerts and approval requests across the whole workflow.",
      },
    ],
  }),
  component: Notifications,
});

type Notification = {
  id: string;
  title: string;
  message: string;
  target_role: string | null;
  sender: string;
  kind: string;
  read_at: string | null;
  created_at: string;
  rfq_id: string | null;
  quotation_id: string | null;
};

function Notifications() {
  const qc = useQueryClient();
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  const markAll = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <AppShell breadcrumb={["Notifications"]}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
        <p className="text-[13px] text-muted-foreground">
          Automatic alerts whenever work moves between teams.
        </p>
      </div>

      <Panel flush>
        <PanelHeader
          title={`${notifications.length} notification${notifications.length === 1 ? "" : "s"}`}
          subtitle={unread ? `${unread} unread` : "all caught up"}
          action={
            unread ? (
              <button
                onClick={() => void markAll()}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-border hover:bg-white/10"
              >
                Mark all read
              </button>
            ) : null
          }
        />
        <div className="divide-y divide-white/5">
          {notifications.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : null}
          {notifications.map((n) => {
            const body = (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {!n.read_at ? <span className="size-1.5 rounded-full bg-primary-soft" /> : null}
                  <span className="text-[13px] font-medium text-foreground">{n.title}</span>
                  <Badge
                    tone={
                      n.kind === "success"
                        ? "ready"
                        : n.kind === "alert"
                          ? "urgent"
                          : n.kind === "warning"
                            ? "wait"
                            : "new"
                    }
                  >
                    {n.target_role ?? "all"}
                  </Badge>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {relativeTime(n.created_at)}
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  {n.message} · from {n.sender}
                </div>
              </>
            );
            return (
              <div key={n.id} className={`px-5 py-3.5 ${n.read_at ? "" : "bg-white/[0.02]"}`}>
                {n.rfq_id ? (
                  <Link to="/rfqs/$id" params={{ id: n.rfq_id }} className="block">
                    {body}
                  </Link>
                ) : n.quotation_id ? (
                  <Link to="/quotations/$id" params={{ id: n.quotation_id }} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </AppShell>
  );
}
