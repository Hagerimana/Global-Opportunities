"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import ApplicantInformationForm from "@/components/projects/ApplicantInformationForm";
import ProjectReviewEditor from "@/components/projects/ProjectReviewEditor";
import { getCurrentAccount } from "@/lib/api";
import { translate, useI18n } from "@/lib/i18n";
import { projectRequest } from "@/lib/project-requests";
import { authenticatedFetch, readAccessToken } from "@/lib/session";
import ProjectFeedbackDialog from "@/components/projects/ProjectFeedbackDialog";
import type { ProjectFeedback } from "@/components/projects/ProjectFeedbackDialog";
import ProjectPostConfirmDialog from "@/components/projects/ProjectPostConfirmDialog";

type WorkflowStep = {
  key: string;
  is_complete: boolean;
};

type WorkflowState = {
  project_id: number;
  reference_number: string;
  status: string;
  current_step: string;
  steps: WorkflowStep[];
  pdf: {
    uploaded: boolean;
    processing_status?: string | null;
    scan_status?: string | null;
    version?: number | null;
    original_filename?: string | null;
  };
  issues: {
    description_and_funding?: Record<string, string>;
    personal_information?: Record<string, string>;
    expert_invitation?: string;
  };
};

type Expert = {
  user_id: number;
  first_name: string;
  last_name: string;
  domain_label: string;
  professional_title: string;
};

type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type DescriptionFields = {
  title: string;
  problem_statement: string;
  solution: string;
  conclusion: string;
  objectives: string;
  expected_results: string;
  target_population: string;
  location: string;
  start_date: string;
  end_date: string;
  total_budget: string;
  requested_amount: string;
  own_contribution: string;
  currency: string;
};

type ProjectData = Record<string, unknown>;

type ActionName =
  | ""
  | "upload"
  | "domain"
  | "description"
  | "invitation"
  | "refresh"
  | "review"
  | "post";

type Translate = (
  path: string,
  values?: Record<string, string | number>,
) => string;

const PROJECT_DOMAINS = [
  "AGRICULTURE",
  "BUSINESS",
  "FINANCE",
  "FUNDRAISING",
  "PROJECT_MANAGEMENT",
  "TECHNOLOGY",
  "ENGINEERING",
  "EDUCATION",
  "HEALTH",
  "ENVIRONMENT",
  "SOCIAL_DEVELOPMENT",
  "COMMUNITY_DEVELOPMENT",
  "GOVERNANCE",
  "LAW",
  "RESEARCH",
  "MARKETING",
  "HUMAN_RESOURCES",
  "MONITORING_EVALUATION",
  "LOGISTICS",
  "CONSTRUCTION",
  "ENERGY",
  "ARTS_CULTURE",
  "LANGUAGES",
  "OTHER",
] as const;

/** Catalogue keys for every project field that can be reported missing. */
const FIELD_LABEL_KEYS: Record<string, string> = {
  title: "account.projects.details.title",
  domain: "account.projects.details.domain",
  problem_statement: "account.projects.details.problem_statement",
  solution: "account.projects.details.solution",
  conclusion: "account.projects.details.conclusion",
  objectives: "account.projects.details.objectives",
  expected_results: "account.projects.details.expected_results",
  target_population: "account.projects.details.target_population",
  location: "account.projects.details.projectLocation",
  start_date: "account.projects.details.plannedStartDate",
  end_date: "account.projects.details.plannedEndDate",
  total_budget: "account.projects.details.total_budget",
  requested_amount: "account.projects.details.requested_amount",
  own_contribution: "account.projects.details.own_contribution",
  currency: "account.projects.details.currency",
};

function fieldLabel(key: string, t: Translate): string {
  const path = FIELD_LABEL_KEYS[key];

  return path ? t(path) : key.replaceAll("_", " ");
}

function stepLabel(key: string, t: Translate): string {
  const path = `projectWizard.steps.${key}`;
  const label = t(path);

  return label === path ? key.replaceAll("_", " ") : label;
}

function statusLabel(value: string, t: Translate): string {
  const path = `status.project.${value}`;
  const label = t(path);

  return label === path ? value.replaceAll("_", " ") : label;
}

function domainLabel(value: string, t: Translate): string {
  const path = `projectWizard.domains.${value}`;
  const label = t(path);

  return label === path ? value.replaceAll("_", " ") : label;
}

/** The PDF preparation state, from `status.preparation.*`. */
function preparationLabel(value: string | null | undefined, t: Translate): string {
  if (!value) return t("projectWizard.unknown");

  const path = `status.preparation.${value}`;
  const label = t(path);

  return label === path ? value.replaceAll("_", " ") : label;
}

