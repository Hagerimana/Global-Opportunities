import type { Config } from "tailwindcss";

/**
 * Tailwind CSS configuration -- the single place the visual language is defined.
 *
 * The previous version used Tailwind's stock palette and kept every brand colour
 * as an ad-hoc class in `app/globals.css`. That worked for a single page of
 * placeholder cards; it does not scale to a full landing page built from
 * `components/`, because the same gradient, shadow and easing would otherwise be
 * re-typed in a dozen files and drift.
 *
 * So the brand now lives here as a real theme:
 *
 *   pine   the primary brand ramp (deep forest green). Replaces the ad-hoc mix
 *          of `emerald-*` and custom hex values used before. Named for the
 *          platform's forest tone, which is close to -- but not identical to --
 *          Tailwind's `emerald`.
 *   gold   the single accent ramp, reserved for emphasis: the primary CTA
 *          highlight, the AI Assistant section, and deadline urgency. Using one
 *          accent for all three keeps gold meaning "look here" everywhere.
 *   ink    text colours. `ink.DEFAULT` is the near-black green used for body
 *          copy, `muted` and `soft` are the two secondary steps. `surface` is
 *          the off-white page canvas, so sections never hard-code `#f7faf8`.
 *
 * `fontFamily` reads the two CSS custom properties that `next/font` injects in
 * `app/layout.tsx`. Both stacks end in a real system fallback, so text is still
 * legible if the webfont fails to load.
 *
 * The `keyframes`/`animation` block is where the ambient motion lives. Every
 * name here has a matching `prefers-reduced-motion` opt-out in
 * `app/globals.css`; adding a new animation means adding it to that media query
 * too, otherwise a user who asked for reduced motion still gets movement.
 */
