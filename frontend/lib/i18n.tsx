"use client";

/**
 * Interface language for the whole app.
 *
 * This is the wiring the specification asked for and the repository did not have
 * (README section 5.2: "next-intl is installed but not configured; the four
 * messages catalogues are never imported"). It is deliberately a hand-rolled
 * provider rather than a next-intl setup, for two reasons:
 *
 *   - next-intl requires a `[locale]` route segment, which would change the URL
 *     structure of every route in the specification at once. A single-page
 *     landing page does not justify that, and the migration is still open.
 *   - The provider has to run on the public landing page, which is a client
 *     component, and it has to update `<html lang>` in place. That is a small
 *     amount of state; a routing layer would be a large amount of machinery.
 *
 * What it does:
 *   - holds the active locale and exposes `t()` for single strings and
 *     `list()` for arrays;
 *   - writes the choice to `localStorage` so it survives a reload;
 *   - keeps `<html lang>` in sync, which is what makes screen readers pick the
 *     right pronunciation rules and lets the browser offer its own translation.
 *
 * The catalogues under `messages/<locale>/` now carry both the interface and the
 * long-form page content: every landing sentence, sample record and form notice
 * is a catalogue key in all four languages. What remains untranslated by design
 * is user-authored data -- a listing's own title is stored in the language it
 * was written in, and the interface around it follows the reader.
 *
 * Quality caveat: the Kirundi and Kiswahili catalogues were written in-repo and
 * reviewed against the language rules in `scripts/i18n/`, not by an accredited
 * translator. Before a public launch they should have a native-speaker review.
 * The catalogues are strict JSON and cannot carry comments, so this note lives
 * here instead -- the same convention the rest of the repository uses.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "@/messages/en/landing.json";
import fr from "@/messages/fr/landing.json";
import rn from "@/messages/rn/landing.json";
import sw from "@/messages/sw/landing.json";
import enApp from "@/messages/en/app.json";
import frApp from "@/messages/fr/app.json";
import rnApp from "@/messages/rn/app.json";
import swApp from "@/messages/sw/app.json";

/**
 * A catalogue is a nested object whose leaves are strings, or arrays of strings.
 *
 * Typing it structurally rather than as `typeof en` is what allows the French,
 * Kirundi and Kiswahili files to be assigned to the same map: with `typeof en`
 * each literal would have to be `"English"`, and the other three files would not
 * type-check.
 *
 * Arrays are part of the type because some strings are a set rather than a
 * sentence -- the nine feature titles, the twelve FAQ questions, the six AI
 * capabilities. Those are read with `list()` and indexed positionally against
 * the matching array in `lib/content.ts`, which is why the order is meaningful
 * and why the catalogues are checked for key parity.
 */
type Catalogue = { [key: string]: string | string[] | Catalogue };

/** The four interface languages, in the order the specification lists them. */
export const localeCodes = ["en", "fr", "rn", "sw"] as const;
export type LocaleCode = (typeof localeCodes)[number];

/** Default locale. Also the fallback for any key a translation is missing. */
export const defaultLocale: LocaleCode = "en";

/**
 * Merges two catalogues without mutating either.
 *
 * The landing catalogue and the platform catalogue are authored separately so
 * the public page and the signed-in application can evolve independently. Both
 * are still read through the same `t()`/`list()` helpers, which means a key must
 * resolve in one merged tree rather than in two namespaces callers have to know
 * about. Later sources win, so `landing.json` remains the authority for any key
 * it already owns.
 */
