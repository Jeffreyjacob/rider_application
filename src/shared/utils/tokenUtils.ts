import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import crypto from "crypto";
import { Response } from "express";

export interface ITokenPayload {
  userId: string;
  email: string;
}

export const generateAccessToken = (user: ITokenPayload) => {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
    },
    env.JWT_SECRET as string,
    {
      expiresIn: env.JWT_EXPIRES_IN as string,
      issuer: "rider_api",
      audience: "rider-client",
    } as jwt.SignOptions
  );
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: "rider_api",
    audience: "rider-client",
  }) as ITokenPayload;
};

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto
    .createHmac("sha256", env.REFRESH_TOKEN_SECRET)
    .update(token)
    .digest("hex");
}

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie(env.REFRESH_TOKEN_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(env.REFRESH_TOKEN_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
