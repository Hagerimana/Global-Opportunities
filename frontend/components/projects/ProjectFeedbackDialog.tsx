"use client";

import { useEffect, useId, useRef } from "react";
import { useI18n } from "@/lib/i18n";

export type ProjectFeedback = {
  kind: "error" | "success" | "information";
  title: string;
  message: string;
};

type Props = {
  feedback: ProjectFeedback | null;
  onClose: () => void;
};

export default function ProjectFeedbackDialog({ feedback, onClose }: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (feedback && !dialog.open) {
      dialog.showModal();
    } else if (!feedback && dialog.open) {
      dialog.close();
    }
  }, [feedback]);

  const isError = feedback?.kind === "error";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      {feedback && (
        <div className="p-6 sm:p-8">
          <h2
            id={titleId}
            className={`text-xl font-semibold ${
              isError ? "text-red-800" : "text-emerald-900"
            }`}
          >
            {feedback.title}
          </h2>

          <p
            id={messageId}
            className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700"
          >
            {feedback.message}
          </p>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              {t("dialog.ok")}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
