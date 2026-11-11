"use client";

/**
 * The closing call to action.
 *
 * Three audiences, three actions, in the order the specification lists them: an
 * applicant looking for funding, an individual creating an account, and an
 * organisation publishing calls.
 *
 * The primary action goes to `#opportunities` rather than to registration. The
 * strongest argument for the platform is that it is browsable without an account,
 * and a reader who has just read twelve sections about searching should be able
 * to try that before being asked to sign up. Registration is the second action,
 * where it belongs.
 *
 * The ambient backdrop and the soft top fade are the page's closing gesture: the
 * section reads as an ending rather than as another block.
 */
import { AmbientBackdrop } from "@/components/ui/ambient";
import { Icon } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { useI18n } from "@/lib/i18n";
import { finalActions } from "@/lib/content";

/**
 * Button styling per action kind, as literal class strings so Tailwind can see
 * them. `primary` is the gold button; the rest are quiet outlines, because three
 * equally loud buttons would give the reader no guidance about where to start.
 */
const kinds = {
  primary: "btn btn-gold",
  secondary: "btn btn-outline",
  tertiary: "btn btn-ghost-light",
} as const;

const arrows = {
  primary: "arrowRight",
  secondary: "userPlus",
  tertiary: "building",
} as const;

export function FinalCta() {
  const { t } = useI18n();

  return (
    <section id="cta" className="relative overflow-hidden bg-pine-950 py-24 sm:py-32">
      <AmbientBackdrop variant="dark" />

      {/* A fade from the section above, so the boundary between the FAQ and this
          panel is a gradient rather than a hard line. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-pine-50 to-transparent"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
        <Reveal direction="up">
          <p className="text-step-eyebrow font-semibold uppercase tracking-[0.2em] text-gold-300">
            {t("finalCta.eyebrow")}
          </p>
          {/*
            The closing statement, in the light gradient rather than flat white.
            This is the last thing on the page, and a gradient gives it the same
            treatment as the hero's opening line -- the two ends of the page
            rhyme, which is what makes a long scroll feel composed rather than
            accumulated. `.text-gradient-light` is a `bg-clip-text` utility, so
            the text itself must also be `text-transparent`, which the class
            applies.
          */}
          <h2 className="text-gradient-light display mt-5 text-balance text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
            {t("finalCta.title")}
          </h2>
        </Reveal>

        <Stagger className="mt-12 space-y-3" step={90}>
          {finalActions.map((action) => (
            <Reveal
              key={action.labelKey}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur transition-all duration-500 ease-premium hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-white">{t(action.labelKey)}</h3>
                  <p className="mt-1.5 text-pretty text-sm leading-6 text-pine-200/70">
                    {t(action.detailKey)}
                  </p>
                </div>

                <a
                  href={action.href}
                  className={`${kinds[action.kind]} shrink-0 justify-center sm:min-w-44`}
                >
                  {t(action.labelKey)}
                  <Icon
                    name={arrows[action.kind]}
                    className="h-4 w-4 transition-transform duration-500 ease-spring group-hover:translate-x-1"
                  />
                </a>
              </div>
            </Reveal>
          ))}
        </Stagger>

        {/* One line of honesty to close on, so the last thing on the page is not
            a claim. */}
        <Reveal direction="up" delay={200}>
          <p className="mx-auto mt-12 max-w-xl text-xs leading-6 text-pine-200/60">
            {t("finalCta.note")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
