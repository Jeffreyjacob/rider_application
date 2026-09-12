import { AuthController } from "./modules/authentication/auth.controller";
import {
  DriverRepository,
  EmailVerificationRepository,
  PasswordResetTokenRepository,
  RefreshTokenRepostory,
  UserRepository,
} from "./modules/authentication/auth.repository";
import { AuthService } from "./modules/authentication/auth.service";
import { RideController } from "./modules/rides/ride.controller";
import {
  RideRejectionRepository,
  RideRepository,
} from "./modules/rides/ride.repository";
import { RideService } from "./modules/rides/ride.service";

export const userRepo = new UserRepository();
export const emailVerificationRepo = new EmailVerificationRepository();
export const passwordResetRepo = new PasswordResetTokenRepository();
export const refreshTokenRepo = new RefreshTokenRepostory();
export const driverRepo = new DriverRepository();
export const rideRepo = new RideRepository();
export const rideRejectionRepo = new RideRejectionRepository();

export const userService = new AuthService(
  userRepo,
  emailVerificationRepo,
  passwordResetRepo,
  refreshTokenRepo,
  driverRepo
);
export const rideService = new RideService(
  rideRepo,
  userRepo,
  driverRepo,
  rideRejectionRepo
);

export const authController = new AuthController(userService);
export const rideController = new RideController(rideService);