export default {
  /**
   * Files scanned for class names. Tailwind generates CSS only for classes it
   * finds in these paths, so a new `components/` subdirectory has to be added
   * here or its classes will be missing from the build.
   *
   * `hooks/` and `lib/` are included even though neither currently contains
   * utility classes, so a class dropped into a hook's returned style object is
   * not silently purged.
   */
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        /** Primary brand ramp. 900/950 are the dark section backgrounds. */
        pine: {
          50: "#f1f8f4",
          100: "#dff0e7",
          200: "#bfe1ce",
          300: "#93cbae",
          400: "#5dae8a",
          500: "#38926c",
          600: "#267554",
          700: "#1f5e45",
          800: "#1b4b39",
          900: "#173e30",
          950: "#0b241c",
        },
        /** Accent ramp. Used sparingly -- see the file comment. */
        gold: {
          50: "#fdf8ec",
          100: "#f9edcd",
          200: "#f2d795",
          300: "#e9ba5a",
          400: "#dfa233",
          500: "#c5831f",
          600: "#a2671a",
          700: "#7f4f18",
        },
        /*
         * Text and surface tones.
         *
         * This ramp is the result of a contrast pass, not of taste, and
         * `scripts/check-contrast.cjs` fails the build if any pairing here
         * drifts -- so these numbers cannot be quietly edited into an
         * accessibility regression.
         *
         * Two of the three steps moved, in opposite directions, because
         * "reduce the contrast" and "be accessible" are not the same
         * instruction. What was actually wrong was the *spread*: the ramp ran
         * from 17.1:1 at the top down to 3.9:1 at the bottom, so the page was
         * simultaneously too harsh to read comfortably and, at its quietest
         * step, illegal. Compressing the top and lifting the floor fixes both
         * with one change.
         *
         *   soft    3.92 -> 5.44:1 on white. A fix, not a softening. The old
         *                  value sat below the 4.5:1 that AA requires for body
         *                  text, and it is used on `text-xs` metadata in the
         *                  trust strip, the discovery cards, the project cards
         *                  and the dashboard mock.
         *   muted   6.65 -> 7.61:1. A small move. This step carries most of the
         *                  page's body copy, so it keeps the most headroom.
         *   DEFAULT 17.12 -> 12.10:1. The actual softening. A near-black at
         *                  17:1 across a full page of body text is high-key
         *                  enough to fatigue, and headings set in it looked
         *                  stamped on rather than placed. 12:1 still clears the
         *                  7:1 that AAA asks for, with room to spare.
         *
         * Every step is measured against `sunken`, the darkest of the four
         * light surfaces, because that is the worst case a colour can land on.
         * `testimonials.tsx` is a `sunken` section and does use `ink.soft`,
         * so that floor is a real pairing rather than a theoretical one.
         */
        ink: {
          DEFAULT: "#263a33",
          muted: "#445851",
          soft: "#5a6e67",
        },
        /*
         * Page surfaces.
         *
         * `DEFAULT` is the canvas, `raised` is a card sitting on it, and
         * `sunken` is the alternating section tone.
         *
         * These were `#f6faf8` and pure `#ffffff`. That pairing is 1.05:1,
         * which sounds harmless until you look at the rendered page: a
         * pure-white card has a hard bright edge against a near-white canvas,
         * and a wall of them reads as high-contrast rectangles rather than as
         * one surface with objects resting on it. `raised` is now a warm
         * off-white, so separation is carried by the shadow -- which reads as
         * elevation -- instead of by a brightness step. `sunken` moved down a
         * little too, to keep the alternating rhythm legible now that
         * `raised` no longer sits at the top of the range.
         */
        surface: {
          DEFAULT: "#f2f7f4",
          raised: "#fafcfb",
          sunken: "#e9f2ed",
        },
      },

      fontFamily: {
        // `next/font` injects --font-sans / --font-display as CSS variables with
        // a pre-tuned fallback, so listing system faces after them is a
        // belt-and-braces guard rather than the primary path.
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // The editorial display face for headlines. `.display` in globals.css
        // points at this.
        display: [
          "var(--font-display)",
          "ui-serif",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },

      boxShadow: {
        /** Barely-there lift for resting cards. */
        soft: "0 1px 2px rgba(11,36,28,.04), 0 10px 26px -14px rgba(11,36,28,.14)",
        /** Default card elevation. */
        card: "0 2px 4px rgba(11,36,28,.04), 0 20px 44px -24px rgba(11,36,28,.30)",
        /** Hover elevation for interactive cards. */
        lift: "0 4px 10px rgba(11,36,28,.06), 0 36px 70px -30px rgba(11,36,28,.36)",
        /** Frosted surfaces: the inset top highlight is what sells the glass. */
        glass: "inset 0 1px 0 rgba(255,255,255,.75), 0 24px 60px -34px rgba(11,36,28,.45)",
        /** Green ambient glow, for primary actions and the AI section. */
        glow: "0 0 0 1px rgba(38,117,84,.16), 0 20px 56px -20px rgba(38,117,84,.50)",
        /** Focus ring replacement, so `focus-visible` never shifts layout. */
        ring: "0 0 0 1px rgba(12,31,26,.08), 0 0 0 4px rgba(38,117,84,.18)",
      },

      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },

      /**
       * Additions to the default spacing scale.
       *
       * `4.5` and `5.5` are used by the icon boxes that have to sit optically
       * centred against 14px body text -- an 18px or 20px box next to a 14px line
       * reads as too large, which is the whole reason these are named rather
       * than left to `h-5` and a nudge.
       *
       * `18` is the gap between a section's heading block and the grid beneath
       * it, used by the diagram and panel sections. It is deliberately one step
       * above Tailwind's `16`: the default `mt-16` reads as attached when the
       * element below it is a wide grid rather than a paragraph.
       */
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        18: "4.5rem",
      },

      /**
       * Two easings carry the whole page. `--ease-premium` (expo-out) is the
       * default for entrances because it decelerates hard, which reads as
       * "expensive". `--ease-spring` overshoots and is reserved for small
       * tactile elements -- toggles, chips, the logo mark.
       *
       * The same values are mirrored as CSS variables in globals.css, because
       * the reveal transition in a stylesheet cannot use a Tailwind utility.
       */
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        400: "400ms",
        600: "600ms",
        900: "900ms",
        1200: "1200ms",
      },

      maxWidth: {
        "8xl": "88rem",
      },

      backgroundImage: {
        /** The dark panel used by the AI, ecosystem and final-CTA sections. */
        "pine-sheen": "linear-gradient(140deg, #173e30 0%, #0f2f25 48%, #0b241c 100%)",
        /** The gold accent fill, used on hover states and small highlights. */
        "gold-sheen": "linear-gradient(135deg, #e9ba5a 0%, #c5831f 100%)",
        /** The gradient headline treatment. Background-clip makes it text. */
        "text-pine":
          "linear-gradient(100deg, #1f5e45 0%, #38926c 42%, #c5831f 100%)",
        /** Hairline border for frosted panels. */
        "hairline":
          "linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,0))",
      },

      keyframes: {
        /**
         * Ambient background motion. Two orbs with different periods drift
         * around the hero, so the gradient never visibly repeats.
         */
        "aurora-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(4%, -6%, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-5%, 4%, 0) scale(.95)" },
        },
        /** Slow vertical bob for the floating cards in the hero visual. */
        "float-y": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -12px, 0)" },
        },
        /** Slower, wider variant so stacked floaters do not move in lockstep. */
        "float-y-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -7px, 0)" },
        },
        /** Horizontal drift used by the logo/partner marquee. */
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        /** A highlight sweeping across a surface, for primary CTAs. */
        sheen: {
          "0%": { transform: "translateX(-120%) skewX(-18deg)" },
          "100%": { transform: "translateX(220%) skewX(-18deg)" },
        },
        /** Expanding ring, used for live/status dots. */
        "pulse-ring": {
          "0%": { transform: "scale(.7)", opacity: ".7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        /** Typing caret for the scripted AI conversation. */
        caret: {
          "0%, 45%": { opacity: "1" },
          "50%, 95%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        /** Slow rotation for the gradient ring around the AI mark. */
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        /** Progress bars and timeline connectors filling in after reveal. */
        "grow-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "grow-y": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        /** Bars in the funding chart growing from the baseline. */
        "grow-bar": {
          from: { transform: "scaleY(.04)" },
          to: { transform: "scaleY(1)" },
        },
        /** Fades a skeleton/placeholder in and out. */
        "soft-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".45" },
        },
        /** Draws an SVG connector path once it scrolls into view. */
        draw: {
          from: { strokeDashoffset: "1000" },
          to: { strokeDashoffset: "0" },
        },
        /** Expanding fade for the ambient vignette behind dark sections. */
        "bloom-in": {
          from: { opacity: "0", transform: "scale(.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },

      animation: {
        "aurora-drift": "aurora-drift 22s var(--ease-premium) infinite",
        "aurora-drift-slow": "aurora-drift 34s var(--ease-premium) infinite reverse",
        "float-y": "float-y 7s ease-in-out infinite",
        "float-y-slow": "float-y-slow 9s ease-in-out infinite",
        marquee: "marquee 42s linear infinite",
        sheen: "sheen 2.6s var(--ease-premium) infinite",
        "pulse-ring": "pulse-ring 2.4s var(--ease-premium) infinite",
        caret: "caret 1.05s steps(1) infinite",
        "spin-slow": "spin-slow 14s linear infinite",
        "grow-x": "grow-x 1.1s var(--ease-premium) forwards",
        "grow-y": "grow-y 1.4s var(--ease-premium) forwards",
        "grow-bar": "grow-bar .9s var(--ease-premium) forwards",
        "soft-pulse": "soft-pulse 2.6s ease-in-out infinite",
        draw: "draw 2.2s var(--ease-premium) forwards",
        "bloom-in": "bloom-in 1.6s var(--ease-premium) forwards",
      },
    },
  },

  // No third-party Tailwind plugins. The design system is deliberately
  // dependency-free: everything here is stock Tailwind plus one stylesheet.
  plugins: [],
} satisfies Config;
