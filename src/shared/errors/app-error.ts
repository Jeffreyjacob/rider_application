/**
 * Base application error class.
 *
 * 🧠 WHY THIS EXISTS:
 *
 * In a real app, you need to distinguish between:
 *
 * 1. Operational errors — expected failures that you can handle gracefully
 *    - "User not found" → return 404, move on
 *    - "Invalid password" → return 401, move on
 *    - "Rate limit exceeded" → return 429, move on
 *
 * 2. Programming errors — bugs in your code
 *    - Accessing undefined property
 *    - Calling a function with wrong arguments
 *    - Database connection lost
 *
 * Operational errors = throw AppError (or its subclasses)
 * Programming errors = let them crash (or use a crash handler)
 *
 * The "isOperational" flag tells Express: "this is a known error,
 * send a clean response to the client." vs "this is a bug,
 * log everything and return a generic 500."
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace in V8 engines
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
    };
  }
}
