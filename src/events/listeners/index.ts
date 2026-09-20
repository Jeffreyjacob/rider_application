import { rideService } from "../../container";
import { rideListeners } from "./rideListeners";

export function registerAllListeners(): void {
  rideListeners(rideService);
}
