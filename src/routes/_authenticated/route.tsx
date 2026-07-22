import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/features/app-shell/app-shell";
import { WorkspaceBoot } from "@/components/ai/workspace-boot";
import { useCrossModuleSync } from "@/hooks/use-cross-module-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useCrossModuleSync();
  useLoginAlertOnce();
  return (
    <WorkspaceBoot>
      <AppShell>
        <Outlet />
      </AppShell>
    </WorkspaceBoot>
  );
}

/**
 * Fire a "new sign in" email once per browser tab session. Covers OAuth
 * redirects (Google) where the sign-in resolves outside /auth.
 */
function useLoginAlertOnce() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = "careeros:login-alert-sent";
    if (sessionStorage.getItem(KEY) === "1") return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled || !data.session) return;
        sessionStorage.setItem(KEY, "1");
        const provider =
          (data.session.user.app_metadata?.provider as string | undefined) ?? "password";
        const { notifyLogin } = await import("@/lib/email/notify.functions");
        await notifyLogin({ data: { provider, userAgent: navigator.userAgent } });
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}



