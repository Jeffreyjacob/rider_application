import { ConnectionOptions } from "bullmq";
import { env } from "./env";

export const bullmqconnections: ConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
  retryStrategy(time: number) {
    return Math.min(time * 500 * Math.pow(2, time), 30000);
  },
};
