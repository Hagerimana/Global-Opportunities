"use client";

/**
 * The organisations and funding ecosystem.
 *
 * A hub-and-spoke diagram: the platform in the middle, the six actor types
 * around it, and the flow of work underneath.
 *
 * The connector lines are one SVG with a `0 0 100 100` viewBox and
 * `preserveAspectRatio="none"`, positioned absolutely behind the grid. Because
 * the viewBox is in percent-like units, the lines land on the same coordinates
 * the grid places the cards at -- 50/50 for the hub, and 0 or 100 horizontally
 * for the two columns -- at any container size, with no measurement and no
 * JavaScript. `vector-effect="non-scaling-stroke"` keeps the line one pixel
 * wide instead of letting it stretch with the aspect ratio.
 *
 * Below `lg` the diagram collapses to a single column: the hub first, then the
 * actors as a plain two-column list. The SVG is hidden there, because a
 * connector pointing at a layout that no longer exists would be a lie.
 *
 * No organisation is named. See the GAP note on `ecosystemActors` in
 * `lib/content.ts`.
 */
import { AmbientBackdrop } from "@/components/ui/ambient";
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { ecosystemActors, ecosystemFlows } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

/**
 * The row each actor's card occupies in the three-by-three grid.
 *
 * Written as literal class strings rather than interpolated, because Tailwind
 * extracts class names by scanning the source text: `lg:row-start-${index}` would
 * produce nothing in the built CSS. Three actors, three rows, first three on the
 * left, last three on the right.
 */
const rowClasses = ["lg:row-start-1", "lg:row-start-2", "lg:row-start-3"] as const;

/** The same layout expressed as percentages, for the connector lines. */
const anchorPoints = [
  [0, 16.67],
  [0, 50],
  [0, 83.33],
  [100, 16.67],
  [100, 50],
  [100, 83.33],
] as const;

export function Ecosystem() {
  const { t, list } = useI18n();
  const actorNames = list("ecosystem.actors");

  return (
    /*
     * The id is `about`, not `ecosystem`. The previous version of the page linked
     * to `/about`, which 404s, and this is the section that answers the question
     * an About page would answer: what the platform is, who acts on it and how
     * they relate. Nothing else links to `#ecosystem`, so no anchor is lost.
     */
    <Section id="about" tone="dark" dark>
      <AmbientBackdrop variant="dark" />

      <SectionHeading
        eyebrow={t("ecosystem.eyebrow")}
        title={t("ecosystem.title")}
        description={t("ecosystem.description")}
        dark
        align="center"
      />

      {/* --- The diagram ---------------------------------------------------- */}
      <div className="relative mt-18">
        {/* Connectors, behind everything. `hidden lg:block` because the stacked
            layout below has no meaningful connector. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
        >
          <defs>
            {/* One gradient, referenced by all six lines, so they read as a
                single system rather than six separate strokes. */}
            <linearGradient id="eco-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5dae8a" stopOpacity=".15" />
              <stop offset="50%" stopColor="#e9ba5a" stopOpacity=".55" />
              <stop offset="100%" stopColor="#5dae8a" stopOpacity=".15" />
            </linearGradient>
          </defs>

          {anchorPoints.map(([x, y], index) => (
            <line
              key={index}
              x1={x}
              y1={y}
              x2="50"
              y2="50"
              stroke="url(#eco-line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div className="relative grid gap-4 lg:grid-cols-3 lg:grid-rows-3 lg:gap-6">
          {/* Left column actors */}
          {ecosystemActors.slice(0, 3).map((actor, index) => (
            <ActorCard
              key={actor.titleKey}
              icon={actor.icon as IconName}
              title={actorNames[index] ?? ""}
              detail={t(actor.detailKey)}
              className={`lg:col-start-1 lg:self-center ${rowClasses[index]}`}
            />
          ))}

          {/* The hub. Centred on `lg`, first in the flow on a phone. */}
          <Reveal
            direction="scale"
            className="order-first lg:order-none lg:col-start-2 lg:row-start-2 lg:self-center"
          >
            <div className="glass-dark relative overflow-hidden rounded-3xl p-7 text-center">
              {/* A slow-rotating conic ring behind the mark, so the centre of
                  the diagram is the most alive thing on the section. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-px animate-spin-slow opacity-60"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(233,186,90,.5) 90deg, transparent 200deg, rgba(93,174,138,.4) 300deg, transparent 360deg)",
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: 1,
                }}
              />
              <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-gold-300">
                <Icon name="globe" className="h-7 w-7" strokeWidth={1.5} />
              </span>
              <p className="display relative mt-5 text-xl text-white">Global Opportunities</p>
              <p className="relative mt-2 text-sm text-pine-200/75">
                {t("ecosystem.hubLabel")}
              </p>
            </div>
          </Reveal>

          {/* Right column actors */}
          {ecosystemActors.slice(3).map((actor, index) => (
            <ActorCard
              key={actor.titleKey}
              icon={actor.icon as IconName}
              title={actorNames[index + 3] ?? ""}
              detail={t(actor.detailKey)}
              className={`lg:col-start-3 lg:self-center ${rowClasses[index]}`}
            />
          ))}
        </div>
      </div>

      {/* --- The flow ------------------------------------------------------- */}
      <Stagger className="mt-18 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" step={60}>
        {ecosystemFlows.map((flow) => (
          <Reveal
            key={`${flow.from}-${flow.to}`}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur transition-colors duration-500 hover:bg-white/10"
          >
            <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-gold-300" />
            <p className="text-sm text-pine-100">{t(flow.labelKey)}</p>
          </Reveal>
        ))}
      </Stagger>
    </Section>
  );
}

function ActorCard({
  icon,
  title,
  detail,
  className = "",
}: {
  icon: IconName;
  title: string;
  detail: string;
  className?: string;
}) {
  return (
    <Reveal direction="up" className={className}>
      <div className="group h-full rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-pine-100 transition-all duration-500 ease-spring group-hover:bg-gold-400 group-hover:text-pine-950">
            <Icon name={icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="display text-lg leading-snug text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-pine-200/70">{detail}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
