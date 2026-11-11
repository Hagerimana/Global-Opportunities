/**
 * Typed HTTP client for the Django REST API.
 *
 * Requests use relative /api/ URLs. The Next.js rewrite forwards
 * them to Django.
 */

import { authenticatedFetch, SessionError } from "@/lib/session";
import { getActiveLocale, translate } from "@/lib/i18n";
export type AccountType = "PERSONAL" | "ORGANIZATION";

export type OrganizationType =
  | "GOVERNMENT"
  | "PUBLIC_INSTITUTION"
  | "PRIVATE_COMPANY"
  | "NGO"
  | "NON_PROFIT"
  | "ASSOCIATION"
  | "COOPERATIVE"
  | "FOUNDATION"
  | "FINANCIAL_INSTITUTION"
  | "EDUCATIONAL_INSTITUTION"
  | "RESEARCH_INSTITUTION"
  | "OTHER";

export type OrganizationRegistrationData = {
  name: string;
  organization_type: OrganizationType;
  registration_number: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  commune: string;
  description?: string;
  website?: string;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type RequestBody = {
  [key: string]: JsonValue;
};

type ApiErrorPayload = Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Find the first non-empty message in a DRF error response. */
function firstMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() ? value : undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }

    return undefined;
  }

  if (value !== null && typeof value === "object") {
    const payload = value as ApiErrorPayload;

    const detail = firstMessage(payload.detail);
    if (detail) return detail;

    for (const [key, item] of Object.entries(payload)) {
      if (key === "detail") continue;

      const message = firstMessage(item);
      if (message) return message;
    }
  }

  return undefined;
}

/** POST JSON and return the successful response. */
async function request<T>(
  path: string,
  body: RequestBody,
  accessToken?: string,
): Promise<T> {
  let response: Response;

  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": getActiveLocale(),
    },
    body: JSON.stringify(body),
  };

  try {
    response = accessToken
      ? await authenticatedFetch(`/api/${path}`, init)
      : await fetch(`/api/${path}`, init);
  } catch (cause) {
    if (cause instanceof SessionError) {
      throw new ApiError(cause.message, cause.status);
    }

    throw new ApiError(translate("clientErrors.network"), 0);
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(
      firstMessage(payload) ?? translate("clientErrors.requestFailed"),
      response.status,
    );
  }

  return payload as T;
}

export type LoginResponse = {
  access: string;
  refresh: string;
};

export type RegisterResponse = {
  pending_id: number;
  email: string;
  account_type: AccountType;
  message: string;
};

export type VerifyEmailResponse = {
  message: string;
  email: string;
  account_type: AccountType;
};

export type ResendVerificationCodeResponse = {
  message: string;
  pending_id: number;
  email: string;
};

export type LogoutResponse = {
  message: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export type RequestPasswordResetResponse = {
  message: string;
  email: string;
};

export type ResetPasswordResponse = {
  message: string;
  email: string;
};

/** Exchange credentials for access and refresh tokens. */
export function login(email: string, password: string) {
  return request<LoginResponse>("auth/login/", {
    email: email.trim().toLowerCase(),
    password,
  });
}

/** Start a personal registration. */
export function register(
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  password_confirmation: string,
) {
  return request<RegisterResponse>("auth/register/", {
    account_type: "PERSONAL",
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email.trim().toLowerCase(),
    password,
    password_confirmation,
  });
}

/** Start an organization registration without personal names. */
export function registerOrganization(
  email: string,
  password: string,
  password_confirmation: string,
  organization: OrganizationRegistrationData,
) {
  return request<RegisterResponse>("auth/register/", {
    account_type: "ORGANIZATION",
    email: email.trim().toLowerCase(),
    password,
    password_confirmation,
    organization: {
      name: organization.name.trim(),
      organization_type: organization.organization_type,
      registration_number: organization.registration_number.trim(),
      email: organization.email.trim().toLowerCase(),
      phone: organization.phone.trim(),
      address: organization.address.trim(),
      province: organization.province.trim(),
      commune: organization.commune.trim(),
      description: organization.description?.trim() ?? "",
      website: organization.website?.trim() ?? "",
    },
  });
}

/** Preserve leading zeroes by keeping the code as a string. */
export function verifyEmail(pending_id: number, code: string) {
  return request<VerifyEmailResponse>("auth/verify-email/", {
    pending_id,
    code: code.trim(),
  });
}

export function resendVerificationCode(pending_id: number) {
  return request<ResendVerificationCodeResponse>("auth/resend-code/", {
    pending_id,
  });
}

export function logout(accessToken: string, refreshToken: string) {
  return request<LogoutResponse>(
    "auth/logout/",
    { refresh: refreshToken },
    accessToken,
  );
}

export function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
  newPasswordConfirmation: string,
) {
  return request<ChangePasswordResponse>(
    "auth/password/change/",
    {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    },
    accessToken,
  );
}

export function requestPasswordReset(email: string) {
  return request<RequestPasswordResetResponse>("auth/password/reset/request/", {
    email: email.trim().toLowerCase(),
  });
}

export function resetPassword(
  email: string,
  code: string,
  newPassword: string,
  newPasswordConfirmation: string,
) {
  return request<ResetPasswordResponse>("auth/password/reset/confirm/", {
    email: email.trim().toLowerCase(),
    code: code.trim(),
    new_password: newPassword,
    new_password_confirmation: newPasswordConfirmation,
  });
}
export type PersonalAccount = {
  id: number;
  account_type: "PERSONAL";
  email: string;
  person: {
    first_name: string;
    last_name: string;
  };
  organization: null;
};

export type OrganizationAccount = {
  id: number;
  account_type: "ORGANIZATION";
  email: string;
  person: null;
  organization: {
    id: number;
    name: string;
    organization_type: OrganizationType;
    registration_number: string;
    email: string;
    phone: string;
    address: string;
    province: string;
    commune: string;
    verification_status:
      | "PENDING"
      | "UNDER_REVIEW"
      | "VERIFIED"
      | "REJECTED"
      | "SUSPENDED";
  };
};

export type CurrentAccount = PersonalAccount | OrganizationAccount;

/** Load the authenticated account and its profile. */
export async function getCurrentAccount(
  _accessToken: string,
): Promise<CurrentAccount> {
  // Kept for compatibility with existing callers.
  // authenticatedFetch obtains the current token from the session.
  void _accessToken;

  let response: Response;

  try {
    response = await authenticatedFetch("/api/auth/me/", {
      method: "GET",
      cache: "no-store",
    });
  } catch (cause) {
    if (cause instanceof SessionError) {
      throw new ApiError(cause.message, cause.status);
    }

    throw new ApiError(translate("clientErrors.networkShort"), 0);
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(
      firstMessage(payload) ?? translate("clientErrors.accountLoad"),
      response.status,
    );
  }

  return payload as CurrentAccount;
}
