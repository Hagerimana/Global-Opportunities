"use client";

/**
 * Benefits.
 *
 * Eight outcomes, two columns of four, each with an icon, a translated title and
 * an English explanation of what changes in practice.
 *
 * The copy is deliberately concrete. "Better project organisation" is a claim
 * nobody can check; "a project is a record with objectives, results, budget and
 * progress, not a folder of differently named files" is a statement about what
 * the platform holds, and a reader can decide whether that matters to them.
 */
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { benefits } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function Benefits() {
  const { t } = useI18n();

  return (
    <Section id="benefits" tone="sunken">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            eyebrow={t("benefits.eyebrow")}
            title={t("benefits.title")}
            description={t("benefits.description")}
          />
        </div>

        <Stagger className="grid gap-4 sm:grid-cols-2" step={70}>
          {benefits.map((benefit, index) => (
            <Reveal
              key={benefit.titleKey}
              className="group relative overflow-hidden rounded-3xl border border-pine-900/8 bg-white p-6 transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-pine-700/20 hover:shadow-lift"
            >
              {/* A large ghosted numeral in the corner. It carries the reading
                  order for a sighted user and is hidden from assistive
                  technology, since the ordered list below already does that. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -top-4 font-mono text-6xl font-bold text-pine-50 transition-colors duration-500 group-hover:text-pine-100"
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-pine-50 text-pine-700 transition-all duration-500 ease-spring group-hover:bg-pine-800 group-hover:text-white">
                <Icon name={benefit.icon as IconName} className="h-5 w-5" />
              </span>

              <h3 className="display text-step-h4 relative mt-5 leading-snug text-pine-950">
                {t(benefit.titleKey)}
              </h3>
              <p className="relative mt-2.5 text-pretty text-sm leading-6 text-ink-muted">
                {t(benefit.detailKey)}
              </p>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
