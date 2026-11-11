"use client";

/**
 * Live project showcase.
 *
 * Loads posted and funded projects from `GET /api/public/projects/home/` and
 * renders three groups. Unlike the static `showcaseProjects` sample in
 * `lib/content.ts`, this section is real data, so its labels are interface
 * strings from the `projects.*` catalogue keys rather than sample records.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import PublicProjectCard from "@/components/projects/PublicProjectCard";
import { publicGet } from "@/lib/public-projects";
import type { ProjectHome, PublicProject } from "@/lib/public-projects";
import { Stagger } from "@/components/ui/reveal";
import { useI18n } from "@/lib/i18n";

function Cards({
  projects,
  empty,
}: {
  projects: PublicProject[];
  empty: string;
}) {
  const [expandedId, setExpandedId] = useState<PublicProject["id"] | null>(
    null,
  );

  if (!projects.length) {
    return <p className="rounded-2xl bg-white p-5 text-slate-600">{empty}</p>;
  }

  return (
    <Stagger
      className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3"
      step={80}
    >
      {projects.map((project) => (
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
  );
}

export function ProjectShowcase() {
  const { t } = useI18n();
  const [data, setData] = useState<ProjectHome | null>(null);
  /** Empty string means "no message of its own"; the fallback is translated at render. */
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void publicGet<ProjectHome>("/api/public/projects/home/", controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "");
      });
    return () => controller.abort();
  }, [retry]);
  return <section id="projects" className="bg-emerald-50 px-5 py-20" aria-labelledby="projects-title">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="font-semibold uppercase tracking-wider text-emerald-700">{t("projects.eyebrow")}</p>
          <h2 id="projects-title" className="display mt-3 text-3xl text-emerald-950 sm:text-4xl">{t("projects.title")}</h2>
          <p className="mt-4 max-w-2xl text-slate-600">{t("projects.description")}</p>
        </div>
        <Link href="/projects/new" className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white">{t("projects.ctaNew")}</Link>
      </div>
      {error || !data ? (
        error ? <div role="alert" className="mt-8 rounded-2xl bg-red-50 p-5 text-red-800">
          <p>{error || t("projects.errorFallback")}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 font-semibold underline">{t("projects.retry")}</button>
        </div> : <p role="status" className="mt-8">{t("projects.loading")}</p>
      ) : <>
        <div className="mt-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-2xl font-semibold text-emerald-950">{t("projects.groups.seeking.title")}</h3><p className="mt-2 text-sm text-slate-600">{t("projects.groups.seeking.body")}</p></div>
            <Link href="/projects" className="rounded-xl border border-emerald-800 px-4 py-3 font-semibold text-emerald-800">{t("projects.ctaAll")}</Link>
          </div>
          <Cards projects={data.seeking_funding} empty={t("projects.groups.seeking.empty")} />
        </div>
        <div className="mt-14 border-t border-emerald-200 pt-10">
          <h3 className="text-2xl font-semibold text-emerald-950">{t("projects.fundedTitle")}</h3>
          <div className="mt-7"><h4 className="mb-2 text-xl font-semibold text-emerald-900">{t("projects.groups.inProgress.title")}</h4>
            <p className="mb-5 text-sm text-slate-600">{t("projects.groups.inProgress.body")}</p>
            <Cards projects={data.funded_in_progress} empty={t("projects.groups.inProgress.empty")} />
          </div>
          <div className="mt-10"><h4 className="mb-2 text-xl font-semibold text-emerald-900">{t("projects.groups.completed.title")}</h4>
            <p className="mb-5 text-sm text-slate-600">{t("projects.groups.completed.body")}</p>
            <Cards projects={data.funded_completed} empty={t("projects.groups.completed.empty")} />
          </div>
        </div>
      </>}
    </div>
  </section>;
}
