"use client";

/**
 * Platform features.
 *
 * The nine capabilities the specification lists, rendered as a bento grid: the
 * first two take half the row each, the remaining seven sit three per row. The
 * asymmetry is deliberate -- a uniform nine-card grid reads as a checklist, and
 * the two discovery-and-build features are the ones a first-time visitor should
 * see at double size.
 *
 * Card order follows `features` in `lib/content.ts`, and each card's title is a
 * translation key indexing `features.items` in the locale catalogue. **The two
 * arrays must stay in the same order** -- the index in `titleKey` is the link
 * between them.
 */
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { features } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function Features() {
  const { t } = useI18n();

  return (
    <Section id="features" tone="sunken">
      <SectionHeading
        eyebrow={t("features.eyebrow")}
        title={t("features.title")}
        description={t("features.description")}
      />

        {/*
          1 column, then 2, then 4.

          This was `lg:grid-cols-6` with the wide cards spanning 3 and the narrow
          ones spanning 2. Those numbers only work if the row divides evenly:
          3 + 3 = 6 fills the first row, but 2 + 2 + 2 = 6 leaves the fourth
          narrow card alone on a second row with two empty cells beside it --
          a visibly ragged last row at exactly the width where the grid is
          supposed to look deliberate. A 4-column track makes both rows divide:
          2 + 2 for the wide pair, 1 + 1 + 1 + 1 for the narrow four.
        */}
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" step={70}>
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.titleKey}
            icon={feature.icon as IconName}
            title={t(feature.titleKey)}
            detail={t(feature.detailKey)}
            // The first two cards are the wide ones. Computed rather than
            // hard-coded per item so reordering `features` cannot leave a
            // half-width card in a full-width slot.
            wide={index < 2}
          />
        ))}
      </Stagger>
    </Section>
  );
}

function FeatureCard({
  icon,
  title,
  detail,
  wide,
  staggerIndex,
  staggerStep,
}: {
  icon: IconName;
  title: string;
  detail: string;
  wide: boolean;
  /**
   * Injected by `<Stagger>` through `cloneElement`, then forwarded to the
   * `Reveal` that forms the card's root.
   *
   * Both props have to be forwarded. Forwarding only `staggerIndex` compiles
   * and renders without complaint, because `Reveal` defaults `staggerStep` to
   * 70 -- the same value this grid happens to use. The two agreeing is luck, so
   * changing `step` on the `Stagger` above would silently do nothing until
   * someone noticed the cards no longer cascade.
   */
  staggerIndex?: number;
  staggerStep?: number;
}) {
  return (
    <Reveal
      direction="up"
      staggerIndex={staggerIndex}
      staggerStep={staggerStep}
      className={`group relative overflow-hidden rounded-3xl border border-pine-900/8 bg-white transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:border-pine-700/20 hover:shadow-lift ${
        // `self-start` stops a short card in the wide row stretching to match
        // its neighbour, which would leave a large empty area beneath it.
        wide ? "sm:col-span-2 lg:col-span-2" : "lg:col-span-1"
      }`}
    >
      {/* The hover wash. A soft gradient that fades in from the top-left, under
          the icon, so the card appears to light up rather than just move. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pine-50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className={`relative ${wide ? "p-7" : "p-6"}`}>
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pine-50 text-pine-700 transition-all duration-500 ease-spring group-hover:scale-105 group-hover:bg-pine-800 group-hover:text-white">
            <Icon name={icon} className="h-5.5 w-5.5" strokeWidth={1.7} />
          </span>

          {/* The arrow only appears on hover, and it travels. Hidden entirely on
              touch, where there is no hover state to trigger it -- it is
              `aria-hidden` and carries no information the title does not. */}
          <Icon
            name="arrowUpRight"
            aria-hidden
            className="hidden h-5 w-5 -translate-x-1 text-pine-400 opacity-0 transition-all duration-500 ease-premium group-hover:translate-x-0 group-hover:opacity-100 sm:block"
          />
        </div>

        <h3 className={`display text-step-h3 mt-6 text-pine-950 ${wide ? "" : "text-step-h4"}`}>
          {title}
        </h3>
        <p className="mt-2.5 text-pretty text-sm leading-6 text-ink-muted">{detail}</p>
      </div>
    </Reveal>
  );
}
