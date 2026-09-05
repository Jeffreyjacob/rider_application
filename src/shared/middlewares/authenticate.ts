import { NextFunction, Request, Response } from "express";
import { NotFoundError, UnauthorizedError } from "../errors";
import { verifyAccessToken } from "../utils/tokenUtils";
import { driverRepo, userRepo } from "../../container";
import { redis } from "../../config/redis";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const BearerToken = req.headers["authorization"];

    if (!BearerToken?.startsWith("Bearer ")) {
      throw new UnauthorizedError("unable to find token");
    }

    const token = BearerToken.split(" ")[1];
    const payload = verifyAccessToken(token);

    // blacklist token
    const key = `BlacklistToken:${token}`;
    const result = await redis.get(key);

    if (result) throw new UnauthorizedError("token has been blacklisted");

    const user = await userRepo.findUserById(payload.userId);
    if (!user) throw new NotFoundError("unable to find user");

    req.user = {
      userId: user.id,
      email: user.email,
    };
    next();
  } catch (error: any) {
    next(error);
  }
};

export const requireDriver = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) throw new UnauthorizedError("you must be login");
  try {
    const user = await userRepo.findUserById(req.user.userId);
    if (!user) throw new NotFoundError("user not found");

    const driver = await driverRepo.findDriverByUserId(user.id);
    if (!driver) throw new UnauthorizedError("user is not driver");
    req.driver = driver;
    next();
  } catch (error: any) {
    next(error);
  }
};
