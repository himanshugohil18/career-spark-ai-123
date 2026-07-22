/**
 * Contextual greeting utility. Returns a time-of-day salutation and a
 * secondary line based on the real state of the user's Career Brain.
 */

export type GreetingContext = {
  displayName: string;
  hasResume?: boolean;
  hasParsedPendingReview?: boolean;
  profileCompletion?: number; // 0..100
  applicationCount?: number;
  matchCount?: number;
  highMatchCount?: number;
  careerHealth?: number; // 0..100
};

export function getTimeOfDay(date: Date = new Date()): "morning" | "afternoon" | "evening" | "night" {
  const h = date.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

export function getGreeting(ctx: GreetingContext, date: Date = new Date()) {
  const tod = getTimeOfDay(date);
  const salutations = {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Working late",
  } as const;

  const primary = `${salutations[tod]}, ${ctx.displayName}.`;

  let secondary = "Welcome back.";
  if (!ctx.hasResume) {
    if (ctx.hasParsedPendingReview) {
      secondary = "Your resume is parsed. Review and approve to activate your Career Brain.";
    } else {
      secondary = "Upload your resume to activate your Career Brain and every AI agent.";
    }
  } else if ((ctx.highMatchCount ?? 0) > 0) {
    secondary = `Your Career Brain surfaced ${ctx.highMatchCount} strong match${ctx.highMatchCount === 1 ? "" : "es"} — worth a look.`;
  } else if ((ctx.matchCount ?? 0) > 0) {
    secondary = `Your Career Brain is live. Ranking ${ctx.matchCount} role${ctx.matchCount === 1 ? "" : "s"} against your profile.`;
  } else if ((ctx.applicationCount ?? 0) > 0) {
    secondary = `You have ${ctx.applicationCount} application${ctx.applicationCount === 1 ? "" : "s"} in flight.`;
  } else {
    secondary = "Your Career Brain is active. New opportunities are being ranked continuously.";
  }

  return { primary, secondary, timeOfDay: tod };
}
