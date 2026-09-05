import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  forgetPasswordSchema,
  loginSchema,
  logoutSchema,
  registerDriverSchema,
  registerSchema,
  resendEmailVerificationSchema,
  resetPasswordSchema,
  updateDriverStatus,
  verifyEmailSchema,
} from "./auth.validation";
import { ResponseHelper } from "../../shared/utils/apiResponse";
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../../shared/utils/tokenUtils";
import { env } from "../../config/env";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async registerUser(req: Request, res: Response): Promise<void> {
    const data = registerSchema.parse(req.body);
    const result = await this.authService.registerUser(data);
    req.log?.info({ userId: result.id }, "user created");
    ResponseHelper.created(res, result, "User created successfully!");
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const data = verifyEmailSchema.parse(req.body);
    const result = await this.authService.verifyEmail(data);
    req.log?.info({ email: data.email }, "user email verified");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async resendEmailVerification(req: Request, res: Response): Promise<void> {
    const data = resendEmailVerificationSchema.parse(req.body);
    const result = await this.authService.resendEmailveriication(data);
    req.log?.info({ email: data.email }, "user email has been resent");
    ResponseHelper.success(res, "", 200, result.message);
  }

  async login(req: Request, res: Response): Promise<void> {
    const data = loginSchema.parse(req.body);
    const result = await this.authService.login(data);
    req.log?.info({ userId: result.user.id }, "user logged in");
    const { user, accessToken, refreshToken } = result;
    setRefreshTokenCookie(res, refreshToken);
    ResponseHelper.success(res, { user, accessToken }, 200, "User logged in ");
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[env.REFRESH_TOKEN_NAME];
    const result = await this.authService.refreshToken(refreshToken);
    const { accessToken, refreshToken: newRefresh } = result;
    setRefreshTokenCookie(res, newRefresh);
    ResponseHelper.success(
      res,
      { accessToken },
      200,
      "token has been refreshed"
    );
  }

  async forgetPassword(req: Request, res: Response): Promise<void> {
    const data = forgetPasswordSchema.parse(req.body);
    const result = await this.authService.forgetPassword(data);
    ResponseHelper.success(res, "", 200, result.message);
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const data = resetPasswordSchema.parse(req.body);
    const result = await this.authService.resetPassword(data);
    ResponseHelper.success(res, "", 200, result.message);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[env.REFRESH_TOKEN_NAME];
    const data = logoutSchema.parse(req.body);
    const result = await this.authService.logout(
      data.accessToken,
      refreshToken
    );
    clearRefreshTokenCookie(res);
    ResponseHelper.success(res, "", 200, result.message);
  }

  async createDriver(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const data = registerDriverSchema.parse(req.body);
    const result = await this.authService.createDriver(userId, data);
    req.log?.info({ userId }, "driver has been created");
    ResponseHelper.created(res, result, "Driver created successfully!");
  }

  async updateDriverOnlineStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const data = updateDriverStatus.parse(req.body);
    const result = await this.authService.updateDriverOnlineStatus(
      userId,
      data
    );
    req.log?.info(
      { userId, status: data.status },
      "driver status has been updated"
    );
  }
}
