"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

import {
  clearSession,
  readAccessToken,
  readLastActivity,
  recordSessionActivity,
  SESSION_CHANGED_EVENT,
  SESSION_IDLE_MS,
  SESSION_WARNING_MS,
} from "@/lib/session";

type Notice =
  | { kind: "none" }
  | { kind: "warning"; seconds: number }
  | { kind: "expired" };

export function SessionGuard() {
  const { t } = useI18n();
  const [notice, setNotice] = useState<Notice>({
    kind: "none",
  });

  useEffect(() => {
    let lastRecorded = 0;

    function check() {
      if (!readAccessToken()) {
        setNotice((current) =>
          current.kind === "expired" ? current : { kind: "none" },
        );
        return;
      }

      const lastActivity = readLastActivity();

      const remaining =
        lastActivity === null
          ? 0
          : SESSION_IDLE_MS - (Date.now() - lastActivity);

      if (remaining <= 0) {
        clearSession();
        setNotice({ kind: "expired" });
        return;
      }

      if (remaining <= SESSION_WARNING_MS) {
        setNotice({
          kind: "warning",
          seconds: Math.ceil(remaining / 1000),
        });
      } else {
        setNotice({ kind: "none" });
      }
    }

    function onActivity(event: Event) {
      // Ignore synthetic DOM events.
      if (!event.isTrusted || !readAccessToken()) return;

      const now = Date.now();

      // Limit storage writes during repeated interactions.
      if (now - lastRecorded < 1000) return;

      lastRecorded = now;

      if (!recordSessionActivity()) {
        check();
        return;
      }

      setNotice({ kind: "none" });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        check();
      }
    }

    const activityEvents = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
    ] as const;

    for (const event of activityEvents) {
      window.addEventListener(event, onActivity, {
        passive: true,
      });
    }

    window.addEventListener("focus", check);
    window.addEventListener(SESSION_CHANGED_EVENT, check);

    document.addEventListener("visibilitychange", onVisibilityChange);

    const interval = window.setInterval(check, 1000);

    check();

    return () => {
      for (const event of activityEvents) {
        window.removeEventListener(event, onActivity);
      }

      window.removeEventListener("focus", check);
      window.removeEventListener(SESSION_CHANGED_EVENT, check);

      document.removeEventListener("visibilitychange", onVisibilityChange);

      window.clearInterval(interval);
    };
  }, []);

  if (notice.kind === "none") return null;

  return (
    <aside
      aria-label={t("sessionGuard.noticeLabel")}
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-5 shadow-xl"
    >
      {notice.kind === "warning" ? (
        <>
          <p role="status" className="font-semibold text-amber-950">
            {t("sessionGuard.warningTitle")}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {t("sessionGuard.warningBody", {
              minutes: Math.ceil(notice.seconds / 60),
            })}
          </p>

          <button
            type="button"
            onClick={() => {
              if (recordSessionActivity()) {
                setNotice({ kind: "none" });
              } else {
                clearSession();
                setNotice({ kind: "expired" });
              }
            }}
            className="mt-4 rounded-xl bg-emerald-800 px-4 py-2 font-semibold text-white"
          >
            {t("sessionGuard.staySignedIn")}
          </button>
        </>
      ) : (
        <>
          <p role="alert" className="font-semibold text-amber-950">
            {t("sessionGuard.expiredTitle")}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {t("sessionGuard.expiredBody")}
          </p>

          <Link
            href="/auth/login"
            className="mt-4 inline-flex rounded-xl bg-emerald-800 px-4 py-2 font-semibold text-white"
          >
            {t("sessionGuard.logInAgain")}
          </Link>
        </>
      )}
    </aside>
  );
}
