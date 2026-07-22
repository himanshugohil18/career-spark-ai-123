import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ai/skeleton";
import { getCollectionItems, removeFromCollection } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/jobs/collections/$collectionId")({
  head: () => ({ meta: [{ title: "Collection · CareerOS" }] }),
  component: CollectionDetail,
});

function CollectionDetail() {
  const { collectionId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["collection-items", collectionId],
    queryFn: () => getCollectionItems({ data: { collectionId } }),
  });

  const remove = useMutation({
    mutationFn: (jobId: string) => removeFromCollection({ data: { collectionId, jobId } }),
    onSuccess: () => {
      toast.success("Removed from collection.");
      void queryClient.invalidateQueries({ queryKey: ["collection-items", collectionId] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-10">
      <Link to="/jobs/collections" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Collections
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">This collection is empty. Add jobs from the feed.</p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((row) => {
            const job = row.job as { id: string; title: string; location: string | null; company?: { name?: string } | null } | null;
            if (!job) return null;
            return (
              <li key={row.id} className="surface-card flex items-center justify-between p-4">
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: job.id }}
                  className="font-display font-semibold hover:text-primary"
                >
                  {job.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {job.company?.name ?? "—"} · {job.location ?? "—"}
                  </span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(job.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
