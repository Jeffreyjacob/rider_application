import { prisma } from "../../config/databse";
import { logger } from "../../config/logger";
import { Ride, RideStatus } from "../../generated/prisma/client";
import { getEmailQueue } from "../../job/queues/email";
import { BadRequestError, NotFoundError } from "../../shared/errors";
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
import { RideRepository } from "./ride.repository";
import {
  ICompleteRideInput,
  ICreateRideInput,
  IEstimateRideInput,
  IGetRideHistoryInput,
} from "./ride.validations";

export class RideService {
  constructor(
    private readonly rideRepo: RideRepository,
    private readonly userRepo: UserRepository,
    private readonly driverRepo: DriverRepository
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

  async acceptRide(id: string, riderId: string, driverId: string) {
    const rider = await this.userRepo.findUserById(riderId);
    if (!rider) throw new NotFoundError("unable to find user");

    const driver = await prisma.driver.findFirst({
      where: { id },
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

    const ride = await this.rideRepo.findRideById(id);
    if (!ride) throw new NotFoundError("unable to find ride");

    const updatedRide = await this.rideRepo.acceptRide(id, driver.id);
    if (!updatedRide)
      throw new BadRequestError(
        "unable to update ride or ride already accepted by other driver"
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

    const findDriver = await this.driverRepo.findDriverByUserId(userId);
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

    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("email", {
        email: rider.email,
        subject: `Ride from ${ride.pickupAddress} to ${ride.dropOffAddress} has been completed `,
        html: rideCompletedEmailTemplate({}),
      });
    } catch (error: any) {
      logger.warn("unable to queue accept ride email to email queue");
    }

    return update;
  }
}
