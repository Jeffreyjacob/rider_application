import crypto from "crypto";
import { redis } from "../../config/redis";

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