const EMPTY_DESCRIPTION: DescriptionFields = {
  title: "",
  problem_statement: "",
  solution: "",
  conclusion: "",
  objectives: "",
  expected_results: "",
  target_population: "",
  location: "",
  start_date: "",
  end_date: "",
  total_budget: "",
  requested_amount: "",
  own_contribution: "",
  currency: "BIF",
};

/*
 * The long-form fields, grouped by input type.
 *
 * These carry keys only; the visible labels come from `FIELD_LABEL_KEYS` through
 * `fieldLabel()`, which reads the same `account.projects.details.*` entries the
 * project record uses. Keeping one label map means the wizard and the review
 * screen cannot call the same field two different things in the same language.
 */
const LONG_FIELDS = [
  "problem_statement",
  "solution",
  "conclusion",
  "objectives",
  "expected_results",
  "target_population",
] as const;

const DATE_FIELDS = ["start_date", "end_date"] as const;

const MONEY_FIELDS = ["total_budget", "requested_amount", "own_contribution"] as const;

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white " +
  "px-4 py-3 text-slate-900 outline-none focus:ring-2 " +
  "focus:ring-emerald-600 disabled:bg-slate-100";

const buttonClass =
  "inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-semibold " +
  "text-white hover:bg-emerald-900 disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex rounded-xl border border-emerald-800 px-5 py-3 " +
  "font-semibold text-emerald-800 disabled:opacity-60";

const sectionClass = "mt-6 rounded-3xl bg-white p-6";

const requestJson = projectRequest;

