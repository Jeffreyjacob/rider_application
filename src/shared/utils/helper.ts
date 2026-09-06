import crypto from "crypto";
import { redis } from "../../config/redis";
import { env } from "../../config/env";

export function generateOtp(): string {
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString();
}

export function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function ensureIdempotency(jobId: string, workertype: string) {
  const key = `processed:${workertype}:${jobId}`;
  const acquired = await redis.set(key, "1", "EX", 86400);
  return acquired === "OK";
}

export async function clearIdempotency(jobId: string, workerType: string) {
  const key = `processed:${workerType}:${jobId}`;
  await redis.del(key);
}

const OTP_lOCKOUT_LIMIT = 5;
const OTP_LOCKOUT_WINDOW_SECOND = 600;

export async function recordFailedOtpAttempt(userId: string): Promise<void> {
  const key = `otp_lockout:${userId}`;
  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, OTP_LOCKOUT_WINDOW_SECOND);
  }
}

export async function isOtpLocked(userId: string): Promise<boolean> {
  const key = `otp_lockout:${userId}`;
  const attempts = await redis.get(key);
  return attempts !== null && Number(attempts) >= OTP_lOCKOUT_LIMIT;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dlng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const MINIMUM_RIDE_DISTANCE_KM = 0.3;

export function estimateRide(distanceKm: number): {
  estimatedPriceKobo: number;
  estimatedDurationMin: number;
} {
  const estimatedDurationMin = Math.ceil(
    (distanceKm / env.AVERAGE_SPEED_KMH) * 60
  );

  const estimatedPriceKobo =
    env.BASE_FAKE_KOBO +
    Math.round(distanceKm * env.PER_KM_RATE_KOBO) +
    Math.round(estimatedDurationMin * env.PER_MINUTE_RATE_KOBO);

  return { estimatedDurationMin, estimatedPriceKobo };
}

export function calculateFinalPrice(
  distanceKm: number,
  actualDurationMin: number
): number {
  return (
    env.BASE_FAKE_KOBO +
    Math.round(distanceKm * env.PER_KM_RATE_KOBO) +
    Math.round(actualDurationMin * env.PER_MINUTE_RATE_KOBO)
  );
}
