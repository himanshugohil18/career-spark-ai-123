/**
 * CareerOS Automation Worker — reference implementation.
 *
 * Runs OUTSIDE Lovable on any Node host. Speaks the HTTP contract documented
 * in README.md. This is intentionally minimal so you can adapt selectors per
 * ATS (Greenhouse / Lever / Workday / etc).
 */

import http from "node:http";
import { chromium } from "playwright";

const PORT = Number(process.env.PORT ?? 8787);
const SECRET = process.env.AUTO_APPLY_WORKER_SECRET;
if (!SECRET) {
  console.error("AUTO_APPLY_WORKER_SECRET is required");
  process.exit(1);
}

/** @type {Map<string, { browser: import('playwright').Browser, page: import('playwright').Page, cfg: any }>} */
const sessions = new Map();

function auth(req) {
  const h = req.headers["authorization"] ?? "";
  return h === `Bearer ${SECRET}`;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function sendWebhook(cfg, patch) {
  try {
    await fetch(cfg.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.webhookSecret}`,
      },
      body: JSON.stringify({ sessionId: cfg.sessionId, ...patch }),
    });
  } catch (e) {
    console.warn("[worker] webhook failed:", e.message);
  }
}

async function runSession(cfg) {
  const browserSessionId = `bs-${cfg.sessionId.slice(0, 8)}-${Date.now()}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();
  sessions.set(browserSessionId, { browser, page, cfg });

  await sendWebhook(cfg, {
    status: "running",
    step: "launching_browser",
    events: [{ step: "launching_browser", kind: "info", message: `Chromium started (${browserSessionId}).` }],
  });

  try {
    const url = cfg.applicationUrl || cfg.jobUrl;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await sendWebhook(cfg, {
      step: "filling_application",
      events: [{ step: "filling_application", kind: "info", message: `Navigated to ${url}` }],
    });

    // Best-effort field filling based on formHints. Real ATS integrations
    // should extend this with provider-specific selectors.
    for (const hint of cfg.formHints ?? []) {
      const value = String(hint.value ?? "");
      if (!value) continue;
      const label = String(hint.label ?? "");
      const filled = await tryFill(page, label, value);
      await sendWebhook(cfg, {
        events: [{
          step: "filling_application",
          kind: filled ? "info" : "warning",
          message: filled ? `Filled ${label}` : `Could not locate field for ${label}`,
        }],
      });
    }

    // Screenshot before approval
    const shot = await page.screenshot({ type: "png" });
    // Prod: upload to object storage and send that URL instead of a data URL.
    const dataUrl = `data:image/png;base64,${shot.toString("base64")}`;
    await sendWebhook(cfg, {
      screenshots: [{ step: "filling_application", imageUrl: dataUrl, caption: "Ready for review" }],
    });

    await sendWebhook(cfg, {
      status: "awaiting_approval",
      step: "awaiting_approval",
      events: [{ step: "awaiting_approval", kind: "approval", message: "Waiting for human approval." }],
    });
  } catch (e) {
    await sendWebhook(cfg, {
      status: "failed",
      error: e.message,
      events: [{ step: "filling_application", kind: "error", message: e.message }],
    });
    await browser.close().catch(() => {});
    sessions.delete(browserSessionId);
  }

  return browserSessionId;
}

async function tryFill(page, label, value) {
  const candidates = [
    page.getByLabel(new RegExp(label, "i")),
    page.getByPlaceholder(new RegExp(label, "i")),
    page.locator(`input[name*="${label.toLowerCase()}" i]`),
  ];
  for (const loc of candidates) {
    try {
      const el = loc.first();
      if (await el.count()) {
        await el.fill(value, { timeout: 3000 });
        return true;
      }
    } catch {
      /* keep trying */
    }
  }
  return false;
}

async function submitSession(browserSessionId) {
  const s = sessions.get(browserSessionId);
  if (!s) throw new Error("unknown browserSessionId");
  const { page, cfg } = s;
  try {
    const btn = page.getByRole("button", { name: /submit|apply|send/i }).first();
    if (await btn.count()) await btn.click({ timeout: 8000 });
    await page.waitForTimeout(3000);
    const shot = await page.screenshot({ type: "png" });
    await sendWebhook(cfg, {
      status: "completed",
      step: "completed",
      screenshots: [{
        step: "completed",
        imageUrl: `data:image/png;base64,${shot.toString("base64")}`,
        caption: "After submit",
      }],
      events: [{ step: "completed", kind: "info", message: "Application submitted." }],
    });
  } catch (e) {
    await sendWebhook(cfg, {
      status: "failed",
      error: e.message,
      events: [{ step: "submitting", kind: "error", message: e.message }],
    });
  } finally {
    await s.browser.close().catch(() => {});
    sessions.delete(browserSessionId);
  }
}

async function cancelSession(browserSessionId) {
  const s = sessions.get(browserSessionId);
  if (!s) return;
  await s.browser.close().catch(() => {});
  sessions.delete(browserSessionId);
}

const server = http.createServer(async (req, res) => {
  if (!auth(req)) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: "unauthorized" }));
  }
  res.setHeader("content-type", "application/json");
  try {
    if (req.method === "POST" && req.url === "/sessions/start") {
      const cfg = await readJson(req);
      const browserSessionId = await runSession(cfg);
      return res.end(JSON.stringify({ browserSessionId }));
    }
    if (req.method === "POST" && req.url === "/sessions/submit") {
      const { browserSessionId } = await readJson(req);
      void submitSession(browserSessionId);
      return res.end(JSON.stringify({ ok: true }));
    }
    if (req.method === "POST" && req.url === "/sessions/cancel") {
      const { browserSessionId } = await readJson(req);
      await cancelSession(browserSessionId);
      return res.end(JSON.stringify({ ok: true }));
    }
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: "not_found" }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`[worker] listening on :${PORT}`));
