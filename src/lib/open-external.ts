/**
 * Open an external URL from within the app.
 *
 * The Lovable preview / published app runs inside an iframe with a strict
 * Cross-Origin-Opener-Policy. Opening third-party pages (LinkedIn, some ATS
 * hosts) directly triggers `ERR_BLOCKED_BY_RESPONSE` in Chrome because of a
 * COOP mismatch on the popup. To work around it we bounce through a
 * same-origin `/go?u=...` route.
 */

import { toast } from "sonner";

/**
 * Validate that a value is a well-formed http(s) URL we can safely open.
 * Rejects null/empty strings, non-http protocols, and obviously malformed
 * inputs so callers can disable UI when a job has no usable link.
 */
export function isValidExternalUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Attempts to open `url` in a new tab (or top-level navigation when embedded
 * in the Lovable preview iframe). Returns `true` on success, `false` when
 * the URL is unusable or navigation failed — callers can surface a message
 * to the user in that case.
 */
export function openExternal(url: string | null | undefined): boolean {
  if (!isValidExternalUrl(url)) {
    toast.error("Application link unavailable");
    return false;
  }
  const safe = new URL(url.trim()).toString();
  const bounce = new URL(`/go?u=${encodeURIComponent(safe)}`, window.location.origin).toString();
  const isEmbedded = (() => {
    try {
      return window.top !== window.self;
    } catch {
      return true;
    }
  })();

  try {
    if (isEmbedded) {
      try {
        if (window.top) {
          window.top.location.assign(bounce);
          return true;
        }
      } catch {
        // Cross-origin top frame — fall through to popup/bounce.
      }
    }

    const w = window.open(safe, "_blank", "noopener,noreferrer");
    if (w && !w.closed) return true;

    // Popup blocked — fall back to a same-tab bounce.
    window.location.assign(bounce);
    return true;
  } catch (err) {
    console.error("openExternal failed", err);
    toast.error("Could not open the application link. Please try again.");
    return false;
  }
}
