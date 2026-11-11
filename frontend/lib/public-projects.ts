/** Public requests never require a login token. */
import { getActiveLocale, translate } from "@/lib/i18n";

export type PublicProject = {
  id: number; reference_number: string; title: string; description: string;
  problem_statement: string; solution: string; conclusion: string;
  objectives: string; expected_results: string; domain: string; domain_label: string;
  project_type: string; sector: string; target_population: string; location: string;
  start_date: string | null; end_date: string | null; total_budget: string | null;
  requested_amount: string | null; own_contribution: string | null; currency: string;
  status: string; status_label: string; posted_at: string; progress_percentage: string | null;
  completed_at: string | null; has_approved_funding: boolean;
};
export type ProjectHome = {
  seeking_funding: PublicProject[];
  funded_in_progress: PublicProject[];
  funded_completed: PublicProject[];
};
export type PublicPage = { count: number; next: string | null; previous: string | null; results: PublicProject[] };

export function responseError(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload.map(responseError).join(" ");
  if (payload && typeof payload === "object") {
    const object = payload as Record<string, unknown>;
    if (object.detail) return responseError(object.detail);
    return Object.values(object).map(responseError).join(" ");
  }
  return translate("clientErrors.requestIncomplete");
}

export async function publicGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "omit",
    signal,
    headers: { "Accept-Language": getActiveLocale() },
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(responseError(payload));
  if (payload === undefined) throw new Error(translate("clientErrors.emptyResponse"));
  return payload as T;
}

export function amount(value: string | null, currency: string): string {
  if (value === null || value === "") return translate("clientErrors.notRecorded");
  const [whole, fraction] = value.split(".");
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction === undefined ? "" : `.${fraction}`}`;
}
export function displayDate(value: string | null): string {
  if (!value) return translate("clientErrors.notRecorded");
  // Date-only fields are calendar dates, not UTC timestamps.
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(getActiveLocale());
}
