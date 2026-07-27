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

    // Look up the account across auth users (covers OAuth-only accounts too).
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);

    const match = (list?.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === data.email,
    );

    if (!match) return { available: true as const, provider: null };

    const provider =
      (match.app_metadata?.provider as string | undefined) ??
      (match.identities?.[0]?.provider as string | undefined) ??
      "email";

    return { available: false as const, provider };
  });
