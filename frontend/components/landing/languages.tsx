"use client";

/**
 * The multilingual experience section.
 *
 * The same screen shown in all four languages, which makes the point that the
 * four are equal citizens rather than a translated afterthought.
 *
 * The switcher is a `fieldset` of radio inputs rather than a list of buttons, so
 * it behaves as a single control to keyboard and screen reader users, arrow keys
 * included, without any of that being reimplemented. Choosing a language
 * re-renders the preview from that locale's catalogue, so the switch is genuine
 * rather than a decorative toggle.
 *
 * The opportunity title, sector and deadline inside the preview come from
 * `languageShowcase` in `lib/content.ts` and are shown in their own script
 * (`Fursa na Kupeleka Maji` is not a translated string, it is a real Swahili
 * title). That is the point: a listing can be published in one language and
 * read in another, and the record keeps the original.
 *
 * Everything around the preview -- heading, body, points, note -- is a
 * catalogue key, so the section follows the reader's interface language while
 * the preview itself stays in the language chosen by the switcher. That contrast
 * is the section's point: the interface is translated, and a record keeps the
 * language it was published in.
 *
 * GAP: the preview values are illustrative examples, not live records, which is
 * why `languages.note` states that listings shown here are samples. Replace them
 * with API data before launch, or keep the note.
 */
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { languageShowcase } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

/**
 * The four claims below the switcher, each mapped to an icon.
 *
 * `icon` is a literal union so `IconName` accepts it without a cast, and
 * `switchTo` is a catalogue key for the screen-reader label on the radio group.
 */
const points = [
  { icon: "type", key: "languages.points.interface" },
  { icon: "search", key: "languages.points.search" },
  { icon: "database", key: "languages.points.storage" },
  { icon: "plus", key: "languages.points.add" },
] as const;

