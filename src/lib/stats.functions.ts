import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicStats = {
  users: number;
  jobs: number;
  applications: number;
  ai_sessions: number;
  resumes: number;
  companies: number;
};

export const getPublicStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicStats> => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supa = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data, error } = await supa.rpc("get_public_stats" as never);
    if (error) {
      return { users: 0, jobs: 0, applications: 0, ai_sessions: 0, resumes: 0, companies: 0 };
    }
    const d = (data ?? {}) as Partial<PublicStats>;
    return {
      users: Number(d.users ?? 0),
      jobs: Number(d.jobs ?? 0),
      applications: Number(d.applications ?? 0),
      ai_sessions: Number(d.ai_sessions ?? 0),
      resumes: Number(d.resumes ?? 0),
      companies: Number(d.companies ?? 0),
    };
  },
);
