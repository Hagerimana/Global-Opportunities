"use client";

/**
 * Sign-in page: POST /api/auth/login/.
 *
 * Form handling follows the project's chosen stack -- React Hook Form for
 * state and Zod for validation -- so the same rules run in the browser for
 * immediate feedback and again on the server, which stays the authority.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordField } from "@/components/auth/password-field";
import { PageLanguage } from "@/components/layout/page-language";
import { ApiError, login } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { saveSession } from "@/lib/session";

/**
 * Client-side shape of the form.
 *
 * Deliberately looser than the registration policy: a returning user only has
 * to supply a non-empty password, since strength rules have nothing to add at
 * sign-in. Length caps mirror the server's to avoid pointless round trips.
 *
 * The schema is built per render from `t()` so validation messages follow the
 * selected interface language instead of being frozen in English at import
 * time.
 */
function makeLoginSchema(t: (path: string) => string) {
  return z.object({
    email: z
      .string()
      .trim()
      .email(t("validation.validEmail"))
      .max(254, t("validation.max254")),
    password: z.string().min(1, t("validation.required")).max(128, t("validation.max128")),
  });
}

// Derive the TypeScript type from the schema so the two can never drift.
type LoginForm = z.infer<ReturnType<typeof makeLoginSchema>>;

export default function LoginPage() {
  const { t } = useI18n();
  const loginSchema = useMemo(() => makeLoginSchema(t), [t]);

  /**
   * `resolver` runs the Zod schema on every change; `mode: "onBlur"` means
   * validation waits until a field loses focus, so the user is not corrected
   * while still typing.
   *
   * `setError("root", ...)` below attaches a form-level message to a field
   * name that does not exist, which is how React Hook Form models a banner.
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  /** Runs after client validation passes. */
  async function submit(values: LoginForm) {
    let tokens;

    try {
      tokens = await login(values.email, values.password);
    } catch (cause) {
      setError("root", {
        message:
          cause instanceof ApiError
            ? cause.message
            : t("auth.errors.generic"),
      });

      return;
    }

    try {
      saveSession(tokens);
    } catch (cause) {
      setError("root", {
        message:
          cause instanceof Error ? cause.message : t("auth.errors.storage"),
      });

      return;
    }

    window.location.assign("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-emerald-50 px-5 py-10">
      <PageLanguage />

      {/* noValidate hands validation to Zod instead of the browser's own
          bubbles, so the styling and wording stay consistent. */}
      <form
        noValidate
        onSubmit={handleSubmit(submit)}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-emerald-950/10"
      >
        <Link href="/" className="text-sm font-semibold text-emerald-800">
          {t("app.backHome")}
        </Link>

        <h1 className="display mt-7 text-4xl text-emerald-950">
          {t("auth.login.title")}
        </h1>
        <p className="mt-3 text-slate-600">{t("auth.login.subtitle")}</p>

        {/* Form-level error banner. role="alert" announces it immediately. */}
        {errors.root && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {errors.root.message}
          </p>
        )}

        {/* The label wraps the input, so no htmlFor is needed. aria-invalid
            exposes the error state to assistive technology. */}
        <label className="mt-6 block text-sm font-medium text-slate-700">
          {t("account.fields.email")}
          <input
            autoComplete="email"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
            className={`mt-1.5 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600 ${errors.email ? "border-red-500" : "border-slate-200"}`}
          />
        </label>
        {errors.email && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {errors.email.message}
          </p>
        )}

        {/* register() output is spread into the shared component, which forwards
            it to the real <input>. */}
        <div className="mt-5">
          <PasswordField
            label={t("account.fields.password")}
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        {/* Disabled while the request is in flight, which also blocks a
            double submit. */}

        <div className="mt-3 text-right">
          <Link
            href="/auth/forgot-password"
            className="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {t("auth.login.forgot")}
          </Link>
        </div>

        <button
          disabled={isSubmitting}
          className="mt-7 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>

        <p className="mt-6 text-center text-sm text-slate-600">
          {t("auth.login.newHere")}{" "}
          <Link
            href="/auth/account-type"
            className="font-semibold text-emerald-800"
          >
            {t("auth.login.create")}
          </Link>
        </p>
      </form>
    </main>
  );
}
