"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/lib/session";
import { useI18n } from "@/lib/i18n";

type ReviewData = Record<string, unknown>;

type DomainOption = {
  value: string;
  label: string;
};

type Props = {
  projectId: number;
  review: ReviewData;
  domains: DomainOption[];
  onSaved: (review: ReviewData) => void;
  onPost: () => void;
  posting: boolean;
};

/*
 * The fields the editor exposes, grouped by input type.
 *
 * The arrays carry keys only; `FIELD_LABEL_KEYS` maps each key to the same
 * `account.projects.details.*` entry the project record uses, so the review
 * screen and the wizard cannot label one field two different ways.
 */
const TEXT_FIELDS = ["title", "location"] as const;

const LONG_FIELDS = [
  "problem_statement",
  "solution",
  "conclusion",
  "objectives",
  "expected_results",
  "target_population",
] as const;

const DATE_FIELDS = ["start_date", "end_date"] as const;

const MONEY_FIELDS = ["total_budget", "requested_amount", "own_contribution"] as const;

const FIELD_KEYS = [
  ...TEXT_FIELDS,
  ...LONG_FIELDS,
  ...DATE_FIELDS,
  ...MONEY_FIELDS,
  "domain",
  "currency",
];

const FIELD_LABEL_KEYS: Record<string, string> = {
  title: "account.projects.details.title",
  domain: "account.projects.details.domain",
  problem_statement: "account.projects.details.problem_statement",
  solution: "account.projects.details.solution",
  conclusion: "account.projects.details.conclusion",
  objectives: "account.projects.details.objectives",
  expected_results: "account.projects.details.expected_results",
  target_population: "account.projects.details.target_population",
  location: "account.projects.details.projectLocation",
  start_date: "account.projects.details.plannedStartDate",
  end_date: "account.projects.details.plannedEndDate",
  total_budget: "account.projects.details.total_budget",
  requested_amount: "account.projects.details.requested_amount",
  own_contribution: "account.projects.details.own_contribution",
  currency: "account.projects.details.currency",
};

function fieldLabel(key: string, t: (path: string) => string): string {
  const path = FIELD_LABEL_KEYS[key];

  return path ? t(path) : key.replaceAll("_", " ");
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white " +
  "px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600 " +
  "disabled:bg-slate-100";

function toValues(review: ReviewData): Record<string, string> {
  return Object.fromEntries(
    FIELD_KEYS.map((key) => [
      key,
      review[key] === null || review[key] === undefined
        ? ""
        : String(review[key]),
    ]),
  );
}

function errorText(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(errorText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${errorText(item)}`)
      .join(" ");
  }

  return "";
}

export default function ProjectReviewEditor({
  projectId,
  review,
  domains,
  onSaved,
  onPost,
  posting,
}: Props) {
  const { t } = useI18n();
  const [values, setValues] = useState(() => toValues(review));
  const [savedValues, setSavedValues] = useState(() => toValues(review));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const dirty = FIELD_KEYS.some((key) => values[key] !== savedValues[key]);

  const disabled = saving || posting;

  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  }

  async function saveChanges() {
    if (disabled || !dirty) return;

    const missing = FIELD_KEYS.filter(
      (key) => !String(values[key] ?? "").trim(),
    );

    if (missing.length > 0) {
      setError(
        t("reviewEditor.completeFields", {
          fields: missing.map((key) => fieldLabel(key, t)).join(", "),
        }),
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const payload: Record<string, string | null> = { ...values };

    for (const key of [...DATE_FIELDS, ...MONEY_FIELDS]) {
      payload[key] = values[key] || null;
    }

    try {
      const response = await authenticatedFetch(
        `/api/project-workflow/${projectId}/review/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        },
      );

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(errorText(result) || t("reviewEditor.saveError"));
      }

      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error(t("reviewEditor.unexpected"));
      }

      const saved = result as ReviewData;
      const nextValues = toValues(saved);

      setValues(nextValues);
      setSavedValues(nextValues);
      onSaved(saved);
      setNotice(t("reviewEditor.saved"));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("reviewEditor.saveChangesError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="mt-5 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void saveChanges();
      }}
    >
      <p className="text-sm text-slate-600">{t("reviewEditor.intro")}</p>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-900"
        >
          {notice}
        </p>
      )}

      {TEXT_FIELDS.map((key) => (
        <label key={key} className="block text-sm font-medium text-slate-700">
          {fieldLabel(key, t)}
          <input
            required
            value={values[key]}
            maxLength={255}
            disabled={disabled}
            onChange={(event) => update(key, event.target.value)}
            className={inputClass}
          />
        </label>
      ))}

      <label className="block text-sm font-medium text-slate-700">
        {t("reviewEditor.domain")}
        <select
          required
          value={values.domain}
          disabled={disabled}
          onChange={(event) => update("domain", event.target.value)}
          className={inputClass}
        >
          <option value="">{t("reviewEditor.selectDomain")}</option>
          {domains.map((domain) => (
            <option key={domain.value} value={domain.value}>
              {domain.label}
            </option>
          ))}
        </select>
      </label>

      {LONG_FIELDS.map((key) => (
        <label key={key} className="block text-sm font-medium text-slate-700">
          {fieldLabel(key, t)}
          <textarea
            required
            rows={4}
            value={values[key]}
            disabled={disabled}
            onChange={(event) => update(key, event.target.value)}
            className={inputClass}
          />
        </label>
      ))}

      <div className="grid gap-5 sm:grid-cols-2">
        {DATE_FIELDS.map((key) => (
          <label key={key} className="block text-sm font-medium text-slate-700">
            {fieldLabel(key, t)}
            <input
              required
              type="date"
              value={values[key]}
              disabled={disabled}
              onChange={(event) => update(key, event.target.value)}
              className={inputClass}
            />
          </label>
        ))}

        {MONEY_FIELDS.map((key) => (
          <label key={key} className="block text-sm font-medium text-slate-700">
            {fieldLabel(key, t)}
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={values[key]}
              disabled={disabled}
              onChange={(event) => update(key, event.target.value)}
              className={inputClass}
            />
          </label>
        ))}

        <label className="block text-sm font-medium text-slate-700">
          {t("reviewEditor.currency")}
          <input
            required
            maxLength={3}
            value={values.currency}
            disabled={disabled}
            onChange={(event) =>
              update("currency", event.target.value.toUpperCase())
            }
            className={inputClass}
          />
        </label>
      </div>

      {dirty && (
        <p role="status" className="text-sm text-amber-800">
          {t("reviewEditor.unsaved")}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={disabled || !dirty}
          className="rounded-xl border border-emerald-800 px-5 py-3 font-semibold text-emerald-800 disabled:opacity-60"
        >
          {saving ? t("reviewEditor.saving") : t("reviewEditor.save")}
        </button>

        <button
          type="button"
          disabled={disabled || dirty}
          onClick={onPost}
          className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {posting ? t("reviewEditor.posting") : t("reviewEditor.post")}
        </button>
      </div>
    </form>
  );
}
