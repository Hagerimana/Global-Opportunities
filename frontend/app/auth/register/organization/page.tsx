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
  registerOrganization,
  type RegisterResponse,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const organizationTypes = [
  "GOVERNMENT",
  "PUBLIC_INSTITUTION",
  "PRIVATE_COMPANY",
  "NGO",
  "NON_PROFIT",
  "ASSOCIATION",
  "COOPERATIVE",
  "FOUNDATION",
  "FINANCIAL_INSTITUTION",
  "EDUCATIONAL_INSTITUTION",
  "RESEARCH_INSTITUTION",
  "OTHER",
] as const;

function makeOrganizationSchema(t: (path: string) => string) {
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
      name: z
        .string()
        .trim()
        .min(1, t("validation.orgName"))
        .max(255, t("validation.max255")),

      organizationType: z.enum(organizationTypes),

      registrationNumber: z
        .string()
        .trim()
        .min(1, t("validation.registrationNumber"))
        .max(100, t("validation.max100")),

      email: z
        .string()
        .trim()
        .min(1, t("validation.orgEmail"))
        .email(t("validation.validEmail"))
        .max(254, t("validation.max254")),

      phone: z
        .string()
        .trim()
        .min(1, t("validation.orgPhone"))
        .max(50, t("validation.max50")),

      address: z.string().trim().min(1, t("validation.orgAddress")),

      province: z
        .string()
        .trim()
        .min(1, t("validation.province"))
        .max(100, t("validation.max100")),

      commune: z
        .string()
        .trim()
        .min(1, t("validation.commune"))
        .max(100, t("validation.max100")),

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

type OrganizationForm = z.infer<ReturnType<typeof makeOrganizationSchema>>;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 " +
  "outline-none focus:ring-2 focus:ring-emerald-600 " +
  "aria-[invalid=true]:border-red-500";

const textFields = [
  {
    key: "name",
    labelKey: "account.fields.organizationName",
    autoComplete: "organization",
    maxLength: 255,
  },
  {
    key: "registrationNumber",
    labelKey: "account.fields.registrationNumber",
    autoComplete: "off",
    maxLength: 100,
  },
  {
    key: "email",
    labelKey: "account.fields.organizationEmail",
    type: "email",
    autoComplete: "email",
    maxLength: 254,
  },
  {
    key: "phone",
    labelKey: "account.fields.phone",
    type: "tel",
    autoComplete: "tel",
    maxLength: 50,
  },
  {
    key: "province",
    labelKey: "account.fields.province",
    autoComplete: "address-level1",
    maxLength: 100,
  },
  {
    key: "commune",
    labelKey: "account.fields.commune",
    autoComplete: "address-level2",
    maxLength: 100,
  },
] as const;

export default function OrganizationRegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const organizationSchema = useMemo(() => makeOrganizationSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      registrationNumber: "",
      email: "",
      phone: "",
      address: "",
      province: "",
      commune: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  async function submit(values: OrganizationForm) {
    let pending: RegisterResponse;

    try {
      pending = await registerOrganization(
        values.email,
        values.password,
        values.passwordConfirmation,
        {
          name: values.name,
          organization_type: values.organizationType,
          registration_number: values.registrationNumber,
          email: values.email,
          phone: values.phone,
          address: values.address,
          province: values.province,
          commune: values.commune,
        },
      );
    } catch (cause) {
      setError("root", {
        message:
          cause instanceof ApiError
            ? cause.message
            : t("auth.errors.registration"),
      });

      return;
    }

    try {
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
        className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl shadow-emerald-950/10 sm:p-8"
      >
        <Link href="/" className="text-sm font-semibold text-emerald-800">
          {t("app.backHome")}
        </Link>

        <h1 className="display mt-7 text-3xl text-emerald-950 sm:text-4xl">
          {t("auth.organization.title")}
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          {t("auth.organization.subtitle")}
        </p>

        <p className="mt-3 text-sm text-slate-600">
          {t("auth.organization.individual")}{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-emerald-800 underline"
          >
            {t("auth.organization.createPersonal")}
          </Link>
        </p>

        {errors.root && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {errors.root.message}
          </p>
        )}

        <fieldset disabled={isSubmitting} className="mt-6 min-w-0">
          <legend className="sr-only">{t("auth.organization.title")}</legend>

          <p className="mb-5 text-xs text-slate-500">
            {t("auth.organization.allRequired")}
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {textFields.map((field) => {
              const error = errors[field.key];
              const errorId = `organization-${field.key}-error`;

              return (
                <label
                  key={field.key}
                  className="block text-sm font-medium text-slate-700"
                >
                  {t(field.labelKey)}

                  <input
                    type={"type" in field ? field.type : "text"}
                    autoComplete={field.autoComplete}
                    maxLength={field.maxLength}
                    required
                    {...register(field.key)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error
                        ? errorId
                        : field.key === "email"
                          ? "organization-email-help"
                          : undefined
                    }
                    className={inputClass}
                  />

                  {field.key === "email" && (
                    <span
                      id="organization-email-help"
                      className="mt-1 block text-xs font-normal text-slate-500"
                    >
                      {t("auth.organization.emailHelp")}
                    </span>
                  )}

                  {error && (
                    <span
                      id={errorId}
                      role="alert"
                      className="mt-1 block text-xs font-normal text-red-700"
                    >
                      {error.message}
                    </span>
                  )}
                </label>
              );
            })}

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              {t("auth.organization.orgType")}
              <select
                required
                defaultValue=""
                {...register("organizationType")}
                aria-invalid={Boolean(errors.organizationType)}
                aria-describedby={
                  errors.organizationType
                    ? "organization-type-error"
                    : undefined
                }
                className={`${inputClass} bg-white`}
              >
                <option value="" disabled>
                  {t("auth.organization.selectType")}
                </option>

                {organizationTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`account.organizationTypes.${type}`)}
                  </option>
                ))}
              </select>
              {errors.organizationType && (
                <span
                  id="organization-type-error"
                  role="alert"
                  className="mt-1 block text-xs font-normal text-red-700"
                >
                  {t("validation.selectOrgType")}
                </span>
              )}
            </label>

            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              {t("account.fields.address")}
              <textarea
                rows={3}
                autoComplete="street-address"
                required
                {...register("address")}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={
                  errors.address ? "organization-address-error" : undefined
                }
                className={inputClass}
              />
              {errors.address && (
                <span
                  id="organization-address-error"
                  role="alert"
                  className="mt-1 block text-xs font-normal text-red-700"
                >
                  {errors.address.message}
                </span>
              )}
            </label>

            <div>
              <PasswordField
                label={t("account.fields.password")}
                autoComplete="new-password"
                error={errors.password?.message}
                {...register("password")}
              />

              <p className="mt-2 text-xs text-slate-500">
                {t("auth.register.passwordHint")}
              </p>
            </div>

            <PasswordField
              label={t("account.fields.confirmPassword")}
              autoComplete="new-password"
              error={errors.passwordConfirmation?.message}
              {...register("passwordConfirmation")}
            />
          </div>

          <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
            {t("auth.organization.verificationNotice")}
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="mt-6 w-full rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting
              ? t("auth.organization.submitting")
              : t("auth.organization.submit")}
          </button>
        </fieldset>

        <p className="mt-6 text-center text-sm text-slate-600">
          {t("auth.organization.already")}{" "}
          <Link href="/auth/login" className="font-semibold text-emerald-800">
            {t("auth.organization.login")}
          </Link>
        </p>
      </form>
    </main>
  );
}
