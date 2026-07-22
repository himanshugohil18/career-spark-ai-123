/**
 * Auto-Apply Driver — server-only abstraction over the actual browser worker.
 *
 * CareerOS runs on Cloudflare Workers, so real Chromium/Playwright cannot
 * execute in this runtime. The driver interface lets us swap between:
 *   - NoopDriver: development stub; emits synthetic events so the UI works
 *     end-to-end without any external service.
 *   - HttpWorkerDriver: production; POSTs to the reference Node+Playwright
 *     service in /automation-worker. The worker streams progress back via
 *     the /api/public/hooks/auto-apply-events webhook.
 *
 * The driver never touches Supabase directly. Orchestrator owns persistence.
 */

export type DriverStartInput = {
  sessionId: string;
  webhookUrl: string;
  webhookSecret: string;
  jobUrl: string;
  applicationUrl: string | null;
  jobTitle: string;
  companyName: string;
  requireApproval: true;
  profile: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
    website: string | null;
  };
  resume: {
    fileName: string;
    downloadUrl: string | null;
    text: string;
  };
  coverLetter: { text: string } | null;
  answers: Array<{ question: string; answer: string }>;
  formHints: Array<{ label: string; value: string }>;
};

export interface AutoApplyDriver {
  readonly kind: "noop" | "http";
  start(input: DriverStartInput): Promise<{ browserSessionId: string }>;
  submit(browserSessionId: string): Promise<void>;
  cancel(browserSessionId: string): Promise<void>;
}

class NoopDriver implements AutoApplyDriver {
  readonly kind = "noop" as const;
  async start(_input: DriverStartInput) {
    // Synthetic id — the orchestrator will emit its own "worker not
    // configured" event so the UI stays honest.
    return { browserSessionId: `noop-${_input.sessionId.slice(0, 8)}` };
  }
  async submit() {
    /* nothing to do */
  }
  async cancel() {
    /* nothing to do */
  }
}

class HttpWorkerDriver implements AutoApplyDriver {
  readonly kind = "http" as const;
  constructor(private baseUrl: string, private authToken: string) {}

  private async call(path: string, body: unknown) {
    const url = this.baseUrl.replace(/\/+$/, "") + path;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Worker ${path} ${res.status}: ${txt.slice(0, 300)}`);
    }
    return (await res.json().catch(() => ({}))) as Record<string, unknown>;
  }

  async start(input: DriverStartInput) {
    const out = (await this.call("/sessions/start", input)) as {
      browserSessionId?: string;
    };
    if (!out.browserSessionId) throw new Error("Worker did not return a browserSessionId");
    return { browserSessionId: out.browserSessionId };
  }

  async submit(browserSessionId: string) {
    await this.call("/sessions/submit", { browserSessionId });
  }

  async cancel(browserSessionId: string) {
    await this.call("/sessions/cancel", { browserSessionId });
  }
}

export function getDriver(): AutoApplyDriver {
  const url = process.env.AUTO_APPLY_WORKER_URL;
  const secret = process.env.AUTO_APPLY_WORKER_SECRET;
  if (!url || !secret) return new NoopDriver();
  return new HttpWorkerDriver(url, secret);
}

/**
 * Canonical step order for the AI application timeline. Progress % is derived
 * from the index. Keep in sync with the worker's step names.
 */
export const AUTO_APPLY_STEPS = [
  "queued",
  "researching_company",
  "analyzing_job",
  "selecting_resume",
  "generating_cover_letter",
  "preparing_answers",
  "launching_browser",
  "filling_application",
  "awaiting_input",
  "awaiting_approval",
  "submitting",
  "completed",
] as const;

export type AutoApplyStep = (typeof AUTO_APPLY_STEPS)[number];

export function stepProgress(step: string): number {
  const idx = (AUTO_APPLY_STEPS as readonly string[]).indexOf(step);
  if (idx < 0) return 0;
  return Math.round((idx / (AUTO_APPLY_STEPS.length - 1)) * 100);
}

export const STEP_LABELS: Record<string, string> = {
  queued: "Queued",
  researching_company: "Researching company",
  analyzing_job: "Analyzing job",
  selecting_resume: "Selecting resume",
  generating_cover_letter: "Generating cover letter",
  preparing_answers: "Preparing answers",
  launching_browser: "Launching browser",
  filling_application: "Filling application",
  awaiting_input: "Waiting for you",
  awaiting_approval: "Waiting for approval",
  submitting: "Submitting",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};
