import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
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
  return (
    <WorkspaceBoot>
      <AppShell>
        <Outlet />
      </AppShell>
    </WorkspaceBoot>
  );
}


