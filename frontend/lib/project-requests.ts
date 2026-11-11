import { authenticatedFetch } from "@/lib/session";
import { translate } from "@/lib/i18n";

export class ProjectRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ProjectRequestError";
  }
}

export function projectErrorText(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(projectErrorText).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const message = projectErrorText(item);
        if (!message) return "";

        return key === "detail"
          ? message
          : `${key.replaceAll("_", " ")}: ${message}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

export async function projectRequest<T>(
  path: string,
  method: "GET" | "PATCH" | "POST" = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;

  try {
    response = await authenticatedFetch(path, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (cause) {
    const status =
      cause && typeof cause === "object" && "status" in cause
        ? Number(cause.status)
        : 0;

    if (status === 401) {
      throw new ProjectRequestError(
        translate("clientErrors.projectSessionExpired"),
        401,
      );
    }

    throw new ProjectRequestError(translate("clientErrors.projectNetwork"), status);
  }

  const payload: unknown = await response.json().catch(() => undefined);
  const detail = projectErrorText(payload);

  if (!response.ok) {
    let message = detail || translate("clientErrors.projectServerError");

    if (response.status === 401) {
      message = translate("clientErrors.projectSessionExpiredShort");
    } else if (response.status === 403) {
      message = detail || translate("clientErrors.projectPermission");
    } else if (response.status === 404) {
      message = translate("clientErrors.projectNotFound");
    } else if (response.status === 409) {
      message = detail || translate("clientErrors.projectNotReady");
    } else if (response.status >= 500) {
      message = translate("clientErrors.projectServerFailure");
    }

    throw new ProjectRequestError(
      `${message} (HTTP ${response.status})`,
      response.status,
    );
  }

  if (payload === undefined) {
    throw new ProjectRequestError(
      translate("clientErrors.projectUnreadable"),
      response.status,
    );
  }

  return payload as T;
}
