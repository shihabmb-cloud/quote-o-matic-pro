import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("super_admin") && !roles.includes("manager")) {
    throw new Error("Only Super Admin or Manager can manage the team");
  }
  return roles as string[];
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("company_id").eq("id", context.userId).single();
    const { data: people } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, job_title, created_at")
      .eq("company_id", me!.company_id)
      .order("created_at");
    const ids = (people ?? []).map((p) => p.id);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids);
    return (people ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as string),
    }));
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        full_name: z.string().min(1).max(120),
        job_title: z.string().max(120).default(""),
        role: z.enum(["super_admin", "manager", "crm", "purchase"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const myRoles = await assertAdmin(context.supabase, context.userId);
    if (data.role === "super_admin" && !myRoles.includes("super_admin")) {
      throw new Error("Only a Super Admin can create another Super Admin");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("company_id").eq("id", context.userId).single();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: data.role },
    });
    if (error) throw new Error(error.message);
    const id = created.user.id;
    await supabaseAdmin
      .from("profiles")
      .update({ company_id: me!.company_id, job_title: data.job_title, full_name: data.full_name })
      .eq("id", id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.role });
    return { id };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(["super_admin", "manager", "crm", "purchase"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const myRoles = await assertAdmin(context.supabase, context.userId);
    if (data.role === "super_admin" && !myRoles.includes("super_admin")) {
      throw new Error("Only a Super Admin can grant Super Admin");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    return { ok: true };
  });

export const getClaudeConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await assertAdmin(context.supabase, context.userId);
    if (!roles.includes("super_admin")) return { key: null as string | null };
    return { key: process.env["MCP_API_KEY"] ?? null };
  });
