/**
 * The brand mark and wordmark.
 *
 * The mark is a globe: a circle for the earth, one vertical ellipse for the
 * meridian, an equator line, and a gold arc that breaks out of the circle. The
 * break is the point of the logo -- an opportunity leaving the closed system and
 * becoming visible. It is drawn in a `currentColor`-driven stroke with the arc
 * in the gold accent, so the mark inherits whatever surface it sits on: the
 * navbar's dark green, the footer's white, or a card.
 *
 * `aria-hidden` on the mark because the wordmark next to it already names the
 * product. Two `title`/`role="img"` combinations would have a screen reader
 * announce the brand twice on every page.
 */
import type { IconName } from "./icon";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      {/* The earth. */}
      <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* The meridian. */}
      <ellipse cx="20" cy="20" rx="5.5" ry="13" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".55" />
      {/* The equator. */}
      <path d="M7.6 20h24.8" stroke="currentColor" strokeWidth="1.4" opacity=".55" strokeLinecap="round" />
      {/* The opportunity leaving the system. */}
      <path
        d="M20 7a13 13 0 0 1 11.3 6.6"
        fill="none"
        stroke="var(--logo-accent, #e9ba5a)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="31.6" cy="11.4" r="2.6" fill="var(--logo-accent, #e9ba5a)" />
    </svg>
  );
}

type LogoProps = {
  /**
   * `stacked` breaks the wordmark across two lines, which is what the navbar uses
   * on narrow viewports. `inline` keeps it on one line.
   */
  variant?: "stacked" | "inline";
  className?: string;
  /** Text colour. The mark and wordmark both inherit it. */
  tone?: "dark" | "light";
};

export function Logo({ variant = "inline", className = "", tone = "dark" }: LogoProps) {
  const wordTone = tone === "light" ? "text-white" : "text-pine-950";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9 shrink-0 text-pine-800" />
      <span className={`display text-[1.05rem] leading-[1.05] font-semibold tracking-tight ${wordTone}`}>
        {variant === "stacked" ? (
          <>
            Global
            <br />
            <span className="text-pine-600">Opportunities</span>
          </>
        ) : (
          <>
            Global <span className={tone === "light" ? "text-pine-200" : "text-pine-600"}>Opportunities</span>
          </>
        )}
      </span>
    </span>
  );
}

/**
 * The icon used for the AI Assistant in navigation and headings.
 *
 * A separate component from `Icon` because it is a brand mark rather than a UI
 * glyph: it draws its own gradient and glow instead of inheriting `currentColor`,
 * because it appears on both light and dark surfaces and on a gold CTA where
 * `currentColor` would be white-on-gold.
 */
export function AiGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="go-ai-glyph" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93cbae" />
          <stop offset="55%" stopColor="#38926c" />
          <stop offset="100%" stopColor="#e9ba5a" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.1 6.2 6.2 2.1-6.2 2.1L12 19.1l-2.1-6.2L3.7 10.8l6.2-2.1Z"
        fill="url(#go-ai-glyph)"
      />
      <path d="M18.4 15.2l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9Z" fill="url(#go-ai-glyph)" opacity=".8" />
    </svg>
  );
}

/**
 * Re-exported so callers that need an icon name for a content-driven element do
 * not have to import from two modules.
 */
export type { IconName };
