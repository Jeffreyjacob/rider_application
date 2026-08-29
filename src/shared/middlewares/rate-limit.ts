import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { env } from "../../config/env";

/**
 * 🧠 RATE LIMITING — THE CONCEPT
 *
 * Imagine a nightclub with a bouncer:
 *
 * - Global rate limit: "Each person can enter 100 times per minute"
 * - Auth rate limit: "Each person can try to enter 5 times per minute"
 * - Login rate limit: "Each person can try to enter 3 times per minute"
 *
 * Without rate limiting, an attacker could:
 * - Send 1 million requests/second → crash your server (DoS attack)
 * - Try 10,000 passwords/second → brute-force accounts
 * - Spam ride requests → flood your database
 *
 * Rate limiting is your FIRST LINE OF DEFENSE.
 */

// ─── Redis Store Factory ─────────────────────────────────────
// 🧠 WHY REDIS?
//
// In-memory rate limiting (using a JavaScript Map) only tracks
// requests for ONE server process.
//
// Without Redis:
//   Server 1: { user123: 50 requests }  ← doesn't know about Server 2
//   Server 2: { user123: 50 requests }  ← doesn't know about Server 1
//   Total: 100 requests (but limit is 60!)
//
// With Redis:
//   Redis: { user123: 100 requests }  ← ALL servers share this
//
// This is CRITICAL for production where you run multiple server
// instances behind a load balancer.
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

// ─── Global Rate Limit ───────────────────────────────────────
// 🧠 THIS IS THE BOUNCER AT THE FRONT DOOR
//
// Applies to ALL requests. Default: 100 requests per minute.
//
// When this triggers, the client gets:
//   429 Too Many Requests
//   Retry-After: 45  (seconds to wait)
//
// This prevents general abuse and protects your server
// from being overwhelmed by any single IP.
export const globalRateLimit = rateLimit({
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

// ─── Auth Rate Limit ─────────────────────────────────────────
// 🧠 THIS IS THE BOUNCER AT THE VIP ENTRANCE
//
// Stricter than global: 15 requests per 15 minutes.
// Applies to login, register, refresh token endpoints.
//
// Why stricter? These endpoints:
// 1. Are expensive (hash passwords, issue tokens)
// 2. Are attack targets (brute force, credential stuffing)
// 3. Have side effects (creating accounts, issuing tokens)
//
// If someone tries to brute-force a password,
// they'd need to pass through this limiter too.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("auth"),
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many authentication attempts. Please try again in 15 minutes.",
    },
  },
});

// ─── Login Rate Limit ────────────────────────────────────────
// 🧠 THIS IS THE BOUNCER CHECKING IDS AT THE DOOR
//
// Even stricter: 5 attempts per 15 minutes per IP.
//
// Why? Login is the #1 attack vector:
// - Brute force: try every password combination
// - Credential stuffing: try leaked passwords from other breaches
// - Password spraying: try common passwords against many accounts
//
// 5 attempts per 15 minutes means:
// - Legitimate user: types password wrong 3 times, then remembers → OK
// - Attacker: gets 5 tries, then blocked for 15 minutes → too slow
//
// In production, you'd also implement:
// - Account lockout (after 5 failed attempts, lock for 30 minutes)
// - CAPTCHA after 3 failed attempts
// - Alert security team after 10 failed attempts
export const loginRateLimit = rateLimit({
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

// ─── Ride Request Rate Limit ─────────────────────────────────
// 🧠 THIS IS THE BOUNCER AT THE RIDE COUNTER
//
// Prevents riders from spamming ride requests.
// 3 requests per 5 minutes.
//
// Why? In a real dispatch system:
// 1. Each request triggers geospatial queries (expensive)
// 2. Each request notifies multiple drivers via WebSocket
// 3. Each request creates a BullMQ job
//
// A rider spamming requests would:
// - Overload PostGIS with queries
// - Flood driver phones with notifications
// - Fill the job queue with duplicate requests
export const rideRequestRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 ride requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("ride-request"),
  keyGenerator: (req) => {
    // Rate limit by user ID, not IP
    // Because riders can use multiple devices
    return (req as any).userId || req.ip;
  },
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many ride requests. Please wait before requesting another ride.",
    },
  },
});
