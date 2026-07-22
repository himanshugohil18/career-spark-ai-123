/**
 * Wellfound (formerly AngelList Talent) — public API is gated. Placeholder
 * so the registry stays uniform; enable when a scraper or partner API is in place.
 */

import type { JobProvider } from "./base";

export const wellfoundProvider: JobProvider = {
  id: "wellfound",
  displayName: "Wellfound",
  async fetch() {
    return [];
  },
};
