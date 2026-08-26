/**
 * Feed diversity.
 *
 * Our catalog is real but unevenly distributed: a handful of very large
 * employers (Databricks, OpenAI, Stripe, Cloudflare, GitLab …) publish hundreds
 * of open roles each, while most companies publish a handful. Ranking purely by
 * score therefore fills the first pages with the same few brands and makes a
 * live aggregation feed look like a small static list.
 *
 * `diversifyByCompany` keeps the ranking order but round-robins across
 * companies so no single employer can dominate a page, without ever dropping a
 * job: overflow entries are appended after the diversified pass.
 *
 * Pure + isomorphic.
 */

type Diversifiable = {
  company?: { id?: string | null; name?: string | null } | null;
  company_id?: string | null;
  provider?: string | null;
};

function companyKey(item: Diversifiable): string {
  return (
    item.company?.id ??
    item.company_id ??
    (item.company?.name ?? "").toLowerCase() ??
    "unknown"
  ).toString();
}

/**
 * Reorders a ranked list so each "round" contains at most `maxPerCompany` jobs
 * from the same company. Relative ranking inside a company is preserved and no
 * item is removed.
 */
export function diversifyByCompany<T extends Diversifiable>(
  items: T[],
  maxPerCompany = 2,
): T[] {
  if (items.length < 3) return items;

  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = companyKey(item);
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
      order.push(key);
    }
    bucket.push(item);
  }
  if (order.length === 1) return items;

  const out: T[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    let placedThisRound = 0;
    for (const key of order) {
      const bucket = groups.get(key);
      if (!bucket || bucket.length === 0) continue;
      const take = bucket.splice(0, maxPerCompany);
      out.push(...take);
      remaining -= take.length;
      placedThisRound += take.length;
    }
    if (placedThisRound === 0) break;
  }
  return out;
}
