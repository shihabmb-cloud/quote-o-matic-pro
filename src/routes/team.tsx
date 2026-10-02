import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge, DataTable, EmptyRow, Field, Panel, PanelHeader, Td, Th } from "@/components/ops";
import { requireSession, ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";
import { createTeamMember, getClaudeConnection, listTeam, setMemberRole } from "@/lib/team.functions";

export const Route = createFileRoute("/team")({
  ssr: false,
  beforeLoad: requireSession,
  head: () => ({
    meta: [
      { title: "Team & access — OneTouch High Technology" },
      { name: "description", content: "Add staff accounts, assign roles and connect Claude to your workspace data." },
      { property: "og:title", content: "Team & access — OneTouch High Technology" },
      { property: "og:description", content: "Manage users, roles and the Claude connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-2 focus:ring-primary/60";
const ROLES: AppRole[] = ["crm", "purchase", "manager", "super_admin"];

function TeamPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("super_admin") || roles.includes("manager");
  const qc = useQueryClient();
  const list = useServerFn(listTeam);
  const create = useServerFn(createTeamMember);
  const setRole = useServerFn(setMemberRole);
  const claude = useServerFn(getClaudeConnection);
  const team = useQuery({ queryKey: ["team"], queryFn: () => list(), enabled: isAdmin });
  const conn = useQuery({ queryKey: ["claude"], queryFn: () => claude(), enabled: roles.includes("super_admin") });
  const [form, setForm] = useState({ full_name: "", email: "", password: "", job_title: "", role: "crm" as AppRole });
  const [busy, setBusy] = useState(false);

  if (!isAdmin) {
    return (
      <AppShell breadcrumb={["Admin", "Team"]}>
        <Panel><div className="p-6 text-[13px] text-muted-foreground">Only Super Admin or Manager can manage the team.</div></Panel>
      </AppShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: form });
      toast.success(`${form.full_name} can now sign in`);
      setForm({ full_name: "", email: "", password: "", job_title: "", role: "crm" });
      void qc.invalidateQueries({ queryKey: ["team"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  };

  const mcpUrl = typeof window !== "undefined" && conn.data?.key ? `${window.location.origin}/api/public/mcp?key=${conn.data.key}` : "";

  return (
    <AppShell breadcrumb={["Admin", "Team"]}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Team & access</h1>
        <p className="text-[13px] text-muted-foreground">Create staff accounts — they can sign in immediately with the password you set.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <PanelHeader title="Add user" />
          <form onSubmit={submit} className="space-y-3 p-4">
            <Field label="Full name"><input className={inputClass} required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Work email"><input type="email" className={inputClass} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Temporary password"><input className={inputClass} required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Job title"><input className={inputClass} value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></Field>
            <Field label="Role">
              <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}>
                {ROLES.map((r) => <option key={r} value={r} className="bg-card">{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
            <button disabled={busy} className="w-full rounded-lg bg-primary py-2 text-[13px] font-medium text-primary-foreground disabled:opacity-60">
              {busy ? "Creating…" : "Create user"}
            </button>
          </form>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Team members" />
          <DataTable>
            <thead><tr><Th>Name</Th><Th>Email</Th><Th>Title</Th><Th>Role</Th></tr></thead>
            <tbody>
              {(team.data ?? []).length === 0 ? <EmptyRow colSpan={4} label={team.isLoading ? "Loading…" : "No users yet"} /> : null}
              {(team.data ?? []).map((m) => (
                <tr key={m.id} className="rowhover">
                  <Td>{m.full_name}</Td>
                  <Td>{m.email}</Td>
                  <Td>{m.job_title || "—"}</Td>
                  <Td>
                    <select
                      className="rounded-md bg-white/5 px-2 py-1 text-[12px] ring-1 ring-border"
                      value={m.roles[0] ?? "crm"}
                      onChange={async (e) => {
                        try {
                          await setRole({ data: { user_id: m.id, role: e.target.value as AppRole } });
                          toast.success("Role updated");
                          void qc.invalidateQueries({ queryKey: ["team"] });
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed");
                        }
                      }}
                    >
                      {ROLES.map((r) => <option key={r} value={r} className="bg-card">{ROLE_LABELS[r]}</option>)}
                    </select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
      </div>

      {roles.includes("super_admin") ? (
        <Panel>
          <PanelHeader title="Connect Claude" />
          <div className="space-y-3 p-4 text-[13px] text-muted-foreground">
            <p>Let Claude read your RFQs, quotations, customers, suppliers, leads and follow-ups (read-only).</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>In Claude, open Settings → Connectors → Add custom connector.</li>
              <li>Name it "OneTouch High Technology" and paste the link below as the server URL.</li>
              <li>Ask Claude things like "Which RFQs are waiting on purchase?"</li>
            </ol>
            <div className="flex gap-2">
              <input readOnly className={inputClass + " num"} value={mcpUrl || "Loading…"} />
              <button
                type="button"
                onClick={() => { void navigator.clipboard.writeText(mcpUrl); toast.success("Copied"); }}
                className="rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground"
              >Copy</button>
            </div>
            <Badge tone="urgent">Keep this link private — anyone with it can read your data.</Badge>
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}
