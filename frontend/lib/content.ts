/**
 * The structure of every piece of content on the landing page, in one place.
 *
 * Why a single data module rather than JSX literals: the page renders the same
 * content in four languages, and every sentence a reader sees lives in a locale
 * catalogue (`messages/<locale>/landing.json`), addressed by the keys exported
 * here. This file holds the shape -- icon names, ordering, dates, numbers, ids --
 * and the *keys* that point at the prose. It holds no display text of its own.
 *
 * The key convention, in one place:
 *
 *   - `labelKey` / `titleKey` / `detailKey` / `quoteKey` / `answerKey` are
 *     dot-separated paths resolved by `t()` in `lib/i18n.tsx`.
 *   - Arrays addressed by position (`features.items.3`, `how.details.3`) are
 *     index-aligned with the arrays here. `scripts/check-catalogue.cjs` enforces
 *     that alignment in all four locales.
 *   - Sample records are addressed by a stable camelCase `key`
 *     (`opps.items.resilienceGrants.title`), so reordering a list cannot attach
 *     one record's title to another record's summary.
 *
 * ---------------------------------------------------------------------------
 * HONESTY RULES FOR THIS FILE
 * ---------------------------------------------------------------------------
 * The specification asked for platform statistics, partner organisations, named
 * funders and user testimonials. None of those exist in this repository, and
 * inventing them would put false claims in front of funders and applicants. So
 * this file draws a hard line:
 *
 *   1. `capabilities` holds facts about the product that are true today -- four
 *      interface languages, nine journey stages, the module and role counts the
 *      backend actually defines. Nothing here is an adoption or usage number.
 *   2. `ecosystem` names actor *types* and their permissions, never a specific
 *      institution, ministry or fund. A real partner list is a marketing
 *      decision and a legal one, not a frontend one.
 *   3. `opportunities`, `showcaseProjects` and `testimonials` are illustrative
 *      samples. Each carries a `sample: true` flag that the UI surfaces as a
 *      visible badge, and each has a `GAP` note below. They demonstrate the
 *      layout and the filters. They must be replaced with API data, not promoted
 *      to real listings.
 *   4. Nothing is quietly implied: the sample notice is rendered on the page.
 *
 * All four locales carry the same keys. `scripts/check-catalogue.cjs` fails if
 * one is missing, and `scripts/scan-hardcoded.cjs` reports interface strings
 * that bypass the catalogues.
 */

/* -------------------------------------------------------------------------- */
/* Capabilities -- the statistics that are true of the product today           */
/* -------------------------------------------------------------------------- */

/**
 * Four numbers, each verifiable by reading the codebase.
 *
 * `value` is what the counter animates to. `labelKey` names the figure and
 * `detailKey` explains it, so the number is never bare.
 */
export const capabilities = [
  { value: 4, labelKey: "trust.lang", detailKey: "trust.details.0" },
  { value: 9, labelKey: "trust.steps", detailKey: "trust.details.1" },
  { value: 12, labelKey: "trust.modules", detailKey: "trust.details.2" },
  { value: 6, labelKey: "trust.roles", detailKey: "trust.details.3" },
] as const;

/**
 * Verification and security signals.
 *
 * Each one names a mechanism that exists in the backend -- the short title is a
 * translation key under `trust.signals` -- with an explanation of what it means
 * in practice.
 *
 * There is deliberately no mention of SOC 2, ISO 27001 or GDPR compliance: none
 * of those have been assessed, and claiming them on a landing page would be a
 * false statement.
 */
export const trustSignals = [
  { key: "auth", detailKey: "trust.signalDetails.auth" },
  { key: "docs", detailKey: "trust.signalDetails.docs" },
  { key: "notifications", detailKey: "trust.signalDetails.notifications" },
  { key: "structure", detailKey: "trust.signalDetails.structure" },
] as const;

/* -------------------------------------------------------------------------- */
/* Opportunity discovery                                                       */
/* -------------------------------------------------------------------------- */

/** The two listing types the platform distinguishes. */
export type OpportunityType = "Funding" | "Call for projects";

/** Filterable status. `Upcoming` listings are published but not yet accepting. */
export type OpportunityStatus = "Open" | "Upcoming";

