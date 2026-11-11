"use client";

/**
 * Scroll reveals and staggered entrances.
 *
 * The whole mechanism is two attributes and a stylesheet. `Reveal` renders an
 * element with `data-reveal="up"` and, once an IntersectionObserver says it has
 * entered the viewport, flips `data-revealed="true"`. `app/globals.css` owns
 * both states.
 *
 * Two decisions worth understanding before editing this file:
 *
 * 1. **The resting state is the visible state.** The hidden look lives on
 *    `[data-reveal]` and the visible look on `[data-reveal][data-revealed]`, so
 *    an element that never gets observed -- no IntersectionObserver, a failed
 *    hydration, JS disabled -- simply renders visible. Inverting that pairing is
 *    the classic way to ship a blank landing page.
 *
 * 2. **One observer, shared by every instance.** Creating an
 *    `IntersectionObserver` per element costs a callback registration each time
 *    and, on a page with this many sections, measurably delays hydration. The
 *    observer below is created once, lazily, and reused; the per-element
 *    callback is held in a `WeakMap` so an unmounted element can be collected.
 */
import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";

/** How far into the viewport an element has to come before it reveals. */
const observerOptions: IntersectionObserverInit = {
  // A tenth of the element: enough that a card has visibly started entering
  // before it animates, but not so much that a short element below the fold
  // never fires.
  threshold: 0.1,
  // Pull the trigger line up from the bottom edge, so an element reveals a
  // moment before it reaches the fold rather than after.
  rootMargin: "0px 0px -8% 0px",
};

let sharedObserver: IntersectionObserver | null = null;
const revealCallbacks = new WeakMap<Element, () => void>();

/**
 * Subscribes an element to the shared observer.
 *
 * The observer is created on first use rather than at module scope because this
 * file is imported into server-rendered pages, where `IntersectionObserver` does
 * not exist.
 */
function observeReveal(element: Element, onVisible: () => void) {
  revealCallbacks.set(element, onVisible);

  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // Reveal once, then stop watching: an element that animates in on every
        // scroll pass would be exhausting to read.
        revealCallbacks.get(entry.target)?.();
        sharedObserver?.unobserve(entry.target);
      }
    }, observerOptions);
  }

  sharedObserver.observe(element);
}

/** Which way the element travels as it appears. */
type Direction = "up" | "left" | "right" | "scale" | "none";

type RevealProps = {
  children: ReactNode;
  direction?: Direction;
  /**
   * Extra delay in milliseconds, on top of any stagger offset.
   *
   * Use this for a one-off; for a list, use `<Stagger>` instead, which computes
   * the offsets from each child's position.
   */
  delay?: number;
  className?: string;
  /**
   * The element to render. Defaults to `div`; pass `section`, `li` or `p` when
   * the reveal wraps something whose semantics matter to a screen reader.
   */
  as?: ElementType;
  /** Set by `<Stagger>` via cloneElement. Not meant to be passed by hand. */
  staggerIndex?: number;
  /** Set by `<Stagger>` via cloneElement. Not meant to be passed by hand. */
  staggerStep?: number;
};

/**
 * Fades and moves its children into view once, when they first intersect.
 *
 * Wraps a single element. For a group, put a `<Stagger>` around several.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  className,
  as,
  staggerIndex,
  staggerStep = 70,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  // `useCallback` with an empty dependency list: the handler only ever sets
  // state, and a new identity would re-run the effect and re-observe.
  const onVisible = useCallback(() => setRevealed(true), []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // No observer support: reveal immediately rather than leaving content
    // hidden. Same reasoning as the CSS resting state, applied in JS.
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    observeReveal(element, onVisible);
    return () => {
      sharedObserver?.unobserve(element);
    };
  }, [onVisible]);

  // The stagger offset comes first so an explicit `delay` is always relative to
  // the element's position in its group.
  const totalDelay = delay + (staggerIndex ?? 0) * staggerStep;

  return createElement(
    as ?? "div",
    {
      ref,
      className,
      "data-reveal": direction,
      "data-revealed": revealed ? "true" : undefined,
      // A CSS custom property, which is how the delay reaches the transition in
      // globals.css. Typed as a cast because React's style type does not allow
      // custom properties under arbitrary names.
      style: { "--reveal-delay": `${totalDelay}ms` } as CSSProperties,
    },
    children,
  );
}

type StaggerProps = {
  children: ReactNode;
  /**
   * Milliseconds between each child. 60-90ms reads as a cascade; much above
   * that and the last item feels late, much below and the stagger stops
   * registering as a sequence at all.
   */
  step?: number;
  className?: string;
  as?: ElementType;
};

/**
 * Reveals its `<Reveal>` children one after another.
 *
 * The index is applied with `cloneElement` rather than a mutable counter in
 * context. A counter incremented during render would be incremented twice under
 * React's StrictMode double-render, and the sequence would come out wrong in
 * development only -- the worst possible failure mode.
 *
 * Direct `<Reveal>` children are required: a wrapper element between the two
 * would hide the child index from the clone.
 */
export function Stagger({ children, step = 70, className, as }: StaggerProps) {
  return createElement(
    as ?? "div",
    { className },
    Children.map(children, (child, index) =>
      isValidElement(child)
        ? cloneElement(child as ReactElement<RevealProps>, { staggerIndex: index, staggerStep: step })
        : child,
    ),
  );
}
