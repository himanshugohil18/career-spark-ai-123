import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({ u: z.string().url().optional() });

export const Route = createFileRoute("/go")({
  head: () => ({
    meta: [
      { title: "Opening job posting · CareerOS" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: GoRedirect,
});

function GoRedirect() {
  const { u } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!u) {
      setError("No destination URL provided.");
      return;
    }
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        setError("Unsupported URL.");
        return;
      }
      // Commit a top-level same-origin document first, then leave the app.
      // This prevents third-party job boards from loading inside the preview
      // iframe/popup sandbox, which is what triggers ERR_BLOCKED_BY_RESPONSE.
      const t = window.setTimeout(() => {
        window.location.replace(u);
      }, 80);
      return () => window.clearTimeout(t);
    } catch {
      setError("Invalid URL.");
    }
  }, [u]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-8 text-center text-foreground">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Redirecting</p>
      <h1 className="font-display text-lg">
        {error ? error : "Taking you to the job posting…"}
      </h1>
      {u && !error && (
        <a href={u} className="text-sm text-primary underline underline-offset-4" rel="noopener noreferrer">
          Open job posting
        </a>
      )}
    </div>
  );
}
