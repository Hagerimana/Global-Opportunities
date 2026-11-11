"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AccountAvatar } from "@/components/auth/account-avatar";
import { PasswordField } from "@/components/auth/password-field";
import { PageLanguage } from "@/components/layout/page-language";
import {
  ApiError,
  changePassword,
  getCurrentAccount,
  type CurrentAccount,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { readAccessToken } from "@/lib/session";

function makeChangePasswordSchema(t: (path: string) => string) {
  const password = z
    .string()
    .min(12, t("validation.passwordMin"))
    .max(128, t("validation.passwordMax"))
    .regex(/[a-z]/, t("validation.passwordLower"))
    .regex(/[A-Z]/, t("validation.passwordUpper"))
    .regex(/\d/, t("validation.passwordNumber"))
    .regex(/[^A-Za-z0-9\s]/, t("validation.passwordSymbol"));

  return z
    .object({
      currentPassword: z.string().min(1, t("validation.enterCurrentPassword")),
      newPassword: password,
      newPasswordConfirmation: z
        .string()
        .min(1, t("validation.confirmNewPassword"))
        .max(128, t("validation.max128")),
    })
    .refine(
      (values) => values.newPassword === values.newPasswordConfirmation,
      {
        path: ["newPasswordConfirmation"],
        message: t("validation.passwordMismatch"),
      },
    )
    .refine((values) => values.newPassword !== values.currentPassword, {
      path: ["newPassword"],
      message: t("validation.differentPassword"),
    });
}

type ChangePasswordForm = z.infer<ReturnType<typeof makeChangePasswordSchema>>;

type PageState = "loading" | "ready" | "missing" | "expired" | "error";

const sectionClass =
  "mt-8 rounded-3xl bg-white p-6 " + "shadow-xl shadow-emerald-950/5 sm:p-8";

function Detail({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();

  return (
    <div className="min-w-0">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-base text-slate-900">
        {value || t("app.notProvided")}
      </dd>
    </div>
  );
}


export default function AccountPage() {
  const { t } = useI18n();
  const changePasswordSchema = useMemo(
    () => makeChangePasswordSchema(t),
    [t],
  );

  const [account, setAccount] = useState<CurrentAccount | null>(null);

  const [pageState, setPageState] = useState<PageState>("loading");

  const [loadError, setLoadError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirmation: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      const accessToken = readAccessToken();

      if (!accessToken) {
        if (!cancelled) setPageState("missing");
        return;
      }

      try {
        const response = await getCurrentAccount(accessToken);

        if (!cancelled) {
          setAccount(response);
          setPageState("ready");
        }
      } catch (cause) {
        if (cancelled) return;

        if (cause instanceof ApiError && cause.status === 401) {
          setPageState("expired");
        } else {
          setLoadError(
            cause instanceof ApiError
              ? cause.message
              : t("account.dashboard.loadError"),
          );
          setPageState("error");
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function submit(values: ChangePasswordForm) {
    setSuccess("");

    const accessToken = readAccessToken();

    if (!accessToken) {
      reset();
      setAccount(null);
      setPageState("missing");
      return;
    }

    try {
      const response = await changePassword(
        accessToken,
        values.currentPassword,
        values.newPassword,
        values.newPasswordConfirmation,
      );

      reset();
      setSuccess(response.message);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        reset();
        setAccount(null);
        setPageState("expired");
        return;
      }

      setError("root", {
        message:
          cause instanceof ApiError
            ? cause.message
            : t("account.dashboard.changeError"),
      });
    }
  }

  const displayName = account
    ? account.account_type === "ORGANIZATION"
      ? account.organization.name
      : `${account.person.first_name} ${account.person.last_name}`
    : "";

  return (
    <main className="min-h-screen bg-emerald-50 px-5 py-8 sm:py-12">
      <PageLanguage />

      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="inline-flex rounded-lg text-sm font-semibold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          ← {t("app.home")}
        </Link>

        <header className="mt-8 flex items-center gap-4">
          {account && (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-emerald-900 text-white">
              <AccountAvatar accountType={account.account_type} />
            </span>
          )}

          <div className="min-w-0">
            <h1 className="display text-3xl text-emerald-950 sm:text-4xl">
              {t("account.dashboard.title")}
            </h1>

            {account && (
              <>
                <p className="mt-2 break-words text-lg font-semibold text-emerald-900">
                  {displayName}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {account.account_type === "ORGANIZATION"
                    ? t("account.dashboard.organizationAccount")
                    : t("account.dashboard.personalAccount")}
                  {" · "}
                  {t("account.dashboard.profileSecurity")}
                </p>
              </>
            )}
          </div>
        </header>

        {pageState === "loading" && (
          <p
            role="status"
            className="mt-8 rounded-2xl bg-white p-6 text-slate-600"
          >
            {t("account.dashboard.loading")}
          </p>
        )}

        {(pageState === "missing" || pageState === "expired") && (
          <section className={sectionClass}>
            <h2 className="text-xl font-semibold text-emerald-950">
              {t("account.dashboard.loginRequired")}
            </h2>

            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {pageState === "expired"
                ? t("account.dashboard.sessionExpired")
                : t("account.dashboard.loginPrompt")}
            </p>

            <Link
              href="/auth/login"
              className="mt-5 inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white"
            >
              {t("account.dashboard.goLogin")}
            </Link>
          </section>
        )}

        {pageState === "error" && (
          <section className={sectionClass}>
            <h2 className="text-xl font-semibold text-emerald-950">
              {t("account.dashboard.unavailable")}
            </h2>

            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {loadError}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl border border-emerald-800 px-5 py-3 font-semibold text-emerald-800"
            >
              {t("account.dashboard.tryAgain")}
            </button>
          </section>
        )}

        {pageState === "ready" && account && (
          <>
            <section className={sectionClass}>
              <h2 className="text-2xl font-semibold text-emerald-950">
                {t("account.dashboard.notificationsTitle")}
              </h2>

              <p className="mt-3 text-sm text-slate-600">
                {account.account_type === "PERSONAL"
                  ? t("account.dashboard.notificationsPersonal")
                  : t("account.dashboard.notificationsOrganization")}
              </p>

              <Link
                href="/account/inbox"
                className="mt-5 inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900"
              >
                {t("account.dashboard.openInbox")}
              </Link>
            </section>

            <section
              aria-labelledby="account-details-heading"
              className={sectionClass}
            >
              <h2
                id="account-details-heading"
                className="text-2xl font-semibold text-emerald-950"
              >
                {account.account_type === "ORGANIZATION"
                  ? t("account.dashboard.organizationProfile")
                  : t("account.dashboard.personalProfile")}
              </h2>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                {account.account_type === "PERSONAL" ? (
                  <>
                    <Detail
                      label={t("account.fields.firstName")}
                      value={account.person.first_name}
                    />
                    <Detail
                      label={t("account.fields.lastName")}
                      value={account.person.last_name}
                    />
                    <Detail
                      label={t("account.fields.loginEmail")}
                      value={account.email}
                    />
                  </>
                ) : (
                  <>
                    <Detail
                      label={t("account.fields.organizationName")}
                      value={account.organization.name}
                    />
                    <Detail
                      label={t("account.fields.organizationType")}
                      value={t(
                        `account.organizationTypes.${account.organization.organization_type}`,
                      )}
                    />
                    <Detail
                      label={t("account.fields.loginEmail")}
                      value={account.email}
                    />
                    <Detail
                      label={t("account.fields.organizationEmail")}
                      value={account.organization.email}
                    />
                    <Detail
                      label={t("account.fields.phone")}
                      value={account.organization.phone}
                    />
                    <Detail
                      label={t("account.fields.registrationNumber")}
                      value={account.organization.registration_number}
                    />
                    <Detail
                      label={t("account.fields.address")}
                      value={account.organization.address}
                    />
                    <Detail
                      label={t("account.fields.province")}
                      value={account.organization.province}
                    />
                    <Detail
                      label={t("account.fields.commune")}
                      value={account.organization.commune}
                    />
                    <Detail
                      label={t("account.fields.verification")}
                      value={t(
                        `status.organization.${account.organization.verification_status}`,
                      )}
                    />
                  </>
                )}
              </dl>

              {account.account_type === "PERSONAL" ? (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="text-lg font-semibold text-emerald-950">
                    {t("account.dashboard.fullPersonalTitle")}
                  </h3>

                  <p className="mt-2 text-sm text-slate-600">
                    {t("account.dashboard.fullPersonalBody")}
                  </p>

                  <Link
                    href="/account/personal-information"
                    className="mt-5 inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    {t("account.dashboard.managePersonal")}
                  </Link>

                  <p className="mt-3 text-xs text-slate-500">
                    {t("account.dashboard.fullPersonalNote")}
                  </p>
                </div>
              ) : (
                <p className="mt-6 text-xs text-slate-500">
                  {t("account.dashboard.organizationSavedNote")}
                </p>
              )}
            </section>
            {/* ========================================================== */}
            {account.account_type === "PERSONAL" && (
              <section className={sectionClass}>
                <h2 className="text-2xl font-semibold text-emerald-950">
                  {t("account.dashboard.myProjectsTitle")}
                </h2>

                <p className="mt-3 text-sm text-slate-600">
                  {t("account.dashboard.myProjectsBody")}
                </p>

                <Link
                  href="/account/projects"
                  className="mt-5 inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900"
                >
                  {t("account.dashboard.manageProjects")}
                </Link>
              </section>
            )}
            {/* ============================================================== */}

            <section
              aria-labelledby="change-password-heading"
              className={sectionClass}
            >
              <h2
                id="change-password-heading"
                className="text-2xl font-semibold text-emerald-950"
              >
                {t("account.dashboard.changePasswordTitle")}
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {t("account.dashboard.changePasswordBody")}
              </p>

              {success && (
                <p
                  role="status"
                  className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                  {success} {t("account.dashboard.passwordSuccessSuffix")}
                </p>
              )}

              {errors.root && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
                >
                  {errors.root.message}
                </p>
              )}

              <form noValidate onSubmit={handleSubmit(submit)} className="mt-6">
                <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
                  <legend className="sr-only">
                    {t("account.dashboard.passwordDetails")}
                  </legend>

                  <PasswordField
                    label={t("account.fields.currentPassword")}
                    autoComplete="current-password"
                    error={errors.currentPassword?.message}
                    {...register("currentPassword")}
                  />

                  <div>
                    <PasswordField
                      label={t("account.fields.newPassword")}
                      autoComplete="new-password"
                      error={errors.newPassword?.message}
                      {...register("newPassword")}
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      {t("account.dashboard.passwordHint")}
                    </p>
                  </div>

                  <PasswordField
                    label={t("account.fields.confirmPassword")}
                    autoComplete="new-password"
                    error={errors.newPasswordConfirmation?.message}
                    {...register("newPasswordConfirmation")}
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                  >
                    {isSubmitting
                      ? t("account.dashboard.updatingPassword")
                      : t("account.dashboard.updatePassword")}
                  </button>
                </fieldset>
              </form>
            </section>

            {account.account_type === "PERSONAL" && (
              <section className={sectionClass}>
                <h2 className="text-2xl font-semibold text-emerald-950">
                  {t("account.dashboard.professionalTitle")}
                </h2>

                <p className="mt-3 text-sm text-slate-600">
                  {t("account.dashboard.professionalBody")}
                </p>

                <Link
                  href="/account/professional-profiles"
                  className="mt-5 inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900"
                >
                  {t("account.dashboard.manageProfessional")}
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
