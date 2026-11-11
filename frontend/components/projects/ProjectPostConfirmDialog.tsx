"use client";

import { useEffect, useId, useRef } from "react";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ProjectPostConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="p-6 sm:p-8">
        <h2 id={titleId} className="text-2xl font-semibold text-emerald-950">
          {t("dialog.postTitle")}
        </h2>

        <div
          id={descriptionId}
          className="mt-4 space-y-3 text-sm leading-6 text-slate-700"
        >
          <p>{t("dialog.postBody1")}</p>

          <p>{t("dialog.postBody2")}</p>

          <p className="rounded-xl bg-amber-50 p-3 text-amber-900">
            {t("dialog.postBody3")}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {t("dialog.cancel")}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {t("dialog.post")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
