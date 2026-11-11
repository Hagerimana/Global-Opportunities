"use client";

/**
 * Trust and social proof.
 *
 * This section answers "why should I believe this platform" without inventing a
 * single claim. The four figures are properties of the product that can be
 * checked by reading the repository -- four interface catalogues, nine journey
 * stages, twelve backend modules, six actor roles. The four signals below them
 * describe mechanisms that exist: token-based sign-in, categorised and
 * reviewable documents, per-user notification preferences, and structured records
 * instead of email threads.
 *
 * What is deliberately absent: partner logos, funder names, user counts, and
 * testimonials. None are verified, and a landing page that displays an
 * institution's logo implies a partnership that has not been confirmed. See the
 * honesty rules at the top of `lib/content.ts`. The testimonial section further
 * down carries role-attributed sample quotes with a visible notice instead.
 */
import { CountUp } from "@/components/ui/count-up";
import { Icon } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { capabilities, trustSignals } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

/** Fixed widths for the counting digits, so the row does not reflow while the
 *  numbers animate from 0. */
const digitClass = "inline-block min-w-[1.6ch] text-center";

export function Trust() {
  const { t } = useI18n();

  return (
    <Section id="trust" tone="light" spacing="tight" className="pt-0">
      {/* The statistics sit in a raised panel that overlaps nothing and reads as
          a single band, which is what makes four unrelated figures feel related. */}
      <Reveal direction="scale">
        <div className="glass overflow-hidden rounded-3xl">
          <dl className="grid divide-y divide-pine-900/8 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            {capabilities.map((item, index) => (
              <div
                key={item.labelKey}
                className={`group relative p-7 text-center transition-colors duration-500 hover:bg-pine-50/40 ${
                  // Dividers: a top border on the second row for `sm`, and a left
                  // border on every cell but the first for `lg`. Done with
                  // conditional classes rather than a wrapper so the grid stays
                  // a single flat list for screen readers.
                  index % 2 === 1 ? "sm:border-l sm:border-pine-900/8" : ""
                } ${index > 0 ? "lg:border-l lg:border-pine-900/8" : ""} ${
                  index >= 2 ? "sm:border-t sm:border-pine-900/8 lg:border-t-0" : ""
                }`}
              >
                <dd
                  className={`display text-5xl text-pine-900 ${digitClass}`}
                  // The figure is decorative: the label and detail beside it
                  // carry the meaning, so announcing "4" on its own adds nothing.
                  aria-hidden
                >
                  <CountUp value={item.value} />
                </dd>
                <dt className="mt-2 text-sm font-semibold text-pine-950">{t(item.labelKey)}</dt>
                <p className="mx-auto mt-1.5 max-w-[16rem] text-xs leading-5 text-ink-soft">
                  {t(item.detailKey)}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      <div className="mt-16 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow={t("trust.eyebrow")}
            title={t("trust.title")}
            description={t("trust.description")}
          />

          {/* A short reassurance line rather than a badge wall. Certification
              logos would be a claim; this is a statement of intent that can be
              checked against the backend. */}
          <Reveal direction="up" delay={200}>
            <div className="mt-7 flex items-center gap-3 rounded-2xl border border-pine-900/8 bg-white/70 p-4 backdrop-blur">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pine-100 text-pine-700">
                <Icon name="shield" className="h-5 w-5" />
              </span>
              <p className="text-sm leading-6 text-ink-muted">{t("trust.assurance")}</p>
            </div>
          </Reveal>
        </div>

        {/* The signal cards. */}
        <Stagger className="grid gap-4 sm:grid-cols-2" step={90}>
          {trustSignals.map((signal) => (
            <Reveal
              key={signal.key}
              className="group relative rounded-2xl border border-pine-900/8 bg-white p-6 transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-pine-700/20 hover:shadow-lift"
            >
              {/* The icon sits in a gold-tinted tile that warms on hover: a small
                  reward for the pointer rather than a decoration. */}
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-pine-50 text-pine-700 transition-colors duration-500 group-hover:bg-gold-100 group-hover:text-gold-700">
                <Icon name="checkCircle" className="h-5 w-5" />
              </span>
              <h3 className="display text-step-h4 mt-5 text-pine-950">{t(`trust.signals.${signal.key}`)}</h3>
              <p className="mt-2.5 text-sm leading-6 text-ink-muted">{t(signal.detailKey)}</p>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
