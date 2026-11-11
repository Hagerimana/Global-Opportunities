"use client";

/**
 * Access.
 *
 * One plan, which is free, and three roles.
 *
 * There is deliberately no second plan, no "Contact sales" and no price list.
 * The backend has no subscription model, no invoice and no payment provider, so
 * a pricing table with tiers would advertise something that cannot be bought. The
 * honest structure is: applying is free, and organisational, evaluation and
 * administrative access is granted by role rather than purchased.
 *
 * `pricing.note` says exactly that, in the section, for the same reason. When a
 * paid tier is ever added it needs a backend to match -- a card on this page
 * pointing at nothing is worse than no card.
 *
 * The note also flags the second honest caveat: the roles exist in the data model
 * but role checks are not yet enforced in the API's permission classes, so
 * "granted by role" describes the design and not yet the enforcement. See README
 * section 6.
 */
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { accessRoles } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function Pricing() {
  const { t } = useI18n();

  return (
    <Section id="pricing" tone="sunken">
      <SectionHeading
        eyebrow={t("pricing.eyebrow")}
        title={t("pricing.title")}
        align="center"
      />

      <div className="mx-auto mt-14 grid max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        {/* --- The plan ------------------------------------------------------ */}
        <Reveal direction="right">
          <div className="group relative h-full overflow-hidden rounded-3xl bg-pine-900 p-8 text-white shadow-lift sm:p-10">
            {/* A gold bloom and a faint grid. The only place on the page where
                the pine gradient runs this dark, which is what makes the free
                plan read as the headline. */}
            <span
              aria-hidden
              className="orb h-56 w-56 -right-16 -top-20 bg-gold-400/15"
            />
            <span
              aria-hidden
              className="grid-lines pointer-events-none absolute inset-0 opacity-[0.07]"
            />

            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-gold-300">
                  <Icon name="gift" className="h-5.5 w-5.5" />
                </span>
                <p className="display text-lg text-white">
                  {t("pricing.plan.name")}
                </p>
              </div>

              <div className="mt-8 flex items-baseline gap-3">
                <span className="display text-6xl leading-none text-gold-300 sm:text-7xl">
                  {t("pricing.plan.price")}
                </span>
                <span className="text-sm text-pine-200/75">
                  {t("pricing.plan.period")}
                </span>
              </div>

              <p className="mt-6 text-pretty text-sm leading-7 text-pine-100/85">
                {t("pricing.plan.includes")}
              </p>

              <a
                href="/auth/account-type"
                className="btn btn-gold group/btn mt-9 w-full justify-center"
              >
                {t("pricing.plan.cta")}
                <Icon
                  name="arrowRight"
                  className="h-4 w-4 transition-transform duration-500 ease-spring group-hover/btn:translate-x-1"
                />
              </a>
            </div>
          </div>
        </Reveal>

        {/* --- The roles ---------------------------------------------------- */}
        <Stagger className="space-y-4" step={90}>
          {accessRoles.map((role) => (
            <Reveal
              key={role.titleKey}
              className="group flex items-start gap-4 rounded-3xl border border-pine-900/8 bg-white p-6 transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-pine-700/20 hover:shadow-lift"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-pine-50 text-pine-700 transition-all duration-500 ease-spring group-hover:bg-pine-800 group-hover:text-white">
                <Icon name={role.icon as IconName} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="display text-base text-pine-950">
                  {t(role.titleKey)}
                </h3>
                <p className="mt-1.5 text-pretty text-sm leading-6 text-ink-muted">
                  {t(role.detailKey)}
                </p>
              </div>
            </Reveal>
          ))}
        </Stagger>
      </div>

      {/* The honest note. Same treatment as the AI boundary: a rule, set apart
          from the features with its own border and icon. */}
      <Reveal direction="up" delay={160}>
        <p className="mx-auto mt-8 flex max-w-3xl items-start gap-3.5 rounded-2xl border border-pine-900/8 bg-white p-5 text-sm leading-6 text-ink-muted">
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-pine-600" />
          {t("pricing.note")}
        </p>
      </Reveal>
    </Section>
  );
}
