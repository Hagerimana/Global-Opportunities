/**
 * The icon set.
 *
 * One inline SVG sprite instead of an icon package: the project has no icon
 * dependency, and shipping ~40 icons as paths costs a few kilobytes against a
 * library's tree-shaken bundle while giving full control over stroke weight and
 * colour, both of which matter for how consistent the set looks.
 *
 * Conventions, so the set reads as one family:
 *   - 24x24 viewBox, `fill="none"`, `stroke="currentColor"`.
 *   - `strokeLinecap="round"`, `strokeLinejoin="round"` throughout.
 *   - A single `strokeWidth` prop, defaulting to 1.6. Anything heavier reads as
 *     a different family next to the light stroke of the wordmark.
 *   - `aria-hidden` on every icon. An icon is decoration; the label around it
 *     carries the meaning. An icon that is the only content of a control must
 *     be given an `aria-label` on the control itself, not on the svg.
 */
import type { ReactNode, SVGProps } from "react";

/**
 * The paths themselves.
 *
 * `satisfies Record<string, ReactNode>` keeps the object literal narrow, which
 * is what gives `IconName` its autocomplete and makes a typo in an `icon` field
 * a compile error rather than an empty square at runtime.
 */
const icons = {
  /* --- Discovery and workflow ------------------------------------------- */
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88Z" />
    </>
  ),
  layers: (
    <>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16" />
      <path d="M7 20h10" />
      <path d="M4.5 8h15" />
      <path d="M4.5 8 2 14a2.6 2.6 0 0 0 5 0Z" />
      <path d="M19.5 8 17 14a2.6 2.6 0 0 0 5 0Z" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21V4a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6" />
      <path d="M9 12h4" />
    </>
  ),
  folder: (
    <>
      <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z" />
      <path d="M15 13h6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4Z" />
      <path d="m18.6 15.4.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />
    </>
  ),

  /* --- Actors ------------------------------------------------------------ */
  building: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
      <path d="M15 9h3a2 2 0 0 1 2 2v10" />
      <path d="M2 21h20" />
      <path d="M8 7h3" />
      <path d="M8 11h3" />
      <path d="M8 15h3" />
    </>
  ),
  landmark: (
    <>
      <path d="M3 21h18" />
      <path d="M4 10h16" />
      <path d="M12 3l9 5H3l9-5Z" />
      <path d="M6.5 10v8" />
      <path d="M10 10v8" />
      <path d="M14 10v8" />
      <path d="M17.5 10v8" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),

  /* --- Interface --------------------------------------------------------- */
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  sliders: (
    <>
      <path d="M4 21v-6" />
      <path d="M4 11V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-4" />
      <path d="M20 13V3" />
      <path d="M1.5 15h5" />
      <path d="M9.5 8h5" />
      <path d="M17.5 17h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 11h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mapPin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  fileText: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  trendingUp: (
    <>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  barChart: (
    <>
      <path d="M6 20v-4" />
      <path d="M12 20V10" />
      <path d="M18 20V4" />
    </>
  ),
  pie: (
    <>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10Z" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
  /**
   * An `i` in a circle. Used for the honest-limitation notes (the translation
   * gap, the pricing caveat, the sample-quote notice), where the point is
   * "read this, it qualifies what you just saw" rather than "do this".
   */
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  /** A serif `T` and a sans `T`, for "this is translated, not invented". */
  type: (
    <>
      <path d="M5 6V4h14v2" />
      <path d="M12 4v16" />
      <path d="M9 20h6" />
    </>
  ),
  /** A ribbon-and-bow gift, for the free access plan. */
  gift: (
    <>
      <path d="M20 12v9H4v-9" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 21V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
    </>
  ),
  /** A person with a plus, for the "create an account" action. */
  userPlus: (
    <>
      <path d="M15 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </>
  ),
  /**
   * Stacked cylinders. Used where the point is that something is *stored* rather
   * than merely translated -- the language selector's persistence claim.
   */
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </>
  ),

  award: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="m8.21 13.89-1.21 7 5-3 5 3-1.21-7" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9Z" />,
  languages: (
    <>
      <path d="M4 6h9" />
      <path d="M8.5 4v2c0 4.5-2.2 7.5-5.5 9.5" />
      <path d="M6 13c1.8 2.6 3.8 4 6.5 5" />
      <path d="m13.5 21 4.5-11 4.5 11" />
      <path d="M15.4 16.5h5.2" />
    </>
  ),

  /* --- Controls ---------------------------------------------------------- */
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  check: <path d="m20 6-11 11-5-5" />,
  checkCircle: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  menu: (
    <>
      <path d="M3.5 6.5h17" />
      <path d="M3.5 12h17" />
      <path d="M3.5 17.5h17" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

/** Every icon name the content layer is allowed to reference. */
export type IconName = keyof typeof icons;

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  /**
   * Stroke weight. Overridable because icons sitting on a dark panel need a
   * slightly heavier stroke to hold their contrast against the lighter
   * background.
   */
  strokeWidth?: number;
};

/**
 * Renders one icon.
 *
 * Size is not a prop: the caller sets it with a `size-*` or `h-*`/`w-*` class, so
 * an icon always matches the type scale of the text it sits next to.
 */
export function Icon({ name, strokeWidth = 1.6, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {icons[name]}
    </svg>
  );
}
