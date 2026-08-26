/**
 * AI Interview Simulator — server-only engine.
 * Generates adaptive interview questions grounded in the user's Career Brain,
 * scores each answer, and produces a final debrief.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callLovableAI, extractJson } from "../ai-gateway.server";

type Ctx = { supabase: SupabaseClient<any>; userId: string };

export type SimTurn = {
  id: string;
  turn_index: number;
  question: string;
  answer: string | null;
  score: number | null;
  feedback: string | null;
  points_hit: string[] | null;
  points_missed: string[] | null;
};

async function candidateContext(c: Ctx): Promise<string> {
  const [{ data: profile }, { data: skills }, { data: exp }] = await Promise.all([
    c.supabase
      .from("profiles")
      .select("current_title, years_of_experience, preferred_role, professional_summary")
      .eq("user_id", c.userId)
      .maybeSingle(),
    c.supabase.from("skills").select("name, category, proficiency").eq("user_id", c.userId).limit(40),
    c.supabase
      .from("work_experiences")
      .select("role, company, achievements, technologies")
      .eq("user_id", c.userId)
      .order("sort_order", { ascending: true })
      .limit(5),
  ]);
  const parts: string[] = [];
  if (profile) {
    parts.push(
      `Candidate: ${profile.current_title ?? "aspiring professional"}, ${profile.years_of_experience ?? 0} yrs experience, targeting ${profile.preferred_role ?? "their next role"}.`,
    );
    if (profile.professional_summary) parts.push(`Summary: ${String(profile.professional_summary).slice(0, 400)}`);
  }
  if (skills?.length) parts.push(`Skills: ${skills.map((s: any) => s.name).join(", ")}`);
  if (exp?.length) {
    parts.push(
      `Experience: ${exp
        .map((e: any) => `${e.role} at ${e.company}${e.technologies?.length ? ` (${e.technologies.slice(0, 6).join(", ")})` : ""}`)
        .join("; ")}`,
    );
  }
  return parts.join("\n") || "No candidate profile data available.";
}

async function generateQuestion(c: Ctx, session: any, priorQuestions: string[]): Promise<string> {
  const context = await candidateContext(c);
  try {
    const raw = await callLovableAI({
      messages: [
        {
          role: "system",
          content:
            "You are a senior interviewer conducting a realistic mock interview. Ask ONE focused question. Return JSON: {\"question\": string}. Mix behavioral and technical based on difficulty. Never repeat prior questions.",
        },
        {
          role: "user",
          content: `${context}\nTarget role: ${session.target_role}\nDifficulty: ${session.difficulty}\nThis is question ${priorQuestions.length + 1} of ${session.planned_questions}.\nPrior questions: ${JSON.stringify(priorQuestions)}`,
        },
      ],
      responseFormat: "json_object",
      temperature: 0.7,
      maxTokens: 400,
    });
    const parsed = JSON.parse(extractJson(raw));
    if (parsed.question && typeof parsed.question === "string") return parsed.question.trim();
  } catch {
    /* deterministic fallback keeps the simulator usable if AI is briefly unavailable */
  }
  const fallbackQuestions = [
    `Tell me about your most relevant experience for the ${session.target_role} role.`,
    `Walk me through a project that proves you can succeed as a ${session.target_role}.`,
    `Describe a difficult technical or teamwork challenge you solved, and what result you achieved.`,
    `Which skills make you strongest for ${session.target_role}, and where are you still improving?`,
    `Why should this company choose you for a ${session.target_role} position?`,
  ];
  return fallbackQuestions[priorQuestions.length % fallbackQuestions.length];
}

