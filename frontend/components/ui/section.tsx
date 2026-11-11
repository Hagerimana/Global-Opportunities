"use client";

/**
 * The two layout primitives every landing section is built from: a `<section>`
 * shell that owns the vertical rhythm and the anchor target, and a heading block
 * that owns the eyebrow/title/description pattern.
 *
 * Why these exist: the specification asks for eighteen sections, and the
 * alternative -- each one hand-rolling its own `container-x` wrapper, its own
 * `py-24`, its own id -- is how a long page ends up with four different left
 * edges. Centralising it here is what keeps the rhythm consistent as sections are
 * added or reordered.
 */
import type { ReactNode } from "react";
import { Reveal } from "./reveal";

type SectionProps = {
  /** Anchor target. Must match the `href` in `navLinks` / `footerColumns`. */
  id?: string;
  children: ReactNode;
  /**
   * Surface tone.
   *
   * `light` is the page default, `sunken` is a slightly deeper card tone for
   * alternating rhythm, `dark` is the inverted panel used by the AI, ecosystem
   * and final-CTA sections, and `none` leaves the background alone so a section
   * can sit inside another one's panel.
   */
  tone?: "light" | "sunken" | "dark" | "none";
  /** Vertical padding. `tight` is for sections that follow a dense one. */
  spacing?: "default" | "tight";
  className?: string;
  /** Adds `on-dark` so focus rings invert inside this section. */
  dark?: boolean;
};

const toneClasses = {
  light: "bg-surface",
  sunken: "bg-surface-sunken",
  dark: "bg-pine-sheen",
  none: "",
} as const;

export function Section({
  id,
  children,
  tone = "light",
  spacing = "default",
  className = "",
  dark,
}: SectionProps) {
  return (
    <section
      id={id}
      // `on-dark` is the hook `globals.css` uses to invert the focus ring
      // colour, so keyboard users are not left with a green ring on green.
      className={`relative ${toneClasses[tone]} ${dark ?? tone === "dark" ? "on-dark" : ""} ${
        spacing === "tight" ? "py-16 sm:py-20" : "py-20 sm:py-28 lg:py-32"
      } ${className}`}
    >
      <div className="container-x relative">{children}</div>
    </section>
  );
}

type SectionHeadingProps = {
  /** Translated eyebrow label. Rendered through `.eyebrow`. */
  eyebrow: string;
  /** The headline. `display` sets the serif face. */
  title: ReactNode;
  /** Supporting paragraph. Omit for a heading with no intro. */
  description?: ReactNode;
  /** `center` for hero-adjacent sections, `left` for everything else. */
  align?: "left" | "center";
  /** Heading level. `h2` everywhere on this page; the hero owns the `h1`. */
  as?: "h2" | "h3";
  /** Constrains the measure. Long measures are hard to read. */
  maxWidth?: string;
  /** Inverts the eyebrow and description for dark panels. */
  dark?: boolean;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  maxWidth = "max-w-2xl",
  dark = false,
  className = "",
}: SectionHeadingProps) {
  return (
    <div
      className={`${align === "center" ? "mx-auto text-center" : ""} ${maxWidth} ${className}`}
    >
      <Reveal direction="up">
        {/* The eyebrow is decorative repetition of the section's subject, so it
            is hidden from assistive technology; the heading carries the meaning. */}
        <p className={`eyebrow ${dark ? "eyebrow-light" : ""}`} aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
          {eyebrow}
        </p>
      </Reveal>

      <Reveal direction="up" delay={70}>
        <Heading className={`display text-step-h2 mt-4 text-balance leading-[1.12] ${dark ? "text-white" : "text-pine-950"}`}>
          {title}
        </Heading>
      </Reveal>

      {description && (
        <Reveal direction="up" delay={140}>
          <p
            className={`text-step-body-lg mt-5 text-pretty leading-relaxed ${
              dark ? "text-pine-100/80" : "text-ink-muted"
            }`}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