function describeError(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(describeError).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const text = describeError(item);

        if (!text) return "";

        return key === "detail" ? text : `${key.replaceAll("_", " ")}: ${text}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function messageFrom(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

function descriptionFromProject(project: ProjectData): DescriptionFields {
  const fields = { ...EMPTY_DESCRIPTION };

  for (const key of Object.keys(fields) as Array<keyof DescriptionFields>) {
    const value = project[key];

    fields[key] =
      value === null || value === undefined
        ? EMPTY_DESCRIPTION[key]
        : String(value);
  }

  return fields;
}

function nextStepMessage(state: WorkflowState, t: Translate): string {
  if (state.status !== "DRAFT") {
    return t("projectWizard.statusCurrent", {
      status: statusLabel(state.status, t),
    });
  }

  return t("projectWizard.nextStep", {
    step: stepLabel(state.current_step, t),
  });
}

async function uploadPdf(file: File): Promise<WorkflowState> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;

  try {
    response = await authenticatedFetch("/api/project-workflow/upload-pdf/", {
      method: "POST",
      body: formData,
      cache: "no-store",
    });
  } catch (cause) {
    throw new Error(messageFrom(cause, translate("projectWizard.uploadRequest")));
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(translate("projectWizard.uploadExpired"));
    }

    if (response.status >= 500) {
      throw new Error(
        translate("projectWizard.uploadServer", { status: response.status }),
      );
    }

    throw new Error(
      (describeError(payload) || translate("projectWizard.uploadFailed")) +
        ` (HTTP ${response.status})`,
    );
  }

  if (!payload || typeof payload !== "object" || !("project_id" in payload)) {
    throw new Error(translate("projectWizard.uploadIncomplete"));
  }

  return payload as WorkflowState;
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {title}
      {children}
    </label>
  );
}

export default function NewProjectPage() {
  const { t } = useI18n();

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-emerald-50 px-5 py-10">
          <p role="status" className="mx-auto max-w-3xl">
            {t("projectWizard.loading")}
          </p>
        </main>
      }
    >
      <ProjectWorkflowRoute />
    </Suspense>
  );
}

function ProjectWorkflowRoute() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("projectId");

  return (
    <ProjectWorkflowPage
      key={resumeId === null ? "new-project" : `project-${resumeId}`}
      resumeId={resumeId}
    />
  );
}

function ProjectWorkflowPage({ resumeId }: { resumeId: string | null }) {
  const resuming = resumeId !== null;
  const { t } = useI18n();

  const [accountReady, setAccountReady] = useState(false);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState("");

  const [resumeLoading, setResumeLoading] = useState(resuming);
  const [resumeError, setResumeError] = useState("");
  const [resumeRetry, setResumeRetry] = useState(0);

  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [action, setAction] = useState<ActionName>("");
  const [feedback, setFeedback] = useState<ProjectFeedback | null>(null);
  const [postConfirmOpen, setPostConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState<DescriptionFields>({
    ...EMPTY_DESCRIPTION,
  });

  const [experts, setExperts] = useState<Expert[]>([]);
  const [expertNext, setExpertNext] = useState<string | null>(null);
  const [expertsLoading, setExpertsLoading] = useState(false);
  const [expertError, setExpertError] = useState("");
  const [expertRetry, setExpertRetry] = useState(0);
  const [expertId, setExpertId] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");

  const [review, setReview] = useState<ProjectData | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const actionLock = useRef(false);

  const busy = action !== "";
  const currentStep = workflow?.current_step ?? "PDF_UPLOAD";
  const isDraft = workflow?.status === "DRAFT";

  const showWorkflow =
    accountReady && !resumeLoading && !resumeError && workflow !== null;

  const showDraft = showWorkflow && isDraft;

  useEffect(() => {
    let ignore = false;

    async function loadAccount() {
      try {
        const account = await getCurrentAccount(readAccessToken() ?? "");

        if (account.account_type !== "PERSONAL") {
          throw new Error(translate("projectWizard.personalOnly"));
        }

        if (!ignore) setAccountReady(true);
      } catch (cause) {
        if (!ignore) {
          setAccountError(messageFrom(cause, translate("projectWizard.verifyAccount")));
        }
      } finally {
        if (!ignore) setAccountLoading(false);
      }
    }

    void loadAccount();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!accountReady || !resuming) return;

    let ignore = false;

    setResumeLoading(true);
    setResumeError("");
    setWorkflow(null);
    setReview(null);
    setError("");
    setNotice("");

    async function resumeDraft() {
      if (!resumeId || !/^[1-9]\d*$/.test(resumeId)) {
        throw new Error(t("projectWizard.invalidId"));
      }

      const project = await requestJson<ProjectData>(
        `/api/projects/${resumeId}/`,
      );

      if (project.status !== "DRAFT") {
        throw new Error(t("projectWizard.notDraft"));
      }

      const state = await requestJson<WorkflowState>(
        `/api/project-workflow/${resumeId}/`,
      );

      if (ignore) return;

      if (state.status !== "DRAFT") {
        throw new Error(t("projectWizard.notAvailable"));
      }

      setDomain(String(project.domain ?? ""));
      setDescription(descriptionFromProject(project));
      setWorkflow(state);

      setNotice(
        t("projectWizard.draftLoaded", {
          reference: state.reference_number,
          next: nextStepMessage(state, t),
        }),
      );
    }

    void resumeDraft()
      .catch((cause: unknown) => {
        if (!ignore) {
          setResumeError(
            messageFrom(cause, translate("projectWizard.draftLoad")),
          );
        }
      })
      .finally(() => {
        if (!ignore) setResumeLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [accountReady, resuming, resumeId, resumeRetry, t]);

  useEffect(() => {
    if (!showDraft || currentStep !== "EXPERT_INVITATION") return;

    let ignore = false;

    setExpertsLoading(true);
    setExpertError("");
    setExperts([]);
    setExpertNext(null);
    setExpertId("");

    void requestJson<Page<Expert>>("/api/project-experts/")
      .then((result) => {
        if (ignore) return;

        if (!Array.isArray(result.results)) {
          throw new Error(translate("projectWizard.expertUnexpected"));
        }

        setExperts(result.results);
        setExpertNext(result.next);
      })
      .catch((cause: unknown) => {
        if (!ignore) {
          setExpertError(
            messageFrom(cause, translate("projectWizard.expertLoad")),
          );
        }
      })
      .finally(() => {
        if (!ignore) setExpertsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [showDraft, currentStep, expertRetry]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  async function runAction(
    name: Exclude<ActionName, "">,
    task: () => Promise<void>,
  ) {
    if (actionLock.current) return;

    actionLock.current = true;
    setAction(name);
    clearMessages();

    try {
      await task();
    } catch (cause) {
      setError(messageFrom(cause, t("projectWizard.actionFailed")));
    } finally {
      actionLock.current = false;
      setAction("");
    }
  }

  const loadWorkflow = useCallback(async (projectId: number) => {
    const state = await requestJson<WorkflowState>(
      `/api/project-workflow/${projectId}/`,
    );

    setWorkflow(state);
    return state;
  }, []);

  async function handlePdfUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || resuming || workflow) return;

    if (!selectedFile) {
      setError(t("projectWizard.selectPdf"));
      return;
    }

    const file = selectedFile;

    await runAction("upload", async () => {
      const state = await uploadPdf(file);

      setWorkflow(state);
      setReview(null);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setNotice(
        t("projectWizard.pdfUploaded", {
          reference: state.reference_number,
          next: nextStepMessage(state, t),
        }),
      );
    });
  }

  async function saveDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workflow || busy || !isDraft) return;

    if (!domain) {
      setError(t("projectWizard.selectDomainError"));
      return;
    }

    await runAction("domain", async () => {
      const state = await requestJson<WorkflowState>(
        `/api/project-workflow/${workflow.project_id}/domain/`,
        "PATCH",
        { domain },
      );

      setWorkflow(state);
      setReview(null);

      setNotice(
        t("projectWizard.domainSaved", { next: nextStepMessage(state, t) }),
      );
    });
  }

  async function saveDescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workflow || busy || !isDraft) return;

    const missing = (
      Object.keys(description) as Array<keyof DescriptionFields>
    ).filter((key) => !description[key].trim());

    if (missing.length > 0) {
      setError(
        t("projectWizard.completeFields", {
          fields: missing.map((key) => fieldLabel(key, t)).join(", "),
        }),
      );
      return;
    }

    await runAction("description", async () => {
      const state = await requestJson<WorkflowState>(
        `/api/project-workflow/${workflow.project_id}/description-funding/`,
        "PATCH",
        {
          ...description,
          currency: description.currency.trim().toUpperCase(),
          total_budget: description.total_budget || null,
          requested_amount: description.requested_amount || null,
          own_contribution: description.own_contribution || null,
          start_date: description.start_date || null,
          end_date: description.end_date || null,
        },
      );

      setWorkflow(state);
      setReview(null);

      setNotice(
        t("projectWizard.descriptionSaved", { next: nextStepMessage(state, t) }),
      );
    });
  }

  async function loadMoreExperts() {
    if (!expertNext || busy || expertsLoading) return;

    setExpertsLoading(true);
    setExpertError("");

    try {
      const parsed = new URL(expertNext, window.location.origin);

      if (parsed.pathname !== "/api/project-experts/") {
        throw new Error(t("projectWizard.expertPagination"));
      }

      const result = await requestJson<Page<Expert>>(
        `${parsed.pathname}${parsed.search}`,
      );

      if (!Array.isArray(result.results)) {
        throw new Error(t("projectWizard.expertUnexpected"));
      }

      setExperts((current) => {
        const byId = new Map(current.map((item) => [item.user_id, item]));

        for (const item of result.results) {
          byId.set(item.user_id, item);
        }

        return [...byId.values()];
      });

      setExpertNext(result.next);
      setNotice(t("projectWizard.moreExperts"));
    } catch (cause) {
      setExpertError(messageFrom(cause, t("projectWizard.expertMore")));
    } finally {
      setExpertsLoading(false);
    }
  }

  async function inviteExpert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workflow || busy || !isDraft) return;

    if (!expertId) {
      setError(t("projectWizard.selectExpert"));
      return;
    }

    await runAction("invitation", async () => {
      await requestJson("/api/project-expert-invitations/", "POST", {
        project_id: workflow.project_id,
        expert_user_id: Number(expertId),
        message: invitationMessage,
      });

      setInvitationMessage("");

      try {
        const state = await loadWorkflow(workflow.project_id);

        setNotice(
          t("projectWizard.invitationRecorded", {
            next: nextStepMessage(state, t),
          }),
        );
      } catch (cause) {
        setNotice(t("projectWizard.invitationRecordedOnly"));

        throw new Error(
          t("projectWizard.inviteRefresh", { message: messageFrom(cause, "") }),
        );
      }
    });
  }

  async function refreshWorkflowStatus() {
    if (!workflow || busy) return;

    await runAction("refresh", async () => {
      const state = await loadWorkflow(workflow.project_id);

      if (state.current_step !== "REVIEW_AND_POST") {
        setReview(null);
      }

      setNotice(
        t("projectWizard.workflowRefreshed", {
          next: nextStepMessage(state, t),
        }),
      );
    });
  }

  /*
   * The personal-information form owns its own save action, so it reports
   * success here instead of going through runAction(). Once the record is
   * complete, reload the workflow so the wizard advances to review and post
   * like every other step, without requiring a manual status refresh.
   */
  async function handleProfileSaved(isComplete: boolean) {
    if (!workflow || !isDraft || !isComplete) return;

    try {
      const state = await loadWorkflow(workflow.project_id);

      if (state.current_step !== "PERSONAL_INFORMATION") {
        setReview(null);
      }

      setNotice(
        t("projectWizard.personalInfoComplete", {
          next: nextStepMessage(state, t),
        }),
      );
    } catch (cause) {
      setError(messageFrom(cause, t("projectWizard.actionFailed")));
    }
  }

  async function loadReview() {
    if (!workflow || busy || !isDraft) return;

    await runAction("review", async () => {
      const projectId = workflow.project_id;

      const [savedProject, reviewData] = await Promise.all([
        requestJson<ProjectData>(`/api/projects/${projectId}/`),
        requestJson<ProjectData>(`/api/project-workflow/${projectId}/review/`),
      ]);

      const merged: ProjectData = { ...savedProject };

      for (const [key, value] of Object.entries(reviewData)) {
        const empty =
          value === null ||
          value === undefined ||
          (typeof value === "string" && value.trim() === "");

        if (!empty) merged[key] = value;
      }

      const requiredFields = [
        "title",
        "domain",
        "problem_statement",
        "solution",
        "conclusion",
        "objectives",
        "expected_results",
        "target_population",
        "location",
        "start_date",
        "end_date",
        "total_budget",
        "requested_amount",
        "own_contribution",
        "currency",
      ];

      const missing = requiredFields.filter((key) => {
        const value = merged[key];

        return (
          value === null ||
          value === undefined ||
          (typeof value === "string" && value.trim() === "")
        );
      });

      if (missing.length > 0) {
        setReview(null);

        throw new Error(
          t("projectWizard.missingValues", {
            fields: missing.map((key) => fieldLabel(key, t)).join(", "),
          }),
        );
      }

      setReview(merged);
      setDomain(String(merged.domain ?? ""));
      setDescription(descriptionFromProject(merged));

      setNotice(t("projectWizard.reviewLoaded"));
    });
  }

  function handleReviewSaved(saved: ProjectData) {
    setReview(saved);
    setDomain(String(saved.domain ?? ""));
    setDescription(descriptionFromProject(saved));
    setError("");

    setNotice(t("projectWizard.reviewSaved"));
  }

  function postProject() {
    if (!workflow || busy || !isDraft) return;

    if (!review) {
      setError(t("projectWizard.openReviewFirst"));
      return;
    }

    clearMessages();
    setPostConfirmOpen(true);
  }

  function cancelPosting() {
    setPostConfirmOpen(false);

    // Cancellation is not an error. Do not open another dialog.
  }

  async function confirmPosting() {
    if (!workflow || busy || !isDraft || !review) {
      setPostConfirmOpen(false);
      return;
    }

    setPostConfirmOpen(false);

    await runAction("post", async () => {
      let state: WorkflowState;

      try {
        state = await requestJson<WorkflowState>(
          `/api/project-workflow/${workflow.project_id}/post/`,
          "POST",
        );
      } catch (cause) {
        const message = messageFrom(cause, t("projectWizard.postFailed"));

        // The backend reports an unprepared proposal under the "proposal"
        // error key. The key is locale-independent, unlike the translated
        // detail text, so match it and show the helpful explanation instead.
        if (message.toLowerCase().startsWith("proposal:")) {
          throw new Error(t("projectWizard.postNotReady"));
        }

        throw cause;
      }

      setWorkflow(state);

      setNotice(
        t("projectWizard.postedNotice", { reference: state.reference_number }),
      );
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
    clearMessages();
  }

  function updateDescription(key: keyof DescriptionFields, value: string) {
    setDescription((current) => ({ ...current, [key]: value }));
    clearMessages();
  }

  useEffect(() => {
    const failure = error || resumeError || accountError || expertError;

    if (failure) {
      setFeedback({
        kind: "error",
        title: t("projectWizard.feedbackErrorTitle"),
        message: notice
          ? `${failure}\n\n${t("projectWizard.additionalInfo")}\n${notice}`
          : failure,
      });
      return;
    }

    if (notice) {
      setFeedback({
        kind: "information",
        title: t("projectWizard.feedbackInfoTitle"),
        message: notice,
      });
    }
  }, [error, resumeError, accountError, expertError, notice, t]);

  return (
    <main id="main" className="min-h-screen bg-emerald-50 px-5 py-10">
      <ProjectPostConfirmDialog
        open={postConfirmOpen}
        onCancel={cancelPosting}
        onConfirm={() => void confirmPosting()}
      />

      <ProjectFeedbackDialog
        feedback={feedback}
        onClose={() => setFeedback(null)}
      />

      <div className="mx-auto max-w-3xl">
        <nav
          aria-label={t("projectWizard.navLabel")}
          className="mt-4 flex flex-wrap items-center gap-4"
        >
          <Link href="/account/projects" className={secondaryButtonClass}>
            {t("projectWizard.myProjects")}
          </Link>

          <Link href="/projects" className={buttonClass}>
            {t("projectWizard.browse")}
          </Link>

          <Link href="/account" className="py-3 font-semibold text-emerald-800">
            {t("projectWizard.account")}
          </Link>
        </nav>

        <h1 className="display mt-7 text-3xl text-emerald-950">
          {resuming ? t("projectWizard.titleResume") : t("projectWizard.titleNew")}
        </h1>

        <p className="mt-4 text-sm text-emerald-900">
          {t("projectWizard.intro")}
        </p>

        {accountLoading ? (
          <p role="status" className="mt-6">
            {t("projectWizard.checkingAccount")}
          </p>
        ) : !accountReady ? (
          <section className={sectionClass}>
            <h2 className="text-xl font-semibold text-emerald-950">
              {t("projectWizard.accessRequired")}
            </h2>

            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-4 text-red-800"
            >
              {accountError || t("projectWizard.loginPersonal")}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/auth/login" className={buttonClass}>
                {t("projectWizard.logIn")}
              </Link>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className={secondaryButtonClass}
              >
                {t("projectWizard.retryAccount")}
              </button>
            </div>
          </section>
        ) : (
          <>
            {resuming && resumeLoading && (
              <p
                role="status"
                className="mt-6 rounded-xl bg-white p-4 text-slate-700"
              >
                {t("projectWizard.loadingDraft")}
              </p>
            )}

            {resuming && resumeError && (
              <section className={sectionClass}>
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.draftFailed")}
                </h2>

                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-4 text-red-800"
                >
                  {resumeError}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={resumeLoading}
                    onClick={() => setResumeRetry((value) => value + 1)}
                    className={secondaryButtonClass}
                  >
                    {t("projectWizard.retryDraft")}
                  </button>

                  <Link href="/account/projects" className={buttonClass}>
                    {t("projectWizard.returnProjects")}
                  </Link>
                </div>
              </section>
            )}

            {error && (
              <p
                role="alert"
                className="mt-5 whitespace-pre-wrap rounded-xl bg-red-50 p-4 text-red-800"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-emerald-100 p-4 text-emerald-950"
              >
                {notice}
              </p>
            )}

            {showWorkflow && workflow && (
              <section className={sectionClass}>
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.progressTitle")}
                </h2>

                <p className="mt-2 break-all text-sm text-slate-600">
                  {t("projectWizard.reference", {
                    reference: workflow.reference_number,
                  })}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {t("projectWizard.status", {
                    status: statusLabel(workflow.status, t),
                  })}
                </p>

                {workflow.pdf.uploaded && (
                  <p className="mt-2 text-sm text-slate-600">
                    {t("projectWizard.proposal", {
                      name:
                        workflow.pdf.original_filename ||
                        t("projectWizard.uploadedPdf"),
                      status: preparationLabel(
                        workflow.pdf.processing_status,
                        t,
                      ),
                    })}
                  </p>
                )}

                <ol className="mt-4 space-y-2">
                  {workflow.steps.map((step, index) => (
                    <li
                      key={step.key}
                      className="flex items-center gap-3 text-sm"
                      aria-current={
                        isDraft && step.key === currentStep ? "step" : undefined
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          step.is_complete
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <span
                        className={
                          step.key === currentStep
                            ? "font-semibold text-emerald-900"
                            : "text-slate-700"
                        }
                      >
                        {stepLabel(step.key, t)}
                      </span>
                    </li>
                  ))}
                </ol>

                {isDraft && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void refreshWorkflowStatus()}
                      className={secondaryButtonClass}
                    >
                      {action === "refresh"
                        ? t("projectWizard.refreshingStatus")
                        : t("projectWizard.refreshStatus")}
                    </button>

                    <Link
                      href={`/projects/${workflow.project_id}/document`}
                      className={secondaryButtonClass}
                    >
                      {t("projectWizard.readProposal")}
                    </Link>
                  </div>
                )}

                {isDraft && (
                  <p className="mt-3 text-xs text-slate-500">
                    {t("projectWizard.draftNote")}
                  </p>
                )}
              </section>
            )}

            {!resuming && !workflow && (
              <section className={sectionClass}>
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.step1Title")}
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {t("projectWizard.step1Body")}
                </p>

                <form
                  className="mt-5"
                  onSubmit={(event) => void handlePdfUpload(event)}
                >
                  <Field title={t("projectWizard.projectPdf")}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      required
                      disabled={busy}
                      onChange={handleFileChange}
                      className={inputClass}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={busy || !selectedFile}
                    className={`${buttonClass} mt-4`}
                  >
                    {action === "upload"
                      ? t("projectWizard.uploadingPdf")
                      : t("projectWizard.uploadPdf")}
                  </button>
                </form>
              </section>
            )}

            {showDraft && currentStep === "DOMAIN" && (
              <section className={sectionClass}>
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.step2Title")}
                </h2>

                <form
                  className="mt-5"
                  onSubmit={(event) => void saveDomain(event)}
                >
                  <Field title={t("projectWizard.projectDomain")}>
                    <select
                      required
                      value={domain}
                      disabled={busy}
                      onChange={(event) => {
                        setDomain(event.target.value);
                        clearMessages();
                      }}
                      className={inputClass}
                    >
                      <option value="">{t("projectWizard.selectDomain")}</option>

                      {PROJECT_DOMAINS.map((value) => (
                        <option key={value} value={value}>
                          {domainLabel(value, t)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <button
                    type="submit"
                    disabled={busy || !domain}
                    className={`${buttonClass} mt-4`}
                  >
                    {action === "domain"
                      ? t("projectWizard.savingDomain")
                      : t("projectWizard.saveDomain")}
                  </button>
                </form>
              </section>
            )}

            {showDraft && currentStep === "DESCRIPTION_AND_FUNDING" && (
              <section className={sectionClass}>
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.step3Title")}
                </h2>

                <form
                  className="mt-5 space-y-5"
                  onSubmit={(event) => void saveDescription(event)}
                >
                  <fieldset disabled={busy} className="space-y-5">
                    <legend className="sr-only">
                      {t("projectWizard.descriptionLegend")}
                    </legend>

                    <Field title={t("projectWizard.projectName")}>
                      <input
                        required
                        maxLength={255}
                        value={description.title}
                        onChange={(event) =>
                          updateDescription("title", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>

                    {LONG_FIELDS.map((key) => (
                      <Field key={key} title={fieldLabel(key, t)}>
                        <textarea
                          required
                          rows={4}
                          value={description[key]}
                          onChange={(event) =>
                            updateDescription(key, event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                    ))}

                    <Field title={t("projectWizard.projectLocation")}>
                      <input
                        required
                        maxLength={255}
                        value={description.location}
                        onChange={(event) =>
                          updateDescription("location", event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {DATE_FIELDS.map((key) => (
                        <Field key={key} title={fieldLabel(key, t)}>
                          <input
                            required
                            type="date"
                            value={description[key]}
                            onChange={(event) =>
                              updateDescription(key, event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                      ))}

                      {MONEY_FIELDS.map((key) => (
                        <Field key={key} title={fieldLabel(key, t)}>
                          <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={description[key]}
                            onChange={(event) =>
                              updateDescription(key, event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                      ))}

                      <Field title={t("projectWizard.currency")}>
                        <input
                          required
                          minLength={3}
                          maxLength={3}
                          pattern="[A-Za-z]{3}"
                          value={description.currency}
                          onChange={(event) =>
                            updateDescription(
                              "currency",
                              event.target.value.toUpperCase(),
                            )
                          }
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className={buttonClass}
                    >
                      {action === "description"
                        ? t("projectWizard.savingInfo")
                        : t("projectWizard.saveInfo")}
                    </button>
                  </fieldset>
                </form>
              </section>
            )}

            {showDraft && currentStep === "EXPERT_INVITATION" && (
              <section className={sectionClass}>
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.step4Title")}
                </h2>

                {expertsLoading && (
                  <p role="status" className="mt-4 text-slate-600">
                    {t("projectWizard.loadingExperts")}
                  </p>
                )}

                {expertError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl bg-red-50 p-4 text-red-800"
                  >
                    <p>{expertError}</p>

                    <button
                      type="button"
                      disabled={busy || expertsLoading}
                      onClick={() => {
                        if (experts.length && expertNext) {
                          void loadMoreExperts();
                        } else {
                          setExpertRetry((value) => value + 1);
                        }
                      }}
                      className="mt-3 font-semibold underline"
                    >
                      {t("projectWizard.retryExperts")}
                    </button>
                  </div>
                )}

                {!expertsLoading && !expertError && experts.length === 0 && (
                  <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                    <p>{t("projectWizard.noExperts")}</p>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setExpertRetry((value) => value + 1)}
                      className="mt-3 font-semibold underline"
                    >
                      {t("projectWizard.checkExperts")}
                    </button>
                  </div>
                )}

                {experts.length > 0 && (
                  <form
                    className="mt-5 space-y-5"
                    onSubmit={(event) => void inviteExpert(event)}
                  >
                    <Field title={t("projectWizard.approvedExpert")}>
                      <select
                        required
                        value={expertId}
                        disabled={busy}
                        onChange={(event) => {
                          setExpertId(event.target.value);
                          clearMessages();
                        }}
                        className={inputClass}
                      >
                        <option value="">{t("projectWizard.chooseExpert")}</option>

                        {experts.map((item) => (
                          <option key={item.user_id} value={item.user_id}>
                            {item.first_name} {item.last_name}
                            {" — "}
                            {item.domain_label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field title={t("projectWizard.invitationMessage")}>
                      <textarea
                        rows={4}
                        maxLength={5000}
                        value={invitationMessage}
                        disabled={busy}
                        onChange={(event) => {
                          setInvitationMessage(event.target.value);
                          clearMessages();
                        }}
                        className={inputClass}
                      />
                    </Field>

                    <button
                      type="submit"
                      disabled={busy || !expertId}
                      className={buttonClass}
                    >
                      {action === "invitation"
                        ? t("projectWizard.sendingInvitation")
                        : t("projectWizard.sendInvitation")}
                    </button>
                  </form>
                )}

                {expertNext && (
                  <button
                    type="button"
                    disabled={busy || expertsLoading}
                    onClick={() => void loadMoreExperts()}
                    className="mt-4 font-semibold text-emerald-800 underline"
                  >
                    {expertsLoading
                      ? t("app.loading")
                      : t("projectWizard.loadMoreExperts")}
                  </button>
                )}
              </section>
            )}

            {showDraft && currentStep === "PERSONAL_INFORMATION" && (
              <section className="mt-6">
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.step5Title")}
                </h2>

                <ApplicantInformationForm onProfileSaved={handleProfileSaved} />

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void refreshWorkflowStatus()}
                  className={`${secondaryButtonClass} mt-4`}
                >
                  {action === "refresh"
                    ? t("projectWizard.refreshingStatus")
                    : t("projectWizard.refreshStatus")}
                </button>

                <p className="mt-2 text-sm text-slate-600">
                  {t("projectWizard.step5Body")}
                </p>
              </section>
            )}

            {showDraft && workflow && currentStep === "REVIEW_AND_POST" && (
              <section className={sectionClass}>
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.step6Title")}
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {t("projectWizard.step6Body")}
                </p>

                {!review ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void loadReview()}
                    className={`${secondaryButtonClass} mt-4`}
                  >
                    {action === "review"
                      ? t("projectWizard.loadingSaved")
                      : t("projectWizard.openReview")}
                  </button>
                ) : (
                  <ProjectReviewEditor
                    key={workflow.project_id}
                    projectId={workflow.project_id}
                    review={review}
                    domains={PROJECT_DOMAINS.map((value) => ({
                      value,
                      label: domainLabel(value, t),
                    }))}
                    onSaved={handleReviewSaved}
                    onPost={() => void postProject()}
                    posting={busy}
                  />
                )}
              </section>
            )}

            {showWorkflow && workflow?.status === "POSTED" && (
              <section className="mt-6 rounded-3xl bg-emerald-100 p-6">
                <h2 className="text-xl font-semibold text-emerald-950">
                  {t("projectWizard.postedTitle")}
                </h2>

                <p className="mt-3 text-sm text-emerald-900">
                  {t("projectWizard.postedBody", {
                    reference: workflow.reference_number,
                  })}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/account/projects" className={buttonClass}>
                    {t("projectWizard.returnProjects")}
                  </Link>

                  <Link
                    href={`/projects/${workflow.project_id}/document`}
                    className={secondaryButtonClass}
                  >
                    {t("projectWizard.readProposal")}
                  </Link>
                </div>
              </section>
            )}

            {showWorkflow &&
              workflow &&
              workflow.status !== "DRAFT" &&
              workflow.status !== "POSTED" && (
                <section className={sectionClass}>
                  <h2 className="text-xl font-semibold text-emerald-950">
                    {t("projectWizard.noDraftTitle")}
                  </h2>

                  <p role="status" className="mt-3 text-slate-700">
                    {t("projectWizard.noDraftBody", {
                      status: statusLabel(workflow.status, t),
                    })}
                  </p>

                  <Link
                    href="/account/projects"
                    className={`${buttonClass} mt-5`}
                  >
                    {t("projectWizard.returnProjects")}
                  </Link>
                </section>
              )}

            {showDraft && currentStep === "PDF_UPLOAD" && (
              <section className={sectionClass}>
                <p role="alert" className="text-amber-900">
                  {t("projectWizard.noProposal")}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
