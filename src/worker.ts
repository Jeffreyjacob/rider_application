import { prisma } from "./config/databse";
import { logger } from "./config/logger";
import { createEmailWorker } from "./job/workers/email";

export async function startWorker() {
  try {
    logger.info("starting worker");
    await prisma.$connect();
    const emailWorker = createEmailWorker();

    const gracefulShutdown = async (signal: string) => {
      logger.info("starting graceful shutdown...");

      const forceExiter = setTimeout(() => {
        logger.info("force shutdown");
        process.exit(1);
      }, 10_000);

      forceExiter.unref();

      try {
        await prisma.$disconnect();
        await emailWorker.close();
      } catch (error: any) {
        logger.fatal({ error }, "unable to gracefully shutdown");
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("uncaughtException", (err) => {
      logger.fatal({ err }, "uncaught exeception worker");
      gracefulShutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason }, " unhandledRejection worker");
      gracefulShutdown("unhandledRejection");
    });
  } catch (error: any) {
    logger.fatal({ error }, "Unable to start worker");
    process.exit();
  }
}
