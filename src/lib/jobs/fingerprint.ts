/**
 * Deterministic dedup fingerprint. Two jobs with the same
 * (company, normalized title, location signature, description shingle)
 * collapse to a single canonical job across providers.
 */

import { createHash } from "crypto";

function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingle(text: string, size = 8): string {
  const words = normalize(text).split(" ").slice(0, 60);
  const shingles: string[] = [];
  for (let i = 0; i + size <= words.length; i += size) {
    shingles.push(words.slice(i, i + size).join(" "));
  }
  return shingles.slice(0, 6).join("|");
}

export function computeFingerprint(input: {
  company: string;
  title: string;
  location?: string | null;
  description?: string | null;
}): string {
  const key = [
    normalize(input.company),
    normalize(input.title),
    normalize(input.location ?? ""),
    shingle(input.description ?? ""),
  ].join("::");
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

export function slugify(text: string): string {
  return normalize(text).replace(/\s+/g, "-").slice(0, 80) || "unknown";
}
