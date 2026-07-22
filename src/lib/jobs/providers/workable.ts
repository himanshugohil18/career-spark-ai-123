/**
 * Workable — requires per-account API tokens. Interface is in place so ops
 * can enable when credentials are provisioned.
 */

import type { JobProvider } from "./base";

export const workableProvider: JobProvider = {
  id: "workable",
  displayName: "Workable",
  async fetch() {
    // Disabled until API tokens are configured per Workable subdomain.
    return [];
  },
};
