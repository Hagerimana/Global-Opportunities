"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageLanguage } from "@/components/layout/page-language";
import { useI18n } from "@/lib/i18n";
import { projectRequest, ProjectRequestError } from "@/lib/project-requests";

type Project = {
  id: number;
  reference_number: string;
  title: string;
  status: string;
  [key: string]: unknown;
};

type ProjectPage = {
  count: number;
  next: string | null;
  results: Project[];
};

const STATUS_VALUES = [
  "DRAFT",
  "POSTED",
  "SUBMITTED",
  "UNDER_EVALUATION",
  "SHORTLISTED",
  "SELECTED",
  "REJECTED",
  "FUNDED",
  "IN_PROGRESS",
  "SUSPENDED",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
] as const;

const DETAIL_FIELDS = [
  "description",
  "problem_statement",
  "solution",
  "conclusion",
  "objectives",
  "expected_results",
  "domain",
  "project_type",
  "sector",
  "target_population",
  "location",
  "start_date",
  "end_date",
  "total_budget",
  "requested_amount",
  "own_contribution",
  "currency",
  "posted_at",
  "created_at",
  "updated_at",
] as const;

const buttonClass =
  "inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-semibold " +
  "text-white hover:bg-emerald-900 disabled:opacity-60";

const secondaryClass =
  "inline-flex rounded-xl border border-emerald-800 px-5 py-3 " +
  "font-semibold text-emerald-800 disabled:opacity-60";