/** One discovery card, expanded in place. */
export type Opportunity = {
  /** Stable key for React and for the details toggle. */
  id: string;
  /**
   * Catalogue key stem: `opps.items.<key>.{title,provider,amount,summary,
   * eligibility,documents}`. camelCase because a dot-separated path cannot carry
   * a hyphen and still resolve through `t()`.
   */
  key: string;
  type: OpportunityType;
  status: OpportunityStatus;
  /** Filter value, addressed as `opps.sectors.<sectorKey>`. */
  sectorKey: string;
  /** Filter value, addressed as `opps.locations.<locationKey>`. */
  locationKey: string;
  /** ISO 8601. Rendered through `Intl.DateTimeFormat` in the component. */
  deadline: string;
  /**
   * Always true today. Rendered as a visible "Sample" badge so no listing on the
   * page can be mistaken for a live call.
   */
  sample: true;
};

/**
 * Sample listings.
 *
 * GAP: replace with `GET /api/opportunities/` through TanStack Query. The
 * endpoint already supports `?search=`, `?sector=`, `?location=`, `?status=`,
 * `?opportunity_type=` and pagination, so the filter form in
 * `components/landing/discovery.tsx` can map almost one-to-one onto query
 * parameters. Keep the `sample` flag and the visible badge until the response
 * is genuinely live data.
 */
export const opportunities: Opportunity[] = [
  {
    id: "resilience-grants",
    key: "resilienceGrants",
    type: "Funding",
    status: "Open",
    sectorKey: "climate",
    locationKey: "burundiRegional",
    deadline: "2026-10-15",
    sample: true,
  },
  {
    id: "learning-communities",
    key: "learningCommunities",
    type: "Call for projects",
    status: "Open",
    sectorKey: "education",
    locationKey: "eastAfrica",
    deadline: "2026-11-02",
    sample: true,
  },
  {
    id: "youth-enterprise",
    key: "youthEnterprise",
    type: "Funding",
    status: "Upcoming",
    sectorKey: "entrepreneurship",
    locationKey: "regional",
    deadline: "2026-11-20",
    sample: true,
  },
  {
    id: "maternal-health",
    key: "maternalHealth",
    type: "Call for projects",
    status: "Open",
    sectorKey: "health",
    locationKey: "burundiNational",
    deadline: "2026-12-05",
    sample: true,
  },
  {
    id: "digital-access",
    key: "digitalAccess",
    type: "Funding",
    status: "Open",
    sectorKey: "digital",
    locationKey: "subSaharanAfrica",
    deadline: "2026-12-18",
    sample: true,
  },
  {
    id: "governance-civics",
    key: "governanceCivics",
    type: "Call for projects",
    status: "Upcoming",
    sectorKey: "governance",
    locationKey: "centralAfrica",
    deadline: "2027-01-09",
    sample: true,
  },
];

/**
 * The sector and location filter values, derived from the listings themselves.
 *
 * Deriving rather than hard-coding means a filter can never offer a value that
 * returns nothing. The values are stable keys: the select stores a key and the
 * label is translated at render time, so switching language mid-filter does not
 * empty the results (see the `ALL` sentinel in `discovery.tsx`).
 */
export const sectorKeys = Array.from(new Set(opportunities.map((item) => item.sectorKey)));

export const locationKeys = Array.from(new Set(opportunities.map((item) => item.locationKey)));

/* -------------------------------------------------------------------------- */
/* Features                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One row per capability the specification lists. The title is a translation key
 * (`features.items[n]`) and the explanation is `features.details[n]`, so the
 * order here must match the order in the catalogue.
 */
export const features = [
  { icon: "compass", titleKey: "features.items.0", detailKey: "features.details.0" },
  { icon: "layers", titleKey: "features.items.1", detailKey: "features.details.1" },
  { icon: "inbox", titleKey: "features.items.2", detailKey: "features.details.2" },
  { icon: "scale", titleKey: "features.items.3", detailKey: "features.details.3" },
  { icon: "wallet", titleKey: "features.items.4", detailKey: "features.details.4" },
  { icon: "receipt", titleKey: "features.items.5", detailKey: "features.details.5" },
  { icon: "folder", titleKey: "features.items.6", detailKey: "features.details.6" },
  { icon: "bell", titleKey: "features.items.7", detailKey: "features.details.7" },
  { icon: "sparkle", titleKey: "features.items.8", detailKey: "features.details.8" },
] as const;

