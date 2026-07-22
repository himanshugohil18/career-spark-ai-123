/**
 * Career profile completeness — reusable pure function used by dashboard
 * and profile page. No I/O. No AI. Deterministic.
 */

export type CompletenessInput = {
  profile: {
    github_url?: string | null;
    linkedin_url?: string | null;
    portfolio_url?: string | null;
    preferred_role?: string | null;
    preferred_location?: string | null;
    expected_salary?: string | null;
    professional_summary?: string | null;
  } | null | undefined;
  certificationsCount: number;
  projectsCount: number;
};

export type CompletenessItem = {
  key: string;
  label: string;
  present: boolean;
  hint: string;
};

export type CompletenessResult = {
  score: number; // 0-100
  present: number;
  total: number;
  items: CompletenessItem[];
  missing: CompletenessItem[];
};

export function computeCompleteness(input: CompletenessInput): CompletenessResult {
  const p = input.profile;
  const items: CompletenessItem[] = [
    { key: "github", label: "GitHub", present: !!p?.github_url, hint: "Show your code — recruiters check GitHub first." },
    { key: "linkedin", label: "LinkedIn", present: !!p?.linkedin_url, hint: "Link your network." },
    { key: "portfolio", label: "Portfolio", present: !!p?.portfolio_url, hint: "A portfolio doubles interview rates." },
    { key: "certifications", label: "Certifications", present: input.certificationsCount > 0, hint: "Certifications boost Career Health." },
    { key: "projects", label: "Projects", present: input.projectsCount > 0, hint: "Projects make your Career DNA stronger." },
    { key: "preferred_role", label: "Preferred Role", present: !!p?.preferred_role, hint: "Tells the Job Agent what to hunt." },
    { key: "expected_salary", label: "Salary Expectations", present: !!p?.expected_salary, hint: "Filters noise from the wrong offers." },
    { key: "preferred_location", label: "Preferred Location", present: !!p?.preferred_location, hint: "Remote, hybrid, or a city." },
    { key: "summary", label: "Professional Summary", present: !!p?.professional_summary, hint: "A crisp summary anchors every match." },
  ];
  const present = items.filter((i) => i.present).length;
  const total = items.length;
  return {
    score: Math.round((present / total) * 100),
    present,
    total,
    items,
    missing: items.filter((i) => !i.present),
  };
}
