import { AuthController } from "./modules/authentication/auth.controller";
import {
  DriverRepository,
  EmailVerificationRepository,
  PasswordResetTokenRepository,
  RefreshTokenRepostory,
  UserRepository,
} from "./modules/authentication/auth.repository";
import { AuthService } from "./modules/authentication/auth.service";

export const userRepo = new UserRepository();
export const emailVerificationRepo = new EmailVerificationRepository();
export const passwordResetRepo = new PasswordResetTokenRepository();
export const refreshTokenRepo = new RefreshTokenRepostory();
export const driverRepo = new DriverRepository();

export const userService = new AuthService(
  userRepo,
  emailVerificationRepo,
  passwordResetRepo,
  refreshTokenRepo,
  driverRepo
);

export const authController = new AuthController(userService);
