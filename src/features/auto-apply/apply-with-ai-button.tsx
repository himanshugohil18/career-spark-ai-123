import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWorkspace } from "@/lib/workspace.functions";
import { startAutoApply } from "@/lib/auto-apply.functions";

/**
 * Launches an AI application session for a job. If the workspace doesn't
 * exist yet, opens one first (so the AI session always has a home).
 */
export function ApplyWithAiButton({
  jobId,
  unavailableReason,
  size = "sm",
  className,
}: {
  jobId: string;
  unavailableReason?: string | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  const navigate = useNavigate();

  const run = useMutation({
    mutationFn: async () => {
      const ws = await openWorkspace({ data: { jobId } });
      const sess = await startAutoApply({ data: { workspaceId: ws.workspaceId } });
      return { workspaceId: ws.workspaceId, sessionId: sess.sessionId };
    },
    onSuccess: ({ workspaceId }) => {
      toast.success("AI agent started. Watch the timeline.");
      void navigate({ to: "/applications/$workspaceId/agent", params: { workspaceId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start AI agent"),
  });

  const unavailable = Boolean(unavailableReason);

  return (
    <Button
      variant="primary"
      size={size}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (unavailable) {
          toast.info(unavailableReason ?? "AI Apply is unavailable for this role.");
          return;
        }
        run.mutate();
      }}
      disabled={run.isPending}
      title={unavailable ? unavailableReason ?? undefined : "AI fills and drafts this application. You approve before submit."}
      className={className}
      aria-disabled={unavailable || undefined}
    >
      <Bot className="h-4 w-4" />
      {run.isPending
        ? "Starting AI…"
        : unavailable
          ? "Apply with AI (Unavailable)"
          : "Apply with AI"}
    </Button>
  );
}
