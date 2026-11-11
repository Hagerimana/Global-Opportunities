"use client";

import Link from "next/link";
import { PageLanguage } from "@/components/layout/page-language";
import { useI18n } from "@/lib/i18n";

function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </svg>
  );
}

function OrganizationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 21V3h12v18M16 9h4v12M2 21h20" />
      <path d="M8 7h4M8 11h4M8 15h4M9 21v-3h2v3" />
    </svg>
  );
}

export default function AccountTypePage() {
  const { t } = useI18n();

  return (
    <main className="grid min-h-screen place-items-center bg-emerald-50 px-5 py-10">
      <PageLanguage />

      <section
        aria-labelledby="account-type-heading"
        className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl shadow-emerald-950/10 sm:p-10"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          {t("app.backHome")}
        </Link>

        <h1
          id="account-type-heading"
          className="display mt-6 text-3xl text-emerald-950 sm:text-4xl"
        >
          {t("auth.accountType.title")}
        </h1>

        <p className="mt-3 max-w-xl text-slate-600">
          {t("auth.accountType.subtitle")}
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section
            aria-labelledby="personal-account-heading"
            className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-900">
              <PersonIcon />
            </span>

            <h2
              id="personal-account-heading"
              className="mt-5 text-xl font-semibold text-emerald-950"
            >
              {t("auth.accountType.personalTitle")}
            </h2>

            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
              {t("auth.accountType.personalBody")}
            </p>

            <Link
              href="/auth/register"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              {t("auth.accountType.personalCta")}
            </Link>
          </section>

          <section
            aria-labelledby="personal-account-heading"
            className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-200 text-slate-700">
              <OrganizationIcon />
            </span>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <h2
                id="organization-account-heading"
                className="text-xl font-semibold text-slate-900"
              >
                {t("auth.accountType.organizationTitle")}
              </h2>
            </div>

            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
              {t("auth.accountType.organizationBody")}
            </p>

            <Link
              href="/auth/register/organization"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              {t("auth.accountType.organizationCta")}
            </Link>
          </section>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          {t("auth.accountType.already")}{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-emerald-800 underline underline-offset-4"
          >
            {t("auth.accountType.login")}
          </Link>
        </p>
      </section>
    </main>
  );
}
