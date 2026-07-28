/**
 * Static, local coaching prompts used to give the practicer something to
 * reflect on after they answer a question in Focus Mode. Nothing here is
 * graded by a model — it's a calm self-review checklist, generated purely
 * client-side from the question's category.
 */

export const CATEGORY_TIPS: Record<string, string[]> = {
  behavioral: [
    "Did you frame it with a clear Situation → Task → Action → Result?",
    "Was there a concrete, measurable outcome?",
    "Did you keep it under ~2 minutes?",
  ],
  technical: [
    "Did you state assumptions before diving into a solution?",
    "Did you talk through trade-offs, not just the answer?",
    "Would a non-expert follow your explanation?",
  ],
  company: [
    "Did you reference something specific about the company or team?",
    "Did it sound genuine rather than rehearsed?",
    "Did you connect it back to your own motivation?",
  ],
  resume: [
    "Did you add context the resume line alone doesn't show?",
    "Did you quantify the impact?",
    "Did you keep the story tight and relevant to the role?",
  ],
  system_design: [
    "Did you clarify requirements and scale before designing?",
    "Did you call out bottlenecks and how you'd address them?",
    "Did you leave room to discuss alternatives?",
  ],
  coding: [
    "Did you narrate your thought process, not just the syntax?",
    "Did you mention time/space complexity?",
    "Did you consider an edge case out loud?",
  ],
  general: [
    "Was your answer structured and easy to follow?",
    "Did you avoid filler words and rambling?",
    "Did you sound calm and confident?",
  ],
};

export function tipsForCategory(category?: string | null): string[] {
  if (category && CATEGORY_TIPS[category]) return CATEGORY_TIPS[category];
  return CATEGORY_TIPS.general;
}

export const SCORE_BANDS = [
  { max: 2, label: "Needs work", className: "bg-destructive" },
  { max: 3, label: "Getting there", className: "bg-warning" },
  { max: 4, label: "Solid", className: "bg-chart-2" },
  { max: 5, label: "Strong", className: "bg-success" },
];

export function bandForScore(score: number) {
  return SCORE_BANDS.find((b) => score <= b.max) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}
