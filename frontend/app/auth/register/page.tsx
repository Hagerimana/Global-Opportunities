"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordField } from "@/components/auth/password-field";
import { PageLanguage } from "@/components/layout/page-language";
import {
  ApiError,
  register as registerAccount,
  type RegisterResponse,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function makeRegisterSchema(t: (path: string) => string) {
  const name = z
    .string()
    .trim()
    .transform((value) => value.normalize("NFC"))
    .refine((value) => value.length > 0, {
      message: t("validation.required"),
    })
    .refine((value) => value.length <= 100, {
      message: t("validation.max100"),
    })
    .refine((value) => /^\p{L}(?:[\p{L}\p{M} ''-]*\p{L})?$/u.test(value), {
      message: t("validation.nameRule"),
    })
    .refine((value) => (value.match(/\p{L}/gu) ?? []).length >= 3, {
      message: t("validation.nameLetters"),
    })
    .transform((value) => value.replace(/ +/g, " "));

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
      firstName: name,
      lastName: name,
      email: z
        .string()
        .trim()
        .email(t("validation.validEmail"))
        .max(254, t("validation.max254")),
      password,
      passwordConfirmation: z
        .string()
        .min(1, t("validation.confirmPassword"))
        .max(128, t("validation.max128")),
    })
    .refine((values) => values.password === values.passwordConfirmation, {
      path: ["passwordConfirmation"],
      message: t("validation.passwordMismatch"),
    });
}

type RegisterForm = z.infer<ReturnType<typeof makeRegisterSchema>>;

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const registerSchema = useMemo(() => makeRegisterSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  async function submit(values: RegisterForm) {
    let pending: RegisterResponse;

    try {
      pending = await registerAccount(
        values.firstName,
        values.lastName,
        values.email,
        values.password,
        values.passwordConfirmation,
      );
    } catch (cause) {
      setError("root", {
        message:
          cause instanceof ApiError ? cause.message : t("auth.errors.generic"),
      });

      return;
    }

    try {
      // The verification page will read this reference.
      // Do not store passwords or verification codes here.
      sessionStorage.setItem(
        "pending_registration",
        JSON.stringify({
          pending_id: pending.pending_id,
          email: pending.email,
        }),
      );
    } catch {
      reset();

      setError("root", {
        message: t("auth.errors.registrationStorage"),
      });

      return;
    }

    reset();
    router.push("/auth/verify-email");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-emerald-50 px-5 py-10">
      <PageLanguage />

      <form
        noValidate
        onSubmit={handleSubmit(submit)}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-emerald-950/10"
      >
        <Link href="/" className="text-sm font-semibold text-emerald-800">
          {t("app.backHome")}
        </Link>

        <h1 className="display mt-7 text-4xl text-emerald-950">
          {t("auth.register.title")}
        </h1>

        {errors.root && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {errors.root.message}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            {t("auth.register.firstName")}
            <input
              autoComplete="given-name"
              {...register("firstName")}
              aria-invalid={Boolean(errors.firstName)}
              className={`mt-1.5 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600 ${
                errors.firstName ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.firstName && (
              <span
                role="alert"
                className="mt-1 block text-xs font-normal text-red-700"
              >
                {errors.firstName.message}
              </span>
            )}
          </label>

          <label className="text-sm font-medium text-slate-700">
            {t("auth.register.lastName")}
            <input
              autoComplete="family-name"
              {...register("lastName")}
              aria-invalid={Boolean(errors.lastName)}
              className={`mt-1.5 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600 ${
                errors.lastName ? "border-red-500" : "border-slate-200"
              }`}
            />
            {errors.lastName && (
              <span
                role="alert"
                className="mt-1 block text-xs font-normal text-red-700"
              >
                {errors.lastName.message}
              </span>
            )}
          </label>
        </div>

        <label className="mt-5 block text-sm font-medium text-slate-700">
          {t("auth.register.email")}
          <input
            type="email"
            autoComplete="email"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
            className={`mt-1.5 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600 ${
              errors.email ? "border-red-500" : "border-slate-200"
            }`}
          />
          {errors.email && (
            <span
              role="alert"
              className="mt-1 block text-xs font-normal text-red-700"
            >
              {errors.email.message}
            </span>
          )}
        </label>

        <div className="mt-5">
          <PasswordField
            label={t("auth.register.password")}
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <span className="mt-1 block text-xs text-slate-500">
            {t("auth.register.passwordHint")}
          </span>
        </div>

        <div className="mt-5">
          <PasswordField
            label={t("auth.register.confirmPassword")}
            autoComplete="new-password"
            error={errors.passwordConfirmation?.message}
            {...register("passwordConfirmation")}
          />
        </div>

        <p className="mt-5 text-sm text-slate-600">
          {t("auth.register.emailNotice")}
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-7 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting
            ? t("auth.register.submitting")
            : t("auth.register.submit")}
        </button>

        <p className="mt-6 text-center text-sm text-slate-600">
          {t("auth.register.already")}{" "}
          <Link href="/auth/login" className="font-semibold text-emerald-800">
            {t("auth.register.login")}
          </Link>
        </p>
      </form>
    </main>
  );
}
