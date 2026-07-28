/**
 * Provider registry. The discovery orchestrator asks the registry for enabled
 * providers by id. New providers plug in by appending a single line here.
 */

import type { JobProvider } from "./base";
import { greenhouseProvider } from "./greenhouse";
import { leverProvider } from "./lever";
import { ashbyProvider } from "./ashby";
import { remoteokProvider } from "./remoteok";
import { ycombinatorProvider } from "./ycombinator";
import { workableProvider } from "./workable";
import { customProvider } from "./custom";
import {
  cutshortProvider,
  founditProvider,
  glassdoorProvider,
  hiristProvider,
  indeedProvider,
  instahyreProvider,
  linkedInJobsProvider,
  naukriProvider,
  shineProvider,
  simplyhiredProvider,
  timesjobsProvider,
  wellfoundProvider,
} from "./marketplaces";
import {
  arbeitnowProvider,
  himalayasProvider,
  jobicyProvider,
  remotiveProvider,
  weworkremotelyProvider,
} from "./portals";

const REGISTRY: Record<string, JobProvider> = {
  [greenhouseProvider.id]: greenhouseProvider,
  [leverProvider.id]: leverProvider,
  [ashbyProvider.id]: ashbyProvider,
  [remoteokProvider.id]: remoteokProvider,
  [ycombinatorProvider.id]: ycombinatorProvider,
  [workableProvider.id]: workableProvider,
  [wellfoundProvider.id]: wellfoundProvider,
  [linkedInJobsProvider.id]: linkedInJobsProvider,
  [naukriProvider.id]: naukriProvider,
  [instahyreProvider.id]: instahyreProvider,
  [hiristProvider.id]: hiristProvider,
  [cutshortProvider.id]: cutshortProvider,
  [indeedProvider.id]: indeedProvider,
  [founditProvider.id]: founditProvider,
  [shineProvider.id]: shineProvider,
  [timesjobsProvider.id]: timesjobsProvider,
  [simplyhiredProvider.id]: simplyhiredProvider,
  [glassdoorProvider.id]: glassdoorProvider,
  [remotiveProvider.id]: remotiveProvider,
  [arbeitnowProvider.id]: arbeitnowProvider,
  [jobicyProvider.id]: jobicyProvider,
  [himalayasProvider.id]: himalayasProvider,
  [weworkremotelyProvider.id]: weworkremotelyProvider,
  [customProvider.id]: customProvider,
};

export function getProvider(id: string): JobProvider | null {
  return REGISTRY[id] ?? null;
}

export function listProviderIds(): string[] {
  return Object.keys(REGISTRY);
}
