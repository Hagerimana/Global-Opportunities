"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordField } from "@/components/auth/password-field";
import { PageLanguage } from "@/components/layout/page-language";
import { ApiError, changePassword } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { readAccessToken } from "@/lib/session";

function makeChangePasswordSchema(t: (path: string) => string) {
  const newPassword = z
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
      newPassword,
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

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const changePasswordSchema = useMemo(
    () => makeChangePasswordSchema(t),
    [t],
  );

  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
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
    setHasSession(Boolean(readAccessToken()));
    setLoading(false);
  }, []);

  async function submit(values: ChangePasswordForm) {
    setSuccess("");

    const accessToken = readAccessToken();

    if (!accessToken) {
      reset();
      setHasSession(false);
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
        setLoginRequired(true);
        return;
      }

      setError("root", {
        message:
          cause instanceof ApiError
            ? cause.message
            : t("auth.errors.changePassword"),
      });
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-emerald-50 px-5 py-10">
      <PageLanguage />

      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-emerald-950/10">
        <Link href="/" className="text-sm font-semibold text-emerald-800">
          {t("app.backHome")}
        </Link>

        <h1 className="display mt-7 text-4xl text-emerald-950">
          {t("auth.change.title")}
        </h1>

        {loading ? (
          <p role="status" className="mt-5 text-slate-600">
            {t("auth.change.checking")}
          </p>
        ) : !hasSession || loginRequired ? (
          <div className="mt-5">
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {loginRequired
                ? t("auth.change.sessionExpired")
                : t("auth.change.loginFirst")}
            </p>

            <Link
              href="/auth/login"
              className="mt-5 inline-block font-semibold text-emerald-800 underline"
            >
              {t("account.dashboard.goLogin")}
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-slate-600">{t("auth.change.intro")}</p>

            {success && (
              <div
                role="status"
                className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                <p>{success}</p>
                <p className="mt-2">{t("auth.change.successSuffix")}</p>
              </div>
            )}

            {errors.root && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
              >
                {errors.root.message}
              </p>
            )}

            <form noValidate onSubmit={handleSubmit(submit)} className="mt-6">
              <fieldset disabled={isSubmitting} className="min-w-0">
                <div>
                  <PasswordField
                    label={t("account.fields.currentPassword")}
                    autoComplete="current-password"
                    error={errors.currentPassword?.message}
                    {...register("currentPassword")}
                  />
                </div>

                <div className="mt-5">
                  <PasswordField
                    label={t("account.fields.newPassword")}
                    autoComplete="new-password"
                    error={errors.newPassword?.message}
                    {...register("newPassword")}
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    {t("account.dashboard.passwordHint")}
                  </p>
                </div>

                <div className="mt-5">
                  <PasswordField
                    label={t("account.fields.confirmPassword")}
                    autoComplete="new-password"
                    error={errors.newPasswordConfirmation?.message}
                    {...register("newPasswordConfirmation")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="mt-7 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {isSubmitting
                    ? t("auth.change.submitting")
                    : t("auth.change.submit")}
                </button>
              </fieldset>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
