import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AgentWidget } from "@/features/auto-apply/agent-widget";
import { ActivityCenter } from "@/features/auto-apply/activity-center";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({ meta: [{ title: "AI Agent · CareerOS" }] }),
  component: AgentPage,
});

function AgentPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Autonomous applications
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">AI Application Agent</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A supervised agent that researches the company, picks the right resume and cover letter,
          fills the application, and waits for your approval before submitting.
        </p>
      </motion.header>

      <AgentWidget />
      <ActivityCenter />
    </div>
  );
}
