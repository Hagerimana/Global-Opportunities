/**
 * PostCSS configuration.
 *
 * PostCSS runs between Tailwind and the browser build. Both plugins are required
 * for utility CSS to be generated at all.
 */
export default {
  plugins: {
    // Compiles Tailwind's @tailwind directives into real CSS, expanding only
    // the utility classes found in the `content` globs.
    tailwindcss: {},
    // Adds vendor prefixes for the handful of properties that still need them
    // (notably `backdrop-filter`, used by the `.glass` navbar).
    autoprefixer: {},
  },
};
