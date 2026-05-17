/**
 * OAuth error hierarchy.
 *
 * Maps to HTTP status codes used by the callback handler. Frontend
 * can branch on `code` to render specific error UIs (expired state,
 * mismatched user, provider refusal).
 */

export const OAUTH_ERROR_CODES = [
  "OAUTH_PROVIDER_NOT_CONFIGURED",
  "OAUTH_STATE_INVALID",
  "OAUTH_STATE_EXPIRED",
  "OAUTH_STATE_USER_MISMATCH",
  "OAUTH_EXCHANGE_FAILED",
  "OAUTH_REFRESH_FAILED",
  "OAUTH_REVOKE_FAILED",
  "OAUTH_VALIDATION_FAILED",
  "OAUTH_UNSUPPORTED_PROVIDER",
] as const;

export type OAuthErrorCode = (typeof OAUTH_ERROR_CODES)[number];

export abstract class OAuthError extends Error {
  abstract readonly code: OAuthErrorCode;
  abstract readonly httpStatus: number;
  readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }

  toApiPayload() {
    return { error: this.message, code: this.code, details: this.details };
  }
}

export class OAuthProviderNotConfiguredError extends OAuthError {
  readonly code = "OAUTH_PROVIDER_NOT_CONFIGURED" as const;
  readonly httpStatus = 503;
}

export class OAuthStateInvalidError extends OAuthError {
  readonly code: OAuthErrorCode = "OAUTH_STATE_INVALID";
  readonly httpStatus: number = 400;
}
export class OAuthStateExpiredError extends OAuthStateInvalidError {
  override readonly code: OAuthErrorCode = "OAUTH_STATE_EXPIRED";
  override readonly httpStatus: number = 410;
}
export class OAuthStateUserMismatchError extends OAuthStateInvalidError {
  override readonly code: OAuthErrorCode = "OAUTH_STATE_USER_MISMATCH";
  override readonly httpStatus: number = 403;
}

export class OAuthExchangeFailedError extends OAuthError {
  readonly code = "OAUTH_EXCHANGE_FAILED" as const;
  readonly httpStatus = 502;
}
export class OAuthRefreshFailedError extends OAuthError {
  readonly code = "OAUTH_REFRESH_FAILED" as const;
  readonly httpStatus = 502;
}
export class OAuthRevokeFailedError extends OAuthError {
  readonly code = "OAUTH_REVOKE_FAILED" as const;
  readonly httpStatus = 502;
}
export class OAuthValidationFailedError extends OAuthError {
  readonly code = "OAUTH_VALIDATION_FAILED" as const;
  readonly httpStatus = 401;
}
export class OAuthUnsupportedProviderError extends OAuthError {
  readonly code = "OAUTH_UNSUPPORTED_PROVIDER" as const;
  readonly httpStatus = 404;
}

export function isOAuthError(value: unknown): value is OAuthError {
  return value instanceof OAuthError;
}
