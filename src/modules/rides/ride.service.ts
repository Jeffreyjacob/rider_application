import { prisma } from "../../config/databse";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import { eventBus } from "../../events/eventBus";
import { Ride, RideStatus } from "../../generated/prisma/client";
import { getEmailQueue } from "../../job/queues/email";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors";
import { OffsetPaginationResponse } from "../../shared/repository/base-repository";
import { rideCompletedEmailTemplate } from "../../shared/utils/emails/completeRideEmail";
import { rideCancelledEmailTemplate } from "../../shared/utils/emails/driverCancelEmail";
import { rideAcceptedEmailTemplate } from "../../shared/utils/emails/rideAcceptedEmail";
import {
  calculateDistanceKm,
  calculateFinalPrice,
  estimateRide,
  MINIMUM_RIDE_DISTANCE_KM,
} from "../../shared/utils/helper";
import {
  DriverRepository,
  UserRepository,
} from "../authentication/auth.repository";
import { RideRejectionRepository, RideRepository } from "./ride.repository";
import {
  ICompleteRideInput,
  ICreateRideInput,
  IEstimateRideInput,
  IGetRideHistoryInput,
  IRateRideInput,
} from "./ride.validations";

export class RideService {
  constructor(
    private readonly rideRepo: RideRepository,
    private readonly userRepo: UserRepository,
    private readonly driverRepo: DriverRepository,
    private readonly rideRejectionRepo: RideRejectionRepository
  ) {}

  async estimateRide(data: IEstimateRideInput) {
    const distanceKm = calculateDistanceKm(
      data.pickupLat,
      data.pickupLng,
      data.dropoffLat,
      data.dropoffLng
    );

    if (distanceKm < MINIMUM_RIDE_DISTANCE_KM)
      throw new BadRequestError("Pickup and dropoff are too close together");

    const { estimatedPriceKobo, estimatedDurationMin } =
      estimateRide(distanceKm);

    return { distanceKm, estimatedPriceKobo, estimatedDurationMin };
  }

  async createRide(riderId: string, data: ICreateRideInput): Promise<Ride> {
    const rider = await this.userRepo.findUserById(riderId);
    if (!rider) throw new NotFoundError("unable to find user");

    const distance = calculateDistanceKm(
      data.pickupLat,
      data.pickupLng,
      data.dropoffLat,
      data.dropoffLng
    );

    if (distance < MINIMUM_RIDE_DISTANCE_KM)
      throw new BadRequestError(
        "Pickup and dropoff locations are too close together for a ride."
      );

    const ride = await this.rideRepo.createRide(rider.id, data);

    eventBus.emit("ride.requested", {
      ride: {
        id: ride.id,
        dropOffAddress: ride.dropOffAddress,
        pickupAddress: ride.pickupAddress,
        estimatedPrice: ride.estimatedPrice!,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
      },
      rider: {
        id: rider.id,
        fullName: rider.fullName,
      },
    });
    return ride;
  }

  async getRideById(id: string): Promise<Ride | null> {
    const ride = await this.rideRepo.findRideById(id);
    if (!ride) throw new NotFoundError("unable to find ride");
    return ride;
  }

  async cancelRide(riderId: string, id: string): Promise<Ride | null> {
    const ride = await this.rideRepo.findRideById(id);
    if (!ride) throw new NotFoundError("unable to find ride");

    const rider = await this.userRepo.findUserById(ride.riderId);

    if (!rider) throw new NotFoundError("unable to find rider");

    const driver = await this.userRepo.findUserById(ride.driverId!);

    if (!driver) throw new NotFoundError("unable to find driver");

    if (riderId !== ride.riderId)
      throw new BadRequestError("You can't cancel a ride, you did not request");

    if (ride.status !== RideStatus.ACCEPTED)
      throw new BadRequestError("You can't cancel this ride at this moment");

    const updateRide = await this.rideRepo.update({
      where: {
        id: ride.id,
      },
      data: {
        status: RideStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await redis.del(`driver:active_ride:${driver.id}`);

    const emailQueue = getEmailQueue();
    try {
      await emailQueue.add("email", {
        email: driver.email,
        subject: `Ride with id ${ride.id} has been Cancelled`,
        html: rideCancelledEmailTemplate({
          driverName: driver.fullName,
          riderName: rider.fullName,
          rideId: ride.id,
          cancelledAt: updateRide.cancelledAt!,
          cancellationReason: "Rider found alternative transportation",
          supportEmail: "driver-support@yourapp.com",
        }),
      });
    } catch (error: any) {
      logger.warn("Unable to add cancel email to email queue");
    }

    return updateRide;
  }

  async rideHistory(
    riderId: string,
    data: IGetRideHistoryInput
  ): Promise<OffsetPaginationResponse<Ride>> {
    const rider = await this.userRepo.findUserById(riderId);
    if (!rider) throw new NotFoundError("unable to find user");

    return await this.rideRepo.findRideHistory(rider.id, data);
  }

  async acceptRide(id: string, driverId: string) {
    const ride = await this.rideRepo.findRideById(id);
    if (!ride) throw new NotFoundError("unable to find ride");

    const rider = await this.userRepo.findUserById(ride.riderId);
    if (!rider) throw new NotFoundError("unable to find user");

    const driver = await prisma.driver.findFirst({
      where: { id: driverId },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            id: true,
          },
        },
      },
    });

    if (!driver) throw new NotFoundError("unable to find driver");
    let updatedRide;
    try {
      updatedRide = await this.rideRepo.acceptRide(id, driver.id);
      if (updatedRide.count === 0)
        throw new BadRequestError(
          "unable to update ride or ride is no longer available"
        );
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new ConflictError("You already have an active ride");
      }
      throw error;
    }