function mergeCatalogue(base: Catalogue, extra: Catalogue): Catalogue {
  const merged: Catalogue = { ...base };

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
      merged[key] = mergeCatalogue(current, value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * The imported catalogues, keyed by locale.
 *
 * All eight files are bundled into the client, so switching languages is a
 * synchronous lookup with no network request. That is the right trade for an
 * application this size; a real deployment with many locales should move the
 * catalogues to a route or an API and lazy-load them.
 */
const catalogues: Record<LocaleCode, Catalogue> = {
  en: mergeCatalogue(en, enApp),
  fr: mergeCatalogue(fr, frApp),
  rn: mergeCatalogue(rn, rnApp),
  sw: mergeCatalogue(sw, swApp),
};

/**
 * The selector's options.
 *
 * `name` is the language's name in that language, which is the convention users
 * expect from a language menu -- a reader who cannot read the current interface
 * language still has to be able to find their own. `englishName` is used for
 * the `lang` attribute fallback and for assistive technology that reads the
 * option list aloud.
 */
export const locales: { code: LocaleCode; name: string; englishName: string }[] = [
  { code: "en", name: "English", englishName: "English" },
  { code: "fr", name: "Français", englishName: "French" },
  { code: "rn", name: "Kirundi", englishName: "Kirundi" },
  { code: "sw", name: "Kiswahili", englishName: "Kiswahili" },
];

/** localStorage key. Namespaced so it cannot collide with another app's data. */
const storageKey = "go.locale";

/**
 * A segment that can address an array element. Digits only, so `t("items.0")`
 * works and `t("items.length")` or `t("items.first")` does not.
 */
const arrayIndex = /^\d+$/;

/**
 * Walks a dot-separated path through a catalogue.
 *
 * Returns `undefined` at any point the path does not exist, or when a segment
 * turns out to be a string where a container was expected. Callers decide what
 * to do about a miss; `t()` falls back, `list()` returns an empty array.
 *
 * Two kinds of node are walkable, and they need different rules:
 *
 * - A **catalogue** is indexed by name: `nav.opportunities`.
 * - An **array** is indexed by position: `features.items.3`, which is how the
 *   nine feature titles in `lib/content.ts` address their translations.
 *
 * Getting the array case wrong is not a small mistake. If an array refuses every
 * further segment, all nine feature headings silently fall back to the raw key
 * and the page renders `features.items.3` as a headline.
 */
function resolve(catalogue: Catalogue, path: string): string | string[] | undefined {
  // The node's type admits `string[]` as well as the container types, so the
  // loop can narrow to the right one on each pass.
  let node: string | string[] | Catalogue | undefined = catalogue;

  for (const segment of path.split(".")) {
    // A string is a leaf. Anything past it is a path that does not exist.
    if (typeof node === "string") return undefined;

    if (Array.isArray(node)) {
      if (!arrayIndex.test(segment)) return undefined;
      // An out-of-range index yields `undefined`, which the next iteration (or
      // the return below) turns into a miss.
      node = node[Number(segment)];
      continue;
    }

    // From here `node` is a catalogue or already `undefined`. A catalogue lookup
    // is total, so this cannot throw.
    if (node === undefined) return undefined;
    node = node[segment];
  }

  return typeof node === "string" || Array.isArray(node) ? node : undefined;
}

/**
 * A module-level mirror of the active locale.
 *
 * React components read the locale from context, but `lib/api.ts` and
 * `lib/session.ts` are plain modules that build user-facing messages outside a
 * render (a failed fetch, an expired token). They cannot call a hook, so the
 * provider writes the current locale here and those modules call `translate()`.
 */
let activeLocale: LocaleCode = defaultLocale;

/** Called by the provider whenever the locale changes. */
export function setActiveLocale(next: LocaleCode) {
  activeLocale = next;
}

/** The locale non-React modules should use when they need one. */
export function getActiveLocale(): LocaleCode {
  return activeLocale;
}

/**
 * Translates one key outside React, using the last locale the provider set.
 *
 * Same fallback order as `t()`: active locale, then English, then the key.
 */
export function translate(path: string, values?: Record<string, string | number>): string {
  return translateIn(activeLocale, path, values);
}

/**
 * The shared lookup behind `t()` and `translate()`.
 *
 * Falls back to the English catalogue, then to the key itself. Returning the key
 * rather than an empty string is deliberate: a missing translation is then
 * visible in the UI during review instead of rendering as a silent gap.
 */
function translateIn(
  locale: LocaleCode,
  path: string,
  values?: Record<string, string | number>,
): string {
  const translated = resolve(catalogues[locale], path);
  const fallback = resolve(catalogues[defaultLocale], path);
  const text =
    typeof translated === "string"
      ? translated
      : typeof fallback === "string"
        ? fallback
        : path;

  if (!values) return text;

  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** The value `useI18n()` returns. */
type I18nValue = {
  /** The active locale code. */
  locale: LocaleCode;
  /** Switches language and persists the choice. */
  setLocale: (next: LocaleCode) => void;
  /**
   * Translates a single key, e.g. `t("nav.opportunities")`.
   *
   * `values` fills `{placeholders}` in the translated string. Interpolation is
   * deliberately tiny -- a whole ICU formatter is not needed for the handful of
   * counts and email addresses the platform inserts into sentences.
   */
  t: (path: string, values?: Record<string, string | number>) => string;
  /** Translates an array-valued key, e.g. `list("how.steps")`. */
  list: (path: string) => string[];
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Picks a starting locale from the browser, before the user's saved choice is
 * known.
 *
 * `navigator.language` is only the primary preference; French speakers in
 * Burundi often have a regional tag such as `fr-BI`, so the match is on the
 * primary subtag. Anything unrecognised falls back to English.
 */
function detectLocale(): LocaleCode {
  if (typeof window === "undefined") return defaultLocale;

  const stored = window.localStorage.getItem(storageKey);
  if (stored && localeCodes.includes(stored as LocaleCode)) return stored as LocaleCode;

  const preferred = window.navigator.language?.slice(0, 2).toLowerCase();
  return localeCodes.includes(preferred as LocaleCode) ? (preferred as LocaleCode) : defaultLocale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  /**
   * Always starts at the default locale so the server-rendered HTML and the
   * first client render agree -- starting at the detected locale would produce
   * a hydration mismatch on every visitor whose browser is not English. The
   * effect below promotes the detected locale immediately after mount, so the
   * cost is at most one frame of English rather than a warning.
   */
  const [locale, setLocaleState] = useState<LocaleCode>(defaultLocale);

  // Promote the detected (or previously saved) locale after mount.
  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  // Keep the document in sync. `lang` is not cosmetic: it drives screen-reader
  // pronunciation and the browser's own translation prompt, so it has to
  // follow the selector rather than staying hard-coded to "en".
  //
  // The catalogue codes are already ISO 639-1 (`en`, `fr`, `rn` for Kirundi,
  // `sw`), so the locale can be written straight through with no mapping table.
  useEffect(() => {
    document.documentElement.lang = locale;
    // Keep the non-React translator in step: `api.ts` and `session.ts` compose
    // messages during requests, outside any render.
    setActiveLocale(locale);
  }, [locale]);

  /**
   * Persists the choice and updates state.
   *
   * The write is wrapped in a try/catch because `localStorage` throws in Safari
   * private mode and whenever a site is opened inside a sandboxed frame with
   * third-party storage blocked. Failing to remember a preference is not a
   * reason to fail the interaction.
   */
  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    setActiveLocale(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      /* preference not persisted; the session still switches */
    }
  }, []);

  /**
   * Translates one key.
   *
   * Delegates to `translateIn()` so the hook and the module-level `translate()`
   * used by `api.ts`/`session.ts` cannot drift in fallback behaviour.
   */
  const t = useCallback(
    (path: string, values?: Record<string, string | number>) =>
      translateIn(locale, path, values),
    [locale],
  );

  /**
   * Translates an array-valued key.
   *
   * Used for the ordered lists that appear in several sections -- the nine
   * journey stages, the feature names, the FAQ categories. Order is meaningful
   * in all of them, so the array is translated element-wise and never sorted.
   */
  const list = useCallback(
    (path: string) => {
      const translated = resolve(catalogues[locale], path);
      if (Array.isArray(translated)) return translated;

      const fallback = resolve(catalogues[defaultLocale], path);
      return Array.isArray(fallback) ? fallback : [];
    },
    [locale],
  );

  // Memoised so a re-render caused by a parent does not hand every consumer a
  // new `t` identity and defeat their own memoisation.
  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t, list }),
    [locale, setLocale, t, list],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Reads the active locale and the translation helpers.
 *
 * Throws outside the provider rather than returning a stub: every consumer on
 * this page is inside `I18nProvider`, so a miss means the tree is wired wrongly
 * and a silent fallback would ship untranslated keys to production.
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>.");
  return context;
}
