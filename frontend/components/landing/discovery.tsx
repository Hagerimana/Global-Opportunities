"use client";

/**
 * Opportunity discovery: search, filters, and the result cards.
 *
 * GAP: the listings come from `opportunities` in `lib/content.ts`, not from the
 * API. `GET /api/opportunities/` already supports `?search=`, `?sector=`,
 * `?location=`, `?status=`, `?opportunity_type=` and page-number pagination, so
 * the intended next step is to move the filter state into a query-key and render
 * the response here. The filtering logic below -- four facets combined with a
 * free-text term -- maps onto those parameters almost one to one, and the
 * facet lists are already derived from the data so they cannot offer a value
 * that returns nothing.
 *
 * Until that happens every card carries a visible "Sample" badge, and the
 * provider names are generic. See the honesty rules in `lib/content.ts`.
 *
 * Two accessibility decisions in the filtering UI:
 *
 * - **The result count is a live region.** Filtering changes how many results
 *   there are with no navigation, so a screen-reader user has no other way to
 *   find out. `aria-live="polite"` announces the new count without interrupting.
 * - **The expanded detail is a real disclosure, not a hover.** It is a button
 *   with `aria-expanded` and `aria-controls`, and the panel is always in the DOM,
 *   so the relationship between the two is programmatic rather than visual.
 */
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { locationKeys, opportunities, sectorKeys, type Opportunity } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

/**
 * One listing with its catalogue strings resolved.
 *
 * The shape in `lib/content.ts` holds only keys and structural facts (dates,
 * enums, ids). The card renders this view instead, built once per locale in the
 * `useMemo` below, so a language switch relabels every card -- title, summary,
 * criteria, documents, sector and location -- without the sample data itself
 * carrying four copies of every sentence.
 */
type TranslatedOpportunity = Opportunity & {
  title: string;
  provider: string;
  amount: string;
  summary: string;
  eligibility: string[];
  documents: string[];
  sector: string;
  location: string;
};

/** Resolves one listing's keys against the active catalogue. */
function translateOpportunity(
  item: Opportunity,
  t: (path: string) => string,
  list: (path: string) => string[],
): TranslatedOpportunity {
  const stem = `opps.items.${item.key}`;
  return {
    ...item,
    title: t(`${stem}.title`),
    provider: t(`${stem}.provider`),
    amount: t(`${stem}.amount`),
    summary: t(`${stem}.summary`),
    eligibility: list(`${stem}.eligibility`),
    documents: list(`${stem}.documents`),
    sector: t(`opps.sectors.${item.sectorKey}`),
    location: t(`opps.locations.${item.locationKey}`),
  };
}

/**
 * The "no filter applied" value for every facet.
 *
 * This is deliberately a locale-independent sentinel rather than the translated
 * "All" string. Storing a translated label in state means the state and the
 * option list disagree the moment the reader changes language: the select would
 * fall back to its first option, and the facet comparison would match nothing,
 * silently emptying the results. Every facet therefore holds `ALL` or a real
 * value, and the label is applied only at render time.
 */
const ALL = "all";

/** A `type` filter value. `ALL` disables that facet. */
type TypeFilter = typeof ALL | "Funding" | "Call for projects";

/**
 * Formats a deadline for display.
 *
 * `Intl.DateTimeFormat` is given the active locale so the date reads naturally
 * in each language. Not every locale the platform offers has a full CLDR date
 * implementation in every runtime -- Kirundi in particular can throw -- so the
 * construction is wrapped and falls back to a plain English format. A wrong
 * language on a date is a small problem; an exception in a render is a broken
 * page.
 */
function formatDeadline(iso: string, locale: string) {
  const date = new Date(iso);
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }
}

/**
 * Whole days from today until the deadline, or `null` once it has passed.
 *
 * Computed rather than hard-coded so the sample listings degrade honestly: a
 * listing whose date has gone by reads "Closed" instead of pretending to still
 * be open.
 */
function daysUntil(iso: string) {
  const milliseconds = new Date(iso).getTime() - Date.now();
  return Math.ceil(milliseconds / 86_400_000);
}

/** One filter control. A labelled `select` is the right control here: the option
 *  list is short, and a native select is fully usable on a phone.
 *
 *  Options are `{ value, label }` pairs rather than bare strings, so the stored
 *  value can stay locale-independent while the visible label is translated. A
 *  string-only option list forces one of the two to be wrong. */
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full cursor-pointer appearance-none rounded-xl border border-pine-900/10 bg-white py-3 pl-4 pr-10 text-sm font-medium text-pine-900 outline-none transition-colors duration-300 hover:border-pine-700/25 focus:border-pine-600 focus:ring-2 focus:ring-pine-600/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-500"
      />
    </label>
  );
}

