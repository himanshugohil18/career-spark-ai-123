import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Bot, Loader2, Sparkles } from "lucide-react";
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
    <motion.span
      className="inline-block"
      whileTap={unavailable || run.isPending ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
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
        {run.isPending ? (
          <motion.span
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting AI…
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-2"
          >
            {unavailable ? <Bot className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {unavailable ? "Apply with AI (Unavailable)" : "Apply with AI"}
          </motion.span>
        )}
      </Button>
    </motion.span>
  );
}
