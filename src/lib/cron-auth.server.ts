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

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.AUTO_APPLY_WORKER_SECRET ?? "";
  if (!secret) return false;

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const candidates = [
    bearer,
    request.headers.get("x-cron-secret") ?? "",
    request.headers.get("apikey") ?? "",
  ];

  return candidates.some((c) => c.length > 0 && safeEqual(c, secret));
}
