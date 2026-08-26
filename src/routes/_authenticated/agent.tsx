import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { AgentWidget } from "@/features/auto-apply/agent-widget";
import { ActivityCenter } from "@/features/auto-apply/activity-center";
import { PageHeader, PageShell, MetaChip } from "@/components/product/page-header";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({ meta: [{ title: "AI Agent · CareerOS" }] }),
  component: AgentPage,
});

function AgentPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Supervised autonomy"
        title="AI Application Agent"
        description="A supervised agent that researches the company, selects the right resume and cover letter, prepares the application — and waits for your approval before anything is submitted."
        meta={
          <MetaChip icon={Bot} tone="brand">
            Approval-gated · nothing is submitted without your review
          </MetaChip>
        }
      />

      <AgentWidget />
      <ActivityCenter />
    </PageShell>
  );
}
