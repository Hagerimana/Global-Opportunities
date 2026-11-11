/**
 * A decorative application-window frame.
 *
 * Wraps mock interface markup so the hero and the product showcase can present
 * screens inside something that reads as software: a title bar, three window
 * dots, a URL pill, and a content area.
 *
 * `aria-hidden` is set on the frame by the caller, and it matters. Every screen
 * inside is a mock -- the buttons are not buttons and the rows are not data. If
 * a screen reader can reach them it will happily read a list of dead controls,
 * which is worse than not describing the visual at all. The alternative, labelling
 * the whole thing as an image, would lose the fact that it is a real interface
 * preview; `aria-hidden` plus the section's own heading is the right trade.
 *
 * There is no "browser" chrome beyond the dots and the pill on purpose: real
 * browser UI implies a URL that cannot be faked honestly, and the frame reads as
 * an app window without it.
 */
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

type AppWindowProps = {
  children: ReactNode;
  /** Text in the address pill. Decorative, so it can be anything plausible. */
  address?: string;
  /** Drops the outer shadow, for a window nested inside another card. */
  flush?: boolean;
  className?: string;
};

export function AppWindow({
  children,
  address = "global-opportunities.app",
  flush = false,
  className = "",
}: AppWindowProps) {
  return (
    <div
      className={`glass-strong overflow-hidden rounded-3xl ${flush ? "shadow-none" : "shadow-lift"} ${className}`}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-pine-900/8 bg-white/50 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-pine-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-pine-100" />
        </div>

        <div className="mx-auto flex max-w-[62%] items-center gap-1.5 rounded-full bg-pine-50/80 px-3 py-1 text-step-eyebrow font-medium text-pine-700/80">
          <Icon name="lock" className="h-2.5 w-2.5" />
          <span className="truncate">{address}</span>
        </div>
      </div>

      {children}
    </div>
  );
}
