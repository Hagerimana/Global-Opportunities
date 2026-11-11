/**
 * The root layout: the HTML shell every route renders inside.
 *
 * In the Next.js App Router a root layout is required and is never unmounted
 * during client-side navigation, so anything global belongs here.
 */
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { SessionGuard } from "@/components/auth/session-guard";

// Global stylesheet. Imported here (and only here) so Tailwind's preflight and
// the custom design tokens below apply to every route.
import "./globals.css";

import { I18nProvider } from "@/lib/i18n";
import Providers from "./providers";

/**
 * Fonts.
 *
 * Loaded through `next/font/google` rather than a `<link>` to the CDN, so the
 * files are downloaded at build time, self-hosted, and served from the same
 * origin: no third-party request on page load, and no layout shift when they
 * arrive. The `variable` option exposes them as CSS custom properties rather
 * than a class, which is what lets `tailwind.config.ts` point `--font-sans` and
 * `--font-display` at them.
 *
 * Two families with two jobs:
 *
 * - **Inter** for everything functional. It is the more legible of the two at
 *   14-16px, which is where this page does most of its reading.
 * - **Fraunces** for display only (`h1`-`h3`, prices, figures). It is a serif
 *   with optical sizing, so the large sizes have the contrast the page's
 *   headlines need and the small sizes stay out of the way.
 *
 * `display: "swap"` shows the fallback immediately rather than blocking on the
 * webfont, which matters more here than usual: the reveal animations run on
 * scroll, and a font swap mid-scroll would reflow the text under the reader.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  // Only the axes the page actually uses. Requesting the full variable range
  // would download a much larger file for axes nothing sets.
  axes: ["SOFT", "WONK"],
  variable: "--font-display",
});

/**
 * Static page metadata, rendered into <head> for search engines and the browser
 * tab.
 *
 * The four `keywords` are the terms somebody would plausibly type, not a
 * keyword list. `openGraph` is set because the page is the one a link is most
 * likely to be shared from, and an unconfigured share preview is a wasted
 * impression.
 *
 * `metadataBase` silences Next's warning about relative OG image URLs. There is
 * no OG image in the repository yet, so the `images` entry is deliberately
 * absent rather than pointing at a file that does not exist.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://opportunities.global"),
  title: {
    default: "Global Opportunities",
    template: "%s | Global Opportunities",
  },
  description:
    "Discover funding opportunities, build a project, apply and track it through assessment, funding and reporting \u2014 in English, French, Kirundi and Kiswahili.",
  keywords: [
    "funding opportunities",
    "project management",
    "grant applications",
    "Global Opportunities",
  ],
  openGraph: {
    type: "website",
    siteName: "Global Opportunities",
    title: "Global Opportunities",
    description:
      "Discover opportunities. Build projects. Create impact. One platform, four languages.",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Opportunities",
    description:
      "Discover opportunities. Build projects. Create impact. One platform, four languages.",
  },
  robots: { index: true, follow: true },
};

/**
 * The viewport. Declared here rather than in a `<meta>` tag by hand, so Next
 * merges it correctly instead of warning about a duplicate.
 *
 * `themeColor` is split per scheme: the page is light for most of its length,
 * but the browser chrome should follow the dark panels and the dark default
 * background rather than staying white over a pine-green section.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Not capped at 1: pinch-zoom is an accessibility requirement, and blocking
  // it fails WCAG 1.4.4. The meta tag equivalent is `user-scalable=no`, which
  // is deliberately absent.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b2019" },
  ],
};

/**
 * Builds the `<html>` and `<body>` wrapper.
 *
 * `lang` is set to `en` in the markup and then corrected by `I18nProvider` on
 * the client, which owns the active locale. It cannot be a server-read value:
 * the chosen language is in `localStorage`, which does not exist during the
 * server render. `en` is the right default for that first paint, and it is
 * corrected before the reader can meaningfully interact.
 *
 * The two font variables and `suppressHydrationWarning` on `<html>` go together.
 * `I18nProvider` writes `document.documentElement.lang` from an effect, and
 * React would otherwise report a mismatch between the server's `en` and the
 * client's chosen code as a hydration error.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable}`}
    >
      <body className="bg-surface font-sans text-ink antialiased">
        {/*
          `I18nProvider` is inside `Providers` because the two are independent
          and both are client boundaries; the order does not matter, but keeping
          them nested in one element means the page has a single client root.

          `SessionGuard` renders translated notices, so it must be inside
          `I18nProvider` as well. It sits after `children` so its overlay is a
          sibling of the page rather than part of the page's own layout.
        */}
        <Providers>
          <I18nProvider>
            {children}
            <SessionGuard />
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
