"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { useI18n } from "@/lib/i18n";
import type { PublicProject } from "@/lib/public-projects";
import { amount, displayDate } from "@/lib/public-projects";

type PublicProjectCardProps = {
  project: PublicProject;
  expanded?: boolean;
  onToggle?: () => void;
  staggerIndex?: number;
  staggerStep?: number;
};

export default function PublicProjectCard({
  project: p,
  expanded: controlledExpanded,
  onToggle,
  staggerIndex,
  staggerStep,
}: PublicProjectCardProps) {
  const { t } = useI18n();
  const panelId = useId();
  const [localExpanded, setLocalExpanded] = useState(false);

  const expanded = controlledExpanded ?? localExpanded;

  function toggleDetails() {
    if (onToggle) {
      onToggle();
    } else {
      setLocalExpanded((current) => !current);
    }
  }

  const preview =
    p.problem_statement || p.description || t("card.descriptionMissing");

  const narrative = [
    [t("card.narrative.description"), p.description],
    [t("card.narrative.problem"), p.problem_statement],
    [t("card.narrative.solution"), p.solution],
    [t("card.narrative.conclusion"), p.conclusion],
    [t("card.narrative.objectives"), p.objectives],
    [t("card.narrative.results"), p.expected_results],
    [t("card.narrative.population"), p.target_population],
  ];

  const statusLabel = t(`status.project.${p.status}`);

  return (
    <Reveal
      as="article"
      staggerIndex={staggerIndex}
      staggerStep={staggerStep}
      className={`ring-conic group relative flex w-full min-w-0 self-start flex-col rounded-3xl border bg-white p-6 transition-all duration-500 ease-premium ${
        expanded
          ? "border-pine-700/25 shadow-lift"
          : "border-pine-900/8 shadow-soft hover:-translate-y-1.5 hover:border-pine-700/20 hover:shadow-lift"
      }`}
    >
      {/* Domain and project status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-pine-100 px-2.5 py-1 text-step-eyebrow font-bold uppercase tracking-wider text-pine-700">
          {p.domain_label || t("card.domainMissing")}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-step-eyebrow font-bold uppercase tracking-wider ${
            p.completed_at
              ? "bg-slate-100 text-slate-600"
              : p.has_approved_funding
                ? "bg-pine-100 text-pine-700"
                : "bg-gold-100 text-gold-700"
          }`}
        >
          {statusLabel === `status.project.${p.status}`
            ? p.status_label
            : statusLabel}
        </span>
      </div>

      {/* Title and short description */}
      <p className="mt-5 break-words text-xs font-semibold uppercase tracking-[0.14em] text-pine-600">
        {p.reference_number}
      </p>

      <h3 className="display mt-2 break-words text-step-h3 text-balance leading-snug text-pine-950">
        {p.title || p.reference_number}
      </h3>

      <p className="mt-2.5 whitespace-pre-line break-words text-sm leading-6 text-ink-muted">
        {preview.slice(0, 240)}
        {preview.length > 240 ? "…" : ""}
      </p>

      {/* Main project metadata */}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-pine-900/8 pt-5 text-sm">
        <div className="col-span-2">
          <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Icon name="building" className="h-3.5 w-3.5" />
            {t("card.requestedFunding")}
          </dt>
          <dd className="mt-1 break-words font-semibold text-pine-950">
            {amount(p.requested_amount, p.currency)}
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            {t("card.posted")}
          </dt>
          <dd className="mt-1 font-semibold text-pine-950">
            {displayDate(p.posted_at)}
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Icon name="mapPin" className="h-3.5 w-3.5" />
            {t("card.location")}
          </dt>
          <dd className="mt-1 break-words font-semibold text-pine-950">
            {p.location || t("card.notRecorded")}
          </dd>
        </div>
      </dl>

      {/* Funding and implementation information */}
      {(p.has_approved_funding ||
        p.progress_percentage != null ||
        p.completed_at) && (
        <ul className="mt-4 space-y-1.5">
          {p.has_approved_funding && (
            <li className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
              <Icon
                name="check"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-500"
              />
              {t("card.approvedFunding")}
            </li>
          )}

          {p.progress_percentage != null && (
            <li className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
              <Icon
                name="check"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-500"
              />
              {t("card.progress", { percent: p.progress_percentage })}
            </li>
          )}

          {p.completed_at && (
            <li className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
              <Icon
                name="check"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-500"
              />
              {t("card.completed", { date: displayDate(p.completed_at) })}
            </li>
          )}
        </ul>
      )}

      {/* Expandable public details */}
      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={toggleDetails}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="tap flex w-full items-center justify-between gap-3 rounded-xl border border-pine-900/10 bg-pine-50/50 px-4 text-left text-sm font-semibold text-pine-800 transition-colors duration-300 hover:border-pine-700/25 hover:bg-pine-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
        >
          {expanded ? t("actions.hideDetails") : t("actions.viewDetails")}

          <Icon
            name="chevronDown"
            className={`h-4 w-4 shrink-0 transition-transform duration-400 ease-premium ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          id={panelId}
          aria-hidden={!expanded}
          className={`grid transition-all duration-600 ease-premium motion-reduce:transition-none ${
            expanded
              ? "mt-4 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div
            className={`min-h-0 overflow-hidden ${
              expanded ? "visible" : "invisible"
            }`}
          >
            <div className="space-y-4 rounded-2xl bg-pine-50/60 p-4 text-sm text-ink-muted">
              {narrative.map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-pine-700">
                      {label}
                    </h4>
                    <p className="mt-2 whitespace-pre-line break-words leading-6">
                      {value}
                    </p>
                  </div>
                ) : null,
              )}

              <dl className="space-y-3 border-t border-pine-900/10 pt-4">
                {p.project_type && (
                  <div>
                    <dt className="font-semibold text-pine-900">
                      {t("card.projectType")}
                    </dt>
                    <dd className="mt-1 break-words">{p.project_type}</dd>
                  </div>
                )}

                {p.sector && (
                  <div>
                    <dt className="font-semibold text-pine-900">
                      {t("card.sector")}
                    </dt>
                    <dd className="mt-1 break-words">{p.sector}</dd>
                  </div>
                )}

                <div>
                  <dt className="font-semibold text-pine-900">
                    {t("card.totalBudget")}
                  </dt>
                  <dd className="mt-1">{amount(p.total_budget, p.currency)}</dd>
                </div>

                <div>
                  <dt className="font-semibold text-pine-900">
                    {t("card.ownContribution")}
                  </dt>
                  <dd className="mt-1">
                    {amount(p.own_contribution, p.currency)}
                  </dd>
                </div>

                <div>
                  <dt className="font-semibold text-pine-900">
                    {t("card.plannedDates")}
                  </dt>
                  <dd className="mt-1">
                    {displayDate(p.start_date)} → {displayDate(p.end_date)}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-pine-900/10 pt-4">
                <Link
                  href={`/projects/${p.id}/document`}
                  tabIndex={expanded ? undefined : -1}
                  className="tap inline-flex items-center gap-2 rounded-xl bg-pine-800 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-pine-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2"
                >
                  <Icon name="fileText" className="h-4 w-4 shrink-0" />
                  {t("card.openDocument")}
                  <Icon name="arrowRight" className="h-3 w-3 shrink-0" />
                </Link>

                <p className="mt-2 text-xs leading-5 text-ink-soft">
                  {t("card.protected")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
