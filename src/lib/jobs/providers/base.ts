/**
 * Provider contract. Every job source implements this interface.
 * The discovery orchestrator and matching engine never import a specific
 * provider — they only see `JobProvider`.
 */

import type { NormalizedJob } from "../types";

export type ProviderConfig = {
  boards?: string[];
  companies?: string[];
  pages?: { url: string; company: string; selector?: string }[];
  [key: string]: unknown;
};

export type ProviderFetchOptions = {
  since?: Date;
  limit?: number;
  queries?: string[];
  locations?: string[];
};

export interface JobProvider {
  id: string;
  displayName: string;
  fetch(config: ProviderConfig, opts?: ProviderFetchOptions): Promise<NormalizedJob[]>;
}

export class ProviderError extends Error {
  constructor(public providerId: string, message: string, public cause?: unknown) {
    super(`[${providerId}] ${message}`);
  }
}
