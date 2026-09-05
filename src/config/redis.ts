import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

const retryStrategy = (times: number): number | null => {
  if (times > 20) {
    logger.fatal("Redis: max reconnection attempts reached. Giving up.");
    return null;
  }

  const delay = Math.min(times * 100, 2000);

  logger.warn({ attempt: times, delayMs: delay }, "Redis: reconnecting...");

  return delay;
};

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  commandTimeout: 5000,
  retryStrategy,
  enableOfflineQueue: true,
  keepAlive: 30000,
  connectTimeout: 5000,
});

redis.on("connect", () => {
  logger.info("Redis: connected");
});

redis.on("ready", () => {
  logger.info("Redis: ready to accept commands");
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis: connection error");
});

redis.on("close", () => {
  logger.warn("Redis: connection closed");
});

redis.on("reconnecting", (delay: number) => {
  logger.info({ delayMs: delay }, "Redis: reconnecting");
});

const disconnectRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info("Redis: disconnected gracefully");
  } catch (err) {
    logger.error({ err }, "Redis: error during disconnect");
  }
};

export { redis, disconnectRedis };
