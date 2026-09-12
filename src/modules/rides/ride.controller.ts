import { Request, Response } from "express";
import { RideService } from "./ride.service";
import {
  completeRideSchema,
  createRideSchema,
  estimateRideSchema,
  getRideHistorySchema,
  rateRideSchedma,
} from "./ride.validations";
import { ResponseHelper } from "../../shared/utils/apiResponse";

export class RideController {
  constructor(private readonly service: RideService) {}

  async estimateRide(req: Request, res: Response): Promise<void> {
    const data = estimateRideSchema.parse(req.body);
    const result = await this.service.estimateRide(data);
    ResponseHelper.success(res, result, 200, "estimated ride fetched");
  }

  async createRide(req: Request, res: Response): Promise<void> {
    const data = createRideSchema.parse(req.body);
    const riderId = req.user?.userId!;
    const result = await this.service.createRide(riderId, data);
    req.log?.info(
      { rideId: result.id, riderId, status: result.status },
      "ride requested"
    );
    ResponseHelper.created(res, result, "ride requested");
  }

  async getRideById(req: Request, res: Response): Promise<void> {
    const rideId = req.params.id as string;
    const result = await this.service.getRideById(rideId);
    ResponseHelper.success(res, result, 200, "ride fetched");
  }

  async cancelRide(req: Request, res: Response): Promise<void> {
    const rideId = req.params.id as string;
    const riderId = req.user?.userId!;
    const result = await this.service.cancelRide(riderId, rideId);
    req.log?.info(
      { rideId: result?.id, riderId: result?.riderId },
      "cancel ride"
    );
    ResponseHelper.success(res, result, 200, "cancel ");
  }

  async rideHistory(req: Request, res: Response): Promise<void> {
    const data = getRideHistorySchema.parse(req.query);
    const riderId = req.user?.userId!;
    const result = await this.service.rideHistory(riderId, data);
    ResponseHelper.success(res, result, 200, "ride history fetched");
  }

  async acceptRide(req: Request, res: Response): Promise<void> {
    const driverId = req.user?.userId!;
    const rideId = req.params.id as string;
    const result = await this.service.acceptRide(rideId, driverId);
    req.log?.info({ rideId, driverId }, "ride accepted");
    ResponseHelper.success(res, "", 200, "Ride accepted");
  }

  async startRide(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const rideId = req.params.id as string;
    const result = await this.service.startRide(userId, rideId);
    req.log?.info(
      { rideId: result.id, driverId: result.driverId },
      "ride started"
    );
    ResponseHelper.success(res, result, 200, "Ride started");
  }

  async completeRide(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const rideId = req.params.id as string;
    const data = completeRideSchema.parse(req.body);
    const result = await this.service.completeRide(userId, rideId, data);
    req.log?.info(
      {
        rideId: result.id,
        driverId: result.driverId,
        distance: result.distanceKm,
      },
      "ride completed"
    );
    ResponseHelper.success(res, result, 200, "ride completed");
  }

  async rejectRide(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const rideId = req.params.id as string;
    const result = await this.service.rejectRide(userId, rideId);
    req.log?.info({ rideId, driverId: userId }, "ride rejected");
    ResponseHelper.success(res, result, 200, "ride rejected");
  }

  async rateRide(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId!;
    const rideId = req.params.id as string;
    const data = rateRideSchedma.parse(req.body);
    const result = await this.service.rateRide(userId, rideId, data);
    req.log?.info({ rideId, userId }, "ride rated");
    ResponseHelper.success(res, result, 200, "ride rated");
  }
}
