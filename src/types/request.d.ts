import { Logger } from "pino";
import { Driver } from "../generated/prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
    log?: Logger;
    user?: {
      userId: string;
      email: string;
    };
    driver: Driver;
  }
}
