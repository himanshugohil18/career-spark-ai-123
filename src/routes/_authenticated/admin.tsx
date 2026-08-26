import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  Shield,
  LayoutDashboard,
  Users,
  CreditCard,
  Briefcase,
  Sparkles,
  Bot,
  BarChart3,
  Activity,
  Mail,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const q = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
    staleTime: 5 * 60_000,
  });
  const location = useLocation();

  if (q.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Verifying access…
      </div>
    );
  }
  if (!q.data?.isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
        <Shield className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          Your account does not have admin privileges. If this is a mistake, contact
          the workspace owner.
        </p>
      </div>
    );
  }

  const tabs = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/billing", label: "Billing", icon: CreditCard },
    { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
    { to: "/admin/providers", label: "Providers", icon: Radio },
    { to: "/admin/ai", label: "AI Usage", icon: Sparkles },
    { to: "/admin/auto-apply", label: "Auto Apply", icon: Bot },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/emails", label: "Emails", icon: Mail },
    { to: "/admin/health", label: "Health", icon: Activity },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            System · Users · Health
          </p>
        </div>
      </div>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => {
          const active = "exact" in t && t.exact
            ? location.pathname === t.to
            : location.pathname.startsWith(t.to) && (t.to !== "/admin" || location.pathname === "/admin");
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "relative flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
