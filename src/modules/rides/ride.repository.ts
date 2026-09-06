import { prisma } from "../../config/databse";
import { Prisma, Ride, RideStatus } from "../../generated/prisma/client";
import { BaseRepository } from "../../shared/repository/base-repository";
import { ICreateRideInput, IGetRideHistoryInput } from "./ride.validations";

export class RideRepository extends BaseRepository<Prisma.RideDelegate, Ride> {
  constructor() {
    super(prisma.ride);
  }

  async createRide(riderId: string, data: ICreateRideInput) {
    return this.create({
      data: {
        riderId,
        status: RideStatus.REQUESTED,
        ...data,
      },
    });
  }

  async findRideById(id: string) {
    return this.findFirst({
      where: { id },
    });
  }

  async findRideHistory(riderId: string, data: IGetRideHistoryInput) {
    let where: Prisma.Args<Prisma.RideDelegate, "findMany">["where"] = {
      riderId,
    };

    if (data.date && data.date.from && data.date.to) {
      where.requestedAt = {
        gte: data.date.from,
        lte: data.date.to,
      };
    }

    return this.findManyWithOffsetPagination({
      where,
      include: {
        driver: {
          select: {
            vehiclePlate: true,
            licenseNo: true,
            user: {
              select: {
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
      page: data.page,
      pageSize: data.limit,
    });
  }

  async acceptRide(id: string, driverId: string) {
    return this.updateMany({
      where: {
        id,
        status: RideStatus.REQUESTED,
      },
      data: {
        status: RideStatus.ACCEPTED,
        driverId,
        acceptedAt: new Date(),
      },
    });
  }
}
