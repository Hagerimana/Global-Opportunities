"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { authenticatedFetch } from "@/lib/session";
import { translate, useI18n } from "@/lib/i18n";

type Country = { code: string; name: string };
type Place = { id: number; name: string; label?: string };
type Choice = { value: string; label: string };
type Completion = { is_complete: boolean; issues: Record<string, string> };
type Profile = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string | null;
  gender: string;
  phone: string;
  nationality: string;
  country_of_residence: string;
  address: string;
  province_id: number | null;
  commune_id: number | null;
  locality_id: number | null;
  province: string;
  commune: string;
  colline: string;
  bank_name: string;
  bank_account_number: string;
  interests: string[];
  completion: Completion;
};
type Result = { profile: Profile; interest_choices: Choice[] };
type Fields = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  nationality: string;
  country_of_residence: string;
  address: string;
  province_id: string;
  commune_id: string;
  locality_id: string;
  bank_name: string;
  bank_account_number: string;
  interests: string[];
};
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100";
const buttonClass =
  "rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60";
const empty: Fields = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  nationality: "",
  country_of_residence: "",
  address: "",
  province_id: "",
  commune_id: "",
  locality_id: "",
  bank_name: "",
  bank_account_number: "",
  interests: [],
};
function errorText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.map(errorText).filter(Boolean).join(" ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(([key, item]) =>
        key === "detail"
          ? errorText(item)
          : `${key.split("_").join(" ")}: ${errorText(item)}`,
      )
      .join(" ");
  return "";
}
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: body === undefined ? "GET" : "PATCH",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok)
    throw new Error(
      errorText(payload) ||
        translate("applicantInfo.errors.requestFailed", {
          status: response.status,
        }),
    );
  if (payload === undefined)
    throw new Error(translate("applicantInfo.errors.emptyResponse"));
  return payload as T;
}
function useReference<T>(path: string | null, retry: number) {
  const [state, setState] = useState<{
    path: string | null;
    items: T[];
    loading: boolean;
    error: string;
  }>({ path: null, items: [], loading: false, error: "" });
  useEffect(() => {
    let ignore = false;
    if (!path) return;
    setState({ path, items: [], loading: true, error: "" });
    void api<T[]>(path)
      .then((items) => {
        if (!Array.isArray(items))
          throw new Error(translate("applicantInfo.errors.list"));
        if (!ignore) setState({ path, items, loading: false, error: "" });
      })
      .catch((cause: unknown) => {
        if (!ignore)
          setState({
            path,
            items: [],
            loading: false,
            error:
              cause instanceof Error
                ? cause.message
                : translate("applicantInfo.errors.loadChoices"),
          });
      });
    return () => {
      ignore = true;
    };
  }, [path, retry]);
  if (!path) return { items: [] as T[], loading: false, error: "" };
  if (state.path !== path)
    return { items: [] as T[], loading: true, error: "" };
  return state;
}
function fromProfile(p: Profile): Fields {
  return {
    first_name: p.first_name,
    last_name: p.last_name,
    date_of_birth: p.date_of_birth ?? "",
    gender: ["male", "female"].includes(
      String(p.gender ?? "")
        .trim()
        .toLowerCase(),
    )
      ? String(p.gender).trim().toLowerCase()
      : "",
    phone: p.phone,
    nationality: p.nationality,
    country_of_residence: p.country_of_residence,
    address: p.address,
    province_id: p.province_id === null ? "" : String(p.province_id),
    commune_id: p.commune_id === null ? "" : String(p.commune_id),
    locality_id: p.locality_id === null ? "" : String(p.locality_id),
    bank_name: p.bank_name,
    bank_account_number: p.bank_account_number,
    interests: [...p.interests],
  };
}
function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {title}
      {children}
    </label>
  );
}
function ChoiceError({ error, retry }: { error: string; retry: () => void }) {
  const { t } = useI18n();

  return error ? (
    <div role="alert" className="mt-2 text-sm text-red-800">
      <p>{error}</p>
      <button type="button" onClick={retry} className="font-semibold underline">
        {t("applicantInfo.retryChoices")}
      </button>
    </div>
  ) : null;
}
type ApplicantInformationFormProps = {
  context?: "project" | "account";
  /**
   * Notified after a successful save. The project wizard uses it to
   * refresh its workflow state so the wizard advances automatically;
   * the account page does not need it.
   */
  onProfileSaved?: (isComplete: boolean) => Promise<void> | void;
};

