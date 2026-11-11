/**
 * Reusable password input with a show/hide toggle.
 *
 * Extracted from the login and register pages because both need the same three
 * behaviours: a stable id linking the <label> to the <input>, an accessible
 * toggle button, and an error message wired up through `aria-describedby`.
 *
 * It is a controlled-agnostic component: callers pass the field through
 * React Hook Form's `register()` and this component forwards every remaining
 * prop to the underlying <input>.
 */
"use client";

import { InputHTMLAttributes, useId, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Accepts every native input attribute (so `register("password")` output can be
 * spread straight in) plus the two presentation props below.
 */
type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function PasswordField({ label, error, id, className = "", ...inputProps }: PasswordFieldProps) {
  const { t } = useI18n();

  // useId gives a unique, SSR-stable id so the label points at the right input
  // even when several password fields share a page. An explicit `id` prop wins.
  const generatedId = useId();
  const inputId = id ?? generatedId;

  // Whether the value is currently shown in clear text.
  const [visible, setVisible] = useState(false);

  return (
    <div className="block text-sm font-medium text-slate-700">
      <label htmlFor={inputId}>{label}</label>

      {/* `relative` anchors the toggle button over the input's right edge. */}
      <span className="relative mt-1.5 block">
        <input
          {...inputProps}
          id={inputId}
          // The same input serves both states; only the type changes.
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          // Point screen readers at the error text so the failure is announced
          // with the field rather than being discovered separately.
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full rounded-xl border px-4 py-3 pr-16 outline-none focus:ring-2 focus:ring-emerald-600 ${error ? "border-red-500" : "border-slate-200"} ${className}`}
        />

        {/* type="button" keeps this from submitting the surrounding form. */}
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-4 text-slate-600 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          // The label states the action, not the current state, so it stays
          // correct after toggling.
          aria-label={t(visible ? "app.hide" : "app.show", {
            label: label.toLowerCase(),
          })}
          // Exposes the toggle as a pressed/unpressed control.
          aria-pressed={visible}
        >
          {/* Both icons are decorative: the button's aria-label already
              conveys the meaning, so the SVGs are hidden from screen readers. */}
          {visible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              {/* Struck-through eye: currently visible. */}
              <path d="m3 3 18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.4 4.4 10 8-.2 1.2-.9 2.6-2 3.8" />
              <path d="M6.6 6.6C4.5 8 2.5 10.3 2 12c.8 4.1 4.7 8 10 8 1.8 0 3.4-.4 4.8-1.1" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              {/* Plain eye: currently hidden. */}
              <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>

      {/* The id referenced by aria-describedby above. role="alert" makes
          assistive technology announce it the moment it appears. */}
      {error && (
        <span id={`${inputId}-error`} role="alert" className="mt-1 block text-xs font-normal text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
