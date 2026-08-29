import { AppError } from "./app-error";

// ─── 400 Bad Request ─────────────────────────────────────────
// Client sent invalid data (missing fields, wrong format, etc.)
export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: Record<string, unknown>) {
    super(message, 400, "BAD_REQUEST", true, details);
  }
}

// ─── 401 Unauthorized ────────────────────────────────────────
// Client is not authenticated (no token, expired token, etc.)
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: Record<string, unknown>) {
    super(message, 401, "UNAUTHORIZED", true, details);
  }
}

// ─── 403 Forbidden ───────────────────────────────────────────
// Client is authenticated but doesn't have permission
// e.g., a rider trying to access driver-only endpoints
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: Record<string, unknown>) {
    super(message, 403, "FORBIDDEN", true, details);
  }
}

// ─── 404 Not Found ───────────────────────────────────────────
// Resource doesn't exist
export class NotFoundError extends AppError {
  constructor(resource = "Resource", details?: Record<string, unknown>) {
    super(`${resource} not found`, 404, "NOT_FOUND", true, details);
  }
}

// ─── 409 Conflict ────────────────────────────────────────────
// State conflict — e.g., trying to accept a ride that's already taken
// 🧠 This is the error you'll use A LOT in the dispatch system
// when two drivers try to accept the same ride.
export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", true, details);
  }
}

// ─── 422 Unprocessable Entity ────────────────────────────────
// Data is valid format but can't be processed
// e.g., "Driver is not available" — the data is fine, but the
// business logic says no.
export class UnprocessableError extends AppError {
  constructor(
    message = "Unprocessable entity",
    details?: Record<string, unknown>
  ) {
    super(message, 422, "UNPROCESSABLE_ENTITY", true, details);
  }
}

// ─── 429 Too Many Requests ───────────────────────────────────
// Rate limiting — client is being too aggressive
export class TooManyRequestsError extends AppError {
  constructor(
    message = "Too many requests",
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 429, "TOO_MANY_REQUESTS", true, {
      retryAfter,
      ...details,
    });
  }
}
