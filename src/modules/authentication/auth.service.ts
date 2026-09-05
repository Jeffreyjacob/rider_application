import { env } from "../../config/env";
import { Driver, User } from "../../generated/prisma/client";
import {
  DriverRepository,
  EmailVerificationRepository,
  PasswordResetTokenRepository,
  RefreshTokenRepostory,
  UserRepository,
} from "./auth.repository";
import bcrypt from "bcryptjs";
import {
  ICreateDriverInput,
  IForgetPasswordInput,
  ILoginInput,
  IRegisterInput,
  IResendEmailVerificationInput,
  IResetPasswordInput,
  IUpateDriverOnlineStatusInput,
  IVerifyEmailInput,
} from "./auth.validation";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from "../../shared/errors";
import {
  generateOtp,
  hashOtp,
  isOtpLocked,
  recordFailedOtpAttempt,
} from "../../shared/utils/helper";
import { getEmailQueue } from "../../job/queues/email";
import { logger } from "../../config/logger";
import {
  resetPasswordEmailTemplate,
  verifyEmailTemplate,
} from "../../shared/utils/emails/verificationEmail";
import { redis } from "../../config/redis";
import { prisma } from "../../config/databse";
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  hashRefreshToken,
} from "../../shared/utils/tokenUtils";
import jwt from "jsonwebtoken";

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailVerificationRepo: EmailVerificationRepository,
    private readonly passwordResetRepo: PasswordResetTokenRepository,
    private readonly refreshTokenRepo: RefreshTokenRepostory,
    private readonly driverRepo: DriverRepository
  ) {}

  private async passwordHash(password: string): Promise<string> {
    return await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  private async compareHash(otp: string, otpHashed: string): Promise<boolean> {
    const newHash = hashOtp(otp);
    return newHash === otpHashed;
  }

  private async comparePassword(
    candidatePassword: string,
    password: string
  ): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, password);
  }

  async registerUser(data: IRegisterInput): Promise<User> {
    const checkIfUserExist = await this.userRepo.exist({
      where: { email: data.email },
    });

    if (checkIfUserExist) throw new ConflictError("email already exist");

    const passwordHash = await this.passwordHash(data.password);
    const user = await this.userRepo.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: passwordHash,
        phone: data.phone,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    const otp = generateOtp();
    const today = new Date();
    const emailExpiresAt = new Date(today.getTime() + 60 * 60 * 1000);

    await this.emailVerificationRepo.createOtp({
      userId: user.id,
      otpHash: hashOtp(otp),
      expiresAt: emailExpiresAt,
    });

    const emailJob = getEmailQueue();
    const url = `${env.FRONTEND_URL}/verifyEmail?email=${user.email}`;

    try {
      await emailJob.add("email", {
        email: user.email,
        subject: "Verify your email",
        html: verifyEmailTemplate({
          code: otp,
          firstName: user.fullName,
          url,
          expiresIn: 60,
        }),
      });
    } catch (error: any) {
      logger.warn("unable to add job to email queue");
    }

    return user;
  }

  async verifyEmail(data: IVerifyEmailInput): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) throw new NotFoundError("user not found");

    if (user.emailverified)
      throw new BadRequestError("user email has already verified");

    if (await isOtpLocked(user.id)) {
      throw new TooManyRequestsError("Too many attempts. Try again 10 minutes");
    }

    const emailOtp = await this.emailVerificationRepo.findFirst({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!emailOtp) throw new Error("No active OTP found");

    const isMatch = await this.compareHash(data.code, emailOtp.otpHash);

    if (isMatch) {
      await prisma.$transaction(async (tx) => {
        await tx.emailOtpverification.update({
          where: { id: emailOtp.id },
          data: { verifiedAt: new Date() },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            emailverified: true,
          },
        });
      });

      await redis.del(`otp_lockout:${user.id}`);

      return {
        message: "email verified successfully!",
      };
    }

    await this.emailVerificationRepo.update({
      where: { id: emailOtp.id },
      data: { attempts: { increment: 1 } },
    });
    await recordFailedOtpAttempt(user.id);
    throw new BadRequestError("Incorrect code");
  }

  async resendEmailveriication(
    data: IResendEmailVerificationInput
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      return {
        message:
          "A new Otp has been sent to your email, if your email is associated account on our platform",
      };
    }

    if (await isOtpLocked(user.id)) {
      throw new TooManyRequestsError(
        "Too many wrong otp attempt, try again in 10 minutes"
      );
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.emailOtpverification.updateMany({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          verifiedAt: null,
        },
        data: {
          expiresAt: new Date(),
        },
      });

      await tx.emailOtpverification.create({
        data: {
          userId: user.id,
          otpHash,
          expiresAt,
        },
      });
    });

    const emailJob = getEmailQueue();
    const url = `${env.FRONTEND_URL}/verifyEmail?email=${user.email}`;

    try {
      await emailJob.add("email", {
        email: user.email,
        subject: "Verify your email",
        html: verifyEmailTemplate({
          code: otp,
          firstName: user.fullName,
          url,
          expiresIn: 60,
        }),
      });
    } catch (error: any) {
      logger.warn("unable to add job to email queue");
    }

    return {
      message:
        "A new Otp has been sent to your email, if your email is associated account on our platform",
    };
  }

  async login(data: ILoginInput): Promise<{
    user: { id: string; fullName: string; email: string };
    accessToken: string;
    refreshToken: string;
  }> {
    let user = await this.userRepo.findByEmail(data.email);
    const dummyhash =
      "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234";

    const passwordMatch = await this.comparePassword(
      data.password,
      user?.password ?? dummyhash
    );

    if (!user || !passwordMatch)
      throw new UnauthorizedError("Invalid credentials");

    if (!user.emailverified)
      throw new UnauthorizedError("please verify your email");

    if (!user.isActive)
      throw new UnauthorizedError(
        "Your account has been deactived. Please contact support"
      );

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken();
    const hasRefreshToken = hashRefreshToken(refreshToken);

    const refreshTokenExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000
    );

    await this.refreshTokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash: hasRefreshToken,
      expiresAt: refreshTokenExpiresAt,
    });

    await this.userRepo.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hashRefresh = hashRefreshToken(refreshToken);
    const refresh = await this.refreshTokenRepo.findRefreshToken({
      tokenHash: hashRefresh,
    });

    if (!refresh)
      throw new UnauthorizedError("Invalid, Used or Expired refresh token");

    if (
      refresh.revokedAt ||
      new Date(refresh.expiresAt).getTime() <= Date.now()
    )
      throw new UnauthorizedError("Invalid,Used or Expired token");

    const user = await this.userRepo.findUserById(refresh.userId);
    if (!user) throw new NotFoundError("User not found");

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const newRefresh = generateRefreshToken();
    const newHashRefreshToken = hashRefreshToken(newRefresh);

    await this.refreshTokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash: newHashRefreshToken,
      expiresAt: new Date(
        Date.now() + env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
    });

    // revoked old refresh token

    await this.refreshTokenRepo.update({
      where: {
        id: refresh.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken: newRefresh,
    };
  }

  async forgetPassword(
    data: IForgetPasswordInput
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(data.email);
    const message =
      "if an account exist with this email, a reset password link would be sent to this email";

    if (!user) {
      return {
        message,
      };
    }

    const cooldownKey = `cooldown:reset:${user.id}`;
    const onCoolDown = await redis.get(cooldownKey);

    if (onCoolDown) {
      const ttl = await redis.ttl(cooldownKey);
      const minutes = Math.ceil(ttl / 60);
      throw new TooManyRequestsError(
        `Please wait ${minutes} minutes before requesting`
      );
    }

    const resetToken = generateVerificationToken();
    const hashResetToken = hashRefreshToken(resetToken);
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetRepo.createPasswordToken({
      userId: user.id,
      tokenHash: hashResetToken,
      expiresAt: resetExpiresAt,
    });

    await redis.set(cooldownKey, "1", "EX", 3600);

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${user.email}`;

    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("reset-password", {
        email: user.email,
        subject: "Forget Password Link",
        html: resetPasswordEmailTemplate(resetUrl, user.fullName),
      });
    } catch (error: any) {
      logger.warn({ err: error }, "Failed to queue reset email");
    }
    return {
      message,
    };
  }

  async resetPassword(data: IResetPasswordInput): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) throw new NotFoundError("User not found");

    const resetToken = await this.passwordResetRepo.findPasswordToken({
      userId: user.id,
      tokenHash: hashRefreshToken(data.token),
    });

    if (!resetToken) throw new UnauthorizedError("Invalid or expired token");

    const passwordHash = await this.passwordHash(data.newPassword);

    await this.passwordResetRepo.updateResetTokenUsedAt({
      id: resetToken.id,
      usedAt: new Date(),
    });

    await this.refreshTokenRepo.revokeAllActiveTokensForUser(user.id);

    await this.userRepo.updateUserById({
      id: user.id,
      data: {
        password: passwordHash,
      },
    });

    return {
      message: "Your password has been reset successfully!",
    };
  }

  async logout(
    accessToken: string,
    refreshToken: string
  ): Promise<{ message: string }> {
    const refresh = await this.refreshTokenRepo.findRefreshToken({
      tokenHash: hashRefreshToken(refreshToken),
    });

    if (!refresh) throw new BadRequestError("invalid or expired token");

    if (
      refresh.revokedAt ||
      new Date(refresh.expiresAt).getTime() <= Date.now()
    )
      throw new UnauthorizedError("Invalid, Used or Expired token");

    await this.refreshTokenRepo.invalidateRefreshToken({
      id: refresh.id,
      revokedAt: new Date(),
    });

    const decoded = jwt.decode(accessToken) as { exp: number };

    if (decoded.exp) {
      const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingSeconds > 0) {
        try {
          await redis.set(
            `BlacklistToken:${accessToken}`,
            "1",
            "EX",
            remainingSeconds
          );
        } catch (error: any) {
          logger.warn({ err: error }, "unable to blacklist token");
        }
      }
    }

    return {
      message: "user has been logged out",
    };
  }

  async createDriver(
    userId: string,
    data: ICreateDriverInput
  ): Promise<Driver> {
    const user = await this.userRepo.findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    const driver = await this.driverRepo.createDriver(user.id, {
      vehiclePlate: data.vehiclePlate,
      licenseNo: data.licenseNo,
    });

    return driver;
  }

  async updateDriverOnlineStatus(
    userId: string,
    data: IUpateDriverOnlineStatusInput
  ) {
    const user = await this.userRepo.findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    const driver = await this.driverRepo.findDriverByUserId(userId);
    if (!driver) throw new NotFoundError("Driver not found");

    await this.driverRepo.updateDriverOnlineStatus(user.id, data.status);
  }
}
