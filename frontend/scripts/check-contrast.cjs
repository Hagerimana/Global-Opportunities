/**
 * Fails the build when a colour pairing in the design system drops below its
 * WCAG 2.1 contrast threshold.
 *
 * Why this is a check and not a matter of taste: the palette has already been
 * wrong in both directions. `ink.soft` shipped at 3.92:1 on white -- an AA
 * failure on `text-xs` metadata in eight components -- while `ink.DEFAULT`
 * shipped at 17.12:1, which passes and is still harsh enough to be worth
 * changing. A reviewer looking at a hex value in isolation cannot tell 3.92:1
 * from 5.44:1, so neither of those would have been caught by eye.
 *
 * The thresholds are the real ones, from WCAG 2.1:
 *
 *   4.5:1  normal text          (SC 1.4.3)
 *   3.0:1  large text, >=24px, or >=18.66px bold   (SC 1.4.3)
 *   3.0:1  UI component boundaries and meaningful graphics  (SC 1.4.11)
 *
 * Large text is allowed the lower bar because WCAG says so, not as a loophole:
 * "large" is defined by size, and a heading is genuinely easier to read than
 * 12px metadata. The distinction is asserted per pairing below rather than
 * assumed, so a pairing cannot quietly claim the easier threshold.
 *
 * Every colour is read from `tailwind.config.ts` at run time. Nothing is
 * duplicated here, so editing the palette edits what is checked.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const config = fs.readFileSync(path.join(root, "tailwind.config.ts"), "utf8");

/* ------------------------------------------------------------------------- */
/* Colour maths                                                               */
/* ------------------------------------------------------------------------- */

/** Parses `#rgb` or `#rrggbb`. Returns null rather than throwing, so a typo in
 *  the palette surfaces as a failed check instead of a stack trace. */
function parseHex(value) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value).trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

/** The sRGB relative-luminance transfer function, WCAG 2.1 section 12. */
function toLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [high, low] = la > lb ? [la, lb] : [lb, la];
  return (high + 0.05) / (low + 0.05);
}

/* ------------------------------------------------------------------------- */
/* Palette extraction                                                         */
/* ------------------------------------------------------------------------- */

/**
 * Strips comments from the config.
 *
 * The `ink` block documents its own ratios in prose -- "soft 3.92 -> 5.44:1" --
 * and a comment-stripping parse is the only way to tell that text apart from an
 * actual key. A block comment is blanked until it closes, which also covers the
 * single-line form used above most of the ramps.
 */
const source = (() => {
  let out = "";
  let inBlock = false;
  for (let i = 0; i < config.length; i += 1) {
    if (inBlock) {
      if (config[i] === "*" && config[i + 1] === "/") {
        inBlock = false;
        i += 1;
      } else if (config[i] === "\n") {
        out += "\n";
      }
      continue;
    }
    if (config[i] === "/" && config[i + 1] === "*") {
      inBlock = true;
      i += 1;
      continue;
    }
    if (config[i] === "/" && config[i + 1] === "/") {
      while (i < config.length && config[i] !== "\n") i += 1;
      continue;
    }
    out += config[i];
  }
  return out;
})();

/**
 * Pulls a named colour ramp out of `theme.extend.colors`.
 *
 * Parsed rather than imported because the config is TypeScript and this runs
 * before anything is built. The block boundaries are found by brace matching
 * from `colors: {`, so adding a new ramp does not require editing this script.
 */
function readRamp(name) {
  const colorsAt = source.indexOf("colors: {");
  if (colorsAt === -1) throw new Error("no colors block in tailwind.config.ts");

  const rampAt = config.indexOf(`${name}: {`, colorsAt);
  if (rampAt === -1) throw new Error(`no "${name}" ramp in tailwind.config.ts`);

  const open = config.indexOf("{", rampAt);
  let depth = 0;
  for (let index = open; index < config.length; index += 1) {
    if (config[index] === "{") depth += 1;
    else if (config[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        /*
         * Key and value are captured in a single pattern, with the key optional
         * and the value mandatory. Anchoring the value on the hex means a line
         * that merely mentions a key -- a comment, or a nested block -- cannot
         * contribute a spurious entry, which is what happens when the keys and
         * the values are matched separately and zipped by position.
         *
         * The key is optional because two entries in the palette are written
         * `DEFAULT:` and one is written `"pine-sheen":`, and a parser that
         * handled only one of those spellings would silently drop a colour.
         */
        const body = config.slice(open + 1, index);
        const entries = {};
        for (const entry of body.matchAll(/(?:"(\w+)"|(\b\w+))\s*:\s*"(#[0-9a-fA-F]{3,6})"/g)) {
          const name = entry[1] || entry[2];
          if (name) entries[name] = entry[3];
        }
        return entries;
      }
    }
  }
  throw new Error(`unterminated "${name}" ramp`);
}