export async function startSimSession(
  c: Ctx,
  input: { targetRole: string; difficulty: string; plannedQuestions: number },
) {
  const { data: session, error } = await c.supabase
    .from("interview_sim_sessions")
    .insert({
      user_id: c.userId,
      target_role: input.targetRole,
      difficulty: input.difficulty,
      planned_questions: input.plannedQuestions,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const question = await generateQuestion(c, session, []);
  const { data: turn, error: tErr } = await c.supabase
    .from("interview_sim_turns")
    .insert({ session_id: session.id, user_id: c.userId, turn_index: 0, question })
    .select("*")
    .single();
  if (tErr) throw new Error(tErr.message);
  return { session, currentTurn: turn as SimTurn };
}

export async function getSimSession(c: Ctx, sessionId: string) {
  const [{ data: session }, { data: turns }] = await Promise.all([
    c.supabase.from("interview_sim_sessions").select("*").eq("id", sessionId).eq("user_id", c.userId).maybeSingle(),
    c.supabase
      .from("interview_sim_turns")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", c.userId)
      .order("turn_index", { ascending: true }),
  ]);
  if (!session) throw new Error("Session not found");
  const currentTurn = (turns ?? []).find((t: any) => t.answer === null) ?? null;
  return { session, turns: (turns ?? []) as SimTurn[], currentTurn: currentTurn as SimTurn | null };
}

export async function listSimSessions(c: Ctx) {
  const { data } = await c.supabase
    .from("interview_sim_sessions")
    .select("id, target_role, difficulty, status, planned_questions, answered_questions, overall_score, created_at")
    .eq("user_id", c.userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function submitSimAnswer(c: Ctx, input: { sessionId: string; turnId: string; answer: string }) {
  const { session, turns } = await getSimSession(c, input.sessionId);
  if (session.status !== "active") throw new Error("This interview session is already completed.");
  const turn = turns.find((t) => t.id === input.turnId);
  if (!turn) throw new Error("Question not found in this session.");
  if (turn.answer !== null) throw new Error("This question has already been answered.");

  const context = await candidateContext(c);
  let score = 5;
  let feedback = "Answer recorded. Add stronger examples, clearer impact, and measurable results to improve this response.";
  let pointsHit: string[] = ["Answered the question directly"];
  let pointsMissed: string[] = ["Quantified business impact", "Concrete example using situation-action-result structure"];
  try {
    const raw = await callLovableAI({
      messages: [
        {
          role: "system",
          content:
            "You are a senior interviewer scoring a mock interview answer. Be honest but constructive. Return JSON: {\"score\": number 0-10, \"feedback\": string (2-3 sentences), \"points_hit\": string[], \"points_missed\": string[]}.",
        },
        {
          role: "user",
          content: `${context}\nTarget role: ${session.target_role}\nQuestion: ${turn.question}\nCandidate answer: ${input.answer}`,
        },
      ],
      responseFormat: "json_object",
      temperature: 0.3,
      maxTokens: 700,
    });
    const parsed = JSON.parse(extractJson(raw));
    if (typeof parsed.score === "number") score = Math.max(0, Math.min(10, parsed.score));
    if (typeof parsed.feedback === "string") feedback = parsed.feedback;
    if (Array.isArray(parsed.points_hit)) pointsHit = parsed.points_hit.map(String).slice(0, 5);
    if (Array.isArray(parsed.points_missed)) pointsMissed = parsed.points_missed.map(String).slice(0, 5);
  } catch {
    /* keep defaults */
  }

  const saved = await c.supabase
    .from("interview_sim_turns")
    .update({ answer: input.answer, score, feedback, points_hit: pointsHit, points_missed: pointsMissed })
    .eq("id", input.turnId)
    .eq("user_id", c.userId);
  if (saved.error) throw new Error(saved.error.message);

  const answered = turns.filter((t) => t.answer !== null).length + 1;
  const isLast = answered >= session.planned_questions;
  const updatedSession = await c.supabase
    .from("interview_sim_sessions")
    .update({ answered_questions: answered })
    .eq("id", session.id)
    .eq("user_id", c.userId);
  if (updatedSession.error) throw new Error(updatedSession.error.message);

  if (isLast) {
    const finished = await finishSimSession(c, session.id);
    return { finished: true as const, score, feedback, pointsHit, pointsMissed, result: finished };
  }

  const nextQuestion = await generateQuestion(c, session, [...turns.map((t) => t.question)]);
  const { data: nextTurn, error: nErr } = await c.supabase
    .from("interview_sim_turns")
    .insert({ session_id: session.id, user_id: c.userId, turn_index: turns.length, question: nextQuestion })
    .select("*")
    .single();
  if (nErr) throw new Error(nErr.message);
  return { finished: false as const, score, feedback, pointsHit, pointsMissed, nextTurn: nextTurn as SimTurn };
}

export async function finishSimSession(c: Ctx, sessionId: string) {
  const { session, turns } = await getSimSession(c, sessionId);
  const answered = turns.filter((t) => t.answer !== null);
  const avg = answered.length
    ? answered.reduce((s, t) => s + Number(t.score ?? 0), 0) / answered.length
    : 0;

  let summary = `You answered ${answered.length} question(s) with an average score of ${avg.toFixed(1)}/10.`;
  let strengths: string[] = [];
  let improvements: string[] = [];
  if (answered.length) {
    try {
      const raw = await callLovableAI({
        messages: [
          {
            role: "system",
            content:
              "You are a senior interviewer writing a final mock-interview debrief. Return JSON: {\"summary\": string (3-4 sentences), \"strengths\": string[3], \"improvements\": string[3]}. Be specific and actionable.",
          },
          {
            role: "user",
            content: `Target role: ${session.target_role}\nTranscript:\n${answered
              .map((t) => `Q: ${t.question}\nA: ${t.answer}\nScore: ${t.score}/10`)
              .join("\n\n")}`.slice(0, 6000),
          },
        ],
        responseFormat: "json_object",
        temperature: 0.4,
        maxTokens: 900,
      });
      const parsed = JSON.parse(extractJson(raw));
      if (typeof parsed.summary === "string") summary = parsed.summary;
      if (Array.isArray(parsed.strengths)) strengths = parsed.strengths.map(String).slice(0, 4);
      if (Array.isArray(parsed.improvements)) improvements = parsed.improvements.map(String).slice(0, 4);
    } catch {
      strengths = ["Completed the full mock interview", "Built practice momentum", "Created a transcript for review"];
      improvements = ["Use more measurable outcomes", "Structure answers with Situation, Action, Result", "Connect examples more tightly to the target role"];
    }
  }

  const { data: updated, error } = await c.supabase
    .from("interview_sim_sessions")
    .update({
      status: "completed",
      overall_score: Math.round(avg * 10) / 10,
      feedback_summary: summary,
      strengths,
      improvements,
    })
    .eq("id", sessionId)
    .eq("user_id", c.userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return updated;
}
