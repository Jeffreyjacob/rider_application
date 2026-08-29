import { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../errors";

export const NotFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.originalUrl.startsWith("/admin/queues")) {
    next();
    return;
  }
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};
