import { prisma } from "../../config/databse";
import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import { getIO } from "../../sockets";
import { eventBus } from "../eventBus";

export function rideListeners() {
  eventBus.on("ride.rating", async ({ driverId }) => {
    try {
      const result = await prisma.rating.aggregate({
        where: { driverId },
        _avg: { stars: true },
      });

      await prisma.driver.update({
        where: { id: driverId },
        data: { rating: result._avg.stars ?? 5.0 },
      });
    } catch (error) {
      logger.warn({ err: error }, "failed to update driver rating average ");
    }
  });

  eventBus.on("ride.accepted", async ({ ride, driver }) => {
    const io = getIO();
    io.to(`user:${ride.riderId}`).emit("ride.accepted", {
      rideId: ride.id,
      driverId: driver.id,
      driverName: driver.fullName,
      vehiclePlate: driver.vehiclePlate,
    });
  });

  eventBus.on("ride.requested", async ({ ride, rider }) => {
    const nearByDriverIds = await redis.geosearch(
      "drivers:locations",
      "FROMLONLAT",
      ride.pickupLng,
      ride.pickupLat,
      "BYRADIUS",
      3,
      "km",
      "ASC"
    );

    if (nearByDriverIds.length === 0) return;

    const rejectedDriverIds = await prisma.rideRejection.findMany({
      where: { rideId: ride.id },
      select: { driverId: true },
    });

    const rejectedSet = new Set(rejectedDriverIds.map((r) => r.driverId));

    const drivers = await prisma.driver.findMany({
      where: { id: { in: nearByDriverIds as string[] } },
      select: { id: true, userId: true },
    });

    const io = getIO();

    for (const driver of drivers) {
      if (rejectedSet.has(driver.id)) continue;
      io.to(`user:${driver.userId}`).emit("ride.requested", {
        rideId: ride.id,
        pickupAddress: ride.pickupAddress,
        dropOffAddress: ride.dropOffAddress,
        estimatedPrice: ride.estimatedPrice,
      });
    }
  });
}
