"use client";

/**
 * A card that lights up under the pointer.
 *
 * The gradient is painted by CSS (`.spotlight` in `app/globals.css`) from two
 * custom properties this component writes on `pointermove`. Doing it with a
 * gradient rather than a transform is deliberate: moving the card itself on
 * pointer movement reads as jittery, while a light source that follows the cursor
 * reads as material.
 *
 * Touch is excluded. A touch device fires `pointermove` while scrolling, and
 * dragging a highlight around behind a finger is noise, so the handler is only
 * attached on devices whose primary pointer can hover.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  /** Renders as this element. Defaults to `div`. */
  as?: "div" | "article" | "li" | "section";
};

/** True only for devices with a real hovering pointer (mouse, trackpad). */
function canHover() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
}

export function SpotlightCard({ children, className = "", as = "div" }: SpotlightCardProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [hoverCapable, setHoverCapable] = useState(false);

  // Checked in an effect rather than during render: `matchMedia` is a browser
  // API, and reading it while rendering would make the server-rendered markup
  // disagree with the first client render.
  useEffect(() => {
    setHoverCapable(canHover());
  }, []);

  /**
   * Writes the pointer position as a percentage of the element's own box.
   *
   * Percentages rather than pixels because the gradient in the stylesheet is
   * sized in pixels around that point: a percentage keeps the highlight centred
   * on the cursor at any card size.
   */
  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const element = ref.current;
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    element.style.setProperty("--mx", `${x}%`);
    element.style.setProperty("--my", `${y}%`);
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={ref as never}
      onPointerMove={hoverCapable ? onPointerMove : undefined}
      className={`spotlight relative overflow-hidden ${className}`}
      style={{ "--mx": "50%", "--my": "0%" } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
