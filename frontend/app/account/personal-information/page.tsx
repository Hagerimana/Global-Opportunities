"use client";

import Link from "next/link";

import ApplicantInformationForm from "@/components/projects/ApplicantInformationForm";
import { useI18n } from "@/lib/i18n";

export default function AccountPersonalInformationPage() {
  const { t } = useI18n();

  return (
    <main id="main" className="min-h-screen bg-emerald-50 px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/account"
          className="font-semibold text-emerald-800 underline"
        >
          {t("app.backToAccount")}
        </Link>

        <h1 className="display mt-6 text-3xl text-emerald-950">
          {t("personalInfo.title")}
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          {t("personalInfo.intro")}
        </p>

        <ApplicantInformationForm context="account" />
      </div>
    </main>
  );
}
