# CareerOS Automation Worker

Reference Node + Playwright service that CareerOS calls to actually drive a
browser. Deploy this **outside** Lovable (Fly.io, Render, Railway, a VPS —
anywhere that runs Node with headless Chromium) and point CareerOS at it.

CareerOS -> POST /sessions/start           -> spawn Chromium, start filling
Worker   -> POST <careeros>/api/public/hooks/auto-apply-events   (progress)
CareerOS -> POST /sessions/submit          -> final click, only after human approval
CareerOS -> POST /sessions/cancel          -> tear down

## Setup

```bash
cd automation-worker
npm install
npx playwright install --with-deps chromium
export AUTO_APPLY_WORKER_SECRET=<same secret Lovable generated>
export PORT=8787
node index.js
```

Copy the `AUTO_APPLY_WORKER_SECRET` value from Lovable (Cloud → Secrets). It
is used two ways:
- CareerOS sends `Authorization: Bearer <secret>` on every call to this worker.
- This worker sends the same header when POSTing events back to the CareerOS webhook.

Then in Lovable Cloud → Secrets, add:

- `AUTO_APPLY_WORKER_URL` = the public URL of this deployed worker
  (e.g. `https://careeros-worker.fly.dev`).

Once that env var is set on the CareerOS side, `getDriver()` switches from
the built-in Noop preview mode to the real HTTP driver — no code change.

## HTTP contract

All requests require `Authorization: Bearer $AUTO_APPLY_WORKER_SECRET`.

### `POST /sessions/start` — request body

```json
{
  "sessionId": "<uuid>",
  "webhookUrl": "https://<project>.lovable.app/api/public/hooks/auto-apply-events",
  "webhookSecret": "<same as AUTO_APPLY_WORKER_SECRET>",
  "jobUrl": "https://boards.greenhouse.io/foo/jobs/123",
  "applicationUrl": "https://...",
  "jobTitle": "Senior DevOps Engineer",
  "companyName": "Acme",
  "requireApproval": true,
  "profile": { "fullName": "...", "email": "...", "phone": "...", "location": "...",
               "linkedin": "...", "github": "...", "portfolio": "...", "website": "..." },
  "resume":  { "fileName": "resume.pdf", "downloadUrl": "https://...", "text": "..." },
  "coverLetter": { "text": "..." } | null,
  "answers": [{ "question": "...", "answer": "..." }],
  "formHints": [{ "label": "Email", "value": "me@x.com" }]
}
```

Respond with `{ "browserSessionId": "<string>" }`.

### Webhook back into CareerOS

`POST <webhookUrl>` with `Authorization: Bearer <webhookSecret>`. Any subset:

```json
{
  "sessionId": "<uuid>",
  "step": "filling_application",
  "status": "awaiting_approval",
  "events": [{ "step": "filling_application", "kind": "info", "message": "Filled email." }],
  "screenshots": [{ "step": "filling_application", "imageUrl": "https://.../shot.png" }],
  "answers": [{ "question": "...", "answer": "..." }],
  "fields": [{ "label": "Salary expectation", "needsUser": true }],
  "error": null
}
```

Statuses CareerOS understands:
`queued`, `running`, `awaiting_input`, `awaiting_approval`, `submitting`,
`completed`, `failed`, `cancelled`.

Steps: `queued`, `researching_company`, `analyzing_job`, `selecting_resume`,
`generating_cover_letter`, `preparing_answers`, `launching_browser`,
`filling_application`, `awaiting_input`, `awaiting_approval`, `submitting`,
`completed`.

### `POST /sessions/submit` — body `{ "browserSessionId": "..." }`
Click the final submit button and stream a `status: "completed"` webhook.

### `POST /sessions/cancel` — body `{ "browserSessionId": "..." }`
Close the browser context.

## Security rules (do not violate)

- Never store user passwords. If a login page appears, POST a webhook with
  `status: "awaiting_input"` and stop.
- Never bypass CAPTCHA or MFA — same rule: pause and hand off to the user.
- Never submit an application before receiving `/sessions/submit`.
- Upload screenshots to your own object storage (S3, R2, Supabase Storage
  with a signed URL) and send the public URL. CareerOS only stores the URL.
