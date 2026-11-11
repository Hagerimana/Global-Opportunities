"use client";

/**
 * How it works: the nine stages from Discover to Monitor.
 *
 * A vertical rail rather than a grid, because the order is the point. Each stage
 * is a numbered node on a continuous line, with a small "output" chip naming what
 * the stage produces -- Discover yields a shortlist, Prepare yields a complete
 * project. Reading those chips in sequence is the clearest statement of what the
 * platform actually does for someone.
 *
 * The left column is `sticky` on wide viewports so the section heading stays with
 * the reader as the nine stages scroll past. Below `lg` it is a normal block
 * above the rail, which is the correct order on a phone anyway.
 *
 * Stage titles come from the `how.steps` array in the locale catalogue, and the
 * details come from `journeyStages` in `lib/content.ts`. The two are index-aligned
 * and must stay that way: nine is a small enough number that a mismatch would be
 * visible immediately, which is the only reason this is not fragile.
 */
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { journeyStages } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function HowItWorks() {
  const { t, list } = useI18n();

  /**
   * The nine translated stage names. `list` returns an empty array if a
   * catalogue is missing the key, so the guard below keeps the rail from
   * rendering nine unlabelled nodes in that case.
   */
  const stageNames = list("how.steps");
  const stages = journeyStages.map((stage, index) => ({
    ...stage,
    title: stageNames[index] ?? `Stage ${index + 1}`,
  }));

  /**
   * The three phases the nine stages fall into, as a reading aid for the rail.
   *
   * `phaseRanges` and `phaseNames` are parallel arrays rather than objects so
   * both can come straight from the catalogue and stay aligned: `phaseNames` is
   * `how.phases` and `phaseRanges` is generated from the same nine-stage
   * grouping. The dot colours are the only local values, because they are
   * decoration rather than text.
   */
  const phaseNames = list("how.phases");
  const phaseRanges = ["01 - 03", "04 - 06", "07 - 09"];
  const phaseDots = ["bg-pine-500", "bg-gold-400", "bg-pine-800"];

  return (
    <Section id="how" tone="light">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        {/* --- The sticky heading ------------------------------------------- */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            eyebrow={t("how.eyebrow")}
            title={t("how.title")}
            description={t("how.description")}
          />

          {/* A compact legend of the three phases the nine stages fall into.
              Purely a reading aid; the rail below carries the detail. */}
          <Reveal direction="up" delay={220}>
            <dl className="mt-9 space-y-3">
              {phaseRanges.map((range, index) => (
                <div key={range} className="flex items-center gap-3.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${phaseDots[index]}`} aria-hidden />
                  <dt className="font-mono text-xs font-semibold text-ink-soft">{range}</dt>
                  <dd className="text-sm font-medium text-pine-950">{phaseNames[index] ?? ""}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* --- The rail ------------------------------------------------------ */}
        <ol className="relative">
          {/*
            The connector. One continuous line behind the nodes, drawn with
            `animate-grow-y` from the top so it appears to be laid down as the
            section reveals. `origin-top` is what makes it grow downwards.

            It stops short of the last node by sitting in a padded container
            rather than running the full height, so the line never appears to run
            past the end of the journey.
          */}
          <span
            aria-hidden
            className="absolute left-[1.4375rem] top-6 bottom-10 w-px origin-top animate-grow-y bg-gradient-to-b from-pine-300 via-pine-400 to-gold-400"
          />

          {stages.map((stage, index) => (
            <li key={stage.title} className="relative">
              <Reveal
                direction="up"
                delay={index * 60}
                className="flex gap-5 pb-9 last:pb-0 sm:gap-6"
              >
                {/* The node. The number is inside, and the node is the list
                    item's visual anchor. `aria-hidden` because the ordered list
                    already conveys the sequence -- announcing "4" before every
                    stage would be noise. */}
                <span
                  aria-hidden
                  className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-pine-900/10 bg-white font-mono text-sm font-bold text-pine-800 shadow-soft transition-all duration-500 ease-spring hover:border-pine-700/30 hover:bg-pine-800 hover:text-white"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1 pt-1">
                  <h3 className="display text-step-h3 text-pine-950">{stage.title}</h3>
                  <p className="mt-2.5 text-pretty text-sm leading-6 text-ink-muted sm:text-base sm:leading-7">
                    {t(stage.detailKey)}
                  </p>

                  {/* The output chip. The small "yields" label keeps the
                      relationship explicit, so the chip does not read as another
                      status. */}
                  <p className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-pine-900/8 bg-white/70 px-3 py-1.5 text-xs text-ink-muted backdrop-blur">
                    <Icon name="checkCircle" className="h-3.5 w-3.5 text-pine-500" />
                    <span className="sr-only">{t("a11y.produces")}</span>
                    {t(stage.outputKey)}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
