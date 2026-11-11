"use client";

/**
 * Product showcase.
 *
 * Five tabbed previews of the platform: opportunity discovery, the project
 * dashboard, application tracking, funding and payment monitoring, and the AI
 * Assistant. Each is a mock interface built from the same primitives as the rest
 * of the page, so the preview looks like the product rather than a screenshot of
 * something else.
 *
 * The tab bar follows the ARIA tabs pattern properly, which means:
 *   - `role="tablist"` with `aria-orientation="horizontal"`;
 *   - a roving `tabIndex` -- the selected tab is the only one in the tab order,
 *     so Tab moves past the tab bar instead of through all five tabs;
 *   - Arrow keys move between tabs, Home and End jump to the ends;
 *   - every `tab` has `aria-controls` and every `tabpanel` has `aria-labelledby`
 *     pointing back at it.
 *
 * Only the selected panel is mounted. The others are cheap to build but
 * non-trivial DOM, and a tab panel that is hidden with `display: none` is
 * correctly removed from the accessibility tree anyway, so mounting them would
 * cost bytes for nothing.
 *
 * Every mock is `aria-hidden`. The controls inside are not real, and a screen
 * reader reading five dead interfaces is worse than one that reads the tab
 * names and moves on.
 */
import { useRef, useState } from "react";
import { AppWindow } from "./app-window";
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { aiScript } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

/** The five panels, in tab order. `id` is used for the ARIA relationships. */
const tabs = [
  { id: "discovery", icon: "compass" as IconName },
  { id: "dashboard", icon: "layers" as IconName },
  { id: "applications", icon: "inbox" as IconName },
  { id: "funding", icon: "wallet" as IconName },
  { id: "ai", icon: "sparkle" as IconName },
];

/* -------------------------------------------------------------------------- */
/* Mock data -- UI fixtures, not platform data                                */
/* -------------------------------------------------------------------------- */

/**
 * Result rows for the discovery panel.
 *
 * Each row points at an existing opportunity key, so the mock and the discovery
 * section cannot describe the same call in two different ways. `metaIndex` names
 * a `showcase.mock.meta` entry and `statusKey` an interface status; both relabel
 * on a locale switch.
 */
const mockResults = [
  { key: "resilienceGrants", sectorKey: "climate", metaIndex: 0, match: 92, statusKey: "ui.status.open" },
  { key: "digitalAccess", sectorKey: "digital", metaIndex: 1, match: 81, statusKey: "ui.status.open" },
  { key: "youthEnterprise", sectorKey: "entrepreneurship", metaIndex: 2, match: 74, statusKey: "ui.status.upcoming" },
] as const;

/**
 * The dashboard's headline figures.
 *
 * `labelIndex` names a `showcase.stats` entry and `deltaIndex` a
 * `showcase.mock.deltas` entry. The numbers themselves are structural.
 */
const mockStats = [
  { labelIndex: 0, value: "4", deltaIndex: 0 },
  { labelIndex: 1, value: "7", deltaIndex: 1 },
  { labelIndex: 2, value: "112k", deltaIndex: 2 },
  { labelIndex: 3, value: "23", deltaIndex: 3 },
];

/** The activity feed on the dashboard. Indices address `showcase.mock.*`. */
const mockActivity = [
  { icon: "checkCircle" as IconName, textIndex: 0, whenIndex: 0 },
  { icon: "download" as IconName, textIndex: 1, whenIndex: 1 },
  { icon: "message" as IconName, textIndex: 2, whenIndex: 2 },
  { icon: "bell" as IconName, textIndex: 3, whenIndex: 3 },
];

/**
 * Application rows with their workflow status.
 *
 * `titleIndex` and `funderIndex` address the `showcase.mock` arrays. `statusKey`
 * is a catalogue key and `tone` is chosen to match it at render time, so the
 * pill's colour and its word cannot drift apart.
 */
const mockApplications = [
  { titleIndex: 0, funderIndex: 0, stage: 4, of: 6, statusKey: "ui.status.underReview", tone: "gold" as const },
  { titleIndex: 1, funderIndex: 1, stage: 6, of: 6, statusKey: "ui.status.decisionRecorded", tone: "pine" as const },
  { titleIndex: 2, funderIndex: 2, stage: 2, of: 6, statusKey: "ui.status.preparing", tone: "slate" as const },
];

/**
 * Disbursement schedule. `released` is a fraction of the tranche, `labelIndex`
 * a `showcase.tranches` index, `amountIndex` a `showcase.mock.amounts` index,
 * and `stateKey` a catalogue key.
 */
