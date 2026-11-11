"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { authenticatedFetch } from "@/lib/session";
import { responseError } from "@/lib/public-projects";
import type { PublicProject } from "@/lib/public-projects";

type Reader = {
  project: PublicProject; version: number; page_count: number;
  pages: { page_number: number; width: number; height: number }[];
};

export default function OrganizationProjectReader({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [reader, setReader] = useState<Reader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(0);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [image, setImage] = useState<{ key: string; url: string } | null>(null);
  const [imageError, setImageError] = useState("");
  const [imageRetry, setImageRetry] = useState(0);
  const validId = /^[1-9]\d*$/.test(projectId);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    setLoading(true); setError(""); setStatus(0); setReader(null); setPage(1);
    async function load() {
      if (!validId) throw new ApiError(t("document.invalidId"), 404);
      const response = await authenticatedFetch(`/api/public/projects/${projectId}/document/`, { cache: "no-store", signal: controller.signal });
      const payload: unknown = await response.json().catch(() => undefined);
      if (!response.ok) throw new ApiError(responseError(payload), response.status);
      if (!ignore) setReader(payload as Reader);
    }
    void load().catch((cause: unknown) => {
      if (!ignore) {
        setError(cause instanceof Error ? cause.message : t("document.couldNotOpen"));
        setStatus(cause instanceof ApiError ? cause.status : 0);
      }
    }).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; controller.abort(); };
  }, [projectId, validId, retry, t]);

  const imageKey = reader ? `${projectId}:${reader.version}:${page}` : "";
  useEffect(() => {
    if (!reader || !imageKey) return;
    const controller = new AbortController();
    let ignore = false;
    let objectUrl: string | null = null;
    setImageError(""); setImage(null);
    async function loadPage() {
      const response = await authenticatedFetch(`/api/public/projects/${projectId}/document/pages/${page}/`, {
        cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => undefined);
        throw new ApiError(responseError(payload), response.status);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/png")) throw new Error(t("document.badImage"));
      const blob = await response.blob();
      if (ignore) return;
      objectUrl = URL.createObjectURL(blob);
      setImage({ key: imageKey, url: objectUrl });
    }
    void loadPage().catch((cause: unknown) => {
      if (!ignore) setImageError(cause instanceof Error ? cause.message : t("document.couldNotLoad"));
    });
    return () => { ignore = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reader, projectId, page, imageKey, imageRetry, t]);

  if (loading) return (
    <p role="status" className="mt-8">
      {t("document.checking")}
    </p>
  );
  if (error || !reader) return (
    <section className="mt-8 rounded-3xl bg-white p-6">
      <h1 className="text-2xl font-semibold text-emerald-950">
        {status === 409
          ? t("document.processingRequired")
          : t("document.protected")}
      </h1>
      <p role="alert" className="mt-4 text-slate-700">
        {error || t("document.unavailable")}
      </p>
      <div className="mt-5 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="rounded-xl border border-emerald-800 px-4 py-3 font-semibold text-emerald-800"
        >
          {t("document.checkAgain")}
        </button>
        {(status === 401 || status === 403) && (
          <Link
            href="/auth/login"
            className="rounded-xl bg-emerald-800 px-4 py-3 font-semibold text-white"
          >
            {t("document.loginAuthorized")}
          </Link>
        )}
        <Link href="/projects" className="py-3 font-semibold text-emerald-800">
          {t("document.browsePublic")}
        </Link>
        
        <Link
          href="/account/projects"
          className="py-3 font-semibold text-emerald-800"
        >
          {t("document.returnMyProjects")}
        </Link>
      </div>
    </section>
  );
  const pageInfo = reader.pages.find((item) => item.page_number === page);
  return (
    <section className="mt-8 print:hidden">
      <h1 className="display text-3xl text-emerald-950">
        {reader.project.title || reader.project.reference_number}
      </h1>
      <p role="status" className="mt-2 text-sm text-emerald-800">
        {t("document.opened", { pages: reader.page_count })}
      </p>
      <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        {t("document.confidential")}
      </p>
      <nav
        aria-label={t("document.pagesLabel")}
        className="my-5 flex flex-wrap items-center gap-4"
      >
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
          className="rounded-xl border border-emerald-800 px-4 py-2 disabled:opacity-40"
        >
          {t("document.previous")}
        </button>
        <span>
          {t("document.pageOf", { page, pages: reader.page_count })}
        </span>
        <button
          type="button"
          disabled={page === reader.page_count}
          onClick={() => setPage((value) => value + 1)}
          className="rounded-xl border border-emerald-800 px-4 py-2 disabled:opacity-40"
        >
          {t("document.next")}
        </button>
      </nav>
      {imageError ? (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          <p>{imageError}</p>
          <button
            type="button"
            onClick={() => setImageRetry((value) => value + 1)}
            className="mt-2 underline"
          >
            {t("document.retryPage")}
          </button>
        </div>
      ) : image && image.key === imageKey && pageInfo ? (
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
          <Image
            src={image.url}
            alt={t("document.watermarkAlt", { page })}
            width={pageInfo.width}
            height={pageInfo.height}
            unoptimized
            draggable={false}
            className="h-auto w-full"
          />
        </div>
      ) : (
        <p role="status">{t("document.loadingPage")}</p>
      )}
    </section>
  );
}
