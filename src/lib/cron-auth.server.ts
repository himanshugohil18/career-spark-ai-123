/**
 * Shared auth helper for public cron/worker endpoints.
 *
 * Requires a server-only shared secret (AUTO_APPLY_WORKER_SECRET). The secret
 * may be supplied as `Authorization: Bearer <secret>`, `x-cron-secret`, or the
 * `apikey` header (for pg_cron style callers). The public Supabase publishable
 * key is NOT accepted — it ships in the client bundle and is not a secret.
 */

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function presentedSecrets(request: Request): string[] {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return [bearer, request.headers.get("x-cron-secret") ?? "", request.headers.get("apikey") ?? ""].filter(
    (c) => c.length > 0,
  );
}

/**
 * Scheduler-aware check. The database scheduler holds its own randomly
 * generated secret in `automation_config` (server-only table), so nightly
 * jobs can authenticate without any secret ever leaving the backend.
 */
export async function isAuthorizedCronRequestAsync(request: Request): Promise<boolean> {
  if (isAuthorizedCronRequest(request)) return true;
  const candidates = presentedSecrets(request);
  if (!candidates.length) return false;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("automation_config")
      .select("value")
      .eq("key", "cron_secret")
      .maybeSingle();
    const stored = (data as { value?: string } | null)?.value ?? "";
    return stored.length > 0 && candidates.some((c) => safeEqual(c, stored));
  } catch {
    return false;
  }
}

export function isAuthorizedCronRequest(request: Request): boolean {
  // Either the worker secret (manual/worker calls) or the scheduler secret
  // (pg_cron jobs) authorizes a cron endpoint.
  const secrets = [
    process.env.AUTO_APPLY_WORKER_SECRET ?? "",
    process.env.CRON_JOBS_SECRET ?? "",
  ].filter((s) => s.length > 0);
  if (secrets.length === 0) return false;

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const candidates = [
    bearer,
    request.headers.get("x-cron-secret") ?? "",
    request.headers.get("apikey") ?? "",
  ];

  return candidates.some((c) => c.length > 0 && secrets.some((s) => safeEqual(c, s)));
}
