/**
 * Money display — CareerOS shows every salary in Indian Rupees.
 *
 * Job feeds aggregate postings from providers around the world, so pay is
 * stored in the source currency. The UI converts to INR at a fixed, clearly
 * documented reference rate and formats using Indian conventions
 * (thousands / lakh / crore, "LPA" for annual pay).
 *
 * Pure + isomorphic: safe on the server and in the browser.
 */

/** Reference conversion rates → INR. Approximate, refreshed periodically. */
export const FX_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 88,
  CAD: 64,
  EUR: 96,
  GBP: 112,
  AUD: 58,
  NZD: 53,
  SGD: 66,
  AED: 24,
  SAR: 23,
  CHF: 110,
  SEK: 8.4,
  NOK: 8.3,
  DKK: 12.9,
  PLN: 22,
  JPY: 0.58,
  CNY: 12.2,
  HKD: 11.3,
  ZAR: 4.9,
  BRL: 16,
  MXN: 4.7,
  ILS: 24,
  PHP: 1.55,
  MYR: 20,
  IDR: 0.0054,
  VND: 0.0035,
  THB: 2.5,
  TRY: 2.2,
  NGN: 0.06,
  KES: 0.68,
  EGP: 1.8,
  ARS: 0.06,
  CLP: 0.09,
  COP: 0.022,
  PEN: 23,
  UAH: 2.1,
  CZK: 3.9,
  HUF: 0.24,
  RON: 19,
  KRW: 0.064,
  TWD: 2.7,
};

/** Convert an amount in `currency` to INR. Unknown currencies fall back to USD. */
export function toInr(amount: number | null | undefined, currency: string | null | undefined): number | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const code = (currency ?? "USD").toUpperCase().trim();
  const rate = FX_TO_INR[code] ?? FX_TO_INR["USD"]!;
  return n * rate;
}

/** `1250000` → `"₹12.5L"`, `45000` → `"₹45,000"`, `21000000` → `"₹2.1Cr"`. */
export function formatInr(amount: number | null | undefined): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 10_000_000) {
    const cr = n / 10_000_000;
    return `₹${cr >= 10 ? Math.round(cr) : Number(cr.toFixed(1))}Cr`;
  }
  if (n >= 100_000) {
    const l = n / 100_000;
    return `₹${l >= 10 ? Math.round(l) : Number(l.toFixed(1))}L`;
  }
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export type SalaryLike = {
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
};

/**
 * Human salary range in rupees, e.g. `"₹12L – ₹18L"` or `"₹45,000"`.
 * Returns null when the posting publishes no pay data (we never invent one).
 */
export function formatSalaryInr(job: SalaryLike): string | null {
  const min = toInr(job.salary_min, job.salary_currency);
  const max = toInr(job.salary_max, job.salary_currency);
  if (min && max && Math.round(min) !== Math.round(max)) {
    return `${formatInr(min)} – ${formatInr(max)}`;
  }
  const only = max ?? min;
  return formatInr(only);
}

/** Annual pay phrased the Indian way: `"₹12L – ₹18L / yr"`. */
export function formatSalaryInrPerYear(job: SalaryLike): string | null {
  const range = formatSalaryInr(job);
  return range ? `${range} / yr` : null;
}
