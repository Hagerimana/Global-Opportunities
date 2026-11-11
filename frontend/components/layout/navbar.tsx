"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageMenu } from "./language-menu";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { AccountAvatar as AccountTypeAvatar } from "@/components/auth/account-avatar";

import { navLinks } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { getCurrentAccount, type AccountType } from "@/lib/api";
import {
  clearSession,
  isSignedIn,
  readAccessToken,
  signOut,
} from "@/lib/session";

/**
 * Homepage section IDs used by the scroll spy.
 * Real routes are excluded.
 */
const anchorIds = navLinks
  .map((link) => link.href)
  .filter((href) => href.startsWith("#"))
  .map((href) => href.slice(1));

function AccountAvatar() {
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountType() {
      const accessToken = readAccessToken();

      if (!accessToken) return;

      try {
        const account = await getCurrentAccount(accessToken);

        if (!cancelled) {
          setAccountType(account.account_type);
        }
      } catch {
        // Keep a neutral placeholder if account loading fails.
      }
    }

    void loadAccountType();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!accountType) {
    return (
      <span
        aria-hidden="true"
        className="h-5 w-5 rounded-full border-2 border-current opacity-50"
      />
    );
  }

  return <AccountTypeAvatar accountType={accountType} className="h-6 w-6" />;
}

