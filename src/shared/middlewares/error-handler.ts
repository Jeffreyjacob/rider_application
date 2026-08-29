import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { logger } from "../../config/logger";
import jwt from "jsonwebtoken";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ─── 1. Our custom AppErrors ─────────────────────────────
  // These are expected, operational errors. We know the status code.
  if (err instanceof AppError) {
    logger.warn(
      {
        err: err.toJSON(),
        path: req.path,
        method: req.method,
      },
      err.message
    );

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // ─── 2. Zod validation errors ────────────────────────────
  // Happens when request body/query/params fail schema validation.
  // We reshape Zod's format into our standard error format.
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    logger.warn(
      {
        validationErrors: formattedErrors,
        path: req.path,
        method: req.method,
      },
      "Validation failed"
    );

    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: formattedErrors,
      },
    });
    return;
  }

  // ─── 3. Prisma database errors ───────────────────────────
  // Prisma throws specific error types for DB issues.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: Record not found (e.g., findUnique returned null but we needed it)
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Record not found",
        },
      });
      return;
    }

    // P2002: Unique constraint violation (e.g., duplicate email)
    if (err.code === "P2002") {
      const field = (err.meta?.target as string[])?.join(", ") || "field";
      res.status(409).json({
        success: false,
        error: {
          code: "CONFLICT",
          message: `A record with this ${field} already exists`,
        },
      });
      return;
    }

    if (err instanceof jwt.TokenExpiredError) {
      logger.warn({
        err: err,
        path: req.path,
        method: req.method,
      });

      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: err.message,
        },
      });
    }

    if (err instanceof jwt.JsonWebTokenError) {
      logger.warn({
        err,
        path: req.path,
        method: req.method,
      });

      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: err.message,
        },
      });
    }
    // Any other Prisma error
    logger.error({ prismaCode: err.code, err, path: req.path }, "Prisma error");
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "A database error occurred",
      },
    });
    return;
  }

  // ─── 4. Unknown errors — programming bugs ────────────────
  // We don't want to leak internal error messages to the client.
  // Log everything for debugging, return generic message.
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      requestId: req.headers["x-request-id"],
    },
    "Unhandled error"
  );

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "development"
          ? err.message // Show real errors in dev
          : "An unexpected error occurred", // Hide details in production
    },
  });
}
