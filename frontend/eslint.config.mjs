/**
 * ESLint configuration, in the flat-config format ESLint 9 requires.
 *
 * `next/core-web-vitals` covers correctness and performance rules for React
 * (including the accessibility-oriented checks that matter for this project);
 * `next/typescript` adds the TypeScript-aware rules. The two share a legacy
 * config format, so FlatCompat is used to load them.
 */
import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The directory holding this file. Required by FlatCompat to resolve the
// relative paths inside the imported legacy configs.
const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });

const config = [
  {
    // Generated and vendored files that should never be linted: the build
    // output, installed packages, Next's ambient type declarations, and the
    // PostCSS config.
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "postcss.config.mjs"],
  },
  // Spread the two Next.js rule sets into this flat config.
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  /*
   * `scripts/` holds Node CLI utilities that run under `node`, not in the
   * browser. They are CommonJS on purpose -- `check-catalogue.cjs` in particular
   * has to be able to validate the catalogues without a build step, so it cannot
   * depend on the TypeScript toolchain. The React and TypeScript rules in the
   * Next.js config sets do not apply to them, and `no-require-imports` would flag
   * every one of their imports.
   *
   * This block has to come *after* the spread above: in flat config, a later
   * matching entry wins, so putting it first would silently do nothing.
   */
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default config;
