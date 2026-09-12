import { prisma } from "../../config/databse";
import { logger } from "../../config/logger";
import { eventBus } from "../eventBus";

export function ratingListeners() {
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
}
