import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/features/app-shell/app-shell";
import { WorkspaceBoot } from "@/components/ai/workspace-boot";
import { useCrossModuleSync } from "@/hooks/use-cross-module-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  // Session lives in browser storage; resolve it after hydration. Redirecting
  // in beforeLoad fires mid-hydration on a hard refresh (server rendered the
  // ssr:false shell, client's first render would be /auth) and triggers a
  // React hydration-mismatch error, so the gate runs in an effect instead.
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!checked) return null;

  return <AuthenticatedWorkspace />;
}

function AuthenticatedWorkspace() {
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