/* -------------------------------------------------------------------------- */
/* How it works                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The nine stages of the journey.
 *
 * This sequence is the product's spine. Every screen, notification and
 * permission in the backend maps onto one of these stages, which is why the
 * titles are a translation array (`how.steps`) rather than per-stage keys: the
 * order is fixed and the two must not drift. `detailKey` and `outputKey` are
 * index-aligned with the same order.
 */
export const journeyStages = [
  { detailKey: "how.details.0", outputKey: "how.outputs.0" },
  { detailKey: "how.details.1", outputKey: "how.outputs.1" },
  { detailKey: "how.details.2", outputKey: "how.outputs.2" },
  { detailKey: "how.details.3", outputKey: "how.outputs.3" },
  { detailKey: "how.details.4", outputKey: "how.outputs.4" },
  { detailKey: "how.details.5", outputKey: "how.outputs.5" },
  { detailKey: "how.details.6", outputKey: "how.outputs.6" },
  { detailKey: "how.details.7", outputKey: "how.outputs.7" },
  { detailKey: "how.details.8", outputKey: "how.outputs.8" },
] as const;

/* -------------------------------------------------------------------------- */
/* Benefits                                                                    */
/* -------------------------------------------------------------------------- */

/** `titleKey` indexes `benefits.items`; `detailKey` indexes `benefits.details`. */
export const benefits = [
  { icon: "compass", titleKey: "benefits.items.0", detailKey: "benefits.details.0" },
  { icon: "inbox", titleKey: "benefits.items.1", detailKey: "benefits.details.1" },
  { icon: "layers", titleKey: "benefits.items.2", detailKey: "benefits.details.2" },
  { icon: "scale", titleKey: "benefits.items.3", detailKey: "benefits.details.3" },
  { icon: "wallet", titleKey: "benefits.items.4", detailKey: "benefits.details.4" },
  { icon: "folder", titleKey: "benefits.items.5", detailKey: "benefits.details.5" },
  { icon: "globe", titleKey: "benefits.items.6", detailKey: "benefits.details.6" },
  { icon: "sparkle", titleKey: "benefits.items.7", detailKey: "benefits.details.7" },
] as const;

/* -------------------------------------------------------------------------- */
/* Ecosystem                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The six actor types the platform is designed around.
 *
 * GAP: no organisation, funder or institution is named here. Publishing a
 * partner list requires written confirmation from each party, and a landing page
 * that implies a partnership which does not exist is a legal problem, not a
 * content gap. Add names under a separate `partners` export once they are
 * confirmed.
 */
export const ecosystemActors = [
  { icon: "building", titleKey: "ecosystem.actors.0", detailKey: "ecosystem.actorDetails.0", side: "left" },
  { icon: "landmark", titleKey: "ecosystem.actors.1", detailKey: "ecosystem.actorDetails.1", side: "right" },
  { icon: "users", titleKey: "ecosystem.actors.2", detailKey: "ecosystem.actorDetails.2", side: "left" },
  { icon: "user", titleKey: "ecosystem.actors.3", detailKey: "ecosystem.actorDetails.3", side: "right" },
  { icon: "scale", titleKey: "ecosystem.actors.4", detailKey: "ecosystem.actorDetails.4", side: "left" },
  { icon: "shield", titleKey: "ecosystem.actors.5", detailKey: "ecosystem.actorDetails.5", side: "right" },
] as const;

/** How the actors move through the platform, rendered under the hub diagram. */
export const ecosystemFlows = [
  { from: "organizations", to: "opportunities", labelKey: "ecosystem.flows.0" },
  { from: "applicants", to: "projects", labelKey: "ecosystem.flows.1" },
  { from: "projects", to: "applications", labelKey: "ecosystem.flows.2" },
  { from: "applications", to: "evaluators", labelKey: "ecosystem.flows.3" },
  { from: "evaluators", to: "funding", labelKey: "ecosystem.flows.4" },
  { from: "funding", to: "payments", labelKey: "ecosystem.flows.5" },
] as const;

/* -------------------------------------------------------------------------- */
/* Project showcase                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One project preview card. Sample content -- see the honesty rules.
 *
 * GAP (kept for reference): the live landing page loads posted projects from
 * `GET /api/public/projects/home/` through `components/landing/project-showcase.tsx`
 * and renders them with `PublicProjectCard`. This static set predates that
 * endpoint and is not currently imported; it is retained, translated, as the
 * documented sample shape.
 */
