/**
 * Hard-coded English scan.
 *
 * The project's rule is that every reader-facing string is translated: interface
 * chrome, headings, long-form copy and sample records all live in the four
 * `messages/<locale>` catalogues. That rule is invisible to the type-checker, so
 * this scan finds English string literals and JSX text nodes in the landing
 * components that are not passed through `t()` or `list()`.
 *
 *   node scripts/scan-hardcoded.cjs
 *
 * The output is a review list, not a build failure: stored values, identifiers
 * and structural chrome are legitimately literal. What it catches is prose --
 * a button, a chip, a status word, an `aria-label`, a sample record -- that was
 * never wired to the catalogue.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dirs = ["components/landing", "components/layout", "components/ui"];

/** `t("...")`, `list("...")`, `key="..."` and import lines are all fine. */
const skipPatterns = [
  /^\s*(import|export)\s/,
  /^\s*\/\//,
  /^\s*\*/,
  /^\s*\*?\s*\*\s/,
  /"use client"/,
  /className=/,
  /\bt\(/,
  /\blist\(/,
  /aria-hidden/,
  /^\s*$/,
];

/**
 * True when a string looks like a Tailwind class list rather than prose.
 *
 * `final-cta.tsx` keeps its button styles in a lookup object, so the literals
 * are on their own lines with no `className=` to skip past. Every token having a
 * `-` in it, or being a short bare utility, is a good enough test to keep them
 * out of the report.
 */
function looksLikeClasses(text) {
  const bare = new Set([
    "flex", "grid", "block", "hidden", "relative", "absolute", "fixed", "sticky",
    "static", "container", "sr-only", "italic", "truncate", "uppercase",
    "lowercase", "capitalize", "antialiased", "tabular-nums", "btn",
  ]);
  return text
    .split(/\s+/)
    .every((token) => token.includes("-") || bare.has(token));
}

/**
 * Strips comments from a line, tracking block-comment state across lines.
 *
 * Comments in this repository are unusually dense -- the components explain their
 * decisions inline -- and a scanner that reports English out of a comment is
 * worse than no scanner, because it trains you to ignore the output. Line
 * comments are removed, and a block comment is blanked until it closes, which
 * also handles the single-line block comment form used for the icon docs, where
 * the comment and the value it documents share a line.
 */
function stripComments(lines) {
  let inBlock = false;
  return lines.map((line) => {
    let out = "";
    let index = 0;

    while (index < line.length) {
      if (inBlock) {
        const end = line.indexOf("*/", index);
        if (end === -1) return out;
        inBlock = false;
        index = end + 2;
        continue;
      }

      const lineComment = line.indexOf("//", index);
      const blockComment = line.indexOf("/*", index);

      if (lineComment !== -1 && (blockComment === -1 || lineComment < blockComment)) {
        out += line.slice(index, lineComment);
        return out;
      }

      if (blockComment !== -1) {
        out += line.slice(index, blockComment);
        inBlock = true;
        index = blockComment + 2;
        continue;
      }

      out += line.slice(index);
      return out;
    }

    return out;
  });
}

const files = [];
for (const dir of dirs) {
  const full = path.join(root, dir);
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.name.endsWith(".tsx")) files.push(path.join(full, entry.name));
  }
}

let findings = 0;
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8").split("\n");
  const lines = stripComments(raw);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (skipPatterns.some((p) => p.test(trimmed))) return;

    // JSX text: `>Some words<` on a line of their own or after a tag.
    const jsxText = [...line.matchAll(/>([A-Z][^<>{}]{2,80})</g)].map((m) => m[1]);

    // String literals that are not keys, class names, URLs or icon names.
    const literals = [...line.matchAll(/"([A-Za-z][A-Za-z ,.'\u2019-]{3,80})"/g)]
      .map((m) => m[1])
      .filter(
        (s) =>
          !looksLikeClasses(s) &&
          // A sentence, or a short label-like phrase: two or more words, or a
          // single capitalised word that is not an identifier.
          (s.includes(" ") &&
            !/^(aria|data|use|grid|flex|text|bg|border|rounded|hover|font|absolute|relative|overflow|object|aspect|transition|duration|ease|animate|items|justify|gap|px|py|pt|pb|mt|mb|pl|pr|top|bottom|left|right|z|w|h|min|max|space|tracking|leading|shadow|opacity|from|via|to|group|peer|sm|md|lg|xl|2xl)$/i.test(s)) ||
          /^(Sample|Preview|Open|Close|Search|Filter|Reset|Sign in|Log in|Sign out|Get started|Learn more|Loading|Saved|Error|Success|New|Active|Pending|Closed|Draft|Submitted)$/.test(s)
      );

    for (const text of [...jsxText, ...literals]) {
      findings += 1;
      console.log(
        `${path.relative(root, file).replace(/\\/g, "/")}:${index + 1}  ${text.trim()}`
      );
    }
  });
}

console.log(`\n${findings} candidate(s). Review each: labels must be translated, body copy may stay English.`);

/*
 * What is left after a clean pass, and why each item is correct:
 *
 * - `lib/content.ts` values and the `TypeFilter` union in `discovery.tsx`:
 *   identifiers and stored values ("Funding", "Open", "Call for projects"),
 *   translated at render rather than in place. The scan sees the literal; the
 *   reader sees `t("discovery.types.funding")`.
 * - Sample records in `showcase.tsx` now carry indices into catalogue arrays
 *   (`applicationTitles`, `funders`, `activity`), so their prose is translated
 *   with the rest of the page.
 *
 * A reader-facing label appearing in this list is a real finding. A stored enum
 * or an identifier is not.
 */
