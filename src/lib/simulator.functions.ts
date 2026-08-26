import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  startSimSession,
  getSimSession,
  listSimSessions,
  submitSimAnswer,
  finishSimSession,
} from "./intelligence/simulator.server";

export const startInterviewSim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        targetRole: z.string().min(2).max(120),
        difficulty: z.enum(["easy", "mixed", "hard"]).default("mixed"),
        plannedQuestions: z.number().int().min(3).max(10).default(5),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => startSimSession(context, data));

export const getInterviewSimSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => getSimSession(context, data.sessionId));

export const listInterviewSimSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listSimSessions(context));

export const submitInterviewSimAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        turnId: z.string().uuid(),
        answer: z.string().min(1).max(8000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => submitSimAnswer(context, data));

export const finishInterviewSim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => finishSimSession(context, data.sessionId));
