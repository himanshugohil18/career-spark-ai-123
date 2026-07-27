import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side duplicate-email validation used before sign-up.
 * Runs with the admin client so it can see accounts created through any
 * provider (email/password or Google).
 */
export const checkEmailAvailable = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => {
    const email = String(d?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (email.length > 255) throw new Error("Email is too long.");
    return { email };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fast path: a profile row already exists for this address.
    const { data: profileRow } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("email", data.email)
      .maybeSingle();

    // Authoritative check: scan auth users (covers OAuth-only accounts and
    // accounts whose profile row was never created). Paginated so accounts
    // beyond the first page are still detected.
    const perPage = 200;
    for (let page = 1; page <= 25; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const users = list?.users ?? [];
      const match = users.find((u) => (u.email ?? "").toLowerCase() === data.email);
      if (match) {
        const provider =
          (match.app_metadata?.provider as string | undefined) ??
          (match.identities?.[0]?.provider as string | undefined) ??
          "email";
        return { available: false as const, provider };
      }
      if (users.length < perPage) break;
    }

    if (profileRow) return { available: false as const, provider: "email" };

    return { available: true as const, provider: null };
  });
