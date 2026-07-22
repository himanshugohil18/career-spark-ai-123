import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ai/skeleton";
import { createCollection, listCollections } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/jobs/collections")({
  head: () => ({ meta: [{ title: "Collections · CareerOS" }] }),
  component: Collections,
});

function Collections() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => listCollections(),
  });

  const create = useMutation({
    mutationFn: () => createCollection({ data: { name: name.trim() } }),
    onSuccess: () => {
      setName("");
      toast.success("Collection created.");
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Collections</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Organize opportunities your way</h1>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(); }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New collection name…"
          className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" variant="primary" disabled={!name.trim() || create.isPending}>
          <Plus className="h-4 w-4" /> Create
        </Button>
      </form>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((c) => {
            const count = ((c.items as { count: number }[] | null) ?? [])[0]?.count ?? 0;
            return (
              <Link
                key={c.id}
                to="/jobs/collections/$collectionId"
                params={{ collectionId: c.id }}
                className="surface-card p-5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold">{c.name}</h3>
                  {c.is_default && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                      Default
                    </span>
                  )}
                </div>
                {c.description && <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>}
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {count} {count === 1 ? "job" : "jobs"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
