export type PlanId = "free" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** amount in paise (INR smallest unit) */
  priceInPaise: number;
  priceLabel: string;
  cadence: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Get started with your Career Brain",
    priceInPaise: 0,
    priceLabel: "₹0",
    cadence: "forever",
    features: [
      "Career Brain (resume parsing + normalization)",
      "Limited AI usage (5 generations / week)",
      "Basic job recommendations",
      "Single application workspace",
    ],
    cta: "Current plan",
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Unlock the full AI recruiter",
    priceInPaise: 79900,
    priceLabel: "₹799",
    cadence: "per month",
    highlight: true,
    features: [
      "Unlimited AI Resume Optimization",
      "AI Cover Letter Generator",
      "AI Interview Preparation",
      "AI Screening Answers",
      "Auto Apply automations",
      "Career Analytics",
      "Premium Job Discovery (all providers)",
    ],
    cta: "Upgrade to Pro",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For power users & teams",
    priceInPaise: 249900,
    priceLabel: "₹2,499",
    cadence: "per month",
    features: [
      "Everything in Pro",
      "Multi-Agent Automation",
      "Team Dashboard",
      "Admin & audit features",
      "Priority AI processing",
      "Dedicated support",
    ],
    cta: "Upgrade to Enterprise",
  },
};

export const PREMIUM_PLANS: PlanId[] = ["pro", "enterprise"];

export function isPremiumPlan(plan: string | null | undefined): boolean {
  return plan === "pro" || plan === "enterprise";
}
