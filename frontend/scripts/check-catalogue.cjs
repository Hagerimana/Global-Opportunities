/**
 * Catalogue integrity check.
 *
 * Verifies, for every one of the four locales, that every translation key
 * referenced in `lib/content.ts` actually resolves. Run it after editing the
 * catalogues or the content arrays:
 *
 *   node scripts/check-catalogue.cjs
 *
 * It reimplements `resolve()` from `lib/i18n.tsx` so a key that would fall back
 * to English at runtime is reported here as an error instead. A missing key is
 * invisible in a build -- `t()` falls back by design -- which is exactly why it
 * needs a separate check.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const locales = ["en", "fr", "rn", "sw"];

/**
 * Deep merge with the same precedence as `lib/i18n.tsx`: the landing catalogue
 * wins over the platform catalogue when both define a key.
 */
function merge(base, extra) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = merged[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      merged[key] = merge(current, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

const catalogues = Object.fromEntries(
  locales.map((code) => {
    const landing = JSON.parse(
      fs.readFileSync(path.join(root, "messages", code, "landing.json"), "utf8")
    );
    const app = JSON.parse(
      fs.readFileSync(path.join(root, "messages", code, "app.json"), "utf8")
    );
    return [code, merge(landing, app)];
  })
);

/** Mirrors `resolve()` in `lib/i18n.tsx`. */
const arrayIndex = /^\d+$/;
function resolve(catalogue, keyPath) {
  let node = catalogue;
  for (const segment of keyPath.split(".")) {
    if (typeof node === "string") return undefined;
    if (Array.isArray(node)) {
      if (!arrayIndex.test(segment)) return undefined;
      node = node[Number(segment)];
      continue;
    }
    if (node === undefined || node === null) return undefined;
    node = node[segment];
  }
  return typeof node === "string" || Array.isArray(node) ? node : undefined;
}

/**
 * Every string literal in `content.ts` that looks like a catalogue key: it has a
 * dot, and its first segment is one of the catalogue's top-level namespaces.
 * Over-inclusive on purpose -- a key that resolves but is never used is harmless,
 * whereas a missing key is a visible bug on the page.
 */
const topLevel = new Set(Object.keys(catalogues.en));
const content = fs.readFileSync(path.join(root, "lib", "content.ts"), "utf8");
const referenced = new Set();

for (const match of content.matchAll(/"([a-zA-Z]+(?:\.[a-zA-Z0-9]+)+)"/g)) {
  const candidate = match[1];
  if (topLevel.has(candidate.split(".")[0])) referenced.add(candidate);
}

// Keys used directly in components or route files rather than through content.ts.
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".tsx")) {
      const source = fs.readFileSync(full, "utf8");
      for (const match of source.matchAll(/\bt\(\s*"([a-zA-Z]+(?:\.[a-zA-Z0-9]+)+)"/g)) {
        if (topLevel.has(match[1].split(".")[0])) referenced.add(match[1]);
      }
      for (const match of source.matchAll(/\blist\(\s*"([a-zA-Z]+(?:\.[a-zA-Z0-9]+)+)"/g)) {
        if (topLevel.has(match[1].split(".")[0])) referenced.add(match[1]);
      }
    }
  }
};
walk(path.join(root, "components"));
walk(path.join(root, "app"));

let failures = 0;
for (const key of [...referenced].sort()) {
  const missing = locales.filter((code) => resolve(catalogues[code], key) === undefined);
  if (missing.length) {
    failures += 1;
    console.log(`MISSING  ${key}  ->  ${missing.join(", ")}`);
  }
}

console.log(`\n${referenced.size} keys referenced, ${failures} unresolved.`);

/* -------------------------------------------------------------------------- */
/* Structural parity across locales                                             */
/* -------------------------------------------------------------------------- */

/**
 * Every locale must have the same key set and the same array lengths as English.
 *
 * The per-key check above only covers keys that are literal strings in
 * `content.ts` or a `t("...")` call. Template-literal and positional keys
 * (`features.details.3`, `opps.items.watershed.eligibility.0`) never reach it, so
 * a locale that is missing one array entry would silently fall back to English --
 * or return `undefined` from a `list()` call. Walking the whole tree closes that
 * hole.
 */
