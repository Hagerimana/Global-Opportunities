"use client";

/**
 * FAQ.
 *
 * Twelve questions, grouped by the part of the system they concern, filterable
 * by that group.
 *
 * The accordion is a controlled button with `aria-expanded` and `aria-controls`
 * pointing at the region it toggles, rather than `<details>`. `<details>` would
 * be less code and is natively accessible, but its content cannot be animated
 * without measuring the panel, and a hard `display: none` swap is the one
 * interaction on this page that would feel like a different website. The
 * `grid-rows-[0fr] -> [1fr]` transition animates to the content's natural height
 * with no measurement, and the inner `overflow-hidden` does the clipping.
 *
 * `aria-hidden` is not set on the collapsed panel, because the content is still
 * in the accessibility tree and the region is referenced by the button -- but
 * hidden content inside a collapsed region is not focusable either way, since
 * nothing in a FAQ answer takes focus.
 *
 * Filtering keeps the first item open on every change, because a filtered list
 * that happens to land entirely collapsed reads as an empty section.
 */
import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { faqs } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

/** The sentinel for "no filter". Not a real category, so it cannot collide. */
const ALL = "all";

export function Faq() {
  const { t } = useI18n();

  /**
   * The categories present in `faqs`, in order of first appearance and
   * de-duplicated. Derived rather than hand-listed, so a question cannot end up
   * filed under a chip that does not exist.
   */
  const categories = useMemo(
    () => [...new Set(faqs.map((faq) => faq.categoryKey))],
    []
  );

  const [category, setCategory] = useState<string>(ALL);
  const [open, setOpen] = useState<string | null>(faqs[0]?.id ?? null);

  const visible = category === ALL ? faqs : faqs.filter((faq) => faq.categoryKey === category);

  return (
    <Section id="faq" tone="light">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            eyebrow={t("faq.eyebrow")}
            title={t("faq.title")}
            description={t("faq.description")}
          />

          {/*
        The filter row wraps rather than scrolling sideways.

        It used to be `flex gap-2 overflow-x-auto` with the scrollbar hidden, on
        the reasoning that a stable single row beats one that reflows as the
        width changes. That trades a real defect for a cosmetic one: a row you
        have to drag sideways to reach the twelfth category is exactly the
        "scroll left or right to see what is hidden" behaviour this page should
        not have, and the hidden scrollbar meant there was no affordance saying
        so. `flex-wrap` reflows, and the FAQ list below it re-renders anyway
        when the category changes, so nothing is lost.
      */}
          <Reveal direction="up" delay={140}>
            <div
              role="group"
              aria-label={t("faq.filterAll")}
              className="mt-9 flex flex-wrap gap-2"
            >
              <FilterChip
                active={category === ALL}
                onClick={() => {
                  setCategory(ALL);
                  setOpen(faqs[0]?.id ?? null);
                }}
              >
                {t("faq.filterAll")}
              </FilterChip>
              {categories.map((key) => (
                <FilterChip
                  key={key}
                  active={category === key}
                  onClick={() => {
                    setCategory(key);
                    const first = faqs.find((faq) => faq.categoryKey === key);
                    setOpen(first?.id ?? null);
                  }}
                >
                  {t(key)}
                </FilterChip>
              ))}
            </div>
          </Reveal>
        </div>

        {/* --- The accordion -------------------------------------------------- */}
        <Stagger className="space-y-3" step={50}>
          {visible.map((faq) => {
            const expanded = open === faq.id;
            const buttonId = `faq-button-${faq.id}`;
            const panelId = `faq-panel-${faq.id}`;

            return (
              <Reveal
                key={faq.id}
                className={`overflow-hidden rounded-2xl border bg-white transition-all duration-500 ease-premium ${
                  expanded
                    ? "border-pine-700/25 shadow-soft"
                    : "border-pine-900/8 hover:border-pine-700/15"
                }`}
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? null : faq.id)}
                    className="flex w-full items-start gap-4 p-5 text-left sm:p-6"
                  >
                    <span className="min-w-0 flex-1">
                      {/* The category, small and above the question. It is
                          visible rather than screen-reader-only because it is
                          the fastest way to scan a list of twelve. */}
                      <span className="text-step-eyebrow block font-semibold uppercase tracking-[0.16em] text-pine-600">
                        {t(faq.categoryKey)}
                      </span>
                      <span className="display text-step-h4 mt-1.5 block text-pretty leading-snug text-pine-950">
                        {t(faq.questionKey)}
                      </span>
                    </span>

                    {/* A plus that rotates into a minus. The rotation is
                        suppressed under reduced motion by the global
                        transition rules, so the icon still changes state. */}
                    <span
                      aria-hidden
                      className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-500 ease-spring ${
                        expanded
                          ? "rotate-45 border-pine-700 bg-pine-800 text-white"
                          : "border-pine-900/12 bg-pine-50 text-pine-700"
                      }`}
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </span>
                  </button>
                </h3>

                {/* The panel. `0fr -> 1fr` is the whole trick: a grid row sized
                    to its content animates between collapsed and natural
                    height without a single measurement. */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid transition-all duration-500 ease-premium ${
                    expanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="border-t border-pine-900/6 px-5 pb-5 pt-4 text-pretty text-sm leading-7 text-ink-muted sm:px-6 sm:pb-6">
                      {t(faq.answerKey)}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </Stagger>
      </div>

      {/* A closing line, because twelve answers end abruptly otherwise. */}
      <Reveal direction="up" delay={120}>
        <p className="mt-12 text-center text-sm text-ink-muted">
          {t("faq.closing")}{" "}
          <a
            href="/auth/account-type"
            className="font-semibold text-pine-700 underline-offset-4 transition-colors hover:text-pine-900 hover:underline"
          >
            {t("faq.closingLink")}
          </a>
        </p>
      </Reveal>
    </Section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    /* The category filter. `.tap` gives it the 44px minimum height -- a 28px
       pill is a difficult target on a phone, and this is one of twelve of them
       stacked in a row that scrolls. */
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap shrink-0 rounded-full border px-4 text-xs font-semibold transition-all duration-400 ease-premium ${
        active
          ? "border-pine-700 bg-pine-800 text-white shadow-soft"
          : "border-pine-900/10 bg-white text-ink-muted hover:-translate-y-0.5 hover:border-pine-700/25 hover:text-pine-800"
      }`}
    >
      {children}
    </button>
  );
}
