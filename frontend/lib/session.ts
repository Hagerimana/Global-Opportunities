/**
 * Browser session and authenticated requests.
 *
 * Inactivity here is a browser UX policy, not a server-side
 * security guarantee.
 */

import { getActiveLocale, translate } from "@/lib/i18n";

const accessTokenKey = "access_token";
const refreshTokenKey = "refresh_token";
const activityKey = "session_last_activity";

export const SESSION_IDLE_MS = 60 * 60 * 1000;
export const SESSION_WARNING_MS = 5 * 60 * 1000;
export const SESSION_CHANGED_EVENT = "go-session-changed";

export type SessionTokens = {
  access: string;
  refresh: string;
};

export class SessionError extends Error {
  constructor(
    message: string,
    public readonly status = 401,
  ) {
    super(message);
    this.name = "SessionError";
  }
}

function readValue(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function notifySessionChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
  }
}

export function readAccessToken(): string | null {
  const value = readValue(accessTokenKey);
  return value?.trim() ? value : null;
}

export function readRefreshToken(): string | null {
  const value = readValue(refreshTokenKey);
  return value?.trim() ? value : null;
}

export function readLastActivity(): number | null {
  const raw = readValue(activityKey);

  if (!raw) return null;

  const value = Number(raw);

  return Number.isFinite(value) && value > 0 ? value : null;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;

  for (const key of [accessTokenKey, refreshTokenKey, activityKey]) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Try every removal independently.
    }
  }

  notifySessionChanged();
}

export function saveSession(tokens: SessionTokens): void {
  if (typeof window === "undefined") {
    throw new Error(translate("clientErrors.storageSession"));
  }

  if (!tokens.access?.trim() || !tokens.refresh?.trim()) {
    throw new Error(translate("clientErrors.tokensMissing"));
  }

  try {
    window.sessionStorage.setItem(accessTokenKey, tokens.access);
    window.sessionStorage.setItem(refreshTokenKey, tokens.refresh);
    window.sessionStorage.setItem(activityKey, String(Date.now()));
  } catch {
    clearSession();

    throw new Error(translate("auth.errors.storage"));
  }

  notifySessionChanged();
}

export function isSignedIn(): boolean {
  return readAccessToken() !== null;
}

export function sessionHasExpired(): boolean {
  const lastActivity = readLastActivity();

  return lastActivity === null || Date.now() - lastActivity >= SESSION_IDLE_MS;
}

/**
 * Record actual interaction, not API calls or token refreshes.
 * An already expired session must not be revived by interaction.
 */
export function recordSessionActivity(): boolean {
  if (!readAccessToken() || !readRefreshToken()) return false;

  if (sessionHasExpired()) return false;

  try {
    window.sessionStorage.setItem(activityKey, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

function requireCurrentSession() {
  if (!readAccessToken() || !readRefreshToken()) {
    throw new SessionError(translate("clientErrors.loginRequired"));
  }

  if (sessionHasExpired()) {
    clearSession();

    throw new SessionError(translate("clientErrors.idleExpired"));
  }
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  requireCurrentSession();

  if (refreshInFlight) return refreshInFlight;

  const originalRefresh = readRefreshToken();

  const operation = (async () => {
    let response: Response;

    try {
      response = await fetch("/api/auth/refresh/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getActiveLocale(),
        },
        body: JSON.stringify({
          refresh: originalRefresh,
        }),
        cache: "no-store",
      });
    } catch {
      throw new SessionError(translate("clientErrors.renewUnreachable"), 0);
    }

    const payload = await response.json().catch(() => null);

    // Do not restore a session that was cleared or replaced while
    // this request was in flight.
    if (readRefreshToken() !== originalRefresh) {
      throw new SessionError(translate("clientErrors.sessionChanged"));
    }

    requireCurrentSession();

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        clearSession();

        throw new SessionError(translate("clientErrors.sessionExpired"));
      }

      throw new SessionError(
        translate("clientErrors.renewFailed"),
        response.status,
      );
    }

    if (typeof payload?.access !== "string" || !payload.access) {
      throw new SessionError(translate("clientErrors.renewInvalid"), 502);
    }

    try {
      window.sessionStorage.setItem(accessTokenKey, payload.access);

      // Supports a replacement refresh token if rotation is enabled
      // later. Renewal does not reset the inactivity timestamp.
      if (typeof payload.refresh === "string" && payload.refresh) {
        window.sessionStorage.setItem(refreshTokenKey, payload.refresh);
      }
    } catch {
      clearSession();

      throw new SessionError(translate("clientErrors.renewStorage"));
    }

    return payload.access as string;
  })();

  refreshInFlight = operation;

  try {
    return await operation;
  } finally {
    if (refreshInFlight === operation) {
      refreshInFlight = null;
    }
  }
}

/**
 * Send an authenticated request.
 *
 * Retry once after a 401 using a renewed access token.
 * API requests themselves do not count as user activity.
 *
 * Use replayable bodies such as JSON strings or FormData,
 * not a consumed ReadableStream.
 */
export async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  requireCurrentSession();

  const originalAccess = readAccessToken()!;

  function send(access: string) {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${access}`);
    headers.set("Accept-Language", getActiveLocale());

    return fetch(url, {
      ...init,
      headers,
    });
  }

  const response = await send(originalAccess);

  if (response.status !== 401) return response;

  requireCurrentSession();

  // Another concurrent request might already have renewed it.
  const currentAccess = readAccessToken();

  const renewedAccess =
    currentAccess && currentAccess !== originalAccess
      ? currentAccess
      : await refreshAccessToken();

  requireCurrentSession();

  return send(renewedAccess);
}

export type SignOutResult = { ok: true } | { ok: false; message: string };

export async function signOut(): Promise<SignOutResult> {
  const refresh = readRefreshToken();

  if (!refresh) {
    return {
      ok: false,
      message: translate("clientErrors.noRefreshToken"),
    };
  }

  try {
    const response = await authenticatedFetch("/api/auth/logout/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: translate("clientErrors.logoutFailed"),
      };
    }
  } catch (cause) {
    return {
      ok: false,
      message:
        cause instanceof Error
          ? cause.message
          : translate("clientErrors.logoutFailedShort"),
    };
  }

  clearSession();
  window.location.assign("/auth/login");

  return { ok: true };
}

export function avatarInitials(): string {
  return "GO";
}
