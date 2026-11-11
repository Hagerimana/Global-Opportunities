"use client";

/**
 * The hero.
 *
 * Left column: the positioning, the two calls to action, and four trust markers.
 * Right column: a mock application window showing an opportunity moving through
 * the journey, with three small floating cards around it.
 *
 * The right-hand visual is decorative and carries no real controls, so the whole
 * column is `aria-hidden`. The information it depicts -- the journey stages, the
 * opportunity metadata -- is stated in text elsewhere on the page: the stages in
 * "How it works" and the metadata in the discovery cards.
 *
 * The headline is the platform's fixed positioning. It is assembled from three
 * translated lines so the sentence can be grammatically reordered in languages
 * where the imperative needs a different word order, rather than being one
 * string split in the markup.
 */
import Link from "next/link";
import { AmbientBackdrop } from "@/components/ui/ambient";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { AppWindow } from "./app-window";
import { useI18n } from "@/lib/i18n";

/**
 * The four markers under the CTAs. Product facts, not adoption claims.
 *
 * `icon` is local because it is decoration; `key` is an index into
 * `hero.chips` in the locale catalogue, so the wording is translated.
 */
const heroMarkers = [
  { icon: "lock" as const, key: 0 },
  { icon: "scale" as const, key: 1 },
  { icon: "globe" as const, key: 2 },
  { icon: "checkCircle" as const, key: 3 },
] as const;

