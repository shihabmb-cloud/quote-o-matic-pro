import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { redirect } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "manager" | "crm" | "purchase";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  crm: "CRM / Sales",
  purchase: "Purchase",
};

type Profile = { id: string; full_name: string; email: string; job_title: string };

type AuthState = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  displayName: string;
  /** Purchase, Manager and Super Admin may see suppliers and buying prices. */
  canSeeCost: boolean;
  /** CRM, Manager and Super Admin may see customers, leads and quotations. */
  canSeeSales: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (!next?.user) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, job_title").eq("id", next.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", next.user.id),
      ]);
      if (!active) return;
      setProfile(p ?? null);
      setRoles((r ?? []).map((row) => row.role as AppRole));
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    roles,
    canSeeCost: roles.some((r) => r !== "crm"),
    canSeeSales: roles.some((r) => r !== "purchase"),
    displayName: profile?.full_name || session?.user?.email?.split("@")[0] || "User",
    signOut: async () => {
      await supabase.auth.signOut();
      setRoles([]);
      setProfile(null);
      window.location.href = "/auth";
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Client-only route gate: every workspace route uses this in beforeLoad with ssr: false. */
export async function requireSession() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/auth" });
  return { user: data.user };
}
