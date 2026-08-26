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
  difficulty: string | null;
  focus_area: string | null;
  hint: string | null;
  model_answer: string | null;
};

const TURN_SELECT =
  "id, turn_index, question, answer, score, feedback, points_hit, points_missed, difficulty, focus_area, hint, model_answer";

export type InterviewType = "technical" | "behavioral" | "hr" | "system_design" | "mixed";

const TYPE_BRIEF: Record<InterviewType, string> = {
  technical:
    "a technical screening: coding fundamentals, language/framework depth, debugging, and applied problem solving",
  behavioral:
    "a behavioral interview: ownership, conflict, failure, collaboration and impact stories, judged with the STAR structure",
  hr: "an HR / culture round: motivation, career goals, salary expectations, notice period, relocation and company fit",
  system_design:
    "a system design round: requirements gathering, data modelling, scaling, trade-offs and failure handling",
  mixed:
    "a full loop that alternates between behavioral, project deep-dive and technical questions",
};

const LADDER = ["easy", "medium", "hard"] as const;
type Rung = (typeof LADDER)[number];

/**
 * Adaptive difficulty: the interviewer gets harder when the candidate is
 * scoring well and easier when they are struggling, exactly like a real
 * interviewer calibrating mid-loop. `mixed` sessions start in the middle.
 */
export function nextDifficulty(session: any, scores: number[]): Rung {
  const requested = String(session.difficulty ?? "mixed");
  if (requested === "easy" || requested === "hard") return requested;
  const current = (LADDER as readonly string[]).includes(session.current_difficulty)
    ? (session.current_difficulty as Rung)
    : "medium";
  if (!scores.length) return current;
  const recent = scores.slice(-2);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const i = LADDER.indexOf(current);
  if (avg >= 7.5) return LADDER[Math.min(LADDER.length - 1, i + 1)];
  if (avg <= 4) return LADDER[Math.max(0, i - 1)];
  return current;
}

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

type GeneratedQuestion = {
  question: string;
  focusArea: string | null;
  hint: string | null;
  modelAnswer: string | null;
  difficulty: string;
};

/**
 * Generates the next question AND the teaching material for it (a nudge hint
 * and a model answer) in one call, so "teacher mode" can reveal coaching
 * without an extra round trip.
 */