const pine = readRamp("pine");
const gold = readRamp("gold");
const ink = readRamp("ink");
const surface = readRamp("surface");

/*
 * The dark-panel gradient. A `linear-gradient(...)` in the config has no inner
 * parentheses, so the capture is greedy to the last `)` on the line rather than
 * stopping at the first. Taking the first `)` would return the colour list
 * without the closing paren, which is fine for the hex match but wrong if the
 * gradient is ever given a `deg` angle or a colour-stop position.
 */
const sheen = (() => {
  const found = /"pine-sheen":\s*"(linear-gradient\((.*)\))"/.exec(config);
  if (!found) throw new Error('no "pine-sheen" gradient in tailwind.config.ts');
  const stops = found[2].match(/#[0-9a-fA-F]{6}/g);
  if (!stops) throw new Error("pine-sheen has no hex stops to check");
  return stops;
})();

/* ------------------------------------------------------------------------- */
/* The pairings the page actually renders                                     */
/* ------------------------------------------------------------------------- */

/*
 * `size` is why the threshold differs, and it is stated per pairing rather than
 * per colour. `body` and `small` need 4.5:1; `large` and `ui` need 3.0:1.
 *
 * Every surface a text colour can land on is listed. `ink.soft` appears in a
 * `sunken` section (testimonials), so the worst case is `sunken`, not white --
 * checking only against white is how a passing-looking palette hides a failure.
 */
const RULES = [
  // --- Body text on the light surfaces ------------------------------------
  { fg: ink.DEFAULT, bg: surface.raised, size: "body", where: "headings and body on a card" },
  { fg: ink.DEFAULT, bg: surface.DEFAULT, size: "body", where: "headings and body on the canvas" },
  { fg: ink.DEFAULT, bg: surface.sunken, size: "body", where: "headings and body on a sunken section" },
  { fg: ink.DEFAULT, bg: "#ffffff", size: "body", where: "headings on pure white (modals, auth pages)" },

  { fg: ink.muted, bg: surface.raised, size: "body", where: "body copy on a card" },
  { fg: ink.muted, bg: surface.DEFAULT, size: "body", where: "body copy on the canvas" },
  { fg: ink.muted, bg: surface.sunken, size: "body", where: "body copy on a sunken section" },
  { fg: ink.muted, bg: "#ffffff", size: "body", where: "body copy on pure white" },

  { fg: ink.soft, bg: surface.raised, size: "small", where: "text-xs metadata on a card" },
  { fg: ink.soft, bg: surface.DEFAULT, size: "small", where: "text-xs metadata on the canvas" },
  { fg: ink.soft, bg: surface.sunken, size: "small", where: "text-xs metadata on a sunken section" },
  { fg: ink.soft, bg: "#ffffff", size: "small", where: "text-xs metadata on pure white" },

  // --- Text on the dark panels -------------------------------------------
  { fg: "#ffffff", bg: pine[900], size: "body", where: "white body on a dark panel" },
  { fg: pine[100], bg: pine[900], size: "body", where: "light body copy on a dark panel" },
  { fg: pine[200], bg: pine[900], size: "body", where: "eyebrow-light on a dark panel" },
  { fg: "#ffffff", bg: pine[950], size: "body", where: "white body on the darkest panel" },
  { fg: pine[100], bg: pine[950], size: "body", where: "light body on the darkest panel" },
  { fg: pine[300], bg: pine[900], size: "small", where: "lightest metadata on a dark panel" },
  { fg: pine[200], bg: pine[800], size: "small", where: "metadata on a primary button" },

  // --- Controls ------------------------------------------------------------
  { fg: pine[950], bg: gold[400], size: "body", where: "btn-gold label" },
  { fg: pine[900], bg: gold[300], size: "body", where: "btn-gold label on hover" },
  { fg: "#ffffff", bg: pine[800], size: "body", where: "btn-primary label" },
  { fg: pine[900], bg: "#ffffff", size: "body", where: "btn-light label" },
  { fg: pine[900], bg: pine[50], size: "small", where: "chip-muted label" },
  { fg: ink.muted, bg: pine[50], size: "small", where: "chip label on a pine tint" },
  { fg: pine[700], bg: pine[100], size: "small", where: "status pill, open" },
  { fg: gold[700], bg: gold[100], size: "small", where: "status pill, upcoming" },

  // --- Non-text boundaries, SC 1.4.11 ------------------------------------
  { fg: pine[600], bg: surface.DEFAULT, size: "ui", where: "focus ring on the canvas" },
  { fg: pine[600], bg: surface.raised, size: "ui", where: "focus ring on a card" },
  { fg: pine[600], bg: surface.sunken, size: "ui", where: "focus ring on a sunken section" },
  { fg: pine[200], bg: pine[900], size: "ui", where: "focus ring on a dark panel" },
  { fg: gold[400], bg: pine[950], size: "ui", where: "eyebrow dot on a dark panel" },
];

/*
 * Rules that describe something other than a foreground/background text pair,
 * or that intentionally accept a lower ratio. Kept beside the main list so that
 * a reviewer sees the exceptions in the same place as the rules.
 *
 * `nonText` rules only need 3:1 and are not text, so they are listed for
 * completeness but graded at the UI threshold.
 */
const THRESHOLD = { body: 4.5, small: 4.5, large: 3.0, ui: 3.0 };

/* ------------------------------------------------------------------------- */
/* Run                                                                        */
/* ------------------------------------------------------------------------- */

let failures = 0;
let warned = 0;
const rows = [];

for (const rule of RULES) {
  const ratio = contrast(rule.fg, rule.bg);
  if (ratio === null) {
    failures += 1;
    console.log(`UNPARSEABLE  ${rule.where}  (fg ${rule.fg} on bg ${rule.bg})`);
    continue;
  }
  const need = THRESHOLD[rule.size];
  const ok = ratio >= need;
  if (!ok) failures += 1;
  rows.push({ ...rule, ratio, need, ok });
}

for (const row of rows.filter((r) => !r.ok)) {
  console.log(
    `FAIL  ${row.ratio.toFixed(2)}:1  needs ${row.need.toFixed(1)}:1  ${row.size.padEnd(5)}  ${row.where}\n` +
      `        fg ${row.fg} on bg ${row.bg}`
  );
}

/*
 * The dark-panel gradient has three stops. The middle one is the surface a
 * heading actually lands on, so it gets the same treatment as a solid.
 */
for (const stop of sheen) {
  const ratio = contrast("#ffffff", stop);
  if (ratio === null) continue;
  const ok = ratio >= 4.5;
  if (!ok) failures += 1;
  else warned += 0;
  rows.push({
    where: `white on pine-sheen stop ${stop}`,
    fg: "#ffffff",
    bg: stop,
    ratio,
    need: 4.5,
    size: "body",
    ok,
  });
}

const passing = rows.filter((r) => r.ok);
const tightest = passing.slice().sort((a, b) => a.ratio - b.ratio)[0];

console.log("");
if (failures) {
  console.log(
    `${failures} of ${rows.length} pairing(s) below threshold. ` +
      `Ratios: ${rows
        .map((r) => r.ratio.toFixed(2))
        .sort((a, b) => Number(a) - Number(b))
        .slice(0, 8)
        .join(", ")} ...`
  );
} else {
  console.log(
    `All ${rows.length} pairings meet their threshold. ` +
      `Tightest: ${tightest.ratio.toFixed(2)}:1 (${tightest.size}) for ${tightest.where}.`
  );
}
void warned;
process.exit(failures ? 1 : 0);
