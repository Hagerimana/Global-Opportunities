/**
 * Merge the landing-page translation patches in `scripts/i18n/landing-<locale>.cjs`
 * into `messages/<locale>/landing.json`.
 *
 * Why a merge rather than a copy: the patch files are authored per section (so
 * a reviewer can read one language top to bottom), while the locale catalogues
 * also carry keys that are not part of this batch. A deep merge adds and
 * overwrites the patched leaves but never drops an existing key.
 *
 * Arrays are replaced wholesale: they are positional and must stay aligned with
 * `lib/content.ts`, so a partial merge into an array would silently shift text.
 *
 * Usage: `node scripts/i18n/apply-i18n.cjs`
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const locales = ["en", "fr", "rn", "sw"];

/** Locale metadata that the older catalogues got wrong; keep it authoritative. */
const localeMeta = {
  en: { name: "English", htmlLang: "en" },
  fr: { name: "Français", htmlLang: "fr" },
  rn: { name: "Kirundi", htmlLang: "rn" },
  sw: { name: "Kiswahili", htmlLang: "sw" },
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function merge(base, patch) {
  if (Array.isArray(patch)) return patch.slice();
  if (!isPlainObject(patch)) return patch;
  const out = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(patch)) {
    out[key] = key in out ? merge(out[key], value) : merge(undefined, value);
  }
  return out;
}

function leafPaths(value, prefix = "", out = []) {
  if (Array.isArray(value)) {
    out.push(prefix + "[]");
    return out;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      leafPaths(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out.push(prefix);
  return out;
}

for (const locale of locales) {
  const patchPath = path.join(__dirname, `landing-${locale}.cjs`);
  const targetPath = path.join(root, "messages", locale, "landing.json");
  const patch = require(patchPath).landing;
  const existing = JSON.parse(fs.readFileSync(targetPath, "utf8"));

  const merged = merge(existing, patch);
  merged.locale = localeMeta[locale];

  fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(
    `${locale}: ${leafPaths(existing).length} -> ${leafPaths(merged).length} keys in ${path.relative(root, targetPath)}`,
  );
}
