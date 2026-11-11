"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { useI18n } from "@/lib/i18n";

export default function ProjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { t } = useI18n();

  return (
    <>
      <Navbar />

      <div className="min-h-screen pt-[var(--nav-h)]">
        <nav
          aria-label={t("projectsLayout.navLabel")}
          className="container-x flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-pine-900/10 py-4 text-sm"
        >
          <Link
            href="/"
            className="tap inline-flex items-center rounded-lg px-2 font-semibold text-pine-800 transition-colors hover:bg-pine-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
          >
            {t("projectsLayout.home")}
          </Link>

          <Link
            href="/#projects"
            className="tap inline-flex items-center rounded-lg px-2 font-semibold text-pine-800 transition-colors hover:bg-pine-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
          >
            {t("projectsLayout.homepageProjects")}
          </Link>

          <Link
            href="/projects"
            className="tap inline-flex items-center rounded-lg px-2 font-semibold text-pine-800 transition-colors hover:bg-pine-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
          >
            {t("projectsLayout.browse")}
          </Link>

          <Link
            href="/projects/new"
            className="tap inline-flex items-center rounded-lg px-2 font-semibold text-pine-800 transition-colors hover:bg-pine-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-600"
          >
            {t("projectsLayout.add")}
          </Link>
        </nav>

        {children}
      </div>
    </>
  );
}
