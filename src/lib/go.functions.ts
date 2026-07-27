import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Validates a /go?u= redirect target against the app's own job postings.
 * Only URLs that exist in the jobs table (application_url) are allowed, so the
 * bounce route can never be used to mask an arbitrary phishing destination.
 */
export const validateRedirectTarget = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ url: z.string().url().max(2048) }).parse(i))
  .handler(async ({ data }) => {
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      return { allowed: false as const };
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { allowed: false as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabaseAdmin as any;

    // Exact match first, then a host-scoped match so tracking params don't break links.
    const { data: exact } = await sb
      .from("jobs")
      .select("id")
      .eq("application_url", data.url)
      .limit(1);
    if (exact && exact.length > 0) return { allowed: true as const };

    const base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    const { data: byPath } = await sb
      .from("jobs")
      .select("id")
      .eq("application_url", base)
      .limit(1);
    if (byPath && byPath.length > 0) return { allowed: true as const };

    return { allowed: false as const };
  });
