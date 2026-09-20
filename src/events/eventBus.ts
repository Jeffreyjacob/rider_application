import { EventEmitter } from "node:stream";
import { logger } from "../config/logger";

interface AppEvents {
  "ride.rating": { driverId: string; riderId: string; rideId: string };
  "ride.requested": {
    ride: {
      id: string;
      pickupAddress: string;
      dropOffAddress: string;
      estimatedPrice: number;
      pickupLat: number;
      pickupLng: number;
    };
    rider: {
      id: string;
      fullName: string;
    };
  };
  "ride.accepted": {
    ride: { id: string; riderId: string };
    driver: { id: string; fullName: string; vehiclePlate: string };
  };
  // for learning purpose of sending ride sequentially to driver rather than broad casting it
  "ride.offer": {
    ride: {
      id: string;
      pickupAddress: string;
      dropOffAddress: string;
      estimatedPrice: number;
      pickupLat: number;
      pickupLng: number;
    };
    rider: {
      id: string;
      fullName: string;
    };
  };
}

export class TypedEventBus extends EventEmitter {
  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]) {
    return super.emit(event, payload);
  }

  on<K extends keyof AppEvents>(
    event: K,
    listener: (payload: AppEvents[K]) => void | Promise<void>
  ): this {
    const safeListener = async (payload: AppEvents[K]) => {
      try {
        await Promise.resolve(listener(payload));
      } catch (error: any) {
        logger.error(
          { error, event },
          `Event Listener failed for event: ${event}`
        );
      }
    };

    return super.on(event, safeListener);
  }

  off<K extends keyof AppEvents>(
    event: K,
    listener: (payload: AppEvents[K]) => void
  ): this {
    return super.off(event, listener);
  }
}

export const eventBus = new TypedEventBus();
export type { AppEvents };
