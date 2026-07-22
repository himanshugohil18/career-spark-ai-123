/**
 * Deterministic post-processing for AI resume extraction.
 *
 * The AI is instructed to copy URLs verbatim, but real resumes often have
 * URLs split by line-breaks, prefixed with icons, or written without a
 * protocol. This pass:
 *   1. Cleans string fields (trim, strip surrounding punctuation) — never
 *      inventing new content.
 *   2. Re-scans the raw resume text for canonical patterns and lifts any
 *      URL / email / phone that the model missed, VERBATIM.
 *
 * We only ADD when the model returned null. We never overwrite a value the
 * model already extracted.
 */

import type { ParsedResume } from "./resume-schema";

const LINKEDIN_RE = /\b(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9\-_%.]+\/?/gi;
const GITHUB_RE = /\b(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9\-_.]+(?:\/[A-Za-z0-9\-_.]+)?\/?/gi;
const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Reasonably permissive phone matcher — matches E.164 or spaced/dashed formats
// with 7-15 digits. Kept intentionally simple so we don't over-match dates.
const PHONE_RE = /\+?\d[\d\s().\-]{7,18}\d/g;

function cleanUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  // Strip common leading garbage (bullets, "•", "▪", "→", "linkedin:", etc.)
  s = s.replace(/^[\s\-•▪→·|]*/i, "");
  s = s.replace(/^(linkedin|github|portfolio|website|url|link)\s*[:\-]\s*/i, "");
  // Strip trailing punctuation
  s = s.replace(/[),.;:'"\s]+$/g, "");
  // Collapse whitespace introduced by PDF line wraps
  s = s.replace(/\s+/g, "");
  return s.length ? s : null;
}

function firstMatch(text: string, re: RegExp): string | null {
  re.lastIndex = 0;
  const m = re.exec(text);
  return m ? m[0] : null;
}

function firstEmail(text: string): string | null {
  EMAIL_RE.lastIndex = 0;
  const m = EMAIL_RE.exec(text);
  return m ? m[0] : null;
}

function firstPhone(text: string): string | null {
  PHONE_RE.lastIndex = 0;
  const m = PHONE_RE.exec(text);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  return digits.length >= 7 ? m[0].trim() : null;
}

/** Return the first URL from `text` whose host looks like a portfolio (not
 *  linkedin/github/twitter/facebook/instagram). */
function firstPortfolioUrl(text: string): string | null {
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const socialHosts = /(linkedin|github|twitter|x\.com|facebook|instagram|medium|stackoverflow|leetcode)/i;
  while ((m = URL_RE.exec(text)) !== null) {
    if (!socialHosts.test(m[0])) return m[0].replace(/[),.;:'"\s]+$/g, "");
  }
  return null;
}

/**
 * Non-destructive repair: fills nulls from the raw resume text, cleans the
 * model's URL/email/phone outputs. Never overwrites present values.
 */
export function repairParsedResume(
  parsed: ParsedResume,
  rawText: string | undefined,
): ParsedResume {
  const p = parsed.personal;
  const text = (rawText ?? "").replace(/\r/g, "\n");
  // PDF text extraction often inserts spaces between adjacent glyph runs, so a
  // URL like `linkedin.com/in/john-doe` can arrive as `linkedin . com / in /
  // john - doe`. Iteratively glue tokens around URL-safe punctuation so the
  // regex below can catch it. Do NOT touch the caller's text — this is a
  // local scan copy only.
  let scan = text;
  for (let i = 0; i < 4; i++) {
    scan = scan.replace(/([A-Za-z0-9])\s+([.\/\-_])\s*([A-Za-z0-9])/g, "$1$2$3");
    scan = scan.replace(/([A-Za-z0-9])\s*([.\/\-_])\s+([A-Za-z0-9])/g, "$1$2$3");
  }

  // 1) Clean model-provided URLs (trim junk, strip PDF line-break whitespace)
  const cleaned = {
    linkedin: cleanUrl(p.linkedin),
    github: cleanUrl(p.github),
    portfolio: cleanUrl(p.portfolio),
    website: cleanUrl(p.website),
    email: p.email?.trim() || null,
    phone: p.phone?.trim() || null,
  };

  // 2) Validate URL shape. If model returned something that clearly isn't a
  //    URL for that field, drop it so the raw-text scan can supply the real
  //    one.
  if (cleaned.linkedin && !/linkedin\.com/i.test(cleaned.linkedin)) cleaned.linkedin = null;
  if (cleaned.github && !/github\.com/i.test(cleaned.github)) cleaned.github = null;

  // 3) Repair from raw text when the model missed a field. Scan the glued
  //    variant so line-wrapped URLs get caught.
  if (!cleaned.linkedin && scan) cleaned.linkedin = firstMatch(scan, LINKEDIN_RE);
  if (!cleaned.github && scan) cleaned.github = firstMatch(scan, GITHUB_RE);
  if (!cleaned.portfolio && !cleaned.website && scan) {
    cleaned.portfolio = firstPortfolioUrl(scan);
  }
  if (!cleaned.email && scan) cleaned.email = firstEmail(scan);
  if (!cleaned.phone && text) cleaned.phone = firstPhone(text);

  // 4) Cross-field cleanup: portfolio should not equal linkedin/github
  if (cleaned.portfolio && cleaned.linkedin && cleaned.portfolio.replace(/^https?:\/\//i, "") === cleaned.linkedin.replace(/^https?:\/\//i, "")) {
    cleaned.portfolio = null;
  }
  if (cleaned.portfolio && cleaned.github && cleaned.portfolio.replace(/^https?:\/\//i, "") === cleaned.github.replace(/^https?:\/\//i, "")) {
    cleaned.portfolio = null;
  }

  // 5) Normalize project URLs the same way (no repair, only clean)
  const projects = parsed.projects.map((pr) => ({
    ...pr,
    githubUrl: pr.githubUrl && /github\.com/i.test(pr.githubUrl) ? cleanUrl(pr.githubUrl) : cleanUrl(pr.githubUrl),
    liveUrl: cleanUrl(pr.liveUrl),
  }));

  const certifications = parsed.certifications.map((c) => ({
    ...c,
    credentialUrl: cleanUrl(c.credentialUrl),
  }));

  return {
    ...parsed,
    personal: {
      ...p,
      linkedin: cleaned.linkedin,
      github: cleaned.github,
      portfolio: cleaned.portfolio,
      website: cleaned.website,
      email: cleaned.email,
      phone: cleaned.phone,
    },
    projects,
    certifications,
  };
}
