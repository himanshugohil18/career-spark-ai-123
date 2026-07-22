/**
 * Tiny, dependency-free User-Agent parser. Extracts browser + OS + device
 * hints for security emails. Regex-based and pragmatic — good enough to
 * show a human "Chrome on macOS", not authoritative fingerprinting.
 */
export interface ParsedUA {
  browser: string;
  os: string;
  device: string;
  raw: string;
}

export function parseUserAgent(ua?: string | null): ParsedUA {
  const raw = (ua ?? "").slice(0, 500);
  const s = raw;

  // Browser
  let browser = "Unknown browser";
  if (/Edg\//.test(s)) browser = "Microsoft Edge";
  else if (/OPR\/|Opera\//.test(s)) browser = "Opera";
  else if (/Chrome\/[\d.]+ Mobile/.test(s)) browser = "Chrome Mobile";
  else if (/Chrome\//.test(s) && !/Chromium/.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/CriOS\//.test(s)) browser = "Chrome iOS";
  else if (/FxiOS\//.test(s)) browser = "Firefox iOS";
  else if (/Safari\//.test(s) && /Version\//.test(s)) browser = "Safari";

  // OS
  let os = "Unknown OS";
  if (/Windows NT 10/.test(s)) os = "Windows 10/11";
  else if (/Windows NT/.test(s)) os = "Windows";
  else if (/Mac OS X ([\d_]+)/.test(s)) {
    const m = s.match(/Mac OS X ([\d_]+)/);
    os = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/Android ([\d.]+)/.test(s)) {
    const m = s.match(/Android ([\d.]+)/);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/(iPhone|iPad|iPod).*OS ([\d_]+)/.test(s)) {
    const m = s.match(/OS ([\d_]+) like Mac/);
    os = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS";
  } else if (/Linux/.test(s)) os = "Linux";
  else if (/CrOS/.test(s)) os = "ChromeOS";

  // Device
  let device = "Desktop";
  if (/iPhone/.test(s)) device = "iPhone";
  else if (/iPad/.test(s)) device = "iPad";
  else if (/Android/.test(s) && /Mobile/.test(s)) device = "Android phone";
  else if (/Android/.test(s)) device = "Android tablet";
  else if (/Mobile/.test(s)) device = "Mobile";

  return { browser, os, device, raw };
}