export function Languages() {
  const { t } = useI18n();

  /**
   * Which catalogue to render the preview in. Independent of the site-wide
   * locale on purpose: a reader on the English page should be able to see the
   * French interface without changing their own reading language.
   */
  const [preview, setPreview] = useState(1);

  return (
    <Section id="languages" tone="light">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
        {/* --- The preview -------------------------------------------------- */}
        <Reveal direction="left">
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-pine-900/10 bg-white shadow-lift">
              {/* A browser chrome strip, so the preview reads as the real
                  product rather than a floating fragment. */}
              <div className="flex items-center gap-3 border-b border-pine-900/8 bg-pine-50/70 px-4 py-3">
                <span className="flex shrink-0 gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-pine-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-pine-200" />
                  <span className="h-2.5 w-2.5 rounded-full bg-pine-200" />
                </span>
                <span className="truncate rounded-md bg-white px-2.5 py-1 font-mono text-step-eyebrow text-ink-soft">
                  opportunities.global
                </span>
              </div>

              {/*
                `lang` on the subtree. Without it a screen reader reading the
                French preview from an English page pronounces French words with
                English phonetics, which is the usual complaint about
                multilingual pages.
              */}
              <div className="p-6 sm:p-7" lang={languageShowcase[preview].code}>
                <p className="text-step-eyebrow font-semibold uppercase tracking-[0.16em] text-pine-600">
                  {t("languages.preview.badge")}
                </p>
                <h3 className="display text-step-h3 mt-2.5 text-balance leading-tight text-pine-950">
                  {t("languages.preview.heading")}
                </h3>
                <p className="mt-4 text-pretty text-sm leading-7 text-ink-muted">
                  {t("languages.preview.body")}
                </p>

                {/* A mock result card, so the preview shows a whole screen
                    rather than a paragraph floating in a frame. The title is
                    written in the target script, which is what makes the preview
                    legible as a real translated interface. */}
                <div className="mt-6 rounded-2xl border border-pine-900/8 bg-pine-50/60 p-5 transition-all duration-500 ease-premium">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-pine-100 px-2.5 py-1 text-step-eyebrow font-semibold text-pine-700">
                      {languageShowcase[preview].sample}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-pine-900/10 bg-white px-2 py-0.5 text-[0.6rem] font-medium text-ink-soft">
                      <Icon name="clock" className="h-2.5 w-2.5" />
                      {languageShowcase[preview].gloss}
                    </span>
                  </div>
                  <p className="display text-step-h4 mt-3.5 leading-snug text-pine-950">
                    {languageShowcase[preview].title}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Icon name="mapPin" className="h-3.5 w-3.5" />
                    {languageShowcase[preview].location}
                  </p>
                </div>
              </div>
            </div>

            {/* A soft gold bloom under the frame. Purely decorative. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-8 left-1/4 h-28 w-1/2 rounded-full bg-gold-300/20 blur-3xl"
            />
          </div>
        </Reveal>

        {/* --- The switcher and the explanation ------------------------------- */}
        <div>
          <SectionHeading
            eyebrow={t("languages.eyebrow")}
            title={t("languages.title")}
            description={t("languages.description")}
          />

          <Reveal direction="up" delay={140}>
            <fieldset className="mt-9">
              <legend className="sr-only">{t("languages.switchTo")}</legend>
              {/*
                Two columns on a phone, four from `sm` up.

                These are the language entries: a code, a name, and a speaker
                count. Two across on a 320px screen gives each entry ~140px, and
                the longest name in the set is "Português" or "Kirundi" -- short,
                but the *count* below it can run to two digits, so the entry is
                at its narrowest exactly where wrapping hurts most. Four across
                from 640px is comfortable.
              */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {languageShowcase.map((language, index) => {
                  const selected = preview === index;
                  return (
                    <label
                      key={language.code}
                      className={`relative cursor-pointer rounded-2xl border px-3 py-3.5 text-center transition-all duration-400 ease-premium ${
                        selected
                          ? "border-pine-700 bg-pine-800 text-white shadow-soft"
                          : "border-pine-900/10 bg-white text-ink-muted hover:-translate-y-0.5 hover:border-pine-700/25"
                      }`}
                    >
                      <input
                        type="radio"
                        name="language-preview"
                        value={language.code}
                        checked={selected}
                        onChange={() => setPreview(index)}
                        className="sr-only"
                      />
                      <span className="block font-mono text-xs font-bold uppercase tracking-wider">
                        {language.code}
                      </span>
                      <span className={`mt-1 block text-xs ${selected ? "text-pine-100" : "text-ink-soft"}`}>
                        {language.native}
                      </span>
                      {selected && (
                        /*
                         * Inside the card, not straddling its corner. A `-right-1`
                         * badge sits 4px outside the label, and because the
                         * labels are grid items in a `fieldset` -- whose UA
                         * stylesheet sets `min-inline-size: min-content` -- the
                         * fieldset refused to shrink below that overhang and
                         * pushed the whole section 6px past its container, which
                         * made the page scroll sideways on every phone width.
                         * Anchoring the badge inside removes the overhang at the
                         * source rather than hiding it.
                         */
                        <span
                          aria-hidden
                          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-gold-400 text-pine-950"
                        >
                          <Icon name="check" className="h-3 w-3" />
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Reveal>

          <Stagger className="mt-9 space-y-3" step={70}>
            {points.map((point) => (
              <Reveal
                key={point.key}
                className="flex items-start gap-3.5 rounded-2xl border border-pine-900/8 bg-white p-4"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-pine-50 text-pine-700">
                  <Icon name={point.icon} className="h-4 w-4" />
                </span>
                <p className="text-pretty text-sm leading-6 text-ink-muted">{t(point.key)}</p>
              </Reveal>
            ))}
          </Stagger>

          <Reveal direction="up" delay={200}>
            <p className="mt-7 flex items-start gap-3 rounded-2xl border border-pine-900/8 bg-pine-50/70 p-4 text-xs leading-6 text-ink-muted">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" />
              {t("languages.note")}
            </p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