export default function MyProjectsPage() {
  const { t } = useI18n();

  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("");
  const [next, setNext] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setError("");
    setErrorStatus(0);
    setNotice("");
    setProjects([]);
    setNext(null);

    const query = status ? `?status=${encodeURIComponent(status)}` : "";

    void projectRequest<ProjectPage | Project[]>(`/api/projects/${query}`)
      .then((result) => {
        if (ignore) return;

        const items = Array.isArray(result) ? result : result.results;

        if (!Array.isArray(items)) {
          throw new Error(t("account.projects.loadError"));
        }

        setProjects(items);
        setTotal(Array.isArray(result) ? items.length : result.count);
        setNext(Array.isArray(result) ? null : result.next);
        setNotice(
          items.length
            ? t("account.projects.loaded")
            : t("account.projects.none"),
        );
      })
      .catch((cause: unknown) => {
        if (ignore) return;

        setError(
          cause instanceof Error
            ? cause.message
            : t("account.projects.loadError"),
        );
        setErrorStatus(cause instanceof ProjectRequestError ? cause.status : 0);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [status, retry, t]);

  async function loadMore() {
    if (!next || loadingMore) return;

    setLoadingMore(true);
    setError("");
    setErrorStatus(0);
    setNotice("");

    try {
      const url = new URL(next, window.location.origin);

      if (url.pathname !== "/api/projects/") {
        throw new Error(t("account.projects.loadMoreError"));
      }

      const result = await projectRequest<ProjectPage>(
        `${url.pathname}${url.search}`,
      );

      if (!Array.isArray(result.results)) {
        throw new Error(t("account.projects.loadError"));
      }

      setProjects((current) => {
        const byId = new Map(current.map((project) => [project.id, project]));

        for (const project of result.results) {
          byId.set(project.id, project);
        }

        return [...byId.values()];
      });

      setNext(result.next);
      setTotal(result.count);
      setNotice(t("account.projects.moreLoaded"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("account.projects.loadMoreError"),
      );
      setErrorStatus(cause instanceof ProjectRequestError ? cause.status : 0);
    } finally {
      setLoadingMore(false);
    }
  }

  function displayValue(value: unknown): string {
    if (value === null || value === undefined || value === "") {
      return t("app.notProvided");
    }

    return String(value);
  }

  function statusLabel(value: string) {
    return t(`status.project.${value}`);
  }

  return (
    <main id="main" className="min-h-screen bg-emerald-50 px-5 py-10">
      <PageLanguage />

      <div className="mx-auto max-w-3xl">
        <Link href="/account" className="font-semibold text-emerald-800">
          {t("app.backToAccount")}
        </Link>

        <h1 className="display mt-6 text-3xl text-emerald-950">
          {t("account.projects.title")}
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          {t("account.projects.body")}
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <label className="block text-sm font-medium text-slate-700">
            {t("account.projects.status")}
            <select
              value={status}
              disabled={loadingMore}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 block rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">{t("account.projects.allStatuses")}</option>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={loading || loadingMore}
            onClick={() => setRetry((value) => value + 1)}
            className={secondaryClass}
          >
            {t("account.projects.refresh")}
          </button>

          <Link href="/projects/new" className={buttonClass}>
            {t("account.projects.add")}
          </Link>
        </div>

        {loading && (
          <p role="status" className="mt-6">
            {t("account.projects.loading")}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl bg-red-50 p-4 text-red-800"
          >
            <p>{error}</p>

            {errorStatus === 401 ? (
              <Link href="/auth/login" className="mt-3 inline-block underline">
                {t("account.projects.logInAgain")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  projects.length && next
                    ? void loadMore()
                    : setRetry((value) => value + 1)
                }
                className="mt-3 font-semibold underline"
              >
                {t("app.retry")}
              </button>
            )}
          </div>
        )}

        {notice && (
          <p
            role="status"
            className="mt-6 rounded-xl bg-emerald-100 p-4 text-emerald-950"
          >
            {notice}
          </p>
        )}

        {!loading && !error && projects.length === 0 && (
          <p className="mt-6 rounded-3xl bg-white p-6 text-slate-600">
            {status
              ? t("account.projects.emptyFiltered")
              : t("account.projects.empty")}
          </p>
        )}

        {projects.map((project) => (
          <article
            key={project.id}
            className="mt-6 rounded-3xl bg-white p-6 shadow-xl shadow-emerald-950/5"
          >
            <h2 className="text-xl font-semibold text-emerald-950">
              {project.title || t("account.projects.untitled")}
            </h2>

            <p className="mt-2 break-all text-sm text-slate-600">
              {project.reference_number}
            </p>

            <p className="mt-2 text-sm font-semibold text-emerald-800">
              {t("account.projects.statusLabel", {
                status: statusLabel(project.status),
              })}
            </p>

            <details className="mt-5 rounded-xl bg-slate-50 p-4">
              <summary className="cursor-pointer font-semibold text-emerald-900">
                {t("account.projects.viewSaved")}
              </summary>

              <dl className="mt-4 space-y-4">
                {DETAIL_FIELDS.map((key) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-slate-500">
                      {t(`account.projects.details.${key}`)}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-slate-900">
                      {displayValue(project[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/projects/${project.id}/document`}
                className={secondaryClass}
              >
                {t("account.projects.readProposal")}
              </Link>

              {project.status === "DRAFT" && (
                <Link
                  href={`/projects/new?projectId=${project.id}`}
                  className={buttonClass}
                >
                  {t("account.projects.editDraft")}
                </Link>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {project.status === "DRAFT"
                ? t("account.projects.draftNote")
                : t("account.projects.readOnlyNote")}{" "}
              {t("account.projects.proposalNote")}
            </p>
          </article>
        ))}

        {!loading && projects.length > 0 && (
          <p className="mt-5 text-sm text-slate-600">
            {t("account.projects.showing", {
              shown: projects.length,
              total,
            })}
          </p>
        )}

        {next && (
          <button
            type="button"
            disabled={loadingMore || loading}
            onClick={() => void loadMore()}
            className={`${secondaryClass} mt-5`}
          >
            {loadingMore
              ? t("account.projects.loadingMore")
              : t("account.projects.loadMore")}
          </button>
        )}
      </div>
    </main>
  );
}
