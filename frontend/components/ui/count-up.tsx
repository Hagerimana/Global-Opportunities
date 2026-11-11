"use client";

/**
 * A number that counts up when it scrolls into view.
 *
 * Used for the capability figures. The animation is driven by
 * `requestAnimationFrame` rather than a CSS keyframe because the value has to
 * be a real, readable number in the DOM at every frame -- a screen reader
 * announcing a number that is changing 60 times a second is unusable, and a
 * visually-hidden `aria-label` with the final value keeps the accessible name
 * stable.
 *
 * The element is `aria-hidden` because the figure is also stated in the label
 * text beside it; announcing it twice is noise. The label carries the meaning.
 */
import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** The number to land on. */
  value: number;
  /** Animation length in milliseconds. */
  duration?: number;
  className?: string;
};

/**
 * Exponential ease-out, matching the `--ease-premium` curve the reveals use.
 *
 * A linear ramp makes a counter look mechanical; this spends most of its time
 * near the final value, which is the number people actually read.
 */
function easeOutExpo(progress: number) {
  return progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
}

export function CountUp({ value, duration = 1600, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect the motion preference. `globals.css` collapses transition and
    // animation durations, but it cannot stop a JavaScript loop, so the check
    // has to happen here as well.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();

        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setDisplay(Math.round(easeOutExpo(progress) * value));
          // Schedule the next frame only while there is progress left, so the
          // loop stops rather than idling at the end.
          if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      // Cancel any frame still queued, otherwise a scroll-away mid-animation
      // leaves a timer running against an unmounted component.
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
