"use client";

/**
 * The keyboard skip link.
 *
 * It lives in its own file rather than inline in `app/page.tsx` because it calls
 * `useI18n`, and `page.tsx` is a server component -- a hook cannot be called from
 * one. The label is translated, so this has to be a client component; the link
 * itself is the first focusable element on the page either way.
 *
 * Why it is needed: the navbar carries six links and the footer about twenty.
 * Without this, a keyboard user tabs through all of them before reaching the
 * hero, on every page load.
 *
 * Styling is `.skip-link` in `globals.css` -- `sr-only` until focused, then
 * pinned above the fixed navbar. It deliberately uses `:focus-visible` rather
 * than `:focus`, so it stays hidden for a pointer click but appears for
 * keyboard and assistive-technology navigation.
 */
import { useI18n } from "@/lib/i18n";

export function SkipLink() {
  const { t } = useI18n();

  return (
    <a href="#main" className="skip-link">
      {t("nav.skipToContent")}
    </a>
  );
}
