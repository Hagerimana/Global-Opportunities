"use client";

/**
 * Testimonials.
 *
 * Three illustrative quotes, attributed to a role and never to a person or an
 * organisation, because nobody has been interviewed. The section says so above
 * the cards, in the same sentence a reader will read first, and each card
 * repeats the marker.
 *
 * This section is the most likely to be misused, so the guard is visible rather
 * than implied: there is no avatar, no name and no logo anywhere in it, and
 * adding one without real attribution would make the page dishonest. The
 * intended path is to replace `testimonials` in `lib/content.ts` with approved,
 * attributed statements, at which point the notice string is deleted with it.
 *
 * Layout is a masonry-ish three-column set on wide viewports. The middle card
 * is raised on `lg` so the three read as a set with a centre of gravity rather
 * than as a flat strip.
 */
import { Icon } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { testimonials } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function Testimonials() {
  const { t } = useI18n();

  return (
    <Section id="testimonials" tone="sunken">
      <SectionHeading
        eyebrow={t("testimonials.eyebrow")}
        title={t("testimonials.title")}
        align="center"
      />

      {/* The notice. Placed above the grid, not in a footnote, because a reader
          skimming quotes needs to know what they are before they read one. */}
      <Reveal direction="up" delay={100}>
        <p className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-2xl border border-pine-900/10 bg-white p-4 text-xs leading-6 text-ink-muted">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" />
          {t("testimonials.notice")}
        </p>
      </Reveal>

      <Stagger className="mt-12 grid gap-5 lg:grid-cols-3" step={110}>
        {testimonials.map((testimonial, index) => (
          <Reveal
            key={testimonial.roleKey}
            className={`group relative flex flex-col rounded-3xl border border-pine-900/8 bg-white p-7 shadow-soft transition-all duration-500 ease-premium hover:-translate-y-1.5 hover:shadow-lift ${
              index === 1 ? "lg:-mt-6 lg:mb-6" : ""
            }`}
          >
            {/* The quote mark. A glyph, so it is hidden from assistive
                technology -- the `<blockquote>` below already conveys quotation. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-1 right-6 font-mono text-7xl font-bold leading-none text-pine-50 transition-colors duration-500 group-hover:text-pine-100"
            >
              &rdquo;
            </span>

            <blockquote className="relative flex-1">
              <p className="text-pretty text-[0.95rem] leading-7 text-ink">
                {t(testimonial.quoteKey)}
              </p>
            </blockquote>

            <footer className="relative mt-7 flex items-center gap-3.5 border-t border-pine-900/8 pt-5">
              {/*
                A role glyph rather than a photograph. A real person's face
                beside a quote they did not say is exactly the thing this
                placeholder is avoiding.
              */}
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pine-50 font-mono text-xs font-bold text-pine-700">
                {t(testimonial.roleKey).slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-pine-950">{t(testimonial.roleKey)}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-step-eyebrow font-medium uppercase tracking-wider text-ink-soft">
                  <Icon name="eye" className="h-3 w-3" />
                  {t("ui.sample")}
                </p>
              </div>
            </footer>
          </Reveal>
        ))}
      </Stagger>
    </Section>
  );
}
