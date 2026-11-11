"use client";

/**
 * The footer.
 *
 * Five groups: identity, the explore links, the platform links, the account
 * actions, and legal/informational items. Plus a language strip and a
 * back-to-top control.
 *
 * Two deliberate choices:
 *
 * - **Nothing here 404s.** Every anchor points at a section that exists on this
 *   page and every route link points at `/auth/login` or `/auth/account-type`. The
 *   legal pages that are not written yet render as inert text with a "soon"
 *   marker instead of links -- the same convention the previous version of this
 *   page used for the unimplemented Jobs and Training listings. See
 *   `legalSoon` in `lib/content.ts`.
 *
 * - **The year is computed at render.** `new Date().getFullYear()` inside the
 *   component body, not at module scope, so a long-lived server process does not
 *   pin the copyright to the year it booted in.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { LanguageMenu } from "./language-menu";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { footerColumns, legalSoon } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { avatarInitials, isSignedIn, signOut } from "@/lib/session";

export function Footer() {
  const { t } = useI18n();
  const [signedIn, setSignedIn] = useState(false);
  const [showTop, setShowTop] = useState(false);

  // Same reason as the navbar: `sessionStorage` is browser-only, so the check has
  // to happen after mount or the server and client markup disagree.
  useEffect(() => {
    setSignedIn(isSignedIn());
  }, []);

  // The back-to-top control appears only once there is somewhere to go back to.
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <footer className="on-dark relative overflow-hidden bg-pine-950 text-pine-50">
      {/* A single soft bloom at the top edge, so the footer reads as lit from
          the content above it rather than as a flat black band. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="orb h-96 w-96 -top-40 left-1/4 bg-pine-600/20" />
        <div className="grid-fade-light absolute inset-0 opacity-60" />
      </div>

      <div className="container-x relative">
        <div className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* --- Identity ---------------------------------------------------- */}
          <div className="lg:col-span-4">
            <Logo tone="light" />
            <p className="mt-5 max-w-xs text-pretty text-sm leading-6 text-pine-200/80">
              {t("footer.tagline")}
            </p>

            {/* The language selector is repeated here, not only in the navbar,
                because the navbar is hidden on small viewports and a reader
                should not have to scroll back up to switch language. */}
            <div className="mt-7">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-pine-300/70">
                {t("footer.languages")}
              </p>
              <LanguageMenu tone="light" />
            </div>
          </div>

          {/* --- Link columns ------------------------------------------------ */}
          {footerColumns.map((column) => (
            <nav key={column.headingKey} aria-label={t(column.headingKey)} className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-white">{t(column.headingKey)}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.headingKey}-${link.href}-${link.key}`}>
                    <a
                      href={link.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-pine-200/75 transition-colors duration-300 hover:text-white"
                    >
                      {t(link.key)}
                      <Icon
                        name="arrowUpRight"
                        className="h-3.5 w-3.5 opacity-0 transition-all duration-300 ease-premium group-hover:translate-x-0.5 group-hover:opacity-100"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* --- Account ----------------------------------------------------- */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-white">{t("footer.account")}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {signedIn ? (
                <>
                  <li className="flex items-center gap-2.5 text-pine-200/75">
                    <span
                      className="grid h-6 w-6 place-items-center rounded-full bg-pine-700 text-[0.6rem] font-semibold text-white"
                      aria-hidden
                    >
                      {avatarInitials()}
                    </span>
                    {t("nav.profile")}
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={signOut}
                      className="text-pine-200/75 transition-colors duration-300 hover:text-white"
                    >
                      {t("nav.logout")}
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      href="/auth/login"
                      className="text-pine-200/75 transition-colors duration-300 hover:text-white"
                    >
                      {t("nav.login")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/auth/account-type"
                      className="text-pine-200/75 transition-colors duration-300 hover:text-white"
                    >
                      {t("nav.getStarted")}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* --- Legal and information --------------------------------------- */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-white">{t("footer.legal")}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {/*
                Inert, not links. These pages are not written and there is no
                route to point at; publishing a link that 404s is worse than
                showing the item as pending. Give each one an `href` here when
                the page is written.
              */}
              {legalSoon.map((item) => (
                /* `flex-wrap` plus `shrink-0` on the badge: at some widths the
                   column is narrower than the label plus the badge, and a
                   non-shrinking badge on a non-wrapping row was clipped by 6px
                   with no ellipsis and no way to read it. Wrapping puts the
                   badge on its own line instead. */
                <li key={item.key} className="flex flex-wrap items-center gap-2 text-pine-300/60">
                  {t(item.key)}
                  <span className="shrink-0 rounded-full border border-white/15 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-pine-300/70">
                    {t("footer.soon")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* --- Bottom bar ----------------------------------------------------
            The `env(safe-area-inset-bottom)` term is the home-indicator
            clearance. On an iPhone with a gesture bar, the indicator overlays
            the bottom ~34px of the viewport, and this row is the last thing on
            the page -- without the padding the copyright line and the
            back-to-top control sit underneath it. The fallback keeps the whole
            `calc()` valid on engines without `env()` support. */}
        <div
          className="flex flex-col gap-4 border-t border-white/10 py-7 sm:flex-row sm:items-center sm:justify-between"
          style={{ paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <p className="text-xs text-pine-300/70">
            &copy; {new Date().getFullYear()} Global Opportunities. {t("footer.rights")}
          </p>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label={t("a11y.toTop")}
            className={`group inline-flex items-center gap-2 self-start text-xs font-medium text-pine-200/70 transition-all duration-500 ease-premium hover:text-white ${
              showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            {t("a11y.toTop")}
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/15 transition-all duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:border-white/40">
              <Icon name="arrowRight" className="h-3.5 w-3.5 -rotate-90" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
