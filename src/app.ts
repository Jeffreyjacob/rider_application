import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { globalRateLimit } from "./shared/middlewares/rate-limit";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { logger } from "./config/logger";
import { nanoid } from "nanoid";
import { errorHandler } from "./shared/middlewares/error-handler";
import { NotFoundMiddleware } from "./shared/middlewares/not-found-handler";
import authRoutes from "./modules/authentication/auth.routes";

class App {
  public readonly express: Application;
  constructor() {
    this.express = express();
  }

  setSecurutyMiddlewares() {
    this.express.use(helmet());
    this.express.use(
      cors({
        origin:
          env.NODE_ENV === "production" ? env.ALLOWED_ORIGIN.split(",") : "*",
        methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"],
        allowedHeaders: ["Auhorization", "Content-Type"],
      })
    );
    this.express.use(globalRateLimit);
    this.express.use(compression());
  }

  setParsingMiddlewares() {
    this.express.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.express.set("trust proxy", 1);
    this.express.use(cookieParser());
  }

  setLoggingMiddlewares() {
    if (env.NODE_ENV === "development") {
      this.express.use(morgan("dev"));
    } else if (env.NODE_ENV === "production") {
      this.express.use(
        morgan("combined", {
          stream: {
            write: (message) => logger.info(message.trim()),
          },
        })
      );
    }

    this.express.use((req, res, next) => {
      const requestId = (req.headers["x-request-id"] as string) ?? nanoid();
      req.headers["x-request-id"] = requestId;
      req.requestId = requestId;
      req.log = logger.child({ requestId });
      res.setHeader("x-request-id", requestId);
      next();
    });
  }

  setRouteMiddleware() {
    this.express.use("/api/v1/auth", authRoutes);
  }
  setErrorMiddleware() {
    this.express.use(NotFoundMiddleware);
    this.express.use(errorHandler);
  }
}

export const app = new App().express;
