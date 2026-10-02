import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ROLE_LABELS, type AppRole } from "@/lib/auth";
import { Eyebrow, Field } from "@/components/ops";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — OneTouch High Technology" },
      {
        name: "description",
        content: "Sign in to the OneTouch High Technology CRM and purchase workspace.",
      },
      { property: "og:title", content: "Sign in — OneTouch High Technology" },
      {
        property: "og:description",
        content: "Sign in to the OneTouch High Technology CRM and purchase workspace.",
      },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "w-full rounded-lg bg-white/5 px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("crm");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        if (data.session) void navigate({ to: "/" });
        else toast.success("Account created. Check your email to confirm, then sign in.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="app-glow" />
      <div className="glass relative z-10 w-full max-w-md rounded-xl p-6 ring-1 ring-border sm:p-8">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-semibold text-background">
            V
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">OneTouch High Technology</div>
            <div className="text-[11px] text-muted-foreground">CRM · Purchase · Quotations</div>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
          {mode === "signin" ? "Sign in to your workspace" : "Create your workspace account"}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          One shared RFQ connects sales and purchase from enquiry to won.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" ? (
            <>
              <Field label="Full name">
                <input
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rania Al-Farsi"
                  required
                />
              </Field>
              <Field label="Team">
                <select
                  className={inputClass}
                  value={role}
                  onChange={(e) => setRole(e.target.value as AppRole)}
                >
                  {(["crm", "purchase", "manager", "super_admin"] as AppRole[]).map((r) => (
                    <option key={r} value={r} className="bg-card">
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : null}

          <Field label="Work email">
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.ae"
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary py-2.5 text-[13px] font-medium text-primary-foreground ring-1 ring-primary/50 hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <Eyebrow>or</Eyebrow>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={() => void google()}
          className="glass2 w-full rounded-lg py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-white/10"
        >
          Continue with Google
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className={cn("mt-5 w-full text-center text-[12px] text-muted-foreground hover:text-foreground")}
        >
          {mode === "signin"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
