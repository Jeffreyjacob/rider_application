import { Worker } from "bullmq";
import { emailProcesser } from "../processors/email";
import { bullmqconnections } from "../../config/bullmq";
import { logger } from "../../config/logger";

export const createEmailWorker = (): Worker => {
  const worker = new Worker("email", emailProcesser, {
    connection: bullmqconnections,
    concurrency: 3,
  });

  worker.on("ready", () => {
    logger.info("email worker is ready");
  });

  worker.on("completed", (job) => {
    logger.info(`email with ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    logger.warn(
      { err, jobId: job?.id },
      `email ${job?.data.email} failed to sent `
    );
  });

  worker.on("error", (err) => {
    logger.warn({ err }, "email worker failed");
  });

  return worker;
};