const mockDisbursements = [
  { labelIndex: 0, amountIndex: 0, released: 1, stateKey: "ui.status.released" },
  { labelIndex: 1, amountIndex: 1, released: 0.5, stateKey: "ui.status.inProgress" },
  { labelIndex: 2, amountIndex: 2, released: 0, stateKey: "ui.status.scheduled" },
];

/* -------------------------------------------------------------------------- */
/* Panel chrome                                                                */
/* -------------------------------------------------------------------------- */

/** A left sidebar of icon-only items, present on the three workspace panels. */
function MockSidebar({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="hidden w-14 shrink-0 flex-col items-center gap-1.5 border-r border-pine-900/8 bg-pine-50/50 py-4 sm:flex">
      <span className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-pine-800 text-white">
        <Icon name="layers" className="h-4 w-4" />
      </span>
      {tabs.slice(0, 4).map((tab, index) => (
        <span
          key={tab.id}
          className={`grid h-9 w-9 place-items-center rounded-lg ${
            index === activeIndex ? "bg-pine-100 text-pine-700" : "text-pine-300"
          }`}
        >
          <Icon name={tab.icon} className="h-4.5 w-4.5" />
        </span>
      ))}
    </div>
  );
}

/** A labelled figure inside a mock panel. */
function StatTile({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    /* `p-3` on the narrowest step. A stat tile is one of two across inside the
       mock window, so at 320px it gets roughly 115px of box and about 90px of
       content after padding. At `p-4` that leaves ~83px, and the uppercase
       tracked label is the binding constraint -- it wraps to three lines and
       the tile loses its square. This is mock content and `aria-hidden`, so the
       wrapping would be cosmetic, but a ragged row of four tiles is the first
       thing a phone screenshot shows. */
    <div className="rounded-2xl border border-pine-900/8 bg-white p-3 sm:p-4">
      <p className="text-step-eyebrow font-medium uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="display text-step-h3 mt-1.5 text-pine-950">{value}</p>
      <p className="mt-1 text-step-eyebrow text-pine-600">{delta}</p>
    </div>
  );
}

