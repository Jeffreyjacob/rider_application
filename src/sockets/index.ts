import http from "node:http";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";
import { UnauthorizedError } from "../shared/errors";
import { verifyAccessToken } from "../shared/utils/tokenUtils";
import { driverRepo } from "../container";
import { redis } from "../config/redis";

let io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export function initSocket(httpServer: http.Server) {
  io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(
    httpServer,
    {
      cors: { origin: "*" },
    }
  );

  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      return next(new UnauthorizedError("Authorization required"));
    }

    try {
      const decoded = verifyAccessToken(token);
      socket.data.userId = decoded.userId;

      const driver = await driverRepo.findDriverByUserId(decoded.userId);
      if (driver) {
        socket.data.driverId = driver.id;
      }
      next();
    } catch (error: any) {
      next(new UnauthorizedError("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    console.log(`Socket connected: userId=${userId}, rooms=`, socket.rooms);
    socket.join(`user:${userId}`);
    console.log(`Joined room: user:${userId}`);
    socket.on("ride.join", ({ rideId }) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on("driver.location.update", async ({ lat, lng }) => {
      const driverId = socket.data.driverId;
      if (!driverId) return;

      await redis.geoadd("drivers:locations", lng, lat, driverId);

      const activeRideId = await redis.get(`driver:active_ride:${driverId}`);
      if (!activeRideId) return;

      io.to(`ride:${activeRideId}`).emit("driver.location.broadcast", {
        driverId,
        lat,
        lng,
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error(
      "Socket.io not initialized - call initSocket() before getIO()"
    );
  }
  return io;
}
