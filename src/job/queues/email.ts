import { Queue } from "bullmq";
import { bullmqconnections } from "../../config/bullmq";

let emailQueue: Queue | null = null;

export const getEmailQueue = (): Queue => {
  if (!emailQueue) {
    emailQueue = new Queue("email", {
      connection: bullmqconnections,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    });
  }

  return emailQueue;
};
