"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordField } from "@/components/auth/password-field";
import { PageLanguage } from "@/components/layout/page-language";
import { ApiError, requestPasswordReset, resetPassword } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { clearSession } from "@/lib/session";

function makeEmailSchema(t: (path: string) => string) {
  return z.object({
    email: z
      .string()
      .trim()
      .email(t("validation.validEmail"))
      .max(254, t("validation.max254")),
  });
}

function makeResetSchema(t: (path: string) => string) {
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
      code: z
        .string()
        .trim()
        .regex(/^[0-9]{6}$/, t("validation.sixDigitCode")),
      newPassword: password,
      newPasswordConfirmation: z
        .string()
        .min(1, t("validation.confirmNewPassword"))
        .max(128, t("validation.max128")),
    })
    .refine((values) => values.newPassword === values.newPasswordConfirmation, {
      path: ["newPasswordConfirmation"],
      message: t("validation.passwordMismatch"),
    });
}

type EmailForm = z.infer<ReturnType<typeof makeEmailSchema>>;
type ResetForm = z.infer<ReturnType<typeof makeResetSchema>>;
type RecoveryStep = "email" | "reset" | "success";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const emailSchema = useMemo(() => makeEmailSchema(t), [t]);
  const resetSchema = useMemo(() => makeResetSchema(t), [t]);
  const [step, setStep] = useState<RecoveryStep>("email");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      code: "",
      newPassword: "",
      newPasswordConfirmation: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (!resendAvailableAt) return;

    function updateCountdown() {
      setSecondsRemaining(
        Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)),
      );
    }

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  function startResendCooldown() {
    setSecondsRemaining(60);
    setResendAvailableAt(Date.now() + 60_000);
  }

  async function submitEmail(values: EmailForm) {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await requestPasswordReset(values.email);

      setRecoveryEmail(response.email);
      setMessage(response.message);
      resetForm.reset();
      startResendCooldown();
      setStep("reset");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("auth.errors.recoveryRequest"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (busy || secondsRemaining > 0) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await requestPasswordReset(recoveryEmail);

      resetForm.resetField("code");
      setMessage(response.message);
      startResendCooldown();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("auth.errors.recoveryResend"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(values: ResetForm) {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await resetPassword(
        recoveryEmail,
        values.code,
        values.newPassword,
        values.newPasswordConfirmation,
      );

      // Clear this tab&s stored tokens after successful recovery.
      // This does not revoke tokens on other devices.
      clearSession();

      resetForm.reset();
      setMessage(response.message);
      setStep("success");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("auth.errors.reset"),
      );
    } finally {
      setBusy(false);
    }
  }

  function changeEmail() {
    if (busy) return;

    resetForm.reset();
    setError("");
    setMessage("");
    setRecoveryEmail("");
    setStep("email");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-emerald-50 px-5 py-10">
      <PageLanguage />

      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-emerald-950/10">
        <Link
          href="/auth/login"
          className="text-sm font-semibold text-emerald-800"
        >
          {t("app.backToLogin")}
        </Link>

        <h1 className="display mt-7 text-4xl text-emerald-950">
          {step === "success"
            ? t("auth.forgot.successTitle")
            : t("auth.forgot.title")}
        </h1>

        {step === "email" && (
          <p className="mt-3 text-slate-600">{t("auth.forgot.emailIntro")}</p>
        )}

        {step === "reset" && (
          <p className="mt-3 text-slate-600">
            {t("auth.forgot.resetIntro", { email: recoveryEmail })}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}

        {step === "email" && (
          <form
            noValidate
            onSubmit={emailForm.handleSubmit(submitEmail)}
            className="mt-6"
          >
            <fieldset disabled={busy} className="min-w-0">
              <legend className="sr-only">
                {t("auth.forgot.emailLabel")}
              </legend>

              <label
                htmlFor="recovery-email"
                className="block text-sm font-medium text-slate-700"
              >
                {t("auth.forgot.emailLabel")}
              </label>

              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                {...emailForm.register("email")}
                aria-invalid={Boolean(emailForm.formState.errors.email)}
                aria-describedby={
                  emailForm.formState.errors.email
                    ? "recovery-email-error"
                    : undefined
                }
                className={`mt-1.5 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600 ${
                  emailForm.formState.errors.email
                    ? "border-red-500"
                    : "border-slate-200"
                }`}
              />

              {emailForm.formState.errors.email && (
                <p
                  id="recovery-email-error"
                  role="alert"
                  className="mt-1 text-xs text-red-700"
                >
                  {emailForm.formState.errors.email.message}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="mt-7 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {busy
                  ? t("auth.forgot.sending")
                  : t("auth.forgot.send")}
              </button>
            </fieldset>
          </form>
        )}

        {step === "reset" && (
          <>
            <form
              noValidate
              onSubmit={resetForm.handleSubmit(submitReset)}
              className="mt-6"
            >
              <fieldset disabled={busy} className="min-w-0 space-y-5">
                <legend className="sr-only">
                  {t("auth.forgot.codeLabel")}
                </legend>

                <div>
                  <label
                    htmlFor="recovery-code"
                    className="block text-sm font-medium text-slate-700"
                  >
                    {t("auth.forgot.codeLabel")}
                  </label>

                  <input
                    id="recovery-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    {...resetForm.register("code")}
                    aria-invalid={Boolean(resetForm.formState.errors.code)}
                    aria-describedby={
                      resetForm.formState.errors.code
                        ? "recovery-code-help recovery-code-error"
                        : "recovery-code-help"
                    }
                    className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-[0.3em] outline-none focus:ring-2 focus:ring-emerald-600 ${
                      resetForm.formState.errors.code
                        ? "border-red-500"
                        : "border-slate-200"
                    }`}
                  />

                  <p
                    id="recovery-code-help"
                    className="mt-2 text-xs text-slate-500"
                  >
                    {t("auth.forgot.codeHelp")}
                  </p>

                  {resetForm.formState.errors.code && (
                    <p
                      id="recovery-code-error"
                      role="alert"
                      className="mt-1 text-xs text-red-700"
                    >
                      {resetForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <div>
                  <PasswordField
                    label={t("auth.forgot.newPassword")}
                    autoComplete="new-password"
                    error={resetForm.formState.errors.newPassword?.message}
                    {...resetForm.register("newPassword")}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    {t("auth.forgot.passwordHint")}
                  </p>
                </div>

                <PasswordField
                  label={t("auth.forgot.confirmPassword")}
                  autoComplete="new-password"
                  error={
                    resetForm.formState.errors.newPasswordConfirmation?.message
                  }
                  {...resetForm.register("newPasswordConfirmation")}
                />

                <button
                  type="submit"
                  disabled={busy}
                  aria-busy={busy}
                  className="w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {busy ? t("app.pleaseWait") : t("auth.forgot.reset")}
                </button>
              </fieldset>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-slate-600">
                {t("auth.forgot.noEmail")}
              </p>

              <button
                type="button"
                onClick={resendCode}
                disabled={busy || secondsRemaining > 0}
                className="mt-2 text-sm font-semibold text-emerald-800 underline disabled:opacity-60"
              >
                {secondsRemaining > 0
                  ? t("auth.forgot.resendIn", { seconds: secondsRemaining })
                  : t("auth.forgot.resend")}
              </button>

              <button
                type="button"
                onClick={changeEmail}
                disabled={busy}
                className="mx-auto mt-4 block text-sm text-slate-600 underline disabled:opacity-60"
              >
                {t("auth.forgot.differentEmail")}
              </button>
            </div>
          </>
        )}

        {step === "success" && (
          <Link
            href="/auth/login"
            className="mt-7 inline-flex w-full justify-center rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white"
          >
            {t("auth.forgot.goLogin")}
          </Link>
        )}
      </section>
    </main>
  );
}