    await redis.set(
      `driver:active_ride:${driver.id}`,
      ride.id,
      "EX",
      60 * 60 * 24
    );

    const emailJob = getEmailQueue();

    try {
      await emailJob.add("email", {
        email: rider.email,
        subject: `Your ride from ${ride.pickupAddress} to ${ride.dropOffAddress}`,
        html: rideAcceptedEmailTemplate({
          riderName: rider.fullName,
          driverName: driver.user.fullName,
          driverPhone: driver.user.phone ?? "",
          driverRating: driver.rating,
          vehicleInfo: {
            vehicleNo: driver.vehiclePlate,
            licensePlate: driver.licenseNo,
          },
          rideId: ride.id,
          pickupLocation: ride.pickupAddress,
          dropoffLocation: ride.dropOffAddress,
          estimatedFare: ride.estimatedPrice ?? 0,
          estimatedArrivalMinutes: ride.estimatedDurationMin ?? 0,
        }),
      });
    } catch (error: any) {
      logger.warn("unable to queue accept ride email to email queue");
    }

    eventBus.emit("ride.accepted", {
      ride: { id: ride.id, riderId: ride.riderId },
      driver: {
        id: driver.id,
        fullName: driver.user.fullName,
        vehiclePlate: driver.vehiclePlate,
      },
    });

    return updatedRide;
  }

  async startRide(userId: string, id: string) {
    const user = await this.userRepo.findUserById(userId);
    if (!user) throw new NotFoundError("unable to find user");

    const findDriver = await this.driverRepo.findDriverByUserId(userId);
    if (!findDriver) throw new NotFoundError("unable to find driver");

    const ride = await this.rideRepo.findRideById(id);
    if (!ride) throw new NotFoundError("unable to find ride");

    if (ride.status !== RideStatus.ACCEPTED)
      throw new BadRequestError(
        "you have to accept the ride before starting it"
      );

    const updated = await this.rideRepo.update({
      where: {
        id,
      },
      data: {
        status: RideStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    return updated;
  }

  async completeRide(userId: string, id: string, data: ICompleteRideInput) {
    const user = await this.userRepo.findUserById(userId);
    if (!user) throw new NotFoundError("unable to find user");

    const findDriver = await prisma.driver.findFirst({
      where: { id },
      include: {
        user: {
          select: {
            fullName: true,
            id: true,
            email: true,
          },
        },
      },
    });
    if (!findDriver) throw new NotFoundError("unable to find driver");

    const ride = await this.rideRepo.findRideById(id);
    if (!ride) throw new NotFoundError("unable to find ride");

    const rider = await this.userRepo.findUserById(ride.riderId);
    if (!rider) throw new NotFoundError("unable to find rider");

    const distanceKmDrivertoDropOff = calculateDistanceKm(
      ride.dropoffLat,
      ride.dropoffLng,
      data.locationLat,
      data.locationLng
    );

    if (distanceKmDrivertoDropOff > 0.4)
      throw new BadRequestError(
        "You must be around dropoff location before you can complete a ride"
      );

    if (ride.status !== RideStatus.IN_PROGRESS)
      throw new BadRequestError(
        "you can't complete a ride that has not started"
      );

    const distanceKm = calculateDistanceKm(
      ride.pickupLat,
      ride.pickupLng,
      ride.dropoffLat,
      ride.dropoffLng
    );
    const duration = new Date(ride.startedAt!).getTime() - Date.now();
    const finalPrice = calculateFinalPrice(distanceKm, duration);

    const update = await this.rideRepo.update({
      where: {
        id,
      },
      data: {
        completedAt: new Date(),
        distanceKm,
        finalPrice,
      },
    });

    await redis.del(`driver:active_ride:${findDriver.id}`);

    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("email", {
        email: rider.email,
        subject: `Ride from ${ride.pickupAddress} to ${ride.dropOffAddress} has been completed `,
        html: rideCompletedEmailTemplate({
          riderName: rider.fullName,
          driverName: findDriver.user.fullName,
          driverRating: findDriver.rating,
          pickupLocation: ride.pickupAddress,
          dropoffLocation: ride.dropOffAddress,
          distanceKm: ride.distanceKm ?? 0,
          durationMinutes: duration,
          finalPrice: String(finalPrice),
          baseFare: String(env.BASE_FAKE_KOBO),
          rideDate: ride.requestedAt,
          rideId: ride.id,
        }),
      });
    } catch (error: any) {
      logger.warn("unable to queue accept ride email to email queue");
    }

    return update;
  }

  async rejectRide(userId: string, rideId: string) {
    const driver = await this.driverRepo.findDriverByUserId(userId);
    if (!driver) throw new NotFoundError("user is not a driver");

    const ride = await this.rideRepo.findRideById(rideId);
    if (!ride) throw new NotFoundError("unable to find ride");

    const reject = await this.rideRejectionRepo.createRideRejection({
      rideId,
      driverId: driver.id,
    });

    return reject;
  }

  async rateRide(userId: string, rideId: string, data: IRateRideInput) {
    const rider = await this.userRepo.findUserById(userId);
    if (!rider) throw new NotFoundError("unable to user");

    const ride = await this.rideRepo.findRideById(rideId);
    if (!ride) throw new NotFoundError("unable to find ride");

    if (ride.status !== RideStatus.COMPLETED)
      throw new BadRequestError(
        "ride must be completed before you can rate it"
      );

    const rating = await prisma.rating.create({
      data: {
        ...data,
        driverId: ride.driverId!,
        rideId,
        riderId: rider.id,
      },
    });

    eventBus.emit("ride.rating", {
      driverId: ride.driverId!,
      rideId: ride.id,
      riderId: userId,
    });

    return rating;
  }
}
