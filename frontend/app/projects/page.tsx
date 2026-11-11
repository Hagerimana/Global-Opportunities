"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Footer } from "@/components/layout/footer";
import { SkipLink } from "@/components/layout/skip-link";
import PublicProjectCard from "@/components/projects/PublicProjectCard";
import { Stagger } from "@/components/ui/reveal";
import { useI18n } from "@/lib/i18n";
import { publicGet } from "@/lib/public-projects";
import type { PublicPage, PublicProject } from "@/lib/public-projects";

export default function SeekingFundingPage() {
  const { t } = useI18n();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<PublicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [expandedId, setExpandedId] = useState<PublicProject["id"] | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      page: String(page),
      search,
    });

    void publicGet<PublicPage>(
      `/api/public/projects/?${query.toString()}`,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult(data);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : t("projectsPage.loadError"),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, search, retry, t]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setExpandedId(null);
    setPage(1);
    setSearch(searchInput.trim());
    setRetry((value) => value + 1);
  }

  function resetSearch() {
    setExpandedId(null);
    setSearchInput("");
    setSearch("");
    setPage(1);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage: number) {
    setExpandedId(null);
    setPage(Math.max(1, nextPage));
  }

  return (
    <>
      <SkipLink />

      <main id="main" className="min-h-screen bg-emerald-50 px-5 py-12">
        <div className="mx-auto max-w-7xl">
          <Link href="/#projects" className="font-semibold text-emerald-800">
            {t("projectsPage.back")}
          </Link>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
            <h1 className="display text-3xl text-emerald-950">
              {t("projectsPage.title")}
            </h1>

            <Link
              href="/projects/new"
              className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white"
            >
              {t("projectsPage.add")}
            </Link>
          </div>

          <p className="mt-3 text-slate-600">{t("projectsPage.intro")}</p>

          <form
            onSubmit={submit}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <label className="min-w-0 flex-1 basis-64">
              <span className="sr-only">{t("projectsPage.searchLabel")}</span>

              <input
                type="search"
                maxLength={200}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("projectsPage.placeholder")}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </label>

            <button
              type="submit"
              className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white"
            >
              {t("projectsPage.search")}
            </button>

            {(searchInput !== "" || search !== "") && (
              <button
                type="button"
                onClick={resetSearch}
                className="rounded-xl border border-emerald-800 px-5 py-3 font-semibold text-emerald-800"
              >
                {t("projectsPage.reset")}
              </button>
            )}
          </form>

          {loading ? (
            <p role="status" className="mt-8">
              {t("projectsPage.loading")}
            </p>
          ) : error ? (
            <div
              role="alert"
              className="mt-8 rounded-xl bg-red-50 p-4 text-red-800"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="mt-2 underline"
              >
                {t("projectsPage.retry")}
              </button>
            </div>
          ) : result ? (
            <>
              <p role="status" className="mt-6 text-sm text-slate-600">
                {result.count === 1
                  ? t("projectsPage.countOne")
                  : t("projectsPage.count", { count: result.count })}
              </p>

              {result.results.length ? (
                <Stagger
                  key={`${page}:${search}:${retry}`}
                  className="mt-6 grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3"
                  step={80}
                >
                  {result.results.map((project) => (
                    <PublicProjectCard
                      key={project.id}
                      project={project}
                      expanded={expandedId === project.id}
                      onToggle={() =>
                        setExpandedId((current) =>
                          current === project.id ? null : project.id,
                        )
                      }
                    />
                  ))}
                </Stagger>
              ) : (
                <p className="mt-6 rounded-xl bg-white p-5">
                  {t("projectsPage.empty")}
                </p>
              )}

              <nav
                aria-label={t("projectsPage.navLabel")}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <button
                  type="button"
                  disabled={!result.previous}
                  onClick={() => changePage(page - 1)}
                  className="rounded-xl border border-emerald-800 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("projectsPage.previous")}
                </button>

                <span>{t("projectsPage.page", { page })}</span>

                <button
                  type="button"
                  disabled={!result.next}
                  onClick={() => changePage(page + 1)}
                  className="rounded-xl border border-emerald-800 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("projectsPage.next")}
                </button>
              </nav>
            </>
          ) : null}
        </div>
      </main>

      <Footer />
    </>
  );
}