export type ShowcaseProject = {
  id: string;
  /** Catalogue stem: `projects.items.<key>.*`. */
  key: string;
  sectorKey: string;
  locationKey: string;
  /** 0-100. Drives the animated progress bar. */
  progress: number;
  /** Numeric figures stay structural; the unit labels are translated. */
  impact: { value: string; labelKey: string }[];
  sample: true;
};

export const showcaseProjects: ShowcaseProject[] = [
  {
    id: "watershed",
    key: "watershed",
    sectorKey: "climate",
    locationKey: "burundiNational",
    progress: 62,
    impact: [
      { value: "74 ha", labelKey: "projects.items.watershed.impact.0" },
      { value: "38", labelKey: "projects.items.watershed.impact.1" },
      { value: "6", labelKey: "projects.items.watershed.impact.2" },
    ],
    sample: true,
  },
  {
    id: "school-clubs",
    key: "schoolClubs",
    sectorKey: "education",
    locationKey: "eastAfrica",
    progress: 38,
    impact: [
      { value: "1,450", labelKey: "projects.items.schoolClubs.impact.0" },
      { value: "60", labelKey: "projects.items.schoolClubs.impact.1" },
      { value: "4", labelKey: "projects.items.schoolClubs.impact.2" },
    ],
    sample: true,
  },
  {
    id: "shared-connectivity",
    key: "sharedConnectivity",
    sectorKey: "digital",
    locationKey: "subSaharanAfrica",
    progress: 21,
    impact: [
      { value: "25", labelKey: "projects.items.sharedConnectivity.impact.0" },
      { value: "60", labelKey: "projects.items.sharedConnectivity.impact.1" },
      { value: "8,900", labelKey: "projects.items.sharedConnectivity.impact.2" },
    ],
    sample: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Impact                                                                      */
/* -------------------------------------------------------------------------- */

/** `titleKey` indexes `impact.items`; `detailKey` indexes `impact.details`. */
export const impactItems = [
  { icon: "compass", titleKey: "impact.items.0", detailKey: "impact.details.0" },
  { icon: "folder", titleKey: "impact.items.1", detailKey: "impact.details.1" },
  { icon: "scale", titleKey: "impact.items.2", detailKey: "impact.details.2" },
  { icon: "activity", titleKey: "impact.items.3", detailKey: "impact.details.3" },
  { icon: "link", titleKey: "impact.items.4", detailKey: "impact.details.4" },
] as const;

/* -------------------------------------------------------------------------- */
/* AI Assistant                                                                */
/* -------------------------------------------------------------------------- */

/** `titleKey` indexes `ai.capabilities`; `detailKey` indexes `ai.capabilityDetails`. */
export const aiCapabilities = [
  { icon: "compass", titleKey: "ai.capabilities.0", detailKey: "ai.capabilityDetails.0" },
  { icon: "scale", titleKey: "ai.capabilities.1", detailKey: "ai.capabilityDetails.1" },
  { icon: "folder", titleKey: "ai.capabilities.2", detailKey: "ai.capabilityDetails.2" },
  { icon: "sparkle", titleKey: "ai.capabilities.3", detailKey: "ai.capabilityDetails.3" },
  { icon: "globe", titleKey: "ai.capabilities.4", detailKey: "ai.capabilityDetails.4" },
  { icon: "inbox", titleKey: "ai.capabilities.5", detailKey: "ai.capabilityDetails.5" },
] as const;

/**
 * The scripted conversation shown in the AI Assistant preview.
 *
 * The user turns are written in Kirundi on purpose: the point of a multilingual
 * platform is that somebody can ask in the language they think in, and the
 * preview shows that rather than asserting it. The assistant replies are
 * catalogue keys, so they follow the reader's interface language.
 *
 * GAP: this is a hand-written illustration, not a transcript. The
 * `/api/ai/chat/` endpoint currently returns a fixed response with no retrieval
 * and no language handling (README section 3.2), so wiring this panel to the
 * endpoint would show the same canned string every time. The panel is labelled
 * as a preview, and the boundary sentence below it states the limit explicitly --
 * the assistant explains information, it does not decide.
 */
export const aiScript = [
  { from: "user" as const, text: "Noshobora gusaba aya mafaranga? Amafaranga ni angahe?" },
  { from: "assistant" as const, textKey: "ai.script.assistant.0" },
  { from: "user" as const, text: "Ni ibihe bisabwa?" },
  { from: "assistant" as const, textKey: "ai.script.assistant.1" },
] as const;

/* -------------------------------------------------------------------------- */
/* Multilingual experience                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The four languages, each with a line of interface text in that language.
 *
 * `native` is the language's own name, which is what the selector shows: someone
 * who cannot read the current interface language still has to be able to find
 * their own.
 *
 * `title` and `location` are written in the language itself, not translated from
 * English. That is the distinction the section is making: a listing published in
 * one language stays in that language in the record, and the interface around it
 * is what follows the reader -- which is why these values are not catalogue keys.
 *
 * GAP: the Swahili title is a constructed example rather than a real listing.
 * It is a sample inside a sample section, which is why the section carries a
 * visible note about the sample records.
 */
export const languageShowcase = [
  {
    code: "en",
    native: "English",
    sample: "Opportunities",
    gloss: "Funding calls and project invitations",
    title: "Clean Water Access for Rural Health Centres",
    location: "Northern Province",
  },
  {
    code: "fr",
    native: "Français",
    sample: "Opportunités",
    gloss: "Appels à projets et financements",
    title: "Accès à l'eau potable pour les centres de santé ruraux",
    location: "Province du Nord",
  },
  {
    code: "rn",
    native: "Kirundi",
    sample: "Amahirwe",
    gloss: "Amahirwe y'umfashanyo n'imigambi",
    title: "Amazi meza ku bigo nderabuzima vyo mu ntara",
    location: "Intara y'Amajyaruguru",
  },
  {
    code: "sw",
    native: "Kiswahili",
    sample: "Fursa",
    gloss: "Maiti ya ufadhili na miradi",
    title: "Fursa na Kupeleka Maji kwenye Vituo vya Afya",
    location: "Mkoa wa Kaskazini",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Testimonials                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Illustrative sample quotes.
 *
 * GAP: nobody has been interviewed yet. These are written as archetypes -- the
 * sentence an applicant, an organisation and an evaluator would recognise as
 * their own experience -- and they are attributed to a role, never to a person
 * or an organisation. The section renders the `notice` string visibly.
 *
 * Do not add a name, a photo or a logo to these. Replace the array with
 * approved, attributed statements before launch, or delete the section.
 */
export const testimonials = [
  { roleKey: "testimonials.roles.applicant", quoteKey: "testimonials.quotes.0" },
  { roleKey: "testimonials.roles.organization", quoteKey: "testimonials.quotes.1" },
  { roleKey: "testimonials.roles.evaluator", quoteKey: "testimonials.quotes.2" },
] as const;

/* -------------------------------------------------------------------------- */
/* Access model                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Role access, alongside the single free plan.
 *
 * GAP: there is no billing in the backend -- no subscription model, no invoice,
 * no payment provider -- so this section states the real access model rather
 * than showing tiers that cannot be purchased. The plan card is free because
 * applying is free; the role cards describe who can do what, which is enforced
 * through roles in `accounts` (though, per README section 6, role checks are not
 * yet wired into the permission classes). When a paid tier is ever added it
 * needs a backend to match, not just a card on this page.
 */
export const accessRoles = [
  { icon: "building", titleKey: "pricing.roles.organization", detailKey: "pricing.roleDetails.0" },
  { icon: "scale", titleKey: "pricing.roles.evaluator", detailKey: "pricing.roleDetails.1" },
  { icon: "shield", titleKey: "pricing.roles.administrator", detailKey: "pricing.roleDetails.2" },
] as const;

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

/** One question in the accordion. Question and answer are catalogue keys. */
export type Faq = {
  id: string;
  /** Category label key, used for the tag on each answer. */
  categoryKey: string;
  /** Question key in the locale catalogue: `faq.q.<id>`. */
  questionKey: string;
  /** Answer key in the locale catalogue: `faq.a.<id>`. */
  answerKey: string;
};

/**
 * The twelve questions, one per category plus two extra on the most common.
 *
 * Answers are deliberately bounded to what the platform does. Where a
 * capability is modelled but not yet enforced -- role checks, email
 * verification, token refresh -- the answer says so rather than promising
 * behaviour that is not there yet.
 */
export const faqs: Faq[] = [
  { id: "q1", categoryKey: "faq.cat.opportunities", questionKey: "faq.q.q1", answerKey: "faq.a.q1" },
  { id: "q2", categoryKey: "faq.cat.opportunities", questionKey: "faq.q.q2", answerKey: "faq.a.q2" },
  { id: "q3", categoryKey: "faq.cat.applications", questionKey: "faq.q.q3", answerKey: "faq.a.q3" },
  { id: "q4", categoryKey: "faq.cat.applications", questionKey: "faq.q.q4", answerKey: "faq.a.q4" },
  { id: "q5", categoryKey: "faq.cat.projects", questionKey: "faq.q.q5", answerKey: "faq.a.q5" },
  { id: "q6", categoryKey: "faq.cat.funding", questionKey: "faq.q.q6", answerKey: "faq.a.q6" },
  { id: "q7", categoryKey: "faq.cat.documents", questionKey: "faq.q.q7", answerKey: "faq.a.q7" },
  { id: "q8", categoryKey: "faq.cat.evaluation", questionKey: "faq.q.q8", answerKey: "faq.a.q8" },
  { id: "q9", categoryKey: "faq.cat.payments", questionKey: "faq.q.q9", answerKey: "faq.a.q9" },
  { id: "q10", categoryKey: "faq.cat.ai", questionKey: "faq.q.q10", answerKey: "faq.a.q10" },
  { id: "q11", categoryKey: "faq.cat.languages", questionKey: "faq.q.q11", answerKey: "faq.a.q11" },
  { id: "q12", categoryKey: "faq.cat.security", questionKey: "faq.q.q12", answerKey: "faq.a.q12" },
];

/* -------------------------------------------------------------------------- */
/* Final call to action                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The three audiences the closing section addresses, in the order the
 * specification lists them.
 */
export const finalActions = [
  {
    kind: "primary" as const,
    labelKey: "finalCta.primary",
    href: "#opportunities",
    detailKey: "finalCta.details.0",
  },
  {
    kind: "secondary" as const,
    labelKey: "finalCta.secondary",
    href: "/auth/account-type",
    detailKey: "finalCta.details.1",
  },
  {
    kind: "tertiary" as const,
    labelKey: "finalCta.tertiary",
    href: "/auth/account-type",
    detailKey: "finalCta.details.2",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The navbar and footer link sets.
 *
 * Every entry is an in-page anchor or an existing route. The previous version of
 * this page linked to `/opportunities`, `/ai`, `/about`, `/privacy` and `/terms`,
 * five of which 404 (README section 5.1); nothing here links to a route that does
 * not exist. Legal pages that are not written yet appear in `legalSoon`, rendered
 * as inert text with a "soon" marker, following the same convention the previous
 * version used for Jobs and Training.
 */
export const navLinks = [
  { key: "nav.home", href: "#home" },
  { key: "nav.opportunities", href: "#opportunities" },
  { key: "nav.funding", href: "#funding" },
  { key: "nav.projects", href: "#projects" },
  { key: "nav.about", href: "#about" },
  { key: "nav.ai", href: "#ai" },
] as const;

export const footerColumns = [
  {
    headingKey: "footer.explore",
    links: [
      { key: "nav.opportunities", href: "#opportunities" },
      { key: "nav.funding", href: "#funding" },
      { key: "nav.projects", href: "#projects" },
      { key: "nav.ai", href: "#ai" },
    ],
  },
  {
    headingKey: "footer.platform",
    links: [
      { key: "nav.about", href: "#about" },
      { key: "discovery.eyebrow", href: "#opportunities" },
      { key: "features.eyebrow", href: "#features" },
      { key: "faq.eyebrow", href: "#faq" },
    ],
  },
] as const;

/**
 * Legal and informational links that are not written yet.
 *
 * `href` is intentionally absent: there is no route to point at, so these render
 * as inert spans. When `/privacy` and `/terms` exist, move them into
 * `footerColumns` and give them a real `href`.
 */
export const legalSoon = [
  { key: "footer.security" },
  { key: "footer.accessibility" },
  { key: "languages.eyebrow" },
] as const;