/** A small status pill, used consistently across the mock panels. */
function Pill({ children, tone = "pine" }: { children: React.ReactNode; tone?: "pine" | "gold" | "slate" }) {
  const tones = {
    pine: "bg-pine-100 text-pine-700",
    gold: "bg-gold-100 text-gold-700",
    slate: "bg-slate-100 text-slate-600",
  } as const;

  return (
    <span className={`rounded-full px-2.5 py-1 text-step-eyebrow font-bold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* The component                                                               */
/* -------------------------------------------------------------------------- */

export function Showcase() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Moves the selection and the focus together.
   *
   * Focus follows selection because this is the automatic-activation pattern:
   * arrow keys are expected to move through a tab bar, and requiring a second
   * keypress to see the panel is the manual pattern, which suits a tab bar that
   * triggers something expensive.
   */
  function select(index: number) {
    setActive(index);
    tabRefs.current[index]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        select((active + 1) % tabs.length);
        break;
      case "ArrowLeft":
        event.preventDefault();
        select((active - 1 + tabs.length) % tabs.length);
        break;
      case "Home":
        event.preventDefault();
        select(0);
        break;
      case "End":
        event.preventDefault();
        select(tabs.length - 1);
        break;
    }
  }

  return (
    /*
     * The id is `funding`, not `showcase`. The navbar's "Funding" item points
     * here, and this is the section that walks through the funding lifecycle end
     * to end -- opportunities, applications, disbursements, monitoring -- so the
     * anchor and the label describe the same thing. An id nothing links to is
     * not worth keeping.
     */
    <Section id="funding" tone="light">
      <SectionHeading
        eyebrow={t("showcase.eyebrow")}
        title={t("showcase.title")}
        description={t("showcase.description")}
        align="center"
      />

      <Reveal direction="up" delay={200}>
        {/* --- The tab bar ------------------------------------------------- */}
        <div
          role="tablist"
          aria-label={t("a11y.showcaseTabs")}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          // Wraps instead of scrolling sideways. The previous version was a
          // `no-scrollbar overflow-x-auto` carousel with a `mask-x-fade`, on the
          // reasoning that five tabs should stay on one row. Hiding the
          // scrollbar and fading the edges means a phone user sees a tab cut off
          // at the edge with nothing indicating they can drag it, and no
          // scrollbar to grab. `flex-wrap` reflows to two rows below `sm` and
          // stays a single row above it, where there is room anyway. The
          // roving tabindex and the arrow-key handling are unaffected, because
          // those depend on the order of the buttons, not on their layout.
          className="mx-auto mt-12 flex max-w-full flex-wrap justify-center gap-1.5 rounded-full border border-pine-900/8 bg-white/70 p-1.5 backdrop-blur"
        >
          {tabs.map((tab, index) => {
            const selected = index === active;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                // Roving tabindex: only the selected tab is reachable with Tab.
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                // `.tap` for the 44px minimum height. This tab row is the one
                // control in the section a touch user taps repeatedly, and the
                // `py-2.5` it replaces produced a 40px target, below the 44px
                // the platform guidance asks for.
                className={`tap inline-flex shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-all duration-400 ease-premium ${
                  selected
                    ? "bg-pine-800 text-white shadow-glow"
                    : "text-ink-muted hover:bg-pine-50 hover:text-pine-800"
                }`}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {t(`showcase.tabs.${tab.id}`)}
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* --- The panels ----------------------------------------------------- */}
      <Reveal direction="scale" delay={120}>
        <div
          role="tabpanel"
          id={`panel-${tabs[active].id}`}
          aria-labelledby={`tab-${tabs[active].id}`}
          // `tabIndex={0}` because a scrollable panel needs to be focusable so a
          // keyboard user can actually scroll it.
          tabIndex={0}
          className="mt-8 outline-none"
        >
          <div aria-hidden>
            {active === 0 && <DiscoveryPanel />}
            {active === 1 && <DashboardPanel />}
            {active === 2 && <ApplicationsPanel />}
            {active === 3 && <FundingPanel />}
            {active === 4 && <AiPanel />}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Panels                                                                      */
/* -------------------------------------------------------------------------- */

function DiscoveryPanel() {
  const { t, list } = useI18n();

  /** The three result subtitles, from `showcase.mock.meta`. */
  const resultMeta = list("showcase.mock.meta");

  return (
    <AppWindow address="global-opportunities.app/opportunities">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex min-w-[14rem] flex-1 items-center gap-2.5 rounded-xl border border-pine-900/8 bg-pine-50/60 px-3.5 py-2.5">
            <Icon name="search" className="h-4 w-4 text-pine-500" />
            <span className="text-sm text-ink-soft">{t("showcase.mock.search")}</span>
          </div>
          {/* The three facet controls, as static chips. These are the same
              facets the real discovery section has, with the same translated
              labels, so the preview shows the interface the reader is actually
              looking at rather than an English approximation of it. */}
          {[
            t("discovery.types.funding"),
            t("discovery.allSectors"),
            t("ui.status.open"),
          ].map((filter) => (
            <span
              key={filter}
              className="rounded-xl border border-pine-900/8 bg-white px-3 py-2.5 text-xs font-medium text-ink-muted"
            >
              {filter}
            </span>
          ))}
        </div>

        <ul className="mt-4 space-y-2.5">
          {mockResults.map((result) => (
            <li
              key={result.key}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-pine-900/8 bg-white p-4 transition-transform duration-500 ease-premium hover:translate-x-1"
            >
              {/*
                `basis-40` so the text column claims a readable minimum and the
                Pill drops to its own line when there is not enough room, and
                `flex-wrap` on the meta row so sector, dot and meta can stack.
                Without both, a 360px screen squeezed this column to 74px, the
                non-wrapping meta row spilled 39px past it, and because nothing
                on the path clips, the page itself scrolled sideways.
              */}
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-semibold text-pine-950">
                  {t(`opps.items.${result.key}.title`)}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-step-eyebrow text-ink-soft">
                  {t(`opps.sectors.${result.sectorKey}`)}
                  <span className="h-0.5 w-0.5 rounded-full bg-ink-soft" />
                  {resultMeta[result.metaIndex] ?? ""}
                </p>
              </div>

              {/*
                The tone follows the state, not the other way round: a listing
                that is open is pine, anything else is gold, because "upcoming"
                needs to read differently from "open" at a glance. Comparing the
                *key* is what keeps the colour and the word from disagreeing
                after a locale switch.
              */}
              <Pill tone={result.statusKey === "ui.status.open" ? "pine" : "gold"}>
                {t(result.statusKey)}
              </Pill>

              {/* The match score, as a labelled meter. The number is the value a
                  user would act on, so it is the part that is prominent. */}
              <div className="w-24">
                <div className="flex items-baseline justify-between">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-ink-soft">
                    {t("showcase.match")}
                  </span>
                  <span className="text-xs font-bold text-pine-800">{result.match}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-pine-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-pine-400 to-pine-600" style={{ width: `${result.match}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppWindow>
  );
}

function DashboardPanel() {
  const { t, list } = useI18n();

  /** The four figure names, from `showcase.stats` in the active locale. */
  const statLabels = list("showcase.stats");
  /** Deltas, activity text and timestamps are catalogue arrays too. */
  const statDeltas = list("showcase.mock.deltas");
  const activityText = list("showcase.mock.activity");
  const activityWhen = list("showcase.mock.when");
  const projectTitles = list("showcase.mock.applicationTitles");

  return (
    <AppWindow address="global-opportunities.app/dashboard">
      <div className="flex">
        <MockSidebar activeIndex={1} />
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* `flex-wrap` with a gap. The project name and the two status pills
                were a single non-wrapping row, and "Watershed restoration" plus
                an Active pill plus a completion percentage is more than a 320px
                screen holds -- the pair used to be pushed under the window
                chrome or clipped. Wrapping keeps the two states adjacent on a
                phone and side by side from `sm`. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-step-eyebrow font-semibold uppercase tracking-[0.16em] text-pine-600">
                  {t("showcase.project")}
                </p>
                <p className="display text-step-h4 mt-1 text-pine-950">
                  {projectTitles[0] ?? ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="pine">{t("ui.status.active")}</Pill>
                <span className="rounded-full border border-pine-900/10 px-3 py-1 text-step-eyebrow font-semibold text-ink-muted">
                  {t("showcase.complete")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {mockStats.map((stat) => (
              <StatTile
                key={stat.labelIndex}
                label={statLabels[stat.labelIndex] ?? ""}
                value={stat.value}
                delta={statDeltas[stat.deltaIndex] ?? ""}
              />
            ))}
          </div>

          {/* The stage rail: six stages with the fourth filled. */}
          <div className="mt-5 rounded-2xl border border-pine-900/8 bg-pine-50/50 p-4">
            <p className="text-step-eyebrow font-semibold uppercase tracking-wider text-ink-soft">
                {t("showcase.journey")}
              </p>
            <div className="mt-3 flex items-center gap-1">
              {[0, 1, 2, 3, 4, 5].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 flex-1 rounded-full ${
                    step < 4 ? "bg-pine-600" : step === 4 ? "bg-gold-400" : "bg-pine-200"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2.5 flex justify-between text-[0.6rem] font-medium text-ink-soft">
              <span>{t("showcase.actions.discover")}</span>
              <span className="text-gold-700">{t("showcase.actions.evaluate")}</span>
              <span>{t("showcase.actions.monitor")}</span>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5">
            {mockActivity.map((entry) => (
              <li key={entry.textIndex} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-pine-50 text-pine-600">
                  <Icon name={entry.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-pine-950">
                  {activityText[entry.textIndex] ?? ""}
                </span>
                <span className="shrink-0 text-step-eyebrow text-ink-soft">
                  {activityWhen[entry.whenIndex] ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppWindow>
  );
}

function ApplicationsPanel() {
  const { t, list } = useI18n();

  /** Project names and funders, from the `showcase.mock` arrays. */
  const titles = list("showcase.mock.applicationTitles");
  const funders = list("showcase.mock.funders");

  return (
    <AppWindow address="global-opportunities.app/applications">
      <div className="flex">
        <MockSidebar activeIndex={2} />
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <p className="display text-step-h4 text-pine-950">{t("showcase.applications")}</p>

          <ul className="mt-4 space-y-2.5">
            {mockApplications.map((application) => (
              <li key={application.titleIndex} className="rounded-2xl border border-pine-900/8 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-pine-950">
                    {titles[application.titleIndex] ?? ""}
                  </p>
                  <Pill tone={application.tone}>{t(application.statusKey)}</Pill>
                </div>
                <p className="mt-0.5 text-step-eyebrow text-ink-soft">
                  {funders[application.funderIndex] ?? ""}
                </p>

                {/* Stage meter: filled segments plus a count, so the position is
                    readable without counting the segments. */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: application.of }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full ${
                          index < application.stage ? "bg-pine-600" : "bg-pine-100"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="shrink-0 text-step-eyebrow font-semibold text-ink-soft">
                    {application.stage}/{application.of}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppWindow>
  );
}

function FundingPanel() {
  const { t, list } = useI18n();

  /** The three tranche names, from `showcase.tranches` in the active locale. */
  const trancheLabels = list("showcase.tranches");
  /** Amounts, dates and totals are catalogue values so the mock reads natively. */
  const amounts = list("showcase.mock.amounts");
  const paymentDates = list("showcase.mock.paymentDates");
  const paymentAmounts = list("showcase.mock.paymentAmounts");

  return (
    <AppWindow address="global-opportunities.app/funding">
      <div className="flex">
        <MockSidebar activeIndex={3} />
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-step-eyebrow font-semibold uppercase tracking-[0.16em] text-pine-600">
                {t("showcase.totalAwarded")}
              </p>
              <p className="display text-step-h3 mt-1 text-pine-950">
                {t("showcase.mock.totalAwarded")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-step-eyebrow font-semibold uppercase tracking-[0.16em] text-pine-600">
                {t("showcase.disbursed")}
              </p>
              <p className="display mt-1 text-3xl text-pine-600">
                {t("showcase.mock.disbursed")}
              </p>
            </div>
          </div>

          {/* The disbursement bars. Each is a labelled proportion, and the label
              carries the figure so the bar is never the only source of value. */}
          <div className="mt-5 space-y-3">
            {mockDisbursements.map((tranche) => (
              <div key={tranche.labelIndex}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-pine-950">
                    {trancheLabels[tranche.labelIndex] ?? ""}
                  </span>
                  <span className="text-ink-soft">
                    {amounts[tranche.amountIndex] ?? ""} &middot;{" "}
                    <span
                      className={
                        tranche.released === 1 ? "text-pine-600" : "text-ink-soft"
                      }
                    >
                      {t(tranche.stateKey)}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-pine-100">
                  <div
                    className={`h-full rounded-full ${
                      tranche.released === 1
                        ? "bg-pine-600"
                        : tranche.released > 0
                          ? "bg-gradient-to-r from-pine-500 to-gold-400"
                          : "bg-pine-200"
                    }`}
                    style={{ width: `${Math.max(tranche.released * 100, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* The payments table. A real `<table>` with a caption for the
              screen-reader column headers to attach to. */}
          <table className="mt-5 w-full text-left text-xs">
            <caption className="sr-only">{t("showcase.paymentsCaption")}</caption>
            <thead>
              <tr className="border-b border-pine-900/8 text-step-eyebrow uppercase tracking-wider text-ink-soft">
                <th scope="col" className="pb-2 font-semibold">
                  {t("showcase.th.reference")}
                </th>
                <th scope="col" className="pb-2 font-semibold">
                  {t("showcase.th.date")}
                </th>
                <th scope="col" className="pb-2 text-right font-semibold">
                  {t("showcase.th.amount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pine-900/6">
              {[
                { ref: "PAY-2041", index: 0 },
                { ref: "PAY-2078", index: 1 },
              ].map((payment) => (
                <tr key={payment.ref}>
                  <td className="py-2.5 font-mono text-step-eyebrow text-pine-800">{payment.ref}</td>
                  <td className="py-2.5 text-ink-muted">{paymentDates[payment.index] ?? ""}</td>
                  <td className="py-2.5 text-right font-semibold text-pine-950">
                    {paymentAmounts[payment.index] ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppWindow>
  );
}

function AiPanel() {
  const { t } = useI18n();

  return (
    <AppWindow address="global-opportunities.app/ai" flush>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-pine-900/8 pb-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-pine-950">
            <Icon name="sparkle" className="h-4.5 w-4.5 text-gold-300" />
          </span>
          <div>
            <p className="text-sm font-semibold text-pine-950">
              {t("ai.conversation.assistant")}
            </p>
            <p className="text-step-eyebrow text-ink-soft">{t("ai.conversation.status")}</p>
          </div>
          <Pill tone="pine">{t("ai.conversation.preview")}</Pill>
        </div>

        {/* The scripted conversation. Messages alternate sides; the assistant's
            are tinted so the turn is obvious at a glance. */}
        <div className="mt-4 space-y-3">
          {aiScript.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.from === "user"
                    ? "rounded-br-md bg-pine-800 text-white"
                    : "rounded-bl-md bg-pine-50 text-pine-950"
                }`}
              >
                {/* User turns are written in Kirundi on purpose -- see the
                    note in `lib/content.ts`. Assistant turns are catalogue
                    keys, so they follow the interface language. */}
                {"text" in message ? message.text : t(message.textKey)}
              </p>
            </div>
          ))}
        </div>

        {/* A disabled-looking composer. It is decorative, so it is a div with
            placeholder styling rather than a real input the reader cannot use. */}
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-pine-900/8 bg-pine-50/50 px-4 py-3">
          <Icon name="message" className="h-4 w-4 text-pine-400" />
          <span className="text-sm text-ink-soft">{t("ai.conversation.placeholder")}</span>
          <Icon name="send" className="ml-auto h-4 w-4 text-pine-400" />
        </div>
      </div>
    </AppWindow>
  );
}
