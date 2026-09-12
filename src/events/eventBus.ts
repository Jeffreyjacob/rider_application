import { EventEmitter } from "stream";
import { logger } from "../config/logger";

interface AppEvents {
  "ride.rating": { driverId: string; riderId: string; rideId: string };
  "ride.requested": { rideId: string; riderId: string };
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
