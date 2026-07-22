import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot } from "lucide-react";
import { Skeleton } from "@/components/ai/skeleton";
import { AutoApplySessionPanel } from "@/features/auto-apply/session-panel";
import { listAutoApplyForWorkspace } from "@/lib/auto-apply.functions";
import { getWorkspace } from "@/lib/workspace.functions";

export const Route = createFileRoute("/_authenticated/applications/$workspaceId/agent")({
  head: () => ({ meta: [{ title: "AI Agent · CareerOS" }] }),
  component: WorkspaceAgent,
  notFoundComponent: () => (
    <div className="mx-auto max-w-lg p-10 text-center">
      <h1 className="font-display text-xl font-semibold">Workspace not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This workspace doesn't exist or belongs to another account.
      </p>
      <Link to="/applications" className="mt-4 inline-block text-sm text-primary underline">
        Back to applications
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-lg p-10 text-center text-sm text-muted-foreground">
      {error.message || "Something went wrong."}
    </div>
  ),
});

function WorkspaceAgent() {
  const { workspaceId } = Route.useParams();
  const ws = useQuery({
    queryKey: ["workspace-head", workspaceId],
    queryFn: () => getWorkspace({ data: { workspaceId } }),
  });
  const sessions = useQuery({
    queryKey: ["auto-apply-for-ws", workspaceId],
    queryFn: () => listAutoApplyForWorkspace({ data: { workspaceId } }),
    refetchInterval: 6000,
  });

  const active = (sessions.data ?? [])[0] as Record<string, unknown> | undefined;

  if (!ws.isLoading && ws.data === null) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <h1 className="font-display text-xl font-semibold">Workspace not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This workspace doesn't exist or belongs to another account.
        </p>
        <Link to="/applications" className="mt-4 inline-block text-sm text-primary underline">
          Back to applications
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-6 md:p-10">
      <div>
        <Link
          to="/applications/$workspaceId"
          params={{ workspaceId }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to workspace
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl font-semibold">
          <Bot className="h-5 w-5 text-primary" /> AI Application Agent
        </h1>
        {ws.data?.workspace && (
          <p className="text-sm text-muted-foreground">
            {String((ws.data.workspace as Record<string, unknown>).id).slice(0, 8)} ·
            {" "}
            {String((ws.data.job as Record<string, unknown> | null)?.title ?? "role")}
          </p>
        )}
      </div>

      {sessions.isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !active ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          No AI session yet for this workspace. Open the job and hit
          <span className="mx-1 font-semibold text-foreground">Apply with AI</span>
          to start one.
        </div>
      ) : (
        <AutoApplySessionPanel sessionId={String(active.id)} />
      )}

      {(sessions.data ?? []).length > 1 && (
        <section>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Previous sessions
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {(sessions.data ?? []).slice(1).map((r) => (
              <li key={String((r as Record<string, unknown>).id)}>
                {new Date(String((r as Record<string, unknown>).created_at)).toLocaleString()} —{" "}
                {String((r as Record<string, unknown>).status)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
