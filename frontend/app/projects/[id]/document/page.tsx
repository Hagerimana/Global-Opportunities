"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { SkipLink } from "@/components/layout/skip-link";
import OrganizationProjectReader from "@/components/projects/OrganizationProjectReader";
import { useI18n } from "@/lib/i18n";

export default function ProjectDocumentPage() {
  const params = useParams<{ id: string }>();
  const { t } = useI18n();

  return (
    <>
      <SkipLink />

      <main id="main" className="min-h-screen bg-emerald-50 px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <nav
            aria-label={t("document.navLabel")}
            className="mb-7 flex flex-wrap items-center gap-5"
          >
            <Link href="/projects" className="font-semibold text-emerald-800">
              {t("document.backProjects")}
            </Link>

            <Link href="/#projects" className="font-semibold text-emerald-800">
              {t("document.home")}
            </Link>

            <Link
              href="/account/projects"
              className="font-semibold text-emerald-800"
            >
              {t("document.myProjects")}
            </Link>
          </nav>

          <OrganizationProjectReader projectId={params.id} />
        </div>
      </main>

      <Footer />
    </>
  );
}
