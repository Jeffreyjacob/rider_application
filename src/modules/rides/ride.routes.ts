import { Router } from "express";
import {
  authenticate,
  requireDriver,
} from "../../shared/middlewares/authenticate";
import { AsyncHandler } from "../../shared/utils/asyncHandler";
import { rideController } from "../../container";

const router = Router();

router.post(
  "/estimateRide",
  authenticate,
  AsyncHandler(rideController.estimateRide.bind(rideController))
);

router.post(
  "/request",
  authenticate,
  AsyncHandler(rideController.createRide.bind(rideController))
);

router.get(
  "/:id",
  authenticate,
  AsyncHandler(rideController.getRideById.bind(rideController))
);

router.post(
  "/cancel/:id",
  authenticate,
  AsyncHandler(rideController.cancelRide.bind(rideController))
);

router.get(
  "/history",
  authenticate,
  AsyncHandler(rideController.rideHistory.bind(rideController))
);

router.post(
  "/accept/:id",
  authenticate,
  requireDriver,
  AsyncHandler(rideController.acceptRide.bind(rideController))
);

router.post(
  "/start/:id",
  authenticate,
  requireDriver,
  AsyncHandler(rideController.startRide.bind(rideController))
);

router.post(
  "/complete/:id",
  authenticate,
  requireDriver,
  AsyncHandler(rideController.completeRide.bind(rideController))
);

router.post(
  "/reject/:id",
  authenticate,
  requireDriver,
  AsyncHandler(rideController.rejectRide.bind(rideController))
);

router.post(
  "/rate/:id",
  authenticate,
  AsyncHandler(rideController.rateRide.bind(rideController))
);

export default router;
