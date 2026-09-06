import z from "zod";
import { RideStatus } from "../../generated/prisma/enums";

export const estimateRideSchema = z.object({
  pickupLat: z.coerce.number().min(-90).max(90),
  pickupLng: z.coerce.number().min(-180).max(180),
  dropoffLat: z.coerce.number().min(-90).max(90),
  dropoffLng: z.coerce.number().min(-180).max(180),
});

export const createRideSchema = z.object({
  pickupLat: z.coerce.number().min(-90).max(90),
  pickupLng: z.coerce.number().min(-180).max(180),
  pickupAddress: z.string().min(1, "current addres is required"),
  dropoffLat: z.coerce.number().min(-90).max(90),
  dropoffLng: z.coerce.number().min(-180).max(180),
  dropOffAddress: z.string().min(1, "destination address is required"),
  estimatedPrice: z.coerce.number().min(1),
  estimatedDurationMin: z.coerce.number().min(1),
});

export const getRideHistorySchema = z.object({
  status: z.enum(RideStatus).optional(),
  date: z
    .object({
      from: z.date(),
      to: z.date(),
    })
    .optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export const completeRideSchema = z.object({
  locationLat: z.coerce.number().min(-90).max(90),
  locationLng: z.coerce.number().min(-180).max(180),
});

export type IEstimateRideInput = z.infer<typeof estimateRideSchema>;
export type ICreateRideInput = z.infer<typeof createRideSchema>;
export type IGetRideHistoryInput = z.infer<typeof getRideHistorySchema>;
export type ICompleteRideInput = z.infer<typeof completeRideSchema>;
