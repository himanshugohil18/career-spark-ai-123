import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Radar } from "lucide-react";

export function EmptyFeed({
  hasBrain,
  onRefresh,
  loading,
  roleLabel,
}: {
  hasBrain: boolean;
  onRefresh: () => void;
  loading?: boolean;
  roleLabel?: string | null;
}) {
  if (!hasBrain) {
    return (
      <div className="surface-card flex flex-col items-center gap-4 p-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary">
          <Sparkles className="h-7 w-7" />
        </span>
        <div>
          <h3 className="font-display text-xl font-semibold">Approve your Career Brain to see matches</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The AI job discovery engine matches every role against your Career Brain. Approve it once and every future job gets scored automatically.
          </p>
        </div>
      </div>
    );
  }
  if (roleLabel) {
    return (
      <div className="surface-card flex flex-col items-center gap-4 p-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary"><Radar className="h-6 w-6" /></span>
        <div>
          <h3 className="font-display text-xl font-semibold">
            No matching {roleLabel} roles were found from your enabled providers.
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            CareerOS will never substitute unrelated roles just to fill the page. Enable more providers or refresh discovery to pull fresh listings.
          </p>
        </div>
        <Button onClick={onRefresh} disabled={loading} variant="primary">
          {loading ? "Working…" : "Refresh matches"}
        </Button>
      </div>
    );
  }
  return (
    <div className="surface-card flex flex-col items-center gap-4 p-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary"><Radar className="h-6 w-6" /></span>
      <div>
        <h3 className="font-display text-xl font-semibold">No jobs matched yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Run the discovery agent to fetch the latest roles from your enabled sources and score them against your Career Brain.
        </p>
      </div>
      <Button onClick={onRefresh} disabled={loading} variant="primary">
        {loading ? "Working…" : "Refresh matches"}
      </Button>
    </div>
  );
}
