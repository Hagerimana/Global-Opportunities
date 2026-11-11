#!/usr/bin/env node
/**
 * Responsive system guard.
 *
 * The fluid type scale, the fluid gutter and the tap-target minimum are all
 * declared in `app/globals.css` and consumed as classes or custom properties
 * across two dozen components. Nothing about that arrangement is enforced by
 * TypeScript, so the couplings are checked here instead.
 *
 * Four rules, each of which corresponds to a mistake that is easy to make and
 * invisible until someone opens the page on a phone:
 *
 *   1. Clamp ordering. `clamp(min, preferred, max)` silently clamps out of
 *      range, so a transposed pair produces a scale that looks fine in the
 *      stylesheet and is frozen at the wrong end on every device.
 *   2. Token/utility agreement. A `text-step-h3` with no matching
 *      `--step-h3` renders at the inherited size, and a `--step-h3` with no
 *      consumer is dead weight. Both are typos, and both are silent.
 *   3. `env()` fallbacks. `env()` is unresolved on older engines, which drops
 *      the whole declaration. Inside a `calc()` that takes the page's anchor
 *      offsets with it.
 *   4. Tap targets. WCAG 2.2 SC 2.5.8 asks for 24x24 CSS pixels; the platform
 *      guidance asks 44x44. An element sized only by `py-2` lands near 36px,
 *      which clears the letter and not the finger.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const rawCss = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8");
const problems = [];
const fail = (message) => problems.push(message);

/*
 * Comments are stripped before anything is parsed. Every rule below reads
 * declarations, and a declaration that appears inside a comment is not a
 * declaration -- but `env()` in particular is easy to mention in prose, and a
 * prose mention of `env(x)` would otherwise be read as a call with no fallback.
 * Both comment forms are handled because the file uses `/* *\/` above
 * `:root` and `//`-style notes are not valid CSS.
 */
const css = rawCss
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !/^\s*\/\//.test(line))
  .join("\n");

/* --- 1. Clamp ordering ---------------------------------------------------- */

const UNITS = { rem: 16, px: 1, em: 16, "": 16 };

/** Evaluates a clamp term at a viewport width, in px. */
function resolve(term, viewport) {
  const value = term.trim();
  const match = value.match(/^(-?[\d.]+)(rem|px|em)?$/);
  if (match) return parseFloat(match[1]) * UNITS[match[2] ?? "rem"];
  // The preferred term is `A + Bvw`; the vw part is viewport-relative.
  const fluid = value.match(/^(-?[\d.]+)(rem|px|em)?\s*\+\s*(-?[\d.]+)vw$/);
  if (fluid) {
    const base = parseFloat(fluid[1]) * UNITS[fluid[2] ?? "rem"];
    return base + (parseFloat(fluid[3]) / 100) * viewport;
  }
  return null;
}

const clampPattern = /--([\w-]+):\s*clamp\(([^)]+)\)/g;
let clampMatch;
let clampCount = 0;
while ((clampMatch = clampPattern.exec(css)) !== null) {
  const [, name, args] = clampMatch;
  const [min, preferred, max] = args.split(",").map((part) => part.trim());
  const minPx = resolve(min, 0);
  const maxPx = resolve(max, 0);
  clampCount += 1;

  if (minPx === null || maxPx === null) {
    fail(`${name}: could not read the clamp bounds (min "${min}", max "${max}")`);
    continue;
  }
  if (minPx >= maxPx) {
    fail(
      `${name}: min ${minPx.toFixed(1)}px is not below max ${maxPx.toFixed(1)}px -- clamp() will pin every viewport to one end`
    );
    continue;
  }

  const at = (viewport) => resolve(preferred, viewport);
  const narrow = at(320);
  const wide = at(1440);
  if (narrow === null || wide === null) {
    fail(`${name}: could not read the preferred term "${preferred}"`);
    continue;
  }

  /*
   * What "correct" means for a clamp.
   *
   * The obvious check -- the preferred term lands inside [min, max] at every
   * viewport -- is wrong, because leaving the range is the entire point of the
   * min and the max. `clamp(1rem, 0.9rem + 3vw, 2.5rem)` is *supposed* to
   * exceed 2.5rem on a wide monitor; the max is what stops it.
   *
   * The two failures that actually matter are directional:
   *
   *   - preferred > max on a 320px phone means the whole mobile range is
   *     pinned to the ceiling, so a "fluid" scale is really a fixed large one;
   *   - preferred < min on a 1440px desktop means the whole desktop range is
   *     pinned to the floor, so the scale never grows for the readers who have
   *     the most screen.
   *
   * And a scale that is pinned at *both* ends is not fluid at all, so the
   * viewport band over which the preferred term is genuinely between the bounds
   * must be non-empty.
   */
  if (narrow > maxPx + 0.5) {
    fail(
      `${name}: preferred term is ${narrow.toFixed(1)}px at 320px, above the ${maxPx.toFixed(1)}px max -- every phone is pinned to the ceiling`
    );
  }
  if (wide < minPx - 0.5) {
    fail(
      `${name}: preferred term is ${wide.toFixed(1)}px at 1440px, below the ${minPx.toFixed(1)}px min -- every desktop is pinned to the floor`
    );
  }

  const crossing = (target) => {
    const slope = preferred.match(/(-?[\d.]+)vw/);
    if (!slope) return null;
    const perVw = parseFloat(slope[1]) / 100;
    if (perVw === 0) return null;
    const base = resolve(preferred.split("+")[0], 0);
    if (base === null) return null;
    return (target - base) / perVw;
  };
  const reachesMin = crossing(minPx);
  const reachesMax = crossing(maxPx);
  if (reachesMin !== null && reachesMax !== null) {
    const band = Math.max(0, Math.min(reachesMax, 1440) - Math.max(reachesMin, 0));
    if (band < 200) {
      fail(
        `${name}: the preferred term is only between its own bounds across ${band.toFixed(0)}px of viewport -- effectively a fixed size`
      );
    }
  }
}

