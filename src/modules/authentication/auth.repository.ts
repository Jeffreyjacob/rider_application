import { prisma } from "../../config/databse";
import {
  EmailOtpverification,
  PasswordResetToken,
  Prisma,
  RefreshToken,
  User,
} from "../../generated/prisma/client";
import { BaseRepository } from "../../shared/repository/base-repository";

export class UserRepository extends BaseRepository<Prisma.UserDelegate, User> {
  constructor() {
    super(prisma.user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findFirst({ where: { email } });
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.findFirst({
      where: {
        id: userId,
      },
    });
  }

  async updateUserById({
    id,
    data,
  }: {
    id: string;
    data: Prisma.UserUpdateInput;
  }): Promise<User | null> {
    return this.update({ where: { id }, data });
  }
}

export class EmailVerificationRepository extends BaseRepository<
  Prisma.EmailOtpverificationDelegate,
  EmailOtpverification
> {
  constructor() {
    super(prisma.emailOtpverification);
  }

  async createOtp(args: {
    userId: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<EmailOtpverification> {
    return this.create({
      data: {
        ...args,
      },
    });
  }

  async increaseOtpAttempt({
    id,
  }: {
    id: string;
  }): Promise<EmailOtpverification | null> {
    return this.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  async findEmailOtp(data: {
    userId: string;
    otpHash: string;
  }): Promise<EmailOtpverification | null> {
    return this.findFirst({
      where: {
        userId: data.userId,
        otpHash: data.otpHash,
        expiresAt: { gt: new Date() },
        verifiedAt: null,
      },
    });
  }

  async updateOtpVerifiedAt(data: {
    id: string;
    verifiedAt: Date;
  }): Promise<EmailOtpverification | null> {
    return this.update({
      where: { id: data.id },
      data: { verifiedAt: data.verifiedAt },
    });
  }
}

export class PasswordResetTokenRepository extends BaseRepository<
  Prisma.PasswordResetTokenDelegate,
  PasswordResetToken
> {
  constructor() {
    super(prisma.passwordResetToken);
  }

  async createPasswordToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return this.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findPasswordToken(data: {
    userId: string;
    tokenHash: string;
  }): Promise<PasswordResetToken | null> {
    return this.findFirst({
      where: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: { gte: new Date() },
        usedAt: null,
      },
    });
  }

  async updateResetTokenUsedAt(data: {
    id: string;
    usedAt: Date;
  }): Promise<PasswordResetToken | null> {
    return this.update({
      where: { id: data.id },
      data: {
        usedAt: data.usedAt,
      },
    });
  }
}

export class RefreshTokenRepostory extends BaseRepository<
  Prisma.RefreshTokenDelegate,
  RefreshToken
> {
  constructor() {
    super(prisma.refreshToken);
  }

  async createRefreshToken(args: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    replaceByTokenId?: string;
  }): Promise<RefreshToken> {
    return this.create({
      data: {
        ...args,
      },
    });
  }

  async invalidateRefreshToken(args: {
    id: string;
    revokedAt: Date;
    replaceByTokenId?: string;
  }): Promise<RefreshToken | null> {
    return this.update({
      where: {
        id: args.id,
      },
      data: {
        ...(args.replaceByTokenId && {
          replaceByTokenId: args.replaceByTokenId,
        }),
        revokedAt: args.revokedAt,
      },
    });
  }

  async findRefreshToken({
    tokenHash,
  }: {
    tokenHash: string;
  }): Promise<RefreshToken | null> {
    return this.findUnique({
      where: {
        tokenHash,
      },
    });
  }

  async revokeAllActiveTokensForUser(
    userId: string
  ): Promise<Prisma.BatchPayload> {
    return this.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}
