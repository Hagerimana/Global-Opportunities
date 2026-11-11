"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/session";
import { translate, useI18n } from "@/lib/i18n";

type Choice = {
  value: string;
  label: string;
};

type RequirementConfiguration = {
  name: string;
  description: string;
  is_mandatory: boolean;
  is_conditional: boolean;
  condition_rule: string;
  accepted_file_types: string[];
  max_file_size: number;
  validity_required: boolean;
};

type Options = {
  profile_types: Choice[];
  domains: Choice[];
  requirements: (RequirementConfiguration & {
    id: number;
    profile_type: string;
  })[];
};

type Application = {
  id: number;
  requested_role: string;
  request_type: string;
  status: string;
  domain: string;
  motivation: string;
  qualifications: string;
  biography: string;
  years_experience: number;
  professional_title: string;
  teaching_methodology: string;
  document_requirements: {
    id: number;
    configuration_snapshot: RequirementConfiguration;
    applicability: string;
    applicability_reason: string;
  }[];
};

type DraftForm = {
  requested_role: string;
  domain: string;
  motivation: string;
  qualifications: string;
  biography: string;
  years_experience: string;
  professional_title: string;
  teaching_methodology: string;
};

function emptyForm(): DraftForm {
  return {
    requested_role: "MENTOR",
    domain: "",
    motivation: "",
    qualifications: "",
    biography: "",
    years_experience: "0",
    professional_title: "",
    teaching_methodology: "",
  };
}

function errorMessage(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(errorMessage).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const message = errorMessage(item);
        return key === "detail"
          ? message
          : `${key.replace(/_/g, " ")}: ${message}`;
      })
      .join(" ");
  }

  return "";
}

async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await authenticatedFetch(
    `/api/professional-profiles/${path}`,
    {
      method,
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    },
  );

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(
      errorMessage(payload) || translate("clientErrors.requestIncomplete"),
    );
  }

  return payload as T;
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white " +
  "px-4 py-3 text-slate-900 outline-none focus:ring-2 " +
  "focus:ring-emerald-600 disabled:bg-slate-50";

const textFields = ["motivation", "qualifications", "biography"] as const;