export function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<string>(anchorIds[0] ?? "");
  const [signedIn, setSignedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  /**
   * Homepage anchors stay local on the homepage.
   * Elsewhere, they navigate back to the homepage section.
   */
  function navigationHref(href: string) {
    return href.startsWith("#") && !isHomePage ? `/${href}` : href;
  }

  function isNavigationActive(href: string) {
    if (href.startsWith("#")) {
      return isHomePage && active === href.slice(1);
    }

    return pathname === href;
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const result = await signOut();

      if (!result.ok) {
        setLogoutError(result.message);
        setLoggingOut(false);
      }
    } catch {
      setLogoutError(t("nav.logoutFailed"));
      setLoggingOut(false);
    }
  }

  function handleLocalLogout() {
    clearSession();
    window.location.assign("/auth/login");
  }

  // Update the frosted background when scrolling or changing routes.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  // Refresh the displayed sign-in state when the route changes.
  useEffect(() => {
    setSignedIn(isSignedIn());
    setMenuOpen(false);
  }, [pathname]);

  // Track visible sections only on the homepage.
  useEffect(() => {
    if (!isHomePage) return;
    if (typeof IntersectionObserver === "undefined") return;

    setActive(anchorIds[0] ?? "");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      },
    );

    const targets = anchorIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);

    targets.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, [isHomePage]);

  // Lock background scrolling and support Escape while the menu is open.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Avoid retaining the mobile scroll lock after resizing to desktop.
  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)");

    function closeOnDesktop() {
      if (desktopQuery.matches) {
        setMenuOpen(false);
      }
    }

    closeOnDesktop();
    desktopQuery.addEventListener("change", closeOnDesktop);

    return () => {
      desktopQuery.removeEventListener("change", closeOnDesktop);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-premium ${
        scrolled || !isHomePage
          ? "glass border-b border-pine-900/8 shadow-soft"
          : "border-b border-transparent"
      }`}
    >
      <nav
        aria-label={t("a11y.primaryNav")}
        className="container-x flex h-[var(--nav-h)] items-center justify-between gap-4"
      >
        {/* Brand and Home navigation */}
        <Link
          href={isHomePage ? "#home" : "/"}
          onClick={() => setMenuOpen(false)}
          className="shrink-0"
          aria-label={t("nav.homeAria")}
        >
          <Logo className="hidden sm:inline-flex" />

          <Logo
            variant="stacked"
            className="sm:hidden [&_svg]:h-8 [&_svg]:w-8"
          />
        </Link>

        {/* Desktop navigation */}
        <ul className="hidden min-w-0 items-center gap-0.5 xl:flex 2xl:gap-1">
          {navLinks.map((link) => {
            const isActive = isNavigationActive(link.href);

            return (
              <li key={link.href} className="min-w-0">
                <Link
                  href={navigationHref(link.href)}
                  aria-current={
                    isActive
                      ? link.href.startsWith("#")
                        ? "location"
                        : "page"
                      : undefined
                  }
                  className={`relative inline-flex min-h-[var(--tap)] items-center whitespace-nowrap rounded-full px-2.5 text-sm font-medium transition-colors duration-300 2xl:px-3.5 ${
                    isActive
                      ? "text-pine-800"
                      : "text-ink-muted hover:text-pine-800"
                  }`}
                >
                  {t(link.key)}

                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-2.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-pine-600 transition-transform duration-400 ease-premium 2xl:inset-x-3.5 ${
                      isActive ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Language, account, and menu controls */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <LanguageMenu />
          </div>

          {signedIn ? (
            <div className="hidden items-center gap-2 xl:flex">
              <Link
                href="/account"
                aria-label={t("nav.profile")}
                title={t("nav.profile")}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pine-800 text-xs font-semibold text-white transition-colors hover:bg-pine-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2"
              >
                <AccountAvatar />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-busy={loggingOut}
                className="inline-flex min-h-[var(--tap)] items-center rounded-full px-3 text-sm font-medium text-ink-muted transition-colors duration-300 hover:text-pine-800 disabled:cursor-wait disabled:opacity-60"
              >
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="hidden min-h-[var(--tap)] items-center rounded-full px-3 text-sm font-semibold text-pine-900 transition-colors duration-300 hover:text-pine-600 xl:flex"
            >
              {t("nav.login")}
            </Link>
          )}

          {!signedIn && (
            <Link
              href="/auth/account-type"
              className="btn-primary hidden !px-5 !py-2.5 sm:inline-flex"
            >
              {t("nav.getStarted")}
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t("a11y.closeMenu") : t("a11y.openMenu")}
            className="tap grid h-10 w-10 place-items-center rounded-full border border-pine-900/10 bg-white/70 text-pine-900 backdrop-blur transition hover:border-pine-700/25 xl:hidden"
          >
            <Icon name={menuOpen ? "close" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Logout failure and recovery controls */}
      {logoutError && (
        <div className="container-x py-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p role="alert">{logoutError}</p>

            <p className="mt-2">{t("nav.logoutRecoveryNote")}</p>

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg border border-red-300 px-3 py-2 font-semibold disabled:opacity-60"
              >
                {t("nav.retryLogout")}
              </button>

              <button
                type="button"
                onClick={handleLocalLogout}
                disabled={loggingOut}
                className="rounded-lg border border-red-300 px-3 py-2 font-semibold disabled:opacity-60"
              >
                {t("nav.clearSession")}
              </button>

              <button
                type="button"
                onClick={() => setLogoutError("")}
                disabled={loggingOut}
                className="rounded-lg px-3 py-2 underline disabled:opacity-60"
              >
                {t("nav.dismiss")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile navigation */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="glass-strong max-h-[calc(100dvh-var(--nav-h))] animate-bloom-in overflow-y-auto border-t border-pine-900/8 xl:hidden"
      >
        {menuOpen && (
          <div className="container-x space-y-1 py-5">
            {navLinks.map((link) => {
              const isActive = isNavigationActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={navigationHref(link.href)}
                  onClick={() => setMenuOpen(false)}
                  aria-current={
                    isActive
                      ? link.href.startsWith("#")
                        ? "location"
                        : "page"
                      : undefined
                  }
                  className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-medium transition-colors duration-200 hover:bg-pine-50 ${
                    isActive ? "bg-pine-50 text-pine-800" : "text-pine-950"
                  }`}
                >
                  {t(link.key)}

                  <Icon name="arrowUpRight" className="h-4 w-4 text-pine-400" />
                </Link>
              );
            })}

            <div className="!mt-5 border-t border-pine-900/8 pt-5">
              <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
                {t("nav.language")}
              </p>

              <div className="px-4">
                <LanguageMenu />
              </div>
            </div>

            <div className="!mt-5 flex flex-col gap-2.5">
              {signedIn ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl bg-pine-50 px-4 py-3 transition-colors hover:bg-pine-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600 focus-visible:ring-offset-2"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pine-800 text-xs font-semibold text-white"
                      aria-hidden="true"
                    >
                      <AccountAvatar />
                    </span>

                    <span className="text-sm font-medium text-pine-900">
                      {t("nav.profile")}
                    </span>

                    <Icon
                      name="arrowRight"
                      className="ml-auto h-4 w-4 text-pine-600"
                    />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    aria-busy={loggingOut}
                    className="btn-outline w-full disabled:cursor-wait disabled:opacity-60"
                  >
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="btn-outline w-full"
                  >
                    {t("nav.login")}
                  </Link>

                  <Link
                    href="/auth/account-type"
                    onClick={() => setMenuOpen(false)}
                    className="btn-primary w-full"
                  >
                    {t("nav.getStarted")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