function shape(value, prefix = "", out = []) {
  if (Array.isArray(value)) {
    out.push([prefix, "array", value.length]);
    value.forEach((item, index) => {
      if (item && typeof item === "object") shape(item, `${prefix}.${index}`, out);
    });
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      shape(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out.push([prefix, typeof value, 0]);
  return out;
}

function structureFailures() {
  const base = new Map(shape(catalogues.en).map(([p, kind, length]) => [p, { kind, length }]));
  let failures = 0;
  for (const code of locales) {
    if (code === "en") continue;
    const current = new Map(shape(catalogues[code]).map(([p, kind, length]) => [p, { kind, length }]));
    for (const [p, want] of base) {
      const got = current.get(p);
      if (!got) {
        failures += 1;
        console.log(`SHAPE    ${p}  ->  missing in ${code}`);
      } else if (got.kind !== want.kind || got.length !== want.length) {
        failures += 1;
        console.log(
          `SHAPE    ${p}  ->  ${code} has ${got.kind}${got.length ? `(${got.length})` : ""}, en has ${want.kind}${want.length ? `(${want.length})` : ""}`
        );
      }
    }
    for (const p of current.keys()) {
      if (!base.has(p)) {
        failures += 1;
        console.log(`SHAPE    ${p}  ->  extra in ${code}`);
      }
    }
  }
  console.log(
    failures
      ? `\n${failures} structural mismatch(es) across locales.`
      : "All four locales have identical structure."
  );
  return failures;
}

const shapeFailures = structureFailures();

/* -------------------------------------------------------------------------- */
/* Array-length parity                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Content arrays whose positions must line up with a catalogue array.
 *
 * `content.ts` holds a `titleKey` of `prefix.N` per item and the component maps
 * the array by index, so a catalogue array that is shorter than its content
 * array renders `undefined` headings, and one that is longer leaves dead
 * translations. Neither fails a type-check, because the keys are plain strings.
 *
 * `pattern` counts the matching key references in `content.ts` (or, with
 * `scope`, inside one exported array). `how.steps` is read with `list()` and has
 * no per-step key, so it borrows the matching `how.details.N` count: the two
 * arrays are documented as index-aligned.
 */
const pairs = [
  { prefix: "trust.details", pattern: /detailKey: "trust\.details\./g },
  { prefix: "features.items", pattern: /titleKey: "features\.items\./g },
  { prefix: "features.details", pattern: /detailKey: "features\.details\./g },
  { prefix: "how.steps", pattern: /detailKey: "how\.details\./g },
  { prefix: "how.details", pattern: /detailKey: "how\.details\./g },
  { prefix: "how.outputs", pattern: /outputKey: "how\.outputs\./g },
  { prefix: "benefits.items", pattern: /titleKey: "benefits\.items\./g },
  { prefix: "benefits.details", pattern: /detailKey: "benefits\.details\./g },
  { prefix: "ecosystem.actors", pattern: /titleKey: "ecosystem\.actors\./g },
  { prefix: "ecosystem.actorDetails", pattern: /detailKey: "ecosystem\.actorDetails\./g },
  { prefix: "ecosystem.flows", pattern: /labelKey: "ecosystem\.flows\./g },
  { prefix: "impact.items", pattern: /titleKey: "impact\.items\./g },
  { prefix: "impact.details", pattern: /detailKey: "impact\.details\./g },
  { prefix: "ai.capabilities", pattern: /titleKey: "ai\.capabilities\./g },
  { prefix: "ai.capabilityDetails", pattern: /detailKey: "ai\.capabilityDetails\./g },
  { prefix: "testimonials.roles", pattern: /roleKey: "testimonials\.roles\./g },
  { prefix: "testimonials.quotes", pattern: /quoteKey: "testimonials\.quotes\./g },
  { prefix: "pricing.roles", pattern: /titleKey: "pricing\.roles\./g },
  { prefix: "pricing.roleDetails", pattern: /detailKey: "pricing\.roleDetails\./g },
  { prefix: "faq.q", pattern: /questionKey: "faq\.q\./g },
  { prefix: "faq.a", pattern: /answerKey: "faq\.a\./g },
  { prefix: "finalCta.details", pattern: /detailKey: "finalCta\.details\./g },
];

/**
 * Walks a path and returns whatever is at it, including a container.
 *
 * `resolve()` stops at leaves, so it cannot be used to measure the size of an
 * intermediate object. This walks for counting only.
 */
function lookup(catalogue, keyPath) {
  let node = catalogue;
  for (const segment of keyPath.split(".")) {
    if (node === undefined || node === null || typeof node !== "object") return undefined;
    node = Array.isArray(node) ? node[Number(segment)] : node[segment];
  }
  return node;
}

let lengthFailures = 0;
for (const { prefix, pattern, scope } of pairs) {
  const body = scope ? content.match(scope)?.[1] ?? "" : content;
  const expected = (body.match(pattern) ?? []).length;
  for (const code of locales) {
    const value = lookup(catalogues[code], prefix);
    /*
     * A catalogue "array" can be written either as a JSON array or as an object
     * with numbered keys -- `faq.q.q1` rather than `faq.q[0]`, because JSON
     * gives no way to make positional intent obvious in an object. Both hold the
     * same number of translations, so accept either shape and count its size.
     */
    const actual = Array.isArray(value)
      ? value.length
      : value && typeof value === "object"
        ? Object.keys(value).length
        : 0;
    if (actual !== expected) {
      lengthFailures += 1;
      console.log(
        `LENGTH   ${prefix} [${code}] has ${actual}, content.ts has ${expected} item(s)`
      );
    }
  }
}

console.log(
  lengthFailures
    ? `\n${lengthFailures} array-length mismatch(es).`
    : "All array lengths agree with content.ts."
);

process.exit(failures + lengthFailures + shapeFailures ? 1 : 0);
