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
  builtinProvider,
  cutshortProvider,
  diceProvider,
  flexJobsProvider,
  founditProvider,
  glassdoorProvider,
  hiristProvider,
  indeedProvider,
  internshalaProvider,
  instahyreProvider,
  levelsFyiProvider,
  linkedInJobsProvider,
  naukriProvider,
  remoteCoProvider,
  remoteLeadsProvider,
  shineProvider,
  simplyhiredProvider,
  talentProvider,
  timesjobsProvider,
  upworkProvider,
  wellfoundProvider,
  zipRecruiterProvider,
} from "./marketplaces";
import {
  arbeitnowProvider,
  himalayasProvider,
  jobicyProvider,
  remotiveProvider,
  weworkremotelyProvider,
  workingnomadsProvider,
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
  [internshalaProvider.id]: internshalaProvider,
  [talentProvider.id]: talentProvider,
  [zipRecruiterProvider.id]: zipRecruiterProvider,
  [diceProvider.id]: diceProvider,
  [builtinProvider.id]: builtinProvider,
  [remoteCoProvider.id]: remoteCoProvider,
  [remoteLeadsProvider.id]: remoteLeadsProvider,
  [levelsFyiProvider.id]: levelsFyiProvider,
  [flexJobsProvider.id]: flexJobsProvider,
  [upworkProvider.id]: upworkProvider,
  [remotiveProvider.id]: remotiveProvider,
  [arbeitnowProvider.id]: arbeitnowProvider,
  [jobicyProvider.id]: jobicyProvider,
  [himalayasProvider.id]: himalayasProvider,
  [weworkremotelyProvider.id]: weworkremotelyProvider,
  [workingnomadsProvider.id]: workingnomadsProvider,
  [customProvider.id]: customProvider,
};

export function getProvider(id: string): JobProvider | null {
  return REGISTRY[id] ?? null;
}

export function listProviderIds(): string[] {
  return Object.keys(REGISTRY);
}
