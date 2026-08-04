/**
 * Career Brain Service — the single source of truth for every downstream
 * module. Job Discovery, Matching, Optimizer, Cover Letter, Interview Prep
 * ALL consume `getCareerBrainSnapshot` instead of re-parsing resumes.
 *
 * Do not add UI here. Do not add fetch/mutation logic. This is a pure
 * server-side aggregator over the normalized tables the review + approve
 * flow already populates.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCareerBrainSnapshotFor } from "./career-brain-logic.server";

export type CareerBrainSnapshot = {
  userId: string;
  ready: boolean; // true once at least one resume is approved
  metadata: {
    brainVersion: number | null;
    resumeVersion: number | null;
    resumeId: string | null;
    resumeName: string | null;
    aiModel: string | null;
    overallConfidence: number | null;
    lastGeneratedAt: string | null;
    lastUpdatedAt: string | null;
    completenessScore: number | null;
  };
  identity: {
    fullName: string | null;
    currentTitle: string | null;
    location: string | null;
    yearsOfExperience: number | null;
    email: string | null;
    phone: string | null;
    links: {
      linkedin: string | null;
      github: string | null;
      portfolio: string | null;
      website: string | null;
    };
    preferences: {
      preferredRole: string | null;
      preferredLocation: string | null;
      expectedSalary: string | null;
    };
    professionalSummary: string | null;
  };
  skills: Array<{ category: string; name: string; confidence: number | null; userVerified: boolean }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experiences: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projects: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  education: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  certifications: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  languages: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  achievements: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brain: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dna: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  health: any | null;
};

export const getCareerBrainSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const snapshot = await getCareerBrainSnapshotFor(context.supabase, context.userId);
    return snapshot as unknown as CareerBrainSnapshot;
  });

