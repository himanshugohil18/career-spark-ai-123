import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { validateRedirectTarget } from "@/lib/go.functions";

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
  const [allowed, setAllowed] = useState(false);
  const validate = useServerFn(validateRedirectTarget);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    if (!u) {
      setError("No destination URL provided.");
      return;
    }

    (async () => {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          if (!cancelled) setError("Unsupported URL.");
          return;
        }
        // Only redirect to destinations that belong to a known job posting.
        const res = await validate({ data: { url: u } });
        if (cancelled) return;
        if (!res.allowed) {
          setError("This destination isn't a recognised CareerOS job link.");
          return;
        }
        setAllowed(true);
        timer = window.setTimeout(() => {
          window.location.replace(u);
        }, 80);
      } catch {
        if (!cancelled) setError("Invalid URL.");
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [u, validate]);


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