export function Hero() {
  const { t, list } = useI18n();

  /** The four marker labels, from `hero.chips` in the active locale. */
  const markerLabels = list("hero.chips");

  /**
   * The four stages shown in the mock window, pulled from the same nine-stage
   * journey as "How it works" so the preview cannot drift from the section it
   * previews. The strip shows Discover, Apply, Decide and Fund -- indices 0, 3,
   * 5 and 6 of `how.steps` -- rather than inventing a shorter list.
   */
  const howSteps = list("how.steps");
  const heroStageLabels = [0, 3, 5, 6].map((index) => howSteps[index]).filter(Boolean);

  return (
    <section
      id="home"
      className="on-dark relative overflow-hidden bg-surface pt-[var(--nav-h)]"
    >
      <AmbientBackdrop />

      <div className="container-x relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-24">
        {/* --- Copy ---------------------------------------------------------- */}
        <div className="max-w-2xl">
          <Reveal direction="up">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-pine-800/12 bg-white/70 py-1.5 pl-2 pr-4 text-xs font-medium text-pine-800 shadow-soft backdrop-blur">
              <span className="relative grid h-5 w-5 place-items-center">
                {/* Two rings: a solid dot and an expanding one. The expansion is
                    what signals "live" without a word. */}
                <span className="absolute h-2 w-2 rounded-full bg-gold-400" />
                <span className="absolute h-2 w-2 animate-pulse-ring rounded-full bg-gold-400" />
              </span>
              {t("hero.eyebrow")}
            </p>
          </Reveal>

          <Reveal direction="up" delay={80}>
            {/*
              `.text-step-h1` replaces `text-[2.6rem] sm:text-6xl lg:text-[4.1rem]`.
              The old ramp had a 2.6rem floor, which is ~42px: on a 320px phone
              that headline wraps to five lines and shoves the two buttons and the
              trust row below the fold. The clamp starts at 2.1rem and scales
              continuously, so it reaches 4.25rem by 1280px with no jump at the
              breakpoints it replaces.
            */}
            <h1 className="display text-step-h1 mt-7 text-balance leading-[1.04] text-pine-950">
              {t("hero.titleLead")}
              <br />
              {t("hero.titleMid")}
              <br />
              <span className="text-gradient italic">
                {t("hero.titleAccent")}
              </span>
            </h1>
          </Reveal>

          <Reveal direction="up" delay={160}>
            <p className="text-step-body-lg mt-7 max-w-xl text-pretty leading-relaxed text-ink-muted">
              {t("hero.description")}
            </p>
          </Reveal>

          <Reveal direction="up" delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#opportunities" className="btn-primary">
                {t("hero.ctaPrimary")}
                <Icon name="arrowRight" className="h-4 w-4" />
              </a>
              <Link href="/auth/account-type" className="btn-outline">
                {t("hero.ctaSecondary")}
              </Link>
            </div>
          </Reveal>

          {/* The marker row. `sm:grid-cols-2` rather than a wrapping flex so the
              four items form a tidy two-by-two on a phone instead of an
              unpredictable rag. */}
          <Reveal direction="up" delay={320}>
            <ul className="mt-10 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {heroMarkers.map((marker) => (
                <li
                  key={marker.key}
                  className="flex items-center gap-2.5 text-sm text-ink-muted"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pine-100 text-pine-700">
                    <Icon name={marker.icon} className="h-3.5 w-3.5" />
                  </span>
                  {markerLabels[marker.key]}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* --- Visual -------------------------------------------------------- */}
        <div aria-hidden className="relative">
          {/* The bloom behind the window. Separate from the mock so it can
              overflow past the frame's rounded corners. */}
          <div className="orb h-72 w-72 -right-10 top-4 bg-pine-300/40" />

          <Reveal direction="scale" delay={200}>
            <div className="relative">
              <AppWindow address="global-opportunities.app/opportunities">
                <div className="p-5 sm:p-6">
                  {/* Search field, mirroring the real discovery form so the
                      preview and the thing it previews look the same. */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-pine-900/8 bg-pine-50/60 px-3.5 py-2.5">
                    <Icon name="search" className="h-4 w-4 text-pine-500" />
                    <span className="text-sm text-ink-soft">
                      {t("opps.sectors.climate")}
                    </span>
                    <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[0.6rem] font-semibold text-pine-700 shadow-soft">
                      12
                    </span>
                  </div>

                  {/* The featured listing. */}
                  <div className="ring-conic mt-4 rounded-2xl border border-pine-900/8 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-pine-100 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-pine-700">
                        {t("discovery.types.funding")}
                      </span>
                      <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-gold-700">
                        {t("ui.status.open")}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-step-eyebrow font-medium text-ink-soft">
                        <Icon name="clock" className="h-3 w-3" />
                        {t("showcase.mock.meta.0")}
                      </span>
                    </div>

                    <p className="display text-step-h4 mt-3 leading-tight text-pine-950">
                      {t("opps.items.resilienceGrants.title")}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {/*
                        Two of the three chips are sample *data* -- a country
                        and a funding range -- so they stay as they are written.
                        The third is interface chrome, so it is translated: a
                        reader in French should not be told "Registration
                        required" in English inside an otherwise French panel.
                      */}
                      {[
                        t("opps.places.burundi"),
                        t("opps.items.resilienceGrants.amount"),
                        t("hero.registrationRequired"),
                      ].map((chip) => (
                        <span key={chip} className="chip-muted">
                          {chip}
                        </span>
                      ))}
                    </div>

                    {/* The progress meter. `animate-soft-pulse` on the fill keeps
                        it alive without implying live data. */}
                    <div className="mt-4 rounded-xl bg-pine-950 p-3.5">
                      <div className="flex items-center justify-between text-step-eyebrow font-medium text-pine-200/70">
                        <span>{t("hero.applicationProgress")}</span>
                        <span className="text-gold-300">
                          {t("hero.stepProgress", { step: 3, total: 4 })}
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/12">
                        <div className="animate-soft-pulse h-full w-3/4 rounded-full bg-gradient-to-r from-pine-400 to-gold-300" />
                      </div>
                    </div>
                  </div>

                  {/* The stage strip: Discover -> Apply -> Decide -> Fund. */}
                  <div className="mt-5">
                    <div className="relative flex justify-between">
                      {/* The connector sits behind the dots, so the line is
                          drawn first and the nodes overlay it. */}
                      <span className="absolute left-0 right-0 top-2.5 h-px bg-gradient-to-r from-pine-200 via-pine-300 to-gold-300" />
                      {heroStageLabels.map((stage, index) => (
                        <div
                          key={stage}
                          className="relative flex flex-col items-center gap-1.5"
                        >
                          <span
                            className={`grid h-5 w-5 place-items-center rounded-full text-[0.55rem] font-bold ${
                              index <= 2
                                ? "bg-pine-700 text-white"
                                : "border-2 border-dashed border-pine-300 bg-white text-pine-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-[0.6rem] font-medium text-ink-soft">
                            {stage}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AppWindow>
            </div>
          </Reveal>

          {/* --- Floating cards ------------------------------------------------
              Three small cards that break out of the window's edges. Each is
              offset and given a different float period so the composition never
              moves in unison. On small viewports the middle one is hidden --
              three overlapping cards on a 360px screen is noise. */}
          <div className="pointer-events-none absolute -left-3 top-1/3 hidden animate-float-y rounded-2xl glass-strong px-4 py-3 shadow-lift sm:block lg:-left-10">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine-100 text-pine-700">
                <Icon name="folder" className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-pine-950">
                  {t("hero.mock.documentsReady")}
                </p>
                <p className="text-step-eyebrow text-ink-soft">
                  {t("hero.mock.documentsList")}
                </p>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -right-2 -top-6 hidden animate-float-y-slow rounded-2xl glass-strong px-4 py-3 shadow-lift sm:block lg:-right-8">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-100 text-gold-700">
                <Icon name="wallet" className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-pine-950">
                  {t("hero.mock.trancheReleased")}
                </p>
                <p className="text-step-eyebrow text-ink-soft">
                  {t("hero.mock.trancheAmount")}
                </p>
              </div>
            </div>
          </div>

          {/* The AI Assistant bubble. Bottom-left, offset furthest, and the
              slowest of the three. */}
          <div className="pointer-events-none absolute -bottom-7 left-2 hidden animate-float-y rounded-2xl bg-pine-950 px-4 py-3 text-white shadow-lift sm:block lg:-left-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
                <Icon name="sparkle" className="h-3.5 w-3.5 text-gold-300" />
              </span>
              <p className="text-xs font-medium">
                {t("hero.mock.askAi")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