export default function ProfessionalProfilesPage() {
  const { t } = useI18n();
  const [options, setOptions] = useState<Options | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [form, setForm] = useState<DraftForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [availableOptions, existingApplications] = await Promise.all([
          api<Options>("options/"),
          api<Application[]>("requests/"),
        ]);

        if (!cancelled) {
          setOptions(availableOptions);
          setApplications(existingApplications);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : translate("professionalProfiles.errors.load"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(key: keyof DraftForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setSelected(null);
    setForm(emptyForm());
    setError("");
    setMessage("");
  }

  async function openApplication(id: number) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const application = await api<Application>(`requests/${id}/`);

      setSelected(application);
      setForm({
        requested_role: application.requested_role,
        domain: application.domain,
        motivation: application.motivation,
        qualifications: application.qualifications,
        biography: application.biography,
        years_experience: String(application.years_experience),
        professional_title: application.professional_title,
        teaching_methodology: application.teaching_methodology,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : translate("professionalProfiles.errors.open"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const years = Number(form.years_experience);

    if (
      form.years_experience.trim() === "" ||
      !Number.isInteger(years) ||
      years < 0 ||
      years > 32767
    ) {
      setError(t("professionalProfiles.errors.years"));
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    const fields = {
      domain: form.domain,
      motivation: form.motivation,
      qualifications: form.qualifications,
      biography: form.biography,
      years_experience: years,
      professional_title:
        form.requested_role === "EXPERT" ? form.professional_title : "",
      teaching_methodology:
        form.requested_role === "TRAINER" ? form.teaching_methodology : "",
    };

    try {
      const saved = selected
        ? await api<Application>(`requests/${selected.id}/`, "PATCH", fields)
        : await api<Application>("requests/", "POST", {
            requested_role: form.requested_role,
            ...fields,
          });

      setSelected(saved);

      setApplications((current) =>
        [saved, ...current.filter((item) => item.id !== saved.id)].slice(0, 50),
      );

      setMessage(
        saved.status === "APPROVED"
          ? t("professionalProfiles.messages.approved", { id: saved.id })
          : t("professionalProfiles.messages.draftSaved", { id: saved.id }),
      );
      
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : translate("professionalProfiles.errors.save"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function activateDevelopmentProfile() {
    if (!selected || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const approved = await api<Application>(
        `requests/${selected.id}/development-approve/`,
        "POST",
        {},
      );

      setSelected(approved);

      setApplications((current) =>
        current.map((item) => (item.id === approved.id ? approved : item)),
      );

      setMessage(t("professionalProfiles.messages.developmentActivated"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : translate("professionalProfiles.errors.activate"),
      );
    } finally {
      setBusy(false);
    }
  }

  const requirements = selected
    ? selected.document_requirements.map((item) => ({
        id: item.id,
        configuration: item.configuration_snapshot,
        applicability: item.applicability,
      }))
    : (options?.requirements ?? [])
        .filter((item) => item.profile_type === form.requested_role)
        .map((item) => ({
          id: item.id,
          configuration: item,
          applicability: item.is_conditional
            ? "UNASSESSED"
            : item.is_mandatory
              ? "REQUIRED"
              : "OPTIONAL",
        }));

  const readOnly = Boolean(selected && selected.status !== "DRAFT");

  return (
    <main className="min-h-screen bg-emerald-50 px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex rounded-lg text-sm font-semibold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {t("professionalProfiles.home")}
          </Link>
          
          <Link
            href="/account"
            className="text-sm font-semibold text-emerald-800"
          >
            {t("professionalProfiles.backAccount")}
          </Link>
        </div>

        <h1 className="display mt-7 text-3xl text-emerald-950 sm:text-4xl">
          {t("professionalProfiles.title")}
        </h1>

        <p className="mt-3 text-slate-600">
          {t("professionalProfiles.intro")}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            {error}{" "}
            <Link href="/auth/login" className="underline">
              {t("professionalProfiles.logIn")}
            </Link>
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-100 p-4 text-sm text-emerald-900"
          >
            {message}
          </p>
        )}

        {loading ? (
          <p role="status" className="mt-8">
            {t("professionalProfiles.loading")}
          </p>
        ) : options ? (
          <>
            <section className="mt-8 rounded-3xl bg-white p-6 shadow-xl shadow-emerald-950/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("professionalProfiles.recentTitle")}
                </h2>

                <button
                  type="button"
                  onClick={startNew}
                  disabled={busy}
                  className="rounded-xl border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 disabled:opacity-60"
                >
                  {t("professionalProfiles.newApplication")}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {t("professionalProfiles.showingRecent")}
              </p>

              {applications.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  {t("professionalProfiles.noApplications")}
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {applications.map((application) => (
                    <li key={application.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void openApplication(application.id)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm hover:bg-emerald-50 disabled:opacity-60"
                      >
                        #{application.id} ·{" "}
                        {t(`status.profileType.${application.requested_role}`)}{" "}
                        ·{" "}
                        {t(`status.requestType.${application.request_type}`)} ·{" "}
                        {t(`status.professional.${application.status}`)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <form
              onSubmit={save}
              className="mt-8 rounded-3xl bg-white p-6 shadow-xl shadow-emerald-950/5"
            >
              <h2 className="text-2xl font-semibold text-emerald-950">
                {selected
                  ? t("professionalProfiles.applicationTitle", {
                      id: selected.id,
                    })
                  : t("professionalProfiles.newTitle")}
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {readOnly
                  ? t("professionalProfiles.readOnly")
                  : t("professionalProfiles.saveIncomplete")}
              </p>

              <fieldset disabled={busy || readOnly} className="mt-6 space-y-5">
                <legend className="sr-only">
                  {t("professionalProfiles.applicationLegend")}
                </legend>

                <label className="block text-sm font-medium text-slate-700">
                  {t("professionalProfiles.profileLabel")}
                  <select
                    value={form.requested_role}
                    disabled={Boolean(selected) || busy || readOnly}
                    onChange={(event) =>
                      updateField("requested_role", event.target.value)
                    }
                    className={inputClass}
                  >
                    {options.profile_types.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  {t("professionalProfiles.domainLabel")}
                  <select
                    value={form.domain}
                    onChange={(event) =>
                      updateField("domain", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">
                      {t("professionalProfiles.chooseLater")}
                    </option>
                    {options.domains.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  {t("professionalProfiles.yearsLabel")}
                  <input
                    type="number"
                    min={0}
                    max={32767}
                    step={1}
                    value={form.years_experience}
                    onChange={(event) =>
                      updateField("years_experience", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                {textFields.map((key) => (
                  <label
                    key={key}
                    className="block text-sm font-medium text-slate-700"
                  >
                    {t(`professionalProfiles.${key}`)}
                    <textarea
                      rows={3}
                      value={form[key]}
                      onChange={(event) => updateField(key, event.target.value)}
                      className={inputClass}
                    />
                  </label>
                ))}

                {form.requested_role === "EXPERT" && (
                  <label className="block text-sm font-medium text-slate-700">
                    {t("professionalProfiles.professionalTitle")}
                    <input
                      maxLength={255}
                      value={form.professional_title}
                      onChange={(event) =>
                        updateField("professional_title", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                )}

                {form.requested_role === "TRAINER" && (
                  <label className="block text-sm font-medium text-slate-700">
                    {t("professionalProfiles.teachingMethodology")}
                    <textarea
                      rows={4}
                      value={form.teaching_methodology}
                      onChange={(event) =>
                        updateField("teaching_methodology", event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                )}

                {!readOnly && (
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {busy
                      ? t("professionalProfiles.pleaseWait")
                      : t("professionalProfiles.saveDraft")}
                  </button>
                )}
              </fieldset>
              {selected?.status === "DRAFT" && (
                <div className="mt-5 rounded-xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-900">
                    {t("professionalProfiles.developmentNote")}
                  </p>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void activateDevelopmentProfile()}
                    className="mt-3 rounded-xl border border-amber-800 px-4 py-2 font-semibold text-amber-900 disabled:opacity-60"
                  >
                    {t("professionalProfiles.activateDevelopment")}
                  </button>
                </div>
              )}
            </form>

            <section className="mt-8 rounded-3xl bg-white p-6 shadow-xl shadow-emerald-950/5">
              <h2 className="text-2xl font-semibold text-emerald-950">
                {t("professionalProfiles.supportingTitle")}
              </h2>

              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                {t("professionalProfiles.documentsNote")}
              </p>

              <ul className="mt-5 space-y-4">
                {requirements.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <h3 className="font-semibold text-emerald-950">
                      {item.configuration.name}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      {t(`status.applicability.${item.applicability}`)}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      {item.configuration.description}
                    </p>

                    {item.configuration.is_conditional && (
                      <p className="mt-2 text-sm text-slate-600">
                        {t("professionalProfiles.condition", {
                          rule: item.configuration.condition_rule,
                        })}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                      {t("professionalProfiles.maxFile", {
                        size: (
                          item.configuration.max_file_size /
                          (1024 * 1024)
                        ).toFixed(1),
                        types:
                          item.configuration.accepted_file_types.join(", "),
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
