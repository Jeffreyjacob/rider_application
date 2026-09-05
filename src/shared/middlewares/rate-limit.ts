import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { Request } from "express";

function createStore(prefix: string): RedisStore {
  try {
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        const result = await redis.call(args[0], ...args.slice(1));
        return result as string;
      },
      prefix: `ratelimit:${prefix}:`,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create Redis rate limit store");
    throw err;
  }
}

export const globalRateLimit = () =>
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS, // 60 seconds (from .env)
    max: env.RATE_LIMIT_MAX, // 100 requests (from .env)
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Don't use X-RateLimit-* headers
    store: createStore("global"),
    message: {
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later.",
      },
    },
    // Skip rate limiting for health checks (used by load balancers)
    skip: (req) => req.path === "/health",
  });

export const authRateLimit = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore("auth"),
    message: {
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message:
          "Too many authentication attempts. Please try again in 15 minutes.",
      },
    },
  });

export const loginRateLimit = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore("login"),
    message: {
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many login attempts. Please try again in 15 minutes.",
      },
    },
  });

export const rideRequestRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 ride requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("ride-request"),
  keyGenerator: (req: Request) => {
    const userId = req.user?.userId!;
    if (userId) return `user:${userId}`;
    return ipKeyGenerator(req.ip!);
  },
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message:
        "Too many ride requests. Please wait before requesting another ride.",
    },
  },
});
