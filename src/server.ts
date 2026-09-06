import { app } from "./app";
import { prisma } from "./config/databse";
import { env } from "./config/env";
import { logger } from "./config/logger";
import http from "http";
import { disconnectRedis } from "./config/redis";

export async function startServer(): Promise<void> {
  try {
    logger.info("...starting server");
    const server = http.createServer(app);
    await prisma.$connect();
    server.listen(env.PORT, () => {
      logger.info(
        {
          Port: env.PORT,
          env: env.NODE_ENV,
          pid: process.pid,
        },
        "Server is ready"
      );
    });

    const gracefulShutdowm = (signal: string) => {
      logger.info({ signal }, "starting shut down");
      const forceExiter = setTimeout(() => {
        logger.info("shutting down with force exit");
        process.exit(1);
      }, 10_000);

      forceExiter.unref();

      server.close(async (err) => {
        try {
          if (err) {
            logger.warn({ err, pid: process.pid }, "unable to close server");
          }
          await prisma.$disconnect();
          await disconnectRedis();
          clearTimeout(forceExiter);
          logger.info("server shutdown gracefully");
          process.exit(0);
        } catch (cleanupErr: any) {
          logger.error(
            { err: cleanupErr, pid: process.pid },
            "unable to graceful shutdown server"
          );
          process.exit(1);
        }
      });
    };

    console.log(0.1 + 0.2);

    process.on("SIGTERM", () => gracefulShutdowm("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdowm("SIGINT"));
    process.on("uncaughtException", (err) => {
      logger.fatal({ err, pid: process.pid }, "uncaughtException error");
      gracefulShutdowm("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason, pid: process.pid }, "unhandledRejection Error");
      gracefulShutdowm("unhandledRejection");
    });
  } catch (error: any) {
    logger.fatal({ err: error, pid: process.pid }, "unable to start server");
    process.exit(1);
  }
}

startServer();
