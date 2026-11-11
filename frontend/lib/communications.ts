import { authenticatedFetch } from "@/lib/session";
import { translate } from "@/lib/i18n";

export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Notice = {
  id: number;
  type: string;
  title: string;
  message: string;
  target_type: string;
  target_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type ExpertInvitation = {
  id: number;
  project_id: number;
  project_title: string;
  project_reference: string;
  expert_user_id: number;
  expert_name: string;
  invited_by_user_id: number;
  applicant_name: string;
  message: string;
  status: string;
  sent_at: string;
  expires_at: string;
  responded_at: string | null;
  cancelled_at: string | null;
  access_revoked_at: string | null;
  access_revocation_reason: string;
};

export type Conversation = {
  id: number;
  invitation_id: number;
  project_id: number;
  project_title: string;
  project_reference: string;
  invitation_status: string;
  subject: string;
  other_participant: {
    id: number;
    name: string;
    project_role: string;
  };
  unread_count: number;
  inbox_state: {
    archived_at: string | null;
    hidden_at: string | null;
  };
  is_closed: boolean;
  closed_at: string | null;
  closure_reason: string;
  created_at: string;
  updated_at: string;
};

export type PrivateMessage = {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  recipient_user_id: number;
  subject: string;
  content: string;
  client_message_id: string;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  is_mine: boolean;
};

function describeError(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(describeError).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const message = describeError(item);
        return key === "detail"
          ? message
          : `${key.replace(/_/g, " ")}: ${message}`;
      })
      .join(" ");
  }

  return "";
}

/**
 * Pagination may return an absolute backend URL.
 * Keep authenticated requests on the frontend's same-origin /api/
 * rewrite rather than forwarding tokens to an arbitrary host.
 */
function localCommunicationPath(path: string): string {
  const parsed = new URL(path, "http://local.invalid");

  if (
    !/^\/api\/(?:notifications|project-expert-invitations|messaging)(?:\/|$)/.test(
      parsed.pathname,
    )
  ) {
    throw new Error("Unsupported communications endpoint.");
  }

  return `${parsed.pathname}${parsed.search}`;
}

export async function communicationRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await authenticatedFetch(localCommunicationPath(path), {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(
      describeError(payload) || translate("clientErrors.requestIncomplete"),
    );
  }

  return payload as T;
}
