import { Logger } from "pino";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
    log?: Logger;
    user?: {
      userId: string;
      email: string;
    };
    role: "driver" | "rider";
  }
}
