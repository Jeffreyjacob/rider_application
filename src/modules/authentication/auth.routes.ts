import { Router } from "express";
import { AsyncHandler } from "../../shared/utils/asyncHandler";
import { authController } from "../../container";
import {
  authenticate,
  requireDriver,
} from "../../shared/middlewares/authenticate";

const router = Router();

router.post(
  "/create",
  AsyncHandler(authController.registerUser.bind(authController))
);

router.post(
  "/verify-email",
  AsyncHandler(authController.verifyEmail.bind(authController))
);

router.post(
  "/resend-email",
  AsyncHandler(authController.resendEmailVerification.bind(authController))
);

router.post("/login", AsyncHandler(authController.login.bind(authController)));

router.post(
  "/refresh",
  AsyncHandler(authController.login.bind(authController))
);

router.post(
  "/forget-password",
  AsyncHandler(authController.forgetPassword.bind(authController))
);

router.post(
  "/reset-password",
  AsyncHandler(authController.resetPassword.bind(authController))
);

router.post(
  "/logOut",
  authenticate,
  AsyncHandler(authController.logout.bind(authController))
);

router.post(
  "/create/driver",
  authenticate,
  AsyncHandler(authController.createDriver.bind(authController))
);

router.patch(
  "/driver/status",
  authenticate,
  requireDriver,
  AsyncHandler(authController.updateDriverOnlineStatus.bind(authController))
);

export default router;