export default function ApplicantInformationForm({
  context = "project",
  onProfileSaved,
}: ApplicantInformationFormProps) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fields, setFields] = useState<Fields>(empty);
  const [interests, setInterests] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);
  const [referenceRetry, setReferenceRetry] = useState(0);
  const alive = useRef(false);
  const savingLock = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError("");
    void api<Result>("/api/applicant-profile/me/")
      .then((result) => {
        if (!ignore) {
          setProfile(result.profile);
          setFields(fromProfile(result.profile));
          setInterests(result.interest_choices);
          setDirty(false);
        }
      })
      .catch((cause: unknown) => {
        if (!ignore)
          setLoadError(
            cause instanceof Error
              ? cause.message
              : translate("applicantInfo.loadFailed"),
          );
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [profileRetry]);
  const countries = useReference<Country>(
    profile ? "/api/locations/countries/" : null,
    referenceRetry,
  );
  const burundi = fields.country_of_residence === "BI";
  const provinces = useReference<Place>(
    profile && burundi ? "/api/locations/countries/BI/provinces/" : null,
    referenceRetry,
  );
  const communes = useReference<Place>(
    profile && burundi && fields.province_id
      ? `/api/locations/provinces/${fields.province_id}/communes/`
      : null,
    referenceRetry,
  );
  const localities = useReference<Place>(
    profile && burundi && fields.commune_id
      ? `/api/locations/communes/${fields.commune_id}/localities/`
      : null,
    referenceRetry,
  );
  function retryChoices() {
    setReferenceRetry((value) => value + 1);
  }
  function edited() {
    setDirty(true);
    setNotice("");
    setSaveError("");
  }
  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    edited();
  }
  function changeCountry(value: string) {
    setFields((current) => ({
      ...current,
      country_of_residence: value,
      province_id: "",
      commune_id: "",
      locality_id: "",
    }));
    edited();
  }
  function changeProvince(value: string) {
    setFields((current) => ({
      ...current,
      province_id: value,
      commune_id: "",
      locality_id: "",
    }));
    edited();
  }
  function changeCommune(value: string) {
    setFields((current) => ({
      ...current,
      commune_id: value,
      locality_id: "",
    }));
    edited();
  }
  function toggleInterest(value: string) {
    setFields((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value],
    }));
    edited();
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingLock.current) return;
    savingLock.current = true;
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      const result = await api<Result>("/api/applicant-profile/me/", {
        ...fields,
        date_of_birth: fields.date_of_birth || null,
        province_id:
          burundi && fields.province_id ? Number(fields.province_id) : null,
        commune_id:
          burundi && fields.commune_id ? Number(fields.commune_id) : null,
        locality_id:
          burundi && fields.locality_id ? Number(fields.locality_id) : null,
      });
      if (alive.current) {
        setProfile(result.profile);
        setFields(fromProfile(result.profile));
        setInterests(result.interest_choices);
        setDirty(false);
        setNotice(
          result.profile.completion.is_complete
            ? context === "account"
              ? t("applicantInfo.notices.updated")
              : t("applicantInfo.notices.savedComplete")
            : context === "account"
              ? t("applicantInfo.notices.savedIncompleteAccount")
              : t("applicantInfo.notices.savedIncompleteProject"),
        );

        // The save itself succeeded, so a refresh failure reported by the
        // caller must never be shown as a failed save here.
        try {
          await onProfileSaved?.(result.profile.completion.is_complete);
        } catch {
          // The caller owns its own error reporting.
        }
      }
    } catch (cause: unknown) {
      if (alive.current)
        setSaveError(
          cause instanceof Error
            ? cause.message
            : t("applicantInfo.errors.save"),
        );
    } finally {
      savingLock.current = false;
      if (alive.current) setSaving(false);
    }
  }
  const now = new Date();

  const cutoffYear = now.getFullYear() - 16;
  const cutoffMonth = now.getMonth();

  const lastDayOfCutoffMonth = new Date(
    cutoffYear,
    cutoffMonth + 1,
    0,
  ).getDate();

  const cutoffDay = Math.min(now.getDate(), lastDayOfCutoffMonth);

  const latestBirthDate =
    `${cutoffYear}-` +
    `${String(cutoffMonth + 1).padStart(2, "0")}-` +
    `${String(cutoffDay).padStart(2, "0")}`;
  if (loading)
    return (
      <section className="mt-6 rounded-3xl bg-white p-6" aria-busy="true">
        <h2 className="text-xl font-semibold text-emerald-950">
          {t("applicantInfo.loadingTitle")}
        </h2>
        <p role="status" className="mt-3">
          {t("applicantInfo.loadingText")}
        </p>
      </section>
    );
  if (loadError || !profile)
    return (
      <section className="mt-6 rounded-3xl bg-white p-6">
        <h2 className="text-xl font-semibold text-emerald-950">
          {t("applicantInfo.loadingTitle")}
        </h2>
        <p role="alert" className="mt-3 text-red-800">
          {loadError || t("applicantInfo.loadFailed")}
        </p>
        <button
          type="button"
          className={`${buttonClass} mt-4`}
          onClick={() => setProfileRetry((value) => value + 1)}
        >
          {t("applicantInfo.retryProfile")}
        </button>
      </section>
    );
  const selections = [
    {
      title: t("applicantInfo.province"),
      value: fields.province_id,
      state: provinces,
      disabled: false,
      onChange: changeProvince,
    },
    {
      title: t("applicantInfo.commune"),
      value: fields.commune_id,
      state: communes,
      disabled: !fields.province_id,
      onChange: changeCommune,
    },
    {
      title: t("applicantInfo.colline"),
      value: fields.locality_id,
      state: localities,
      disabled: !fields.commune_id || localities.items.length === 0,
      onChange: (value: string) => update("locality_id", value),
    },
  ];
  const completionLabels: Record<string, string> = {
    province_id: t("applicantInfo.completionLabels.province"),
    commune_id: t("applicantInfo.completionLabels.commune"),
    locality_id: t("applicantInfo.completionLabels.locality"),
    date_of_birth: t("applicantInfo.completionLabels.dateOfBirth"),
    country_of_residence: t("applicantInfo.completionLabels.countryOfResidence"),
    bank_name: t("applicantInfo.completionLabels.bankName"),
    bank_account_number: t("applicantInfo.completionLabels.bankAccount"),
    first_name: t("applicantInfo.completionLabels.firstName"),
    last_name: t("applicantInfo.completionLabels.lastName"),
  };
  function countryOptions(value: string, placeholder: string) {
    return (
      <>
        <option value="">
          {countries.loading ? t("applicantInfo.loadingCountries") : placeholder}
        </option>
        {value && !countries.items.some((item) => item.code === value) && (
          <option value={value}>
            {t("applicantInfo.previouslySaved", { value })}
          </option>
        )}
        {countries.items.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </>
    );
  }
  return (
    <section
      className="mt-6 rounded-3xl bg-white p-6"
      aria-labelledby="applicant-info-heading"
    >
      <h2
        id="applicant-info-heading"
        className="text-xl font-semibold text-emerald-950"
      >
        {context === "account"
          ? t("applicantInfo.titleAccount")
          : t("applicantInfo.titleProject")}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {t("applicantInfo.intro")}
      </p>
      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-800">
          {t("applicantInfo.savedIdentityTitle")}
        </h3>
        <dl className="mt-2 space-y-2 text-sm">
          <div>
            <dt className="text-slate-500">{t("applicantInfo.firstName")}</dt>
            <dd>{profile.first_name || t("applicantInfo.notAvailable")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("applicantInfo.lastName")}</dt>
            <dd>{profile.last_name || t("applicantInfo.notAvailable")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("applicantInfo.loginEmail")}</dt>
            <dd className="break-all">{profile.email}</dd>
          </div>
        </dl>
      </div>
      <form
        className="mt-6"
        autoComplete="off"
        onSubmit={(event) => void save(event)}
      >
        <fieldset disabled={saving} className="space-y-5">
          <legend className="mb-4 font-semibold text-emerald-950">
            {t("applicantInfo.identityLegend")}
          </legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field title={t("applicantInfo.firstName")}>
              <input
                required
                type="text"
                autoComplete="given-name"
                maxLength={100}
                value={fields.first_name}
                className={inputClass}
                onChange={(event) => update("first_name", event.target.value)}
              />
            </Field>

            <Field title={t("applicantInfo.lastName")}>
              <input
                required
                type="text"
                autoComplete="family-name"
                maxLength={100}
                value={fields.last_name}
                className={inputClass}
                onChange={(event) => update("last_name", event.target.value)}
              />
            </Field>
          </div>

          <Field title={t("applicantInfo.dateOfBirth")}>
            <input
              required
              type="date"
              max={latestBirthDate}
              value={fields.date_of_birth}
              className={inputClass}
              onChange={(event) => update("date_of_birth", event.target.value)}
            />

            <p className="mt-2 text-xs text-slate-500">
              {t("applicantInfo.minAge")}
            </p>
          </Field>
          <Field title={t("applicantInfo.gender")}>
            <select
              required
              value={fields.gender}
              className={inputClass}
              onChange={(event) => update("gender", event.target.value)}
            >
              <option value="">{t("applicantInfo.selectGender")}</option>
              <option value="male">{t("applicantInfo.male")}</option>
              <option value="female">{t("applicantInfo.female")}</option>
            </select>
          </Field>

          <Field title={t("applicantInfo.phone")}>
            <input
              type="tel"
              autoComplete="tel"
              maxLength={50}
              value={fields.phone}
              className={inputClass}
              onChange={(event) => update("phone", event.target.value)}
            />
          </Field>
          <Field title={t("applicantInfo.nationality")}>
            <select
              value={fields.nationality}
              disabled={countries.loading || !!countries.error}
              className={inputClass}
              onChange={(event) => update("nationality", event.target.value)}
            >
              {countryOptions(
                fields.nationality,
                t("applicantInfo.selectNationality"),
              )}
            </select>
          </Field>
          <ChoiceError error={countries.error} retry={retryChoices} />
        </fieldset>
        <fieldset disabled={saving} className="mt-7 space-y-5">
          <legend className="mb-4 font-semibold text-emerald-950">
            {t("applicantInfo.residenceLegend")}
          </legend>
          <Field title={t("applicantInfo.countryOfResidence")}>
            <select
              value={fields.country_of_residence}
              disabled={countries.loading || !!countries.error}
              className={inputClass}
              onChange={(event) => changeCountry(event.target.value)}
            >
              {countryOptions(
                fields.country_of_residence,
                t("applicantInfo.selectResidence"),
              )}
            </select>
          </Field>
          <p className="text-sm text-slate-600">
            {t("applicantInfo.independence")}
          </p>
          {burundi && (
            <>
              {selections.map((item) => (
                <div key={item.title}>
                  <Field title={item.title}>
                    <select
                      value={item.value}
                      className={inputClass}
                      disabled={
                        item.disabled ||
                        item.state.loading ||
                        !!item.state.error
                      }
                      onChange={(event) => item.onChange(event.target.value)}
                    >
                      <option value="">
                        {item.state.loading
                          ? t("applicantInfo.loadingChoices")
                          : t("applicantInfo.selectPlace", {
                              place: item.title.toLocaleLowerCase(),
                            })}
                      </option>
                      {item.state.items.map((place) => (
                        <option key={place.id} value={place.id}>
                          {place.label || place.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <ChoiceError error={item.state.error} retry={retryChoices} />
                </div>
              ))}
              {fields.commune_id &&
                !localities.loading &&
                !localities.error &&
                localities.items.length === 0 && (
                  <p
                    role="status"
                    className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
                  >
                    {t("applicantInfo.noLocalities")}
                  </p>
                )}
              {!profile.province_id &&
                (profile.province || profile.commune || profile.colline) && (
                  <p className="text-sm text-slate-600">
                    {t("applicantInfo.previousAddress", {
                      address: [profile.province, profile.commune, profile.colline]
                        .filter(Boolean)
                        .join(" / "),
                    })}
                  </p>
                )}
            </>
          )}
          <Field
            title={
              burundi
                ? t("applicantInfo.addressBurundi")
                : t("applicantInfo.addressFull")
            }
          >
            <textarea
              rows={3}
              value={fields.address}
              className={inputClass}
              onChange={(event) => update("address", event.target.value)}
            />
          </Field>
        </fieldset>
        <fieldset disabled={saving} className="mt-7 space-y-5">
          <legend className="mb-4 font-semibold text-emerald-950">
            {t("applicantInfo.bankLegend")}
          </legend>
          <Field title={t("applicantInfo.bankName")}>
            <input
              type="text"
              maxLength={255}
              value={fields.bank_name}
              className={inputClass}
              onChange={(event) => update("bank_name", event.target.value)}
            />
          </Field>
          <Field title={t("applicantInfo.bankAccountNumber")}>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              maxLength={100}
              value={fields.bank_account_number}
              className={inputClass}
              onChange={(event) =>
                update("bank_account_number", event.target.value)
              }
            />
          </Field>
          <p className="text-sm text-slate-600">
            {t("applicantInfo.bankNote")}
          </p>
        </fieldset>
        <fieldset disabled={saving} className="mt-7">
          <legend className="mb-3 font-semibold text-emerald-950">
            {t("applicantInfo.interestsLegend")}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {interests.map((choice) => (
              <label
                key={choice.value}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  value={choice.value}
                  checked={fields.interests.includes(choice.value)}
                  onChange={() => toggleInterest(choice.value)}
                  className="h-4 w-4 accent-emerald-700"
                />
                {choice.label}
              </label>
            ))}
          </div>
        </fieldset>
        {saveError && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            {saveError}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950"
          >
            {notice}
          </p>
        )}
        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-800">
            {t("applicantInfo.savedInfoTitle", {
              status: profile.completion.is_complete
                ? t("applicantInfo.complete")
                : t("applicantInfo.incomplete"),
            })}
          </h3>
          {dirty && (
            <p role="status" className="mt-2 text-sm text-amber-900">
              {t("applicantInfo.unsaved")}
            </p>
          )}
          {!profile.completion.is_complete && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {Object.entries(profile.completion.issues).map(
                ([key, message]) => (
                  <li key={key}>
                    {completionLabels[key] || key.split("_").join(" ")}:{" "}
                    {message}
                  </li>
                ),
              )}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-600">
            {context === "account"
              ? t("applicantInfo.completionNoteAccount")
              : t("applicantInfo.completionNoteProject")}
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className={`${buttonClass} mt-5`}
        >
          {saving ? t("applicantInfo.saving") : t("applicantInfo.save")}
        </button>
        <p className="mt-2 text-xs text-slate-500">
          {t("applicantInfo.saveNote")}
        </p>
      </form>
    </section>
  );
}