async function generateQuestion(
  c: Ctx,
  session: any,
  priorQuestions: string[],
  difficulty: string,
  transcript: string,
): Promise<GeneratedQuestion> {
  const context = await candidateContext(c);
  const type = (session.interview_type ?? "mixed") as InterviewType;
  const brief = TYPE_BRIEF[type] ?? TYPE_BRIEF.mixed;
  try {
    const raw = await callLovableAI({
      messages: [
        {
          role: "system",
          content:
            "You are a senior interviewer AND an interview coach running a realistic mock interview. Ask ONE focused question, then privately prepare coaching material for it. " +
            'Return JSON: {"question": string, "focus_area": string (2-4 words), "hint": string (one sentence nudge, no answer given away), "model_answer": string (a strong 100-140 word example answer written in first person)}. ' +
            "Ground every question in the candidate's real background. Never repeat a prior question. Escalate depth to match the stated difficulty.",
        },
        {
          role: "user",
          content: `${context}
Target role: ${session.target_role}${session.target_company ? `\nTarget company: ${session.target_company}` : ""}
Round type: ${brief}
Difficulty for THIS question: ${difficulty}
Question ${priorQuestions.length + 1} of ${session.planned_questions}.
Prior questions: ${JSON.stringify(priorQuestions)}
${transcript ? `Recent answers so far (calibrate depth against these):\n${transcript.slice(0, 2500)}` : ""}`,
        },
      ],
      responseFormat: "json_object",
      temperature: 0.7,
      maxTokens: 900,
    });
    const parsed = JSON.parse(extractJson(raw));
    if (parsed.question && typeof parsed.question === "string") {
      return {
        question: String(parsed.question).trim(),
        focusArea: parsed.focus_area ? String(parsed.focus_area).slice(0, 60) : null,
        hint: parsed.hint ? String(parsed.hint).slice(0, 400) : null,
        modelAnswer: parsed.model_answer ? String(parsed.model_answer).slice(0, 2000) : null,
        difficulty,
      };
    }
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
  return {
    question: fallbackQuestions[priorQuestions.length % fallbackQuestions.length],
    focusArea: null,
    hint: "Answer with one concrete example: the situation, what you personally did, and the measurable result.",
    modelAnswer: null,
    difficulty,
  };
}

export async function startSimSession(
  c: Ctx,
  input: {
    targetRole: string;
    difficulty: string;
    plannedQuestions: number;
    interviewType?: string;
    targetCompany?: string | null;
    mode?: string;
  },
) {
  const startDifficulty = input.difficulty === "mixed" ? "medium" : input.difficulty;
  const { data: session, error } = await c.supabase
    .from("interview_sim_sessions")
    .insert({
      user_id: c.userId,
      target_role: input.targetRole,
      difficulty: input.difficulty,
      planned_questions: input.plannedQuestions,
      interview_type: input.interviewType ?? "mixed",
      target_company: input.targetCompany ?? null,
      mode: input.mode ?? "practice",
      current_difficulty: startDifficulty,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const q = await generateQuestion(c, session, [], startDifficulty, "");
  const { data: turn, error: tErr } = await c.supabase
    .from("interview_sim_turns")
    .insert({
      session_id: session.id,
      user_id: c.userId,
      turn_index: 0,
      question: q.question,
      difficulty: q.difficulty,
      focus_area: q.focusArea,
      hint: q.hint,
      model_answer: q.modelAnswer,
    })
    .select(TURN_SELECT)
    .single();
  if (tErr) throw new Error(tErr.message);
  return { session, currentTurn: turn as SimTurn };
}

export async function getSimSession(c: Ctx, sessionId: string) {
  const [{ data: session }, { data: turns }] = await Promise.all([
    c.supabase.from("interview_sim_sessions").select("*").eq("id", sessionId).eq("user_id", c.userId).maybeSingle(),
    c.supabase
      .from("interview_sim_turns")
      .select(TURN_SELECT)
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
    .select(
      "id, target_role, difficulty, interview_type, target_company, mode, current_difficulty, status, planned_questions, answered_questions, overall_score, created_at",
    )
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
            "You are a senior interviewer AND an interview coach scoring a mock interview answer. Be honest but constructive, and teach: name what was strong, what was missing, and how to restructure the answer. " +
            'Return JSON: {"score": number 0-10, "feedback": string (3-4 sentences of coaching, ending with one concrete rewrite instruction), "points_hit": string[], "points_missed": string[]}.',
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
    return {
      finished: true as const,
      score,
      feedback,
      pointsHit,
      pointsMissed,
      modelAnswer: turn.model_answer,
      difficulty: session.current_difficulty,
      result: finished,
    };
  }

  // Adaptive difficulty: recalibrate off the running scores before asking next.
  const scores = [...turns.filter((t) => t.score != null).map((t) => Number(t.score)), score];
  const difficulty = nextDifficulty(session, scores);
  if (difficulty !== session.current_difficulty) {
    await c.supabase
      .from("interview_sim_sessions")
      .update({ current_difficulty: difficulty })
      .eq("id", session.id)
      .eq("user_id", c.userId);
  }

  const transcript = [...turns.filter((t) => t.answer), { question: turn.question, answer: input.answer, score }]
    .map((t: any) => `Q: ${t.question}\nA: ${String(t.answer).slice(0, 500)}\nScore: ${t.score}/10`)
    .join("\n\n");

  const next = await generateQuestion(
    c,
    { ...session, current_difficulty: difficulty },
    [...turns.map((t) => t.question)],
    difficulty,
    transcript,
  );
  const { data: nextTurn, error: nErr } = await c.supabase
    .from("interview_sim_turns")
    .insert({
      session_id: session.id,
      user_id: c.userId,
      turn_index: turns.length,
      question: next.question,
      difficulty: next.difficulty,
      focus_area: next.focusArea,
      hint: next.hint,
      model_answer: next.modelAnswer,
    })
    .select(TURN_SELECT)
    .single();
  if (nErr) throw new Error(nErr.message);
  return {
    finished: false as const,
    score,
    feedback,
    pointsHit,
    pointsMissed,
    modelAnswer: turn.model_answer,
    difficulty,
    nextTurn: nextTurn as SimTurn,
  };
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
