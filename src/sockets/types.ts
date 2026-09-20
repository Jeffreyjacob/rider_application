export interface ServerToClientEvents {
  "ride.accepted": (payload: {
    rideId: string;
    driverId: string;
    driverName: string;
    vehiclePlate: string;
  }) => void;
  "ride.cancelled": (payload: {
    rideId: string;
    cancelledBy: "rider" | "driver";
  }) => void;
  "driver.location.broadcast": (payload: {
    driverId: string;
    lat: number;
    lng: number;
  }) => void;
  "ride.requested": (payload: {
    rideId: string;
    pickupAddress: string;
    dropOffAddress: string;
    estimatedPrice: number;
  }) => void;
  "ride.offer": (
    payload: {
      id: string;
      pickupAddress: string;
      dropOffAddress: string;
      estimatedPrice: number | null;
    },
    callback: (response: { accepted: boolean }) => void
  ) => void;
}

export interface ClientToServerEvents {
  "driver.location.update": (payload: { lat: number; lng: number }) => void;
  "ride.join": (payload: { rideId: string }) => void;
}

export interface SocketData {
  userId: string;
  driverId?: string;
}
