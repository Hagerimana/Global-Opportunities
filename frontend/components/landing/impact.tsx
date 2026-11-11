"use client";

/**
 * Impact.
 *
 * Five statements of what the platform changes, in the order the change happens
 * in a project's life: access, preparation, transparency, monitoring, and the
 * working relationship.
 *
 * There is no percentage, no counter and no "N organisations" figure on this
 * section, and that is the design decision. Impact statistics for a platform
 * that has not been running for a year would be invented; the count-up component
 * is used in the trust section instead, where the numbers are structural facts
 * about the platform (four listing types, nine stages, twelve document categories,
 * six actor types) and not claims about its success.
 *
 * The layout is a wide alternating stack rather than a grid. Each row puts the
 * statement on one side and the consequence on the other, so the eye tracks a
 * cause and its effect instead of eight equal boxes.
 */
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { impactItems } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function Impact() {
  const { t, list } = useI18n();
  const titles = list("impact.items");

  return (
    <Section id="impact" tone="light">
      <SectionHeading
        eyebrow={t("impact.eyebrow")}
        title={t("impact.title")}
        description={t("impact.description")}
      />

      <div className="mt-18 space-y-4">
        {impactItems.map((item, index) => {
          const flipped = index % 2 === 1;

          return (
            <Reveal
              key={item.titleKey}
              direction="up"
              delay={index * 80}
              className="group relative overflow-hidden rounded-3xl border border-pine-900/8 bg-white transition-all duration-500 ease-premium hover:border-pine-700/20 hover:shadow-lift"
            >
              <div className="grid items-center gap-6 p-7 sm:p-8 lg:grid-cols-[1fr_auto_1.15fr] lg:gap-10">
                {/* --- The statement ------------------------------------------ */}
                <div className={`flex items-center gap-4 ${flipped ? "lg:order-3" : ""}`}>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pine-50 text-pine-700 transition-all duration-500 ease-spring group-hover:bg-pine-800 group-hover:text-white">
                    <Icon name={item.icon as IconName} className="h-5.5 w-5.5" />
                  </span>
                  <h3 className="display text-step-h3 text-pretty leading-snug text-pine-950">
                    {titles[index] ?? ""}
                  </h3>
                </div>

                {/* --- The connector. An arrow whose direction follows the row,
                    so the visual reading order matches the DOM order even when
                    the grid flips. `aria-hidden` because it carries no
                    information the text does not. --- */}
                <span
                  aria-hidden
                  className={`hidden items-center gap-2 lg:flex ${flipped ? "lg:order-2 lg:flex-row-reverse" : "lg:order-2"}`}
                >
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-pine-300" />
                  <Icon
                    name="arrowRight"
                    className={`h-4 w-4 text-pine-400 transition-transform duration-500 ease-spring group-hover:translate-x-1 ${
                      flipped ? "group-hover:-translate-x-1" : ""
                    } ${flipped ? "rotate-180" : ""}`}
                  />
                  <span className="h-px w-8 bg-gradient-to-r from-pine-300 to-transparent" />
                </span>

                {/* --- The consequence ----------------------------------------
                    Both branches set `lg:order` explicitly. Leaving one of them
                    implicit would put `order-1` and `order-3` in the class list
                    at once, and which one wins would depend on the order
                    Tailwind happens to emit them in rather than on intent. --- */}
                <p
                  className={`text-pretty text-sm leading-7 text-ink-muted ${
                    flipped
                      ? "lg:order-1"
                      : "lg:order-3 lg:border-l lg:border-pine-900/8 lg:pl-10"
                  }`}
                >
                  {t(item.detailKey)}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
