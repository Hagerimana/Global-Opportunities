"use client";

/**
 * The ambient background: drifting colour blooms, a masked grid, and a grain
 * overlay.
 *
 * Purely decorative, so the whole thing is `aria-hidden` and `pointer-events-none`
 * -- it must never intercept a click on a card sitting above it.
 *
 * Two variants, because the same trick inverts on a dark panel: the light
 * version sits on `surface` with soft mint and gold blooms, the dark version on
 * `pine-sheen` with brighter, more saturated blooms and a light grid.
 */
export function AmbientBackdrop({ variant = "light" }: { variant?: "light" | "dark" }) {
  const dark = variant === "dark";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Two blooms on different periods, so the composition never visibly
          repeats. `blur-3xl` is what turns a hard-edged circle into light. */}
      <div
        className={`orb h-[34rem] w-[34rem] -left-40 -top-48 animate-aurora-drift ${
          dark ? "bg-pine-500/25" : "bg-pine-300/35"
        }`}
      />
      <div
        className={`orb h-[28rem] w-[28rem] -right-32 top-16 animate-aurora-drift-slow ${
          dark ? "bg-gold-400/20" : "bg-gold-300/30"
        }`}
      />
      <div
        className={`orb h-[26rem] w-[26rem] bottom-[-14rem] left-1/3 animate-aurora-drift ${
          dark ? "bg-pine-400/20" : "bg-pine-200/45"
        }`}
        style={{ animationDelay: "-8s" }}
      />

      {/* The grid, masked to fade out towards the edges. */}
      <div className={`absolute inset-0 ${dark ? "grid-fade-light" : "grid-fade"}`} />

      {/* Film grain. Sits above the grid so the two do not moire against each
          other, and below the content because the whole container is
          pointer-transparent and sits behind it anyway. */}
      <div className="noise absolute inset-0" />

      {/* A hairline of light along the very top, which is what makes a dark
          section look lit from above. */}
      {dark && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      )}
    </div>
  );
}
