"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PageLanguage } from "@/components/layout/page-language";
import { ApiError, resendVerificationCode, verifyEmail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const pendingRegistrationSchema = z.object({
  pending_id: z.number().int().positive(),
  email: z.string().email(),
});

function makeVerificationSchema(t: (path: string) => string) {
  return z.object({
    code: z
      .string()
      .trim()
      .regex(/^[0-9]{4}$/, t("validation.fourDigitCode")),
  });
}

type PendingRegistration = z.infer<typeof pendingRegistrationSchema>;

type VerificationForm = z.infer<ReturnType<typeof makeVerificationSchema>>;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { t } = useI18n();
  const verificationSchema = useMemo(() => makeVerificationSchema(t), [t]);

  const [pending, setPending] = useState<PendingRegistration | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("pending_registration");

      if (!stored) {
        setError(t("auth.verify.noPending"));
        return;
      }

      const parsed = pendingRegistrationSchema.safeParse(JSON.parse(stored));

      if (!parsed.success) {
        setError(t("auth.verify.invalidPending"));
        return;
      }

      setPending(parsed.data);
    } catch {
      setError(t("auth.verify.storage"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  async function submit(values: VerificationForm) {
    if (!pending || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await verifyEmail(pending.pending_id, values.code);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("auth.errors.verification"),
      );

      setBusy(false);
      return;
    }

    // Server verification has succeeded. Storage cleanup must
    // not prevent navigation to the login page.
    try {
      sessionStorage.removeItem("pending_registration");
    } catch {
      // Continue even if browser storage is unavailable.
    }

    reset();
    router.replace("/auth/login");
  }

  async function resend() {
    if (!pending || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await resendVerificationCode(pending.pending_id);

      reset();
      setMessage(response.message);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("auth.errors.resend"),
      );
    } finally {
      setBusy(false);
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
          {t("auth.verify.title")}
        </h1>

        {loading ? (
          <p role="status" className="mt-5 text-slate-600">
            {t("auth.verify.loading")}
          </p>
        ) : (
          <>
            {pending && (
              <p className="mt-3 text-slate-600">
                {t("auth.verify.intro", { email: pending.email })}
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

            {pending && (
              <>
                <form
                  noValidate
                  onSubmit={handleSubmit(submit)}
                  className="mt-6"
                >
                  <label
                    htmlFor="verification-code"
                    className="block text-sm font-medium text-slate-700"
                  >
                    {t("auth.verify.codeLabel")}
                  </label>

                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    disabled={busy}
                    {...register("code")}
                    aria-invalid={Boolean(errors.code)}
                    aria-describedby={
                      errors.code
                        ? "verification-code-help verification-code-error"
                        : "verification-code-help"
                    }
                    className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60 ${
                      errors.code ? "border-red-500" : "border-slate-200"
                    }`}
                  />

                  <p
                    id="verification-code-help"
                    className="mt-2 text-xs text-slate-500"
                  >
                    {t("auth.verify.codeHelp")}
                  </p>

                  {errors.code && (
                    <p
                      id="verification-code-error"
                      role="alert"
                      className="mt-1 text-xs text-red-700"
                    >
                      {errors.code.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    aria-busy={busy}
                    className="mt-7 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
                  >
                    {busy
                      ? t("auth.verify.verifying")
                      : t("auth.verify.submit")}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-sm text-slate-600">
                    {t("auth.verify.noEmail")}
                  </p>

                  <button
                    type="button"
                    onClick={resend}
                    disabled={busy}
                    className="mt-2 text-sm font-semibold text-emerald-800 underline disabled:opacity-60"
                  >
                    {t("auth.verify.resend")}
                  </button>
                </div>

                <p className="mt-5 text-center text-xs text-slate-500">
                  {t("auth.verify.after")}
                </p>
              </>
            )}

            <div className="mt-7 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-600">
                {pending
                  ? t("auth.verify.needRestart")
                  : t("auth.verify.choose")}
              </p>

              <div className="mt-3 flex flex-col gap-3 text-sm">
                <Link
                  href="/auth/register"
                  className="font-semibold text-emerald-800 underline"
                >
                  {t("auth.verify.personal")}
                </Link>

                <Link
                  href="/auth/register/organization"
                  className="font-semibold text-emerald-800 underline"
                >
                  {t("auth.verify.organization")}
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