export function Discovery() {
  const { t, list, locale } = useI18n();

  // --- Filter state --------------------------------------------------------
  // Every facet holds `ALL` or a real value. Never a translated label; see `ALL`.
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>(ALL);
  const [sector, setSector] = useState(ALL);
  const [location, setLocation] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  /** Id of the card whose detail panel is open. Only one at a time. */
  const [expanded, setExpanded] = useState<string | null>(null);

  /** True when any facet differs from its default, which drives the reset button. */
  const isFiltered =
    query !== "" ||
    type !== ALL ||
    sector !== ALL ||
    location !== ALL ||
    status !== ALL;

  /**
   * The visible listings.
   *
   * `useMemo` keyed on the four filter values: the array is small, but the memo
   * also stops the card list re-rendering on unrelated parent renders such as a
   * scroll state change in the navbar.
   *
   * The free-text term matches the title, the sector and the summary. The
   * API-backed version should also search provider and location, which
   * `/api/opportunities/` supports through the same `?search=` parameter.
   */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return opportunities
      // Resolve every listing's catalogue keys first, then filter on the text a
      // reader actually sees. Filtering the raw keys would make the search match
      // `resilienceGrants` instead of "Community resilience grants".
      .map((item) => translateOpportunity(item, t, list))
      .filter((item) => {
        if (type !== ALL && item.type !== type) return false;
        // Facet values are stable keys; only the labels are translated.
        if (sector !== ALL && item.sectorKey !== sector) return false;
        if (location !== ALL && item.locationKey !== location) return false;
        if (status !== ALL && item.status.toLowerCase() !== status) return false;
        if (!needle) return true;

        return `${item.title} ${item.provider} ${item.sector} ${item.summary}`
          .toLowerCase()
          .includes(needle);
      });
  }, [query, type, sector, location, status, t, list]);

  /** Returns every facet to its default and closes any open panel. */
  function reset() {
    setQuery("");
    setType(ALL);
    setSector(ALL);
    setLocation(ALL);
    setStatus(ALL);
    setExpanded(null);
  }

  const allOption = { value: ALL, label: t("discovery.all") };

  /*
   * The facet option lists.
   *
   * The type and status values are catalogue keys, because they are interface
   * chrome that a reader has to recognise. The sector and location values come
   * from the sample data and stay exactly as the data spells them, so selecting
   * "Climate & environment" and then reading the card shows the same string
   * twice rather than two different renderings of it.
   */
  const typeOptions = [
    allOption,
    { value: "Funding", label: t("discovery.types.funding") },
    { value: "Call for projects", label: t("discovery.types.projects") },
  ];
  const statusOptions = [
    allOption,
    { value: "open", label: t("ui.status.open") },
    { value: "upcoming", label: t("ui.status.upcoming") },
  ];
  const sectorOptions = [
    allOption,
    ...sectorKeys.map((key) => ({ value: key, label: t(`opps.sectors.${key}`) })),
  ];
  const locationOptions = [
    allOption,
    ...locationKeys.map((key) => ({ value: key, label: t(`opps.locations.${key}`) })),
  ];

  return (
    <Section id="opportunities">
      <SectionHeading
        eyebrow={t("discovery.eyebrow")}
        title={t("discovery.title")}
        description={t("discovery.description")}
      />

      {/* --- The filter bar -------------------------------------------------
          A single frosted panel holding the search field and the four facets.
          On wide viewports they sit in one row; below `lg` they stack, with the
          search field first because it is the one people reach for. */}
      <Reveal direction="up" delay={180}>
        <div className="glass mt-10 rounded-3xl p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
            <label className="relative block">
              <span className="sr-only">{t("discovery.searchLabel")}</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-pine-500"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("discovery.placeholder")}
                className="w-full rounded-xl border border-pine-900/10 bg-white py-3 pl-11 pr-4 text-sm text-pine-900 outline-none transition-colors duration-300 placeholder:text-ink-soft hover:border-pine-700/25 focus:border-pine-600 focus:ring-2 focus:ring-pine-600/20"
              />
            </label>

            <Filter
              label={t("discovery.type")}
              value={type}
              // The select yields a plain string; `TypeFilter` is a subset of
              // that, so the cast is a narrowing assertion rather than a hope.
              // The two non-`ALL` values are the only options the control offers.
              onChange={(next) => setType(next as TypeFilter)}
              options={typeOptions}
            />
            <Filter label={t("discovery.sector")} value={sector} onChange={setSector} options={sectorOptions} />
            <Filter
              label={t("discovery.location")}
              value={location}
              onChange={setLocation}
              options={locationOptions}
            />
            <Filter label={t("discovery.status")} value={status} onChange={setStatus} options={statusOptions} />
          </div>

          {/* Result count and the reset control. The count is the live region
              discussed in the file comment. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <p aria-live="polite" className="text-sm text-ink-muted">
              <span className="font-semibold text-pine-900">{visible.length}</span> {t("discovery.results")}
              {/* The sample notice rides with the count rather than sitting
                  above the grid, so it is impossible to read the results without
                  seeing it. */}
              <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-2.5 py-1 text-[0.7rem] font-semibold text-gold-700">
                <Icon name="eye" className="h-3 w-3" />
                {t("discovery.sampleNotice")}
              </span>
            </p>

            {isFiltered && (
              <button
                type="button"
                onClick={reset}
                className="tap inline-flex items-center gap-1.5 rounded-full px-3 text-sm font-medium text-pine-700 transition-colors duration-300 hover:bg-pine-50"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
                {t("actions.reset")}
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {/* --- The results ---------------------------------------------------- */}
      {visible.length === 0 ? (
        <Reveal direction="up" delay={120}>
          <div className="mt-8 rounded-3xl border border-dashed border-pine-900/15 bg-white/60 px-8 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pine-50 text-pine-500">
              <Icon name="search" className="h-6 w-6" />
            </span>
            <p className="mx-auto mt-5 max-w-sm text-pretty text-ink-muted">{t("discovery.empty")}</p>
            <button type="button" onClick={reset} className="btn-outline mt-6">
              {t("actions.reset")}
            </button>
          </div>
        </Reveal>
      ) : (
        /*
         * One column, then two, then three -- at 768, 1024, 1280.
         *
         * This was `md:grid-cols-2 xl:grid-cols-3`, which left the whole band
         * between 768px and 1280px stuck at two columns. An opportunity card is
         * dense: a title, a funder, three chips, a deadline and a match meter.
         * Two of those across a 1024px tablet gives each card ~460px, which is
         * roomy for a card that wants to be scanned, and at 1279px it is worse
         * than that. Adding the `lg` step means the third column appears as soon
         * as there is genuinely space for it.
         *
         * This is a block comment rather than a JSX comment because it sits in
         * the false branch of a ternary -- a JavaScript expression position, not
         * a JSX children position, so the JSX comment form is a syntax error.
         */
        <Stagger className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" step={80}>
          {visible.map((item) => (
            <OpportunityCard
              key={item.id}
              item={item}
              locale={locale}
              expanded={expanded === item.id}
              onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
            />
          ))}
        </Stagger>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

type CardProps = {
  item: TranslatedOpportunity;
  locale: string;
  expanded: boolean;
  onToggle: () => void;
  /**
   * Injected by `<Stagger>` through `cloneElement`, then forwarded to the
   * `Reveal` that forms the card's root. The card has to be a direct child of
   * the `Stagger` for this to work, which is why the stagger wrapper is not
   * simply placed around the grid.
   */
  staggerIndex?: number;
  staggerStep?: number;
};

function OpportunityCard({
  item,
  locale,
  expanded,
  onToggle,
  staggerIndex,
  staggerStep,
}: CardProps) {
  const { t } = useI18n();

  const remaining = daysUntil(item.deadline);
  const closed = remaining !== null && remaining < 0;

  /** Status pill colour and label. A closed listing is stated, not hidden. */
  const statusTone =
    item.status === "Open" && !closed
      ? "bg-pine-100 text-pine-700"
      : closed
        ? "bg-slate-100 text-slate-600"
        : "bg-gold-100 text-gold-700";

  /*
   * The status word, translated.
   *
   * `item.status` is the sample data's own value ("Open" / "Upcoming") and is
   * what the facet filters against, so it is not replaced here -- a reader who
   * filters by "Ouvert" and then reads "Open" on the card has been given two
   * names for one thing. The label is mapped from the catalogue instead, and a
   * past-deadline listing is stated as closed rather than hidden.
   */
  const statusLabel = closed
    ? t("ui.status.closed")
    : item.status === "Open"
      ? t("ui.status.open")
      : t("ui.status.upcoming");

  return (
    <Reveal
      as="article"
      staggerIndex={staggerIndex}
      staggerStep={staggerStep}
      className={`ring-conic group relative flex flex-col rounded-3xl border bg-white p-6 transition-all duration-500 ease-premium ${
        expanded
          ? "border-pine-700/25 shadow-lift"
          : "border-pine-900/8 shadow-soft hover:-translate-y-1.5 hover:border-pine-700/20 hover:shadow-lift"
      }`}
    >
      {/* --- Type and status ------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-step-eyebrow font-bold uppercase tracking-wider ${
            item.type === "Funding" ? "bg-pine-100 text-pine-700" : "bg-gold-100 text-gold-700"
          }`}
        >
          {item.type === "Funding" ? t("discovery.types.funding") : t("discovery.types.projects")}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-step-eyebrow font-bold uppercase tracking-wider ${statusTone}`}>
          {statusLabel}
        </span>
        {item.sample && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-pine-900/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-ink-soft">
            <Icon name="eye" className="h-2.5 w-2.5" />
            {t("ui.sample")}
          </span>
        )}
      </div>

      {/* --- Title and summary ---------------------------------------------- */}
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-pine-600">
        {item.sector}
      </p>
      <h3 className="display text-step-h3 mt-2 text-balance leading-snug text-pine-950">{item.title}</h3>
      <p className="mt-2.5 text-sm leading-6 text-ink-muted">{item.summary}</p>

      {/* --- The metadata grid -----------------------------------------------
          Two columns on a phone, three on a card wide enough. Each cell is a
          `dt`/`dd` pair wrapped in a `div`, which is valid inside a `dl` and
          keeps the label-value relationship programmatic. */}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-pine-900/8 pt-5 text-sm">
        <div className="col-span-2">
          <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Icon name="building" className="h-3.5 w-3.5" />
            {t("discovery.labels.amount")}
          </dt>
          <dd className="mt-1 font-semibold text-pine-950">{item.amount}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            {t("discovery.labels.deadline")}
          </dt>
          <dd className="mt-1 font-semibold text-pine-950">
            {formatDeadline(item.deadline, locale)}
            {remaining !== null && remaining >= 0 && (
              <span className="ml-1.5 text-xs font-medium text-ink-soft">({remaining}d)</span>
            )}
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Icon name="mapPin" className="h-3.5 w-3.5" />
            {t("discovery.labels.location")}
          </dt>
          <dd className="mt-1 font-semibold text-pine-950">{item.location}</dd>
        </div>
      </dl>

      {/* --- Eligibility highlights ------------------------------------------
          The first two criteria only. The full list is in the panel; showing
          all of them here would make every card the same length and bury the
          metadata. */}
      <ul className="mt-4 space-y-1.5">
        {item.eligibility.slice(0, 2).map((criterion) => (
          <li key={criterion} className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
            <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-500" />
            {criterion}
          </li>
        ))}
      </ul>

      {/* --- The disclosure -------------------------------------------------- */}
      <div className="mt-auto pt-5">
        {/*
          `.tap` supplies the 44px minimum height (WCAG 2.2 SC 2.5.8 asks 24,
          the platform guidance asks 44) and kills the double-tap delay. The
          `py-2.5` it replaces gave a 40px control, which clears the letter but
          not the finger -- and this is the primary action on the card.
        */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`detail-${item.id}`}
          className="tap flex w-full items-center justify-between rounded-xl border border-pine-900/10 bg-pine-50/50 px-4 text-sm font-semibold text-pine-800 transition-colors duration-300 hover:border-pine-700/25 hover:bg-pine-50"
        >
          {expanded ? t("actions.hideDetails") : t("actions.viewDetails")}
          <Icon
            name="chevronDown"
            className={`h-4 w-4 transition-transform duration-400 ease-premium ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Always rendered, height animated. Keeping the panel mounted means the
            `aria-controls` relationship stays valid and the content is in the
            accessibility tree before it is shown. */}
        <div
          id={`detail-${item.id}`}
          // `grid-rows` is animated from 0fr to 1fr, which is the only way to
          // transition to an unknown content height without measuring it.
          className={`grid transition-all duration-600 ease-premium ${
            expanded ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-2xl bg-pine-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine-700">
                {t("discovery.labels.eligibility")}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {item.eligibility.map((criterion) => (
                  <li key={criterion} className="flex items-start gap-2 text-xs leading-5 text-ink-muted">
                    <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine-500" />
                    {criterion}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-pine-700">
                {t("discovery.labels.documents")}
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {item.documents.map((document) => (
                  <li key={document} className="chip">
                    <Icon name="fileText" className="h-3 w-3 text-pine-500" />
                    {document}
                  </li>
                ))}
              </ul>

              <a
                href="#ai"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-pine-700 transition-colors duration-300 hover:text-pine-900"
              >
                <Icon name="sparkle" className="h-3.5 w-3.5" />
                {t("actions.askAi")}
                <Icon name="arrowRight" className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
