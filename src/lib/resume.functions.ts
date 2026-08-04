import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ApproveInput,
  ProcessResumeInput,
  approveResumeFor,
  deleteResumeFor,
  getNextResumeVersionFor,
  getParsedResumeFor,
  processResumeFor,
  regenerateCareerBrainFor,
  retryParseFor,
  setActiveResumeFor,
} from "./resume-logic.server";

export const processResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ProcessResumeInput.parse(data))
  .handler(async ({ data, context }) => processResumeFor(data, context));

export const retryParse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ resumeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => retryParseFor(data, context));

export const getParsedResume = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ resumeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => getParsedResumeFor(data, context));

export const approveResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ApproveInput.parse(data))
  .handler(async ({ data, context }) => approveResumeFor(data, context));

export const setActiveResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ resumeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => setActiveResumeFor(data, context));

export const regenerateCareerBrain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => regenerateCareerBrainFor(context));

export const deleteResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ resumeId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => deleteResumeFor(data, context));

export const getNextResumeVersion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getNextResumeVersionFor(context));