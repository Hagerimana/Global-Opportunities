"use client";

/**
 * The AI Assistant section.
 *
 * A dark panel with the conversation preview on one side and the six things the
 * assistant does on the other, closed by an explicit statement of what it does
 * not do.
 *
 * That boundary sentence is the most important line on the page. The assistant
 * explains official information; it does not decide funding, select applicants
 * or make a final eligibility judgement. An AI feature on a funding platform
 * that blurs that line is a liability, so the limitation is stated in the copy
 * rather than left to a terms page.
 *
 * The conversation is hand-written and labelled "Preview". The
 * `/api/ai/chat/` endpoint returns a fixed response with no retrieval and no
 * language handling, so wiring this to the API today would show the same canned
 * string regardless of the question. See the GAP note on `aiScript` in
 * `lib/content.ts`.
 *
 * The first user message is deliberately in Kirundi. The point of a multilingual
 * platform is that somebody can ask in the language they think in, and the
 * preview should show that rather than assert it.
 */
import { AmbientBackdrop } from "@/components/ui/ambient";
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { aiCapabilities, aiScript } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function AiAssistant() {
  const { t, list } = useI18n();
  const capabilityNames = list("ai.capabilities");

  return (
    <Section id="ai" tone="dark" dark>
      <AmbientBackdrop variant="dark" />

      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
        {/* --- The conversation --------------------------------------------- */}
        <Reveal direction="right">
          <div className="glass-dark relative overflow-hidden rounded-3xl">
            {/* The header. The rotating ring behind the mark is the same
                treatment as the ecosystem hub, so the two dark panels on the
                page share a visual signature. */}
            <div className="flex items-center gap-3.5 border-b border-white/10 p-5">
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/10">
                <Icon name="sparkle" className="h-5 w-5 text-gold-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{t("ai.conversation.assistant")}</p>
                <p className="text-xs text-pine-200/70">{t("ai.conversation.status")}</p>
              </div>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-pine-200/80">
                {t("ai.conversation.preview")}
              </span>
            </div>

            {/* The turns. Staggered in, so the conversation assembles itself
                rather than appearing all at once.

                The `Reveal` *is* the alignment wrapper, not a child of it.
                `Stagger` injects its index into whichever element sits directly
                beneath it, so wrapping these in a plain `<div>` would put an
                unknown `staggerIndex` attribute on that div, warn in the
                console, and leave the whole exchange appearing at once. */}
            <Stagger className="space-y-3 p-5" step={140}>
              {aiScript.map((message, index) => (
                <Reveal
                  key={index}
                  // The bubble is aligned by its sender, so the reveal element
                  // carries the flex classes rather than wrapping a div that
                  // carries them. `space-y-3` on the Stagger still applies,
                  // because a `Reveal` renders a `div` unless told otherwise.
                  className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.from === "user"
                        ? "rounded-br-md bg-pine-600 text-white"
                        : "rounded-bl-md border border-white/10 bg-white/8 text-pine-50"
                    }`}
                  >
                    <span
                      className={`mb-1.5 flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-wider ${
                        message.from === "user" ? "text-pine-100/80" : "text-gold-300"
                      }`}
                    >
                      <Icon name={message.from === "user" ? "user" : "sparkle"} className="h-3 w-3" />
                      {message.from === "user" ? t("ai.conversation.user") : t("ai.conversation.assistant")}
                    </span>
                    {message.from === "user" ? message.text : t(message.textKey)}
                    {/* The caret on the last assistant message, so the panel
                        reads as live without an actual typing animation running
                        forever. */}
                    {message.from === "assistant" && index === aiScript.length - 1 && (
                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-caret bg-gold-300 align-text-bottom" />
                    )}
                  </div>
                </Reveal>
              ))}
            </Stagger>

            {/* The composer. Decorative, so a styled div rather than a disabled
                input the reader cannot use. */}
            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Icon name="message" className="h-4 w-4 text-pine-300" />
                <span className="text-sm text-pine-200/60">{t("ai.conversation.placeholder")}</span>
                <Icon name="send" className="ml-auto h-4 w-4 text-gold-300" />
              </div>
            </div>
          </div>
        </Reveal>

        {/* --- The capabilities ---------------------------------------------- */}
        <div>
          <SectionHeading
            eyebrow={t("ai.eyebrow")}
            title={t("ai.title")}
            description={t("ai.description")}
            dark
          />

          <Stagger className="mt-9 grid gap-3 sm:grid-cols-2" step={70}>
            {aiCapabilities.map((capability, index) => (
              <Reveal
                key={capability.titleKey}
                className="group flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-all duration-500 ease-premium hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-gold-300 transition-all duration-500 ease-spring group-hover:bg-gold-400 group-hover:text-pine-950">
                  <Icon name={capability.icon as IconName} className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">
                    {capabilityNames[index] ?? ""}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-pine-200/70">{t(capability.detailKey)}</p>
                </div>
              </Reveal>
            ))}
          </Stagger>

          {/* The action. `btn-light` is the white-on-dark button, which is the
              one treatment the section has not used yet -- the preview panel and
              the capability cards are all glass, so the call to action needs a
              solid surface to read as pressable. */}
          <Reveal direction="up" delay={240}>
            <a href="#cta" className="btn btn-light group/cta mt-8">
              {t("ai.cta")}
              <Icon
                name="arrowRight"
                className="h-4 w-4 transition-transform duration-500 ease-spring group-hover/cta:translate-x-1"
              />
            </a>
          </Reveal>

          {/* The boundary. Set apart with its own border and a shield icon, so
              it reads as a rule rather than as another feature. */}
          <Reveal direction="up" delay={200}>
            <p className="mt-8 flex items-start gap-3.5 rounded-2xl border border-gold-400/25 bg-gold-400/8 p-5 text-sm leading-6 text-pine-50">
              <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" />
              <span>
                <span className="font-semibold text-white">{t("ai.boundaryTitle")}</span>{" "}
                {t("ai.boundary")}
              </span>
            </p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