/* --- 2. Token and utility agreement --------------------------------------- */

const stepTokens = new Set(
  [...css.matchAll(/--step-([\w-]+):\s*clamp\(/g)].map((m) => m[1])
);
const stepUtilities = new Set(
  [...css.matchAll(/\.text-step-([\w-]+)\s*\{/g)].map((m) => m[1])
);

for (const token of stepTokens) {
  if (!stepUtilities.has(token)) {
    fail(`--step-${token} is defined but no .text-step-${token} utility consumes it`);
  }
}
for (const utility of stepUtilities) {
  if (!stepTokens.has(utility)) {
    fail(`.text-step-${utility} is declared but --step-${utility} is not defined`);
  }
}

// Every utility must also be used by at least one component, or it is a token
// that will drift out of sync with the design without anything noticing.
const componentDir = path.join(root, "components");
const componentFiles = [];
const sources = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".tsx")) {
      componentFiles.push(path.relative(root, full));
      sources.push(fs.readFileSync(full, "utf8"));
    }
  }
})(componentDir);
const allSources = sources.join("\n");

for (const utility of stepUtilities) {
  if (!allSources.includes(`text-step-${utility}`)) {
    fail(`.text-step-${utility} is defined but no component uses it`);
  }
}

/* --- 3. env() fallbacks --------------------------------------------------- */

for (const match of css.matchAll(/env\(([^)]*)\)/g)) {
  const args = match[1];
  // A bare `env(x)` with no second argument is the unresolvable form: the
  // fallback is a required second parameter, not an optional one.
  if (!/,\s*\S/.test(args)) {
    fail(`env(${args}) has no fallback -- an engine that cannot resolve it drops the whole declaration`);
  }
}

/* --- 4. Tap targets ------------------------------------------------------- */

const TAPPED = /(?<![\w-])tap(?![\w-])|min-h-\[var\(--tap\)\]|min-h-11|min-h-12/;
const INTERACTIVE = /^<(button|a|summary|input|select)\b/;

/*
 * `py-N` on its own decides the height of a control whose height is otherwise
 * set by the line box. `py-2` is 16px of padding over a ~20px line, so ~36px;
 * `py-2.5` is ~40px. Both are under the 44px the platform guidance asks for,
 * which is why the threshold stops at 2.5 -- `py-3` is 48px and passes.
 */
const SHORT_PADDING = /\bpy-(0|0\.5|1|1\.5|2|2\.5)\b/;
const SHORT_HEIGHT = /\bh-(6|7|8|9)\b/;

/**
 * Extracts one JSX opening tag starting at `start`.
 *
 * A regex cannot do this. `onClick={() => setActive(index)}` contains a `>`
 * that belongs to an arrow function, not to the tag, and a naive
 * `<[a-z]+\b[\s\S]{0,900}?>` stops there and returns a fragment that has not
 * yet reached the `className` -- so the control looks unstyled and gets
 * reported. Tracking brace depth and string state is what makes the scan
 * correct on real JSX.
 */
function readTag(source, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === ">" && depth === 0) {
      return source.slice(start, i + 1);
    }
  }
  return null;
}

let interactiveCount = 0;
for (const source of sources) {
  for (const match of source.matchAll(/<(button|a|summary|input|select)\b/g)) {
    const tag = readTag(source, match.index);
    if (!tag || !INTERACTIVE.test(tag)) continue;
    if (TAPPED.test(tag)) continue;

    // Skip non-visual or explicitly hidden controls.
    if (/(?<![\w-])hidden(?![\w-])|sr-only|aria-hidden|type="hidden"/.test(tag)) continue;
    // A control that opts out explicitly has made a considered choice.
    if (/data-tap-exempt/.test(tag)) continue;

    const height = SHORT_HEIGHT.test(tag) ? SHORT_HEIGHT : SHORT_PADDING.test(tag) ? SHORT_PADDING : null;
    if (!height) continue;

    interactiveCount += 1;
    const line = source.slice(0, match.index).split("\n").length;
    const file = sources.findIndex((s) => s === source);
    const name = componentFiles[file] ?? "a component";
    problems.push(
      `${name} line ${line}: <${match[1]}> is sized by ${height.source} with no .tap or min-h -- under 44px`
    );
  }
}

/* --- Report --------------------------------------------------------------- */

if (problems.length) {
  console.error(`Responsive check failed with ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `Responsive system consistent: ${clampCount} clamp(s) ordered, ` +
    `${stepTokens.size} step token(s) matched to utilities and used, ` +
    `all env() calls have fallbacks, ${interactiveCount} small control(s) left for review.`
);
