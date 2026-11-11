"use client";

/**
 * Language control for routes that do not render the public navbar.
 *
 * The landing page, the projects layout and the footer all carry the full
 * language menu. The authentication and account screens are deliberately
 * chrome-free, so without this control a signed-out visitor who lands on
 * `/auth/login` from a shared link would have no way to change language until
 * they navigated back to the homepage. It is fixed to the top-right corner and
 * uses the same listbox component, so keyboard and screen-reader behaviour is
 * identical everywhere.
 */
import { LanguageMenu } from "./language-menu";

export function PageLanguage() {
  return (
    <div className="fixed right-4 top-4 z-50 rounded-full border border-pine-900/8 bg-white/85 p-1 shadow-soft backdrop-blur sm:right-6 sm:top-6">
      <LanguageMenu />
    </div>
  );
}
