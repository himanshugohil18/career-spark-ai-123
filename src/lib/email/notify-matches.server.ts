/**
 * Server-only helper: send the "new job matches" email based on freshly
 * discovered matches from refreshUserMatches. Uses the sender's built-in
 * per-recipient rate limit (12h) so multiple refreshes in the same window
 * won't spam users.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface NewMatchLite {
  jobId: string;
  title: string;
  company: string;
  matchPercent: number;
  location: string | null;
}

export async function notifyNewJobMatches(
  supabase: SupabaseClient,
  userId: string,
  newMatches: NewMatchLite[],
): Promise<void> {
  if (!newMatches.length) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: profile } = await sb
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    let email: string | null = profile?.email ?? null;
    let name: string | null = profile?.full_name ?? null;
    if (!email) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: u } = await (supabaseAdmin as any).auth.admin.getUserById(userId);
        email = u?.user?.email ?? null;
        name = name ?? (u?.user?.user_metadata?.full_name as string | null) ?? null;
      } catch {
        /* ignore */
      }
    }
    if (!email) return;
    const top = [...newMatches]
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, 5);
    const { sendNewJobMatchesEmail } = await import("./senders.server");
    await sendNewJobMatchesEmail(email, {
      name,
      count: newMatches.length,
      topMatches: top.map((m) => ({
        title: m.title,
        company: m.company,
        matchPercent: m.matchPercent,
        location: m.location,
      })),
      jobsUrl: "https://careerosai.site/jobs",
      userId,
    });
  } catch (e) {
    console.warn("[notifyNewJobMatches] failed", (e as Error).message);
  }
}
